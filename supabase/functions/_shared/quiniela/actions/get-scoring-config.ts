import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
} from "../helpers/quinielas-helpers.ts";

export async function handleGetScoringConfig(
  ctx: PublicActionContext,
): Promise<Response> {
  try {
    const { data, error } = await ctx.supabase
      .from("site_config")
      .select("value")
      .eq("key", "scoring_mode")
      .maybeSingle();

    if (error) return handleDbError(error);

    const mode = data?.value ?? "phase_confirmation";
    return jsonOk({ scoringMode: mode });
  } catch {
    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
