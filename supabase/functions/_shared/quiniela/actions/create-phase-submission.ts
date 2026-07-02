import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  hasPhaseSubmission,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  PREDICTIONS_QUERY_LIMIT,
  type PhaseSubmissionsRow,
  toPhaseSubmissionDTO,
} from "../helpers/quinielas-helpers.ts";
import {
  getMissingFixtureCount,
  getMissingPredictionMatchIds,
} from "../helpers/phase-submission-completion.ts";

export async function handleCreatePhaseSubmission(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const phase = parsePhaseKey(ctx.payload.phase);

    const alreadySubmitted = await hasPhaseSubmission({
      supabase: ctx.supabase,
      userId: ctx.me.id,
      phase,
    });
    if (alreadySubmitted instanceof Response) return alreadySubmitted;
    if (alreadySubmitted) {
      return jsonError("CONFLICT", "La fase ya fue confirmada.", 409);
    }

    const { data: matches, error: matchesError } = await ctx.supabase
      .from("matches")
      .select("id, kickoff_at, status")
      .eq("phase", phase)
      .is("deleted_at", null);

    if (matchesError) return handleDbError(matchesError);

    const matchRows = (matches as { id: string; kickoff_at: string; status: string }[] | null) ??
      [];
    const matchKickoffAts = matchRows.map((match) => match.kickoff_at);

    if (matchRows.length === 0) {
      return jsonError(
        "VALIDATION_ERROR",
        "No hay partidos disponibles para confirmar esta fase.",
        400,
      );
    }

    const missingFixtureCount = getMissingFixtureCount(phase, matchKickoffAts);
    if (missingFixtureCount > 0) {
      return jsonError(
        "VALIDATION_ERROR",
        `Debes esperar a que todos los cruces de la fase esten definidos antes de confirmar. Faltan ${missingFixtureCount}.`,
        400,
      );
    }

    const scheduledMatchIds = matchRows
      .filter((match) => match.status === "scheduled")
      .map((match) => match.id);

    if (scheduledMatchIds.length === 0) {
      return jsonError(
        "VALIDATION_ERROR",
        "No hay partidos programados para confirmar esta fase.",
        400,
      );
    }

    const { data: predictions, error: predictionsError } = await ctx.supabase
      .from("predictions")
      .select("match_id")
      .eq("user_id", ctx.me.id)
      .eq("phase", phase)
      .limit(PREDICTIONS_QUERY_LIMIT);

    if (predictionsError) return handleDbError(predictionsError);

    const predictionMatchIds =
      (predictions as { match_id: string }[] | null)?.map((prediction) =>
        prediction.match_id
      ) ?? [];
    const missingPredictionMatchIds = getMissingPredictionMatchIds({
      matchIds: scheduledMatchIds,
      predictionMatchIds,
    });

    if (missingPredictionMatchIds.length > 0) {
      return jsonError(
        "VALIDATION_ERROR",
        `Debes completar todos los pronosticos de la fase antes de confirmar. Faltan ${missingPredictionMatchIds.length}.`,
        400,
      );
    }

    const { data, error } = await ctx.supabase
      .from("phase_submissions")
      .insert({
        user_id: ctx.me.id,
        phase,
        confirmed_at: new Date().toISOString(),
        auto_confirmed: false,
      })
      .select("*")
      .single<PhaseSubmissionsRow>();

    if (error || !data) return handleDbError(error);

    return jsonOk({ submission: toPhaseSubmissionDTO(data) }, 201);
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
