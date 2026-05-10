import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  assertPhaseEditable,
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
} from "../helpers/quinielas-helpers.ts";
import { parsePhaseSubmissionLookup } from "../helpers/parse-submission-inputs.ts";

export async function handleDeletePhaseSubmission(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const lookup = parsePhaseSubmissionLookup(ctx.payload);

    const targetUserId = ctx.me.is_admin && lookup.userId
      ? lookup.userId
      : ctx.me.id;

    if (!ctx.me.is_admin && lookup.userId && lookup.userId !== ctx.me.id) {
      return jsonError(
        "FORBIDDEN",
        "No tienes permisos para esta accion.",
        403,
      );
    }

    if (!ctx.me.is_admin) {
      const lockedError = await assertPhaseEditable({
        supabase: ctx.supabase,
        phase: lookup.phase,
      });
      if (lockedError) return lockedError;
    }

    const { data, error } = await ctx.supabase
      .from("phase_submissions")
      .delete()
      .eq("user_id", targetUserId)
      .eq("phase", lookup.phase)
      .select("user_id")
      .maybeSingle<{ user_id: string }>();

    if (error) return handleDbError(error);
    if (!data) {
      return jsonError("NOT_FOUND", "Confirmacion de fase no encontrada.", 404);
    }

    return jsonOk({ deleted: true });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
