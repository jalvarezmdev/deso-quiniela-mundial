import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type PredictionsRow,
  toPredictionDTO,
} from "../helpers/quinielas-helpers.ts";
import { parsePredictionLookup } from "../helpers/parse-prediction-inputs.ts";

export async function handleGetMyPrediction(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const lookup = parsePredictionLookup(ctx.payload);

    const { data, error } = await ctx.supabase
      .from("predictions")
      .select("*")
      .eq("user_id", ctx.me.id)
      .eq("phase", lookup.phase)
      .eq("match_id", lookup.matchId)
      .maybeSingle<PredictionsRow>();

    if (error) return handleDbError(error);
    if (!data) {
      return jsonError("NOT_FOUND", "Prediccion no encontrada.", 404);
    }

    return jsonOk({ prediction: toPredictionDTO(data) });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
