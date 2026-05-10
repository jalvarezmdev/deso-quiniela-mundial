import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type PhaseSubmissionsRow,
  toPhaseSubmissionDTO,
} from "../helpers/quinielas-helpers.ts";
import { parsePhaseSubmissionUpdate } from "../helpers/parse-submission-inputs.ts";

export async function handleUpdatePhaseSubmission(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const { userId, phase, patch } = parsePhaseSubmissionUpdate(ctx.payload);

    const dbPatch: Record<string, unknown> = {};
    if (patch.confirmedAt !== undefined) {
      dbPatch.confirmed_at = patch.confirmedAt;
    }
    if (patch.autoConfirmed !== undefined) {
      dbPatch.auto_confirmed = patch.autoConfirmed;
    }

    const { data, error } = await ctx.supabase
      .from("phase_submissions")
      .update(dbPatch)
      .eq("user_id", userId)
      .eq("phase", phase)
      .select("*")
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
