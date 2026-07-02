import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseId,
  parseLimit,
  parseOffset,
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
    const limit = parseLimit(ctx.payload.limit);
    const offset = parseOffset(ctx.payload.offset);

    let query = ctx.supabase
      .from("predictions")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (phase) query = query.eq("phase", phase);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query;

    if (error) return handleDbError(error);

    const predictions = (data as PredictionsRow[]).map(toPredictionDTO);
    return jsonOk({ predictions, total: count ?? 0, limit, offset });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
