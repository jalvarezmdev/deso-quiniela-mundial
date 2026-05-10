import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  type PhaseSubmissionsRow,
  toPhaseSubmissionDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleGetMyPhaseSubmission(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const phase = parsePhaseKey(ctx.payload.phase);

    const { data, error } = await ctx.supabase
      .from("phase_submissions")
      .select("*")
      .eq("user_id", ctx.me.id)
      .eq("phase", phase)
      .maybeSingle<PhaseSubmissionsRow>();

    if (error) return handleDbError(error);
    if (!data) {
      return jsonError("NOT_FOUND", "Confirmacion de fase no encontrada.", 404);
    }

    return jsonOk({ submission: toPhaseSubmissionDTO(data) });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
