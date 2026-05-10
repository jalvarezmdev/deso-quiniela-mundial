import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type MatchesRow,
  parseIsoDateString,
  parseLimit,
  parsePhaseKey,
  parseStatus,
  toMatchDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleListMatches(
  ctx: PublicActionContext,
): Promise<Response> {
  try {
    const phase = ctx.payload.phase === undefined
      ? null
      : parsePhaseKey(ctx.payload.phase);
    const status = ctx.payload.status === undefined
      ? null
      : parseStatus(ctx.payload.status);
    const dateFrom = ctx.payload.dateFrom === undefined
      ? null
      : parseIsoDateString(ctx.payload.dateFrom);
    const dateTo = ctx.payload.dateTo === undefined
      ? null
      : parseIsoDateString(ctx.payload.dateTo);
    const limit = parseLimit(ctx.payload.limit, 100, 500);

    let query = ctx.supabase
      .from("matches")
      .select("*")
      .is("deleted_at", null)
      .order("kickoff_at", { ascending: true })
      .limit(limit);

    if (phase) query = query.eq("phase", phase);
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("kickoff_at", dateFrom);
    if (dateTo) query = query.lte("kickoff_at", dateTo);

    const { data, error } = await query;

    if (error) {
      return handleDbError(error);
    }

    const matches = (data as MatchesRow[]).map(toMatchDTO);
    return jsonOk({ matches });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
