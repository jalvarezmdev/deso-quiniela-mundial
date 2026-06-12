import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseId,
} from "../helpers/quinielas-helpers.ts";

type PredictionWithNickname = {
  nickname: string;
  homeGoals: number;
  awayGoals: number;
};

export async function handleListPredictionsForMatch(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const matchId = parseId(ctx.payload.matchId, "matchId");

    const { data, error } = await ctx.supabase
      .from("predictions")
      .select("home_goals, away_goals, users(nickname)")
      .eq("match_id", matchId);

    if (error) return handleDbError(error);

    const predictions: PredictionWithNickname[] = (data as unknown as Array<{
      home_goals: number;
      away_goals: number;
      users: { nickname: string } | null;
    }>).map((row) => ({
      nickname: row.users?.nickname ?? "Sin nombre",
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
    })).sort((a, b) => a.nickname.localeCompare(b.nickname));

    return jsonOk({ predictions });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
