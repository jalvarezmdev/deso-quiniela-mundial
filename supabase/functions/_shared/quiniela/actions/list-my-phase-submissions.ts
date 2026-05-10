import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  jsonOk,
  type PhaseSubmissionsRow,
  toPhaseSubmissionDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleListMyPhaseSubmissions(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  const { data, error } = await ctx.supabase
    .from("phase_submissions")
    .select("*")
    .eq("user_id", ctx.me.id)
    .order("confirmed_at", { ascending: true });

  if (error) return handleDbError(error);

  const submissions = (data as PhaseSubmissionsRow[]).map(toPhaseSubmissionDTO);
  return jsonOk({ submissions });
}
