import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  getSupabaseAdminClient,
  type SupabaseAdminClient,
} from "../_shared/general/supabase-client.ts";
import { computeAndStoreMatchPoints } from "../_shared/quiniela/helpers/scoring.ts";
import {
  isAuthorizedScrapeRequest,
  type MatchStatus,
  parseScrapeSyncMode,
  shouldApplyIncomingMatch,
} from "./sync-policy.ts";

const SOURCE = "onefootball";

type IncomingMatch = {
  externalMatchRef: string;
  id?: string;
  phase?: string;
  groupName?: string | null;
  homeTeamId?: string;
  awayTeamId?: string;
  kickoffAt?: string;
  status?: "scheduled" | "live" | "final";
  homeGoals?: number | null;
  awayGoals?: number | null;
  qualifiedTeamId?: string | null;
};

type MatchesRow = {
  id: string;
  source: string;
  manual_override: boolean;
  status: MatchStatus;
};

type WriteOperation = "insert" | "update";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseIncomingMatch(value: unknown): IncomingMatch | null {
  const payload = asRecord(value);
  const externalMatchRef = typeof payload.externalMatchRef === "string"
    ? payload.externalMatchRef.trim()
    : "";
  if (!externalMatchRef) return null;

  return {
    externalMatchRef,
    id: typeof payload.id === "string" ? payload.id.trim() : undefined,
    phase: typeof payload.phase === "string" ? payload.phase.trim() : undefined,
    groupName: typeof payload.groupName === "string" ? payload.groupName : null,
    homeTeamId: typeof payload.homeTeamId === "string"
      ? payload.homeTeamId.trim()
      : undefined,
    awayTeamId: typeof payload.awayTeamId === "string"
      ? payload.awayTeamId.trim()
      : undefined,
    kickoffAt: typeof payload.kickoffAt === "string"
      ? payload.kickoffAt
      : undefined,
    status: payload.status === "scheduled" || payload.status === "live" ||
        payload.status === "final"
      ? payload.status
      : undefined,
    homeGoals: typeof payload.homeGoals === "number" ? payload.homeGoals : null,
    awayGoals: typeof payload.awayGoals === "number" ? payload.awayGoals : null,
    qualifiedTeamId: typeof payload.qualifiedTeamId === "string"
      ? payload.qualifiedTeamId.trim()
      : null,
  };
}

// Find existing match — first by OneFootball ref, then by teams+date (to merge into Sofascore rows)
async function findExistingMatch(
  supabase: SupabaseAdminClient,
  incoming: IncomingMatch,
): Promise<MatchesRow | null> {
  // 1. Check if OneFootball already has this match
  const { data: byRef } = await supabase
    .from("matches")
    .select("id,source,manual_override,status")
    .eq("source", SOURCE)
    .eq("external_match_ref", incoming.externalMatchRef)
    .is("deleted_at", null)
    .maybeSingle<MatchesRow>();

  if (byRef) return byRef;

  // 2. Try to match existing record by teams + phase (merge into Sofascore data)
  if (incoming.homeTeamId && incoming.awayTeamId && incoming.phase) {
    const { data: byTeams } = await supabase
      .from("matches")
      .select("id,source,manual_override,status")
      .eq("home_team_id", incoming.homeTeamId)
      .eq("away_team_id", incoming.awayTeamId)
      .eq("phase", incoming.phase)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle<MatchesRow>();

    if (byTeams) return byTeams;
  }

  return null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const scrapeSecret = Deno.env.get("SCRAPE_SECRET") ?? "";
  if (!scrapeSecret) {
    return jsonResponse(
      { ok: false, error: "Missing SCRAPE_SECRET env var" },
      500,
    );
  }

  if (!isAuthorizedScrapeRequest(req.headers, scrapeSecret)) {
    return jsonResponse({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  const body = asRecord(await req.json().catch(() => ({})));
  const syncMode = parseScrapeSyncMode(body.syncMode);
  const matchesInput = Array.isArray(body.matches) ? body.matches : [];
  const parsedMatches = matchesInput
    .map(parseIncomingMatch)
    .filter((match): match is IncomingMatch => match !== null);

  let supabase: SupabaseAdminClient;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Supabase admin client error";
    return jsonResponse({ ok: false, error: message }, 500);
  }

  let updated = 0;
  let inserted = 0;
  let skippedManualOverride = 0;
  let skippedFinalCandidate = 0;
  let failed = 0;
  const errors: Array<{
    externalMatchRef: string;
    operation: "insert" | "update";
    message: string;
  }> = [];

  for (const incomingMatch of parsedMatches) {
    const existing = await findExistingMatch(supabase, incomingMatch);

    if (
      !shouldApplyIncomingMatch({
        syncMode,
        incomingStatus: incomingMatch.status,
        existingStatus: existing?.status ?? null,
      })
    ) {
      continue;
    }

    const id = existing?.id ??
      incomingMatch.id ??
      `${SOURCE}-${incomingMatch.externalMatchRef}`;

    const payload: Record<string, unknown> = {
      id,
      source: SOURCE,
      external_match_ref: incomingMatch.externalMatchRef,
    };

    if (incomingMatch.phase) payload.phase = incomingMatch.phase;
    if (incomingMatch.groupName !== undefined) {
      payload.group_name = incomingMatch.groupName;
    }
    if (incomingMatch.homeTeamId) {
      payload.home_team_id = incomingMatch.homeTeamId;
    }
    if (incomingMatch.awayTeamId) {
      payload.away_team_id = incomingMatch.awayTeamId;
    }
    if (incomingMatch.kickoffAt) payload.kickoff_at = incomingMatch.kickoffAt;
    if (incomingMatch.status) payload.status = incomingMatch.status;
    if (incomingMatch.homeGoals !== null) {
      payload.home_goals = incomingMatch.homeGoals;
    }
    if (incomingMatch.awayGoals !== null) {
      payload.away_goals = incomingMatch.awayGoals;
    }
    if (incomingMatch.qualifiedTeamId !== null) {
      payload.qualified_team_id = incomingMatch.qualifiedTeamId;
    }

    const operation: WriteOperation = existing ? "update" : "insert";
    const { error } = existing
      ? await supabase
        .from("matches")
        .update(payload)
        .eq("id", existing.id)
      : await supabase
        .from("matches")
        .insert(payload);

    if (error) {
      failed += 1;
      errors.push({
        externalMatchRef: incomingMatch.externalMatchRef,
        operation,
        message: error.message,
      });
      continue;
    }

    if (operation === "update") {
      updated += 1;
    } else {
      inserted += 1;
    }

    if (payload.status === "final" || payload.status === "live") {
      await computeAndStoreMatchPoints(supabase, {
        matchId: id,
        phase: payload.phase as string,
        homeGoals: payload.home_goals as number,
        awayGoals: payload.away_goals as number,
        qualifiedTeamId: payload.qualified_team_id as string | null,
      });
    }
  }

  const ok = failed === 0;

  return jsonResponse({
    ok,
    source: SOURCE,
    syncedAt: new Date().toISOString(),
    processed: parsedMatches.length,
    inserted,
    updated,
    skippedManualOverride,
    skippedFinalCandidate,
    failed,
    errors,
  }, ok ? 200 : 500);
});
