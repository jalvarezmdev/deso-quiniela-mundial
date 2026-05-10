/// <reference lib="deno.ns" />

import { corsHeaders as supabaseCorsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import type { SupabaseAdminClient } from "../../general/supabase-client.ts";

export const PHASE_KEYS = [
  "groups",
  "roundOf16",
  "roundOf8",
  "roundOf4",
  "semifinals",
  "final",
] as const;

export const MATCH_STATUSES = ["scheduled", "live", "final"] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type RequestEnvelope = {
  action?: string;
  payload?: Record<string, unknown>;
};

export type MatchesRow = {
  id: string;
  phase: PhaseKey;
  group_name: string | null;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string;
  status: MatchStatus;
  home_goals: number | null;
  away_goals: number | null;
  qualified_team_id: string | null;
  manual_override: boolean;
  source: string;
  external_match_ref: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export type TeamsRow = {
  id: string;
  name: string;
  flag: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PredictionsRow = {
  user_id: string;
  phase: PhaseKey;
  match_id: string;
  home_goals: number;
  away_goals: number;
  predicted_qualified_team_id: string | null;
  updated_at: string;
};

export type PhaseSubmissionsRow = {
  user_id: string;
  phase: PhaseKey;
  confirmed_at: string;
  auto_confirmed: boolean;
};

export type PhaseWindowOverridesRow = {
  phase: PhaseKey;
  opens_at: string;
  closes_at: string;
  deleted_at: string | null;
};

export type MatchDTO = {
  id: string;
  phase: PhaseKey;
  groupName: string | null;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId: string | null;
  manualOverride: boolean;
  source: string;
  externalMatchRef: string | null;
  updatedAt: string;
};

export type TeamDTO = {
  id: string;
  name: string;
  flag: string;
};

export type PredictionDTO = {
  userId: string;
  phase: PhaseKey;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  predictedQualifiedTeamId: string | null;
  updatedAt: string;
};

export type PhaseSubmissionDTO = {
  userId: string;
  phase: PhaseKey;
  confirmedAt: string;
  autoConfirmed: boolean;
};

export type PhaseWindowOverrideDTO = {
  phase: PhaseKey;
  opensAt: string;
  closesAt: string;
};

export type ProfilesRow = {
  id: string;
  email: string;
  nickname: string;
  team_id: string;
  pin_hash: string;
  is_admin: boolean;
  onboarding_completed: boolean;
  token_version: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const corsHeaders = { ...supabaseCorsHeaders };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function extractSessionToken(payload: Record<string, unknown>): string {
  if (typeof payload.sessionToken !== "string") return "";
  return payload.sessionToken.trim();
}

export function getEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

export function parseId(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`El campo ${field} es obligatorio.`);
  }
  return value.trim();
}

export function parseOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("Valor invalido.");
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function parsePhaseKey(value: unknown): PhaseKey {
  if (typeof value !== "string") {
    throw new ValidationError("Fase invalida.");
  }

  if (!PHASE_KEYS.includes(value as PhaseKey)) {
    throw new ValidationError("Fase invalida.");
  }

  return value as PhaseKey;
}

export function parseStatus(value: unknown): MatchStatus {
  if (typeof value !== "string") {
    throw new ValidationError("Estado invalido.");
  }

  if (!MATCH_STATUSES.includes(value as MatchStatus)) {
    throw new ValidationError("Estado invalido.");
  }

  return value as MatchStatus;
}

export function parseScore(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError("Marcador invalido.");
  }
  return value;
}

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  throw new ValidationError("Valor booleano invalido.");
}

export function parseIsoDateString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Fecha invalida.");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("Fecha invalida.");
  }

  return parsed.toISOString();
}

export function parseLimit(
  value: unknown,
  defaultValue = 100,
  max = 500,
): number {
  if (value == null) return defaultValue;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new ValidationError("Limite invalido.");
  }
  return Math.min(value, max);
}

export function toMatchDTO(row: MatchesRow): MatchDTO {
  return {
    id: row.id,
    phase: row.phase,
    groupName: row.group_name,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    kickoffAt: row.kickoff_at,
    status: row.status,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    qualifiedTeamId: row.qualified_team_id,
    manualOverride: row.manual_override,
    source: row.source,
    externalMatchRef: row.external_match_ref,
    updatedAt: row.updated_at,
  };
}

export function toTeamDTO(row: TeamsRow): TeamDTO {
  return {
    id: row.id,
    name: row.name,
    flag: row.flag,
  };
}

