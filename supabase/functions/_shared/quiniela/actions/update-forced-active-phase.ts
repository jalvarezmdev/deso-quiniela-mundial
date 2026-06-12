import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
  PHASE_KEYS,
  type PhaseKey,
} from "../helpers/quinielas-helpers.ts";

export async function handleUpdateForcedActivePhase(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const raw = ctx.payload?.forcedActivePhase;

    // null means "let the system compute it"
    if (raw === null || raw === undefined) {
      const { error } = await ctx.supabase
        .from("site_config")
        .upsert(
          { key: "forced_active_phase", value: null, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );

      if (error) return handleDbError(error);
      return jsonOk({ forcedActivePhase: null });
    }

    if (typeof raw !== "string" || !PHASE_KEYS.includes(raw as PhaseKey)) {
      return jsonError(
        "VALIDATION_ERROR",
        `forcedActivePhase must be one of: ${PHASE_KEYS.join(", ")}, or null`,
        400,
      );
    }

    const { error } = await ctx.supabase
      .from("site_config")
      .upsert(
        { key: "forced_active_phase", value: raw, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) return handleDbError(error);

    return jsonOk({ forcedActivePhase: raw });
  } catch {
    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
