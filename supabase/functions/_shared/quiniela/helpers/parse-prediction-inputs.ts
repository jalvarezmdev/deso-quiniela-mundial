import {
  parseId,
  parseOptionalString,
  parsePhaseKey,
  parseScore,
  type PhaseKey,
  ValidationError,
} from "./quinielas-helpers.ts";

export type PredictionWriteInput = {
  phase: PhaseKey;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  predictedQualifiedTeamId: string | null;
};

export function validatePredictedQualifiedTeam(input: {
  phase: PhaseKey;
  homeTeamId: string;
  awayTeamId: string;
  predictedQualifiedTeamId: string | null;
}): void {
  if (!input.predictedQualifiedTeamId) return;

  if (input.phase === "groups") {
    throw new ValidationError(
      "La fase de grupos no admite equipo clasificado en el pronostico.",
    );
  }

  if (
    input.predictedQualifiedTeamId !== input.homeTeamId &&
    input.predictedQualifiedTeamId !== input.awayTeamId
  ) {
    throw new ValidationError(
      "El clasificado pronosticado debe ser local o visitante.",
    );
  }
}

export function parsePredictionWriteInput(
  payload: Record<string, unknown>,
): PredictionWriteInput {
  const phase = parsePhaseKey(payload.phase);
  const matchId = parseId(payload.matchId, "matchId");
  const homeGoals = parseScore(payload.homeGoals);
  const awayGoals = parseScore(payload.awayGoals);
  if (homeGoals == null || awayGoals == null) {
    throw new ValidationError("Debes enviar homeGoals y awayGoals.");
  }

  return {
    phase,
    matchId,
    homeGoals,
    awayGoals,
    predictedQualifiedTeamId: parseOptionalString(
      payload.predictedQualifiedTeamId,
    ),
  };
}

export function parsePredictionLookup(payload: Record<string, unknown>): {
  phase: PhaseKey;
  matchId: string;
} {
  return {
    phase: parsePhaseKey(payload.phase),
    matchId: parseId(payload.matchId, "matchId"),
  };
}
