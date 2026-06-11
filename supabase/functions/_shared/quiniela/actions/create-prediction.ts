import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import { isMatchLocked } from "../helpers/match-lock.ts";
import { computeAndStoreMatchPoints } from "../helpers/scoring.ts";
import {
  assertPhaseEditable,
  handleDbError,
  hasPhaseSubmission,
  isValidationError,
  jsonError,
  jsonOk,
  type MatchesRow,
  type PredictionsRow,
  toPredictionDTO,
} from "../helpers/quinielas-helpers.ts";
import {
  parsePredictionWriteInput,
  validatePredictedQualifiedTeam,
} from "../helpers/parse-prediction-inputs.ts";

export async function handleCreatePrediction(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const input = parsePredictionWriteInput(ctx.payload);

    const lockedError = await assertPhaseEditable({
      supabase: ctx.supabase,
      phase: input.phase,
    });
    if (lockedError) return lockedError;

    const phaseSubmitted = await hasPhaseSubmission({
      supabase: ctx.supabase,
      userId: ctx.me.id,
      phase: input.phase,
    });

    if (phaseSubmitted instanceof Response) return phaseSubmitted;
    if (phaseSubmitted) {
      return jsonError(
        "CONFLICT",
        "La fase ya fue confirmada y no admite cambios.",
        409,
      );
    }

    const { data: match, error: matchError } = await ctx.supabase
      .from("matches")
      .select("*")
      .eq("id", input.matchId)
      .is("deleted_at", null)
      .maybeSingle<MatchesRow>();

    if (matchError) return handleDbError(matchError);
    if (!match) {
      return jsonError("NOT_FOUND", "Partido no encontrado.", 404);
    }
    if (match.phase !== input.phase) {
      return jsonError(
        "VALIDATION_ERROR",
        "La fase no coincide con el partido.",
        400,
      );
    }

    if (isMatchLocked(match, new Date())) {
      return jsonError(
        "CONFLICT",
        "No se puede modificar el pronostico: el partido esta en curso o finalizado.",
        409,
      );
    }

    validatePredictedQualifiedTeam({
      phase: input.phase,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      predictedQualifiedTeamId: input.predictedQualifiedTeamId,
    });

    const { data, error } = await ctx.supabase
      .from("predictions")
      .insert({
        user_id: ctx.me.id,
        phase: input.phase,
        match_id: input.matchId,
        home_goals: input.homeGoals,
        away_goals: input.awayGoals,
        predicted_qualified_team_id: input.predictedQualifiedTeamId,
      })
      .select("*")
      .single<PredictionsRow>();

    if (error || !data) {
      return handleDbError(error);
    }

    if (match.status === "final" || match.status === "live") {
      if (match.home_goals !== null && match.away_goals !== null) {
        await computeAndStoreMatchPoints(ctx.supabase, {
          matchId: match.id,
          phase: match.phase,
          homeGoals: match.home_goals,
          awayGoals: match.away_goals,
          qualifiedTeamId: match.qualified_team_id,
        });
      }
    }

    return jsonOk({ prediction: toPredictionDTO(data) }, 201);
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
