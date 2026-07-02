import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  PREDICTIONS_QUERY_LIMIT,
  type PredictionsRow,
  toPredictionDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleListMyPredictions(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const phase = ctx.payload.phase === undefined
      ? null
      : parsePhaseKey(ctx.payload.phase);

    let query = ctx.supabase
      .from("predictions")
      .select("*")
      .eq("user_id", ctx.me.id)
      .order("updated_at", { ascending: false })
      .limit(PREDICTIONS_QUERY_LIMIT);

    if (phase) {
      query = query.eq("phase", phase);
    }

    const { data, error } = await query;

    if (error) return handleDbError(error);

    const predictions = (data as PredictionsRow[]).map(toPredictionDTO);
    return jsonOk({ predictions });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
