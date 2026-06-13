import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
} from "../helpers/quinielas-helpers.ts";

export async function handleGetForcedActivePhase(
  ctx: PublicActionContext,
): Promise<Response> {
  try {
    const { data, error } = await ctx.supabase
      .from("site_config")
      .select("value")
      .eq("key", "forced_active_phase")
      .maybeSingle();

    if (error) return handleDbError(error);

    const value = data?.value;
    if (value === null || value === undefined || value === "null") {
      return jsonOk({ forcedActivePhase: null });
    }

    return jsonOk({ forcedActivePhase: value });
  } catch {
    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
