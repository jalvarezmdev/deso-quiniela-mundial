import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  type PhaseWindowOverridesRow,
  toPhaseWindowOverrideDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleDeletePhaseWindowOverride(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const phase = parsePhaseKey(ctx.payload.phase);

    const { data, error } = await ctx.supabase
      .from("phase_window_overrides")
      .update({ deleted_at: new Date().toISOString() })
      .eq("phase", phase)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle<PhaseWindowOverridesRow>();

    if (error) {
      return handleDbError(error);
    }

    if (!data) {
      return jsonError("NOT_FOUND", "Ventana de fase no encontrada.", 404);
    }

    return jsonOk({ windowOverride: toPhaseWindowOverrideDTO(data) });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