export function toPredictionDTO(row: PredictionsRow): PredictionDTO {
  return {
    userId: row.user_id,
    phase: row.phase,
    matchId: row.match_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    predictedQualifiedTeamId: row.predicted_qualified_team_id,
    updatedAt: row.updated_at,
  };
}

export function toPhaseSubmissionDTO(
  row: PhaseSubmissionsRow,
): PhaseSubmissionDTO {
  return {
    userId: row.user_id,
    phase: row.phase,
    confirmedAt: row.confirmed_at,
    autoConfirmed: row.auto_confirmed,
  };
}

export function toPhaseWindowOverrideDTO(
  row: PhaseWindowOverridesRow,
): PhaseWindowOverrideDTO {
  return {
    phase: row.phase,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
  };
}

export function handleDbError(
  err: { code?: string; message?: string } | null,
): Response {
  if (!err) {
    return jsonError("DB_ERROR", "Error de base de datos.", 500);
  }

  if (err.code === "23505") {
    return jsonError("CONFLICT", "Registro duplicado.", 409);
  }

  return jsonError("DB_ERROR", err.message ?? "Error de base de datos.", 500);
}

export type WindowComputationInput = {
  overrideCloseAt: string | null;
  earliestKickoffAt: string | null;
};

export function computeEffectiveCloseAt(
  input: WindowComputationInput,
): string | null {
  return input.overrideCloseAt ?? input.earliestKickoffAt;
}

export type OverrideWindow = {
  opensAt: string;
  closesAt: string;
};

export type PhaseWindowResult = {
  opensAt: string | null;
  closeAt: string | null;
  locked: boolean;
};

export function computePhaseWindow({
  override,
  earliestKickoffAt,
  nowIso,
}: {
  override: OverrideWindow | null;
  earliestKickoffAt: string | null;
  nowIso: string;
}): PhaseWindowResult {
  const closeAt = computeEffectiveCloseAt({
    overrideCloseAt: override?.closesAt ?? null,
    earliestKickoffAt,
  });

  const opensAt = override?.opensAt ?? earliestKickoffAt;
  if (!closeAt) {
    return { opensAt, closeAt: null, locked: false };
  }

  const locked = new Date(nowIso).getTime() >= new Date(closeAt).getTime();
  return { opensAt, closeAt, locked };
}

export async function getPhaseWindowState({
  supabase,
  phase,
  now,
}: {
  supabase: SupabaseAdminClient;
  phase: PhaseKey;
  now?: Date;
}): Promise<PhaseWindowResult | Response> {
  const { data: overrideRow, error: overrideError } = await supabase
    .from("phase_window_overrides")
    .select("phase, opens_at, closes_at, deleted_at")
    .eq("phase", phase)
    .maybeSingle<PhaseWindowOverridesRow>();

  if (overrideError) {
    return handleDbError(overrideError);
  }

  const effectiveOverride = overrideRow && !overrideRow.deleted_at
    ? {
      opensAt: overrideRow.opens_at,
      closesAt: overrideRow.closes_at,
    }
    : null;

  const { data: kickoffRows, error: kickoffError } = await supabase
    .from("matches")
    .select("kickoff_at")
    .eq("phase", phase)
    .is("deleted_at", null)
    .order("kickoff_at", { ascending: true })
    .limit(1);

  if (kickoffError) {
    return handleDbError(kickoffError);
  }

  const earliestKickoffAt = kickoffRows && kickoffRows.length > 0
    ? String((kickoffRows[0] as { kickoff_at: string }).kickoff_at)
    : null;

  return computePhaseWindow({
    override: effectiveOverride,
    earliestKickoffAt,
    nowIso: (now ?? new Date()).toISOString(),
  });
}

export async function assertPhaseEditable({
  supabase,
  phase,
}: {
  supabase: SupabaseAdminClient;
  phase: PhaseKey;
}): Promise<Response | null> {
  const windowState = await getPhaseWindowState({ supabase, phase });

  if (windowState instanceof Response) {
    return windowState;
  }

  if (windowState.locked) {
    return jsonError("PHASE_LOCKED", "La fase esta bloqueada.", 409);
  }

  return null;
}

export async function hasPhaseSubmission({
  supabase,
  userId,
  phase,
}: {
  supabase: SupabaseAdminClient;
  userId: string;
  phase: PhaseKey;
}): Promise<boolean | Response> {
  const { data, error } = await supabase
    .from("phase_submissions")
    .select("user_id")
    .eq("user_id", userId)
    .eq("phase", phase)
    .maybeSingle<{ user_id: string }>();

  if (error) {
    return handleDbError(error);
  }

  return Boolean(data);
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Payload invalido.");
  }
  return value as Record<string, unknown>;
}
