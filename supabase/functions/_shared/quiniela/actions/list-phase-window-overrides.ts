import type { PublicActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonOk,
  type PhaseWindowOverridesRow,
  toPhaseWindowOverrideDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleListPhaseWindowOverrides(
  ctx: PublicActionContext,
): Promise<Response> {
  const { data, error } = await ctx.supabase
    .from("phase_window_overrides")
    .select("*")
    .is("deleted_at", null)
    .order("phase", { ascending: true });

  if (error) {
    return handleDbError(error);
  }

  const windowOverrides = (data as PhaseWindowOverridesRow[]).map(
    toPhaseWindowOverrideDTO,
  );
  return jsonOk({ windowOverrides });
}
