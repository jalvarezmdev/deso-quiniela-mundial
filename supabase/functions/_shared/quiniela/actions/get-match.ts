import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type MatchesRow,
  parseId,
  toMatchDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleGetMatch(
  ctx: PublicActionContext,
): Promise<Response> {
  try {
    const id = parseId(ctx.payload.id, "id");

    const { data, error } = await ctx.supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle<MatchesRow>();

    if (error) {
      return handleDbError(error);
    }

    if (!data) {
      return jsonError("NOT_FOUND", "Partido no encontrado.", 404);
    }

    return jsonOk({ match: toMatchDTO(data) });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
