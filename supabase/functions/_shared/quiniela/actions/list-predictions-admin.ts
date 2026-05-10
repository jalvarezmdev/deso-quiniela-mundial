import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseId,
  parsePhaseKey,
  type PredictionsRow,
  toPredictionDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleListPredictionsAdmin(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const phase = ctx.payload.phase === undefined
      ? null
      : parsePhaseKey(ctx.payload.phase);
    const userId = ctx.payload.userId === undefined
      ? null
      : parseId(ctx.payload.userId, "userId");

    let query = ctx.supabase
      .from("predictions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (phase) query = query.eq("phase", phase);
    if (userId) query = query.eq("user_id", userId);

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
