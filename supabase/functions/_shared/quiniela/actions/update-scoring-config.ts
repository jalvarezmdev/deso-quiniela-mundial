import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
} from "../helpers/quinielas-helpers.ts";

const VALID_MODES = ["phase_confirmation", "per_match"];

export async function handleUpdateScoringConfig(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const mode = ctx.payload?.scoringMode;
    if (typeof mode !== "string") {
      return jsonError("VALIDATION_ERROR", "scoringMode is required", 400);
    }

    if (!VALID_MODES.includes(mode)) {
      return jsonError(
        "VALIDATION_ERROR",
        `scoringMode must be one of: ${VALID_MODES.join(", ")}`,
        400,
      );
    }

    const { error } = await ctx.supabase
      .from("site_config")
      .upsert(
        { key: "scoring_mode", value: mode, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) return handleDbError(error);

    return jsonOk({ scoringMode: mode });
  } catch {
    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
