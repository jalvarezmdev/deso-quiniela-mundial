import {
  type MatchStatus,
  parseBoolean,
  parseId,
  parseIsoDateString,
  parseOptionalString,
  parsePhaseKey,
  parseScore,
  parseStatus,
  type PhaseKey,
  ValidationError,
} from "./quinielas-helpers.ts";

export type MatchWriteInput = {
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
};

type MatchOutcomeValidationInput = Pick<
  MatchWriteInput,
  | "phase"
  | "homeTeamId"
  | "awayTeamId"
  | "status"
  | "homeGoals"
  | "awayGoals"
  | "qualifiedTeamId"
>;

export function validateMatchOutcomeConsistency(
  input: MatchOutcomeValidationInput,
): void {
  if (input.homeTeamId === input.awayTeamId) {
    throw new ValidationError("El local y visitante no pueden ser iguales.");
  }

  const isKnockout = input.phase !== "groups";
  const hasScores = input.homeGoals != null && input.awayGoals != null;
  const hasQualifiedTeam = input.qualifiedTeamId != null;

  if (input.status === "scheduled") {
    if (input.homeGoals != null || input.awayGoals != null || hasQualifiedTeam) {
      throw new ValidationError(
        "Un partido programado no puede tener marcador ni clasificado.",
      );
    }
    return;
  }

  if (!hasScores) {
    throw new ValidationError(
      "Los partidos en vivo o finalizados deben tener marcador completo.",
    );
  }

  if (!isKnockout && hasQualifiedTeam) {
    throw new ValidationError(
      "La fase de grupos no admite equipo clasificado.",
    );
  }

  if (hasQualifiedTeam && input.qualifiedTeamId !== input.homeTeamId &&
    input.qualifiedTeamId !== input.awayTeamId) {
    throw new ValidationError(
      "El clasificado debe ser local o visitante.",
    );
  }

  if (isKnockout && input.status === "final" && !hasQualifiedTeam) {
    throw new ValidationError(
      "Los cruces finalizados deben indicar un clasificado.",
    );
  }
}

export function parseCreateMatchInput(
  payload: Record<string, unknown>,
): MatchWriteInput {
  const id = parseId(payload.id, "id");
  const phase = parsePhaseKey(payload.phase);
  const homeTeamId = parseId(payload.homeTeamId, "homeTeamId");
  const awayTeamId = parseId(payload.awayTeamId, "awayTeamId");

  if (homeTeamId === awayTeamId) {
    throw new ValidationError("El local y visitante no pueden ser iguales.");
  }

  const parsed: MatchWriteInput = {
    id,
    phase,
    groupName: parseOptionalString(payload.groupName),
    homeTeamId,
    awayTeamId,
    kickoffAt: parseIsoDateString(payload.kickoffAt),
    status: payload.status == null ? "scheduled" : parseStatus(payload.status),
    homeGoals: parseScore(payload.homeGoals),
    awayGoals: parseScore(payload.awayGoals),
    qualifiedTeamId: parseOptionalString(payload.qualifiedTeamId),
    manualOverride: parseBoolean(payload.manualOverride, false),
  };

  validateMatchOutcomeConsistency(parsed);
  return parsed;
}

export function parseUpdateMatchPatch(payload: Record<string, unknown>): {
  id: string;
  patch: Partial<MatchWriteInput>;
} {
  const id = parseId(payload.id, "id");
  const patch: Partial<MatchWriteInput> = {};

  if (payload.phase !== undefined) patch.phase = parsePhaseKey(payload.phase);
  if (payload.groupName !== undefined) {
    patch.groupName = parseOptionalString(payload.groupName);
  }
  if (payload.homeTeamId !== undefined) {
    patch.homeTeamId = parseId(payload.homeTeamId, "homeTeamId");
  }
  if (payload.awayTeamId !== undefined) {
    patch.awayTeamId = parseId(payload.awayTeamId, "awayTeamId");
  }
  if (payload.kickoffAt !== undefined) {
    patch.kickoffAt = parseIsoDateString(payload.kickoffAt);
  }
  if (payload.status !== undefined) {
    patch.status = parseStatus(payload.status);
  }
  if (payload.homeGoals !== undefined) {
    patch.homeGoals = parseScore(payload.homeGoals);
  }
  if (payload.awayGoals !== undefined) {
    patch.awayGoals = parseScore(payload.awayGoals);
  }
  if (payload.qualifiedTeamId !== undefined) {
    patch.qualifiedTeamId = parseOptionalString(payload.qualifiedTeamId);
  }
  if (payload.manualOverride !== undefined) {
    patch.manualOverride = parseBoolean(payload.manualOverride, false);
  }

  if (
    patch.homeTeamId &&
    patch.awayTeamId &&
    patch.homeTeamId === patch.awayTeamId
  ) {
    throw new ValidationError("El local y visitante no pueden ser iguales.");
  }

  if (Object.keys(patch).length === 0) {
    throw new ValidationError(
      "Debes enviar al menos un campo para actualizar.",
    );
  }

  return { id, patch };
}
