import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  getSupabaseAdminClient,
  type SupabaseAdminClient,
} from "../_shared/general/supabase-client.ts";
import { computeAndStoreMatchPoints } from "../_shared/quiniela/helpers/scoring.ts";

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
  manual_override: boolean;
};

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

async function findExistingByExternalRef(
  supabase: SupabaseAdminClient,
  externalMatchRef: string,
): Promise<MatchesRow | null> {
  const { data } = await supabase
    .from("matches")
    .select("id,manual_override")
    .eq("source", "sofascore")
    .eq("external_match_ref", externalMatchRef)
    .is("deleted_at", null)
    .maybeSingle<MatchesRow>();

  return data ?? null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
      { headers: { "content-type": "application/json" }, status: 405 },
    );
  }

  const body = asRecord(await req.json().catch(() => ({})));
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
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }

  let updated = 0;
  let inserted = 0;
  let skippedManualOverride = 0;

  for (const incomingMatch of parsedMatches) {
    const existing = await findExistingByExternalRef(
      supabase,
      incomingMatch.externalMatchRef,
    );

    if (existing?.manual_override) {
      skippedManualOverride += 1;
      continue;
    }

    const id = existing?.id ??
      incomingMatch.id ??
      `sofascore-${incomingMatch.externalMatchRef}`;

    const payload: Record<string, unknown> = {
      id,
      source: "sofascore",
      external_match_ref: incomingMatch.externalMatchRef,
    };

    if (incomingMatch.phase) payload.phase = incomingMatch.phase;
    if (incomingMatch.groupName !== undefined) {
      payload.group_name = incomingMatch.groupName;
    }
    if (incomingMatch.homeTeamId) payload.home_team_id = incomingMatch.homeTeamId;
    if (incomingMatch.awayTeamId) payload.away_team_id = incomingMatch.awayTeamId;
    if (incomingMatch.kickoffAt) payload.kickoff_at = incomingMatch.kickoffAt;
    if (incomingMatch.status) payload.status = incomingMatch.status;
    if (incomingMatch.homeGoals !== null) payload.home_goals = incomingMatch.homeGoals;
    if (incomingMatch.awayGoals !== null) payload.away_goals = incomingMatch.awayGoals;
    if (incomingMatch.qualifiedTeamId !== null) {
      payload.qualified_team_id = incomingMatch.qualifiedTeamId;
    }

    if (existing) {
      const { error } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", existing.id);

      if (error) continue;
      updated += 1;

      if (payload.status === "final" || payload.status === "live") {
        await computeAndStoreMatchPoints(supabase, {
          matchId: id,
          phase: payload.phase as string,
          homeGoals: payload.home_goals as number,
          awayGoals: payload.away_goals as number,
          qualifiedTeamId: payload.qualified_team_id as string | null,
        });
      }

      continue;
    }

    const { error } = await supabase
      .from("matches")
      .insert(payload);

    if (error) continue;
    inserted += 1;

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

  return new Response(JSON.stringify({
    ok: true,
    source: "sofascore",
    syncedAt: new Date().toISOString(),
    processed: parsedMatches.length,
    inserted,
    updated,
    skippedManualOverride,
  }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
});
