import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import { handleDbError, jsonOk } from "../helpers/quinielas-helpers.ts";

type MatchPointsRow = {
  user_id: string;
  match_id: string;
  phase: string;
  points: number;
  computed_at: string;
};

type MatchPointsDTO = {
  matchId: string;
  points: number;
};

export async function handleListMyMatchPoints(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  const { data, error } = await ctx.supabase
    .from("match_points")
    .select("match_id, points")
    .eq("user_id", ctx.me.id);

  if (error) return handleDbError(error);

  const matchPoints: MatchPointsDTO[] = (data as MatchPointsRow[]).map((row) => ({
    matchId: row.match_id,
    points: row.points,
  }));

  return jsonOk({ matchPoints });
}
