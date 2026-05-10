import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseIsoDateString,
  parsePhaseKey,
  type PhaseWindowOverridesRow,
  toPhaseWindowOverrideDTO,
  ValidationError,
} from "../helpers/quinielas-helpers.ts";

function parseWindowPatch(payload: Record<string, unknown>): {
  phase: ReturnType<typeof parsePhaseKey>;
  opensAt: string;
  closesAt: string;
} {
  const phase = parsePhaseKey(payload.phase);
  const opensAt = parseIsoDateString(payload.opensAt);
  const closesAt = parseIsoDateString(payload.closesAt);

  if (new Date(opensAt).getTime() >= new Date(closesAt).getTime()) {
    throw new ValidationError("opensAt debe ser menor que closesAt.");
  }

  return { phase, opensAt, closesAt };
}

export async function handleUpdatePhaseWindowOverride(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const input = parseWindowPatch(ctx.payload);

    const { data, error } = await ctx.supabase
      .from("phase_window_overrides")
      .update({
        opens_at: input.opensAt,
        closes_at: input.closesAt,
      })
      .eq("phase", input.phase)
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
