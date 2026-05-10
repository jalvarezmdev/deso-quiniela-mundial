import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  assertPhaseEditable,
  handleDbError,
  hasPhaseSubmission,
  isValidationError,
  jsonError,
  jsonOk,
} from "../helpers/quinielas-helpers.ts";
import { parsePredictionLookup } from "../helpers/parse-prediction-inputs.ts";

export async function handleDeletePrediction(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const lookup = parsePredictionLookup(ctx.payload);

    const lockedError = await assertPhaseEditable({
      supabase: ctx.supabase,
      phase: lookup.phase,
    });
    if (lockedError) return lockedError;

    const phaseSubmitted = await hasPhaseSubmission({
      supabase: ctx.supabase,
      userId: ctx.me.id,
      phase: lookup.phase,
    });

    if (phaseSubmitted instanceof Response) return phaseSubmitted;
    if (phaseSubmitted) {
      return jsonError(
        "CONFLICT",
        "La fase ya fue confirmada y no admite cambios.",
        409,
      );
    }

    const { data, error } = await ctx.supabase
      .from("predictions")
      .delete()
      .eq("user_id", ctx.me.id)
      .eq("phase", lookup.phase)
      .eq("match_id", lookup.matchId)
      .select("user_id")
      .maybeSingle<{ user_id: string }>();

    if (error) return handleDbError(error);
    if (!data) {
      return jsonError("NOT_FOUND", "Prediccion no encontrada.", 404);
    }

    return jsonOk({ deleted: true });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
