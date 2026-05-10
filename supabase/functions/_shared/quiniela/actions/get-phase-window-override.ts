import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  type PhaseWindowOverridesRow,
  toPhaseWindowOverrideDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleGetPhaseWindowOverride(
  ctx: PublicActionContext,
): Promise<Response> {
  try {
    const phase = parsePhaseKey(ctx.payload.phase);

    const { data, error } = await ctx.supabase
      .from("phase_window_overrides")
      .select("*")
      .eq("phase", phase)
      .is("deleted_at", null)
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
