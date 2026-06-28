import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseId,
  type MatchesRow,
  type PhaseSubmissionsRow,
  type PredictionsRow,
} from "../helpers/quinielas-helpers.ts";
import { computeMatchPoints } from "../helpers/scoring.ts";

type PredictionWithNickname = {
  nickname: string;
  homeGoals: number;
  awayGoals: number;
  points: number;
};

type MatchResultRow = Pick<
  MatchesRow,
  "phase" | "home_goals" | "away_goals" | "qualified_team_id"
>;

type PredictionWithProfileRow = Pick<
  PredictionsRow,
  "user_id" | "home_goals" | "away_goals" | "predicted_qualified_team_id"
> & { profiles: { nickname: string } | null };

export async function handleListPredictionsForMatch(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const matchId = parseId(ctx.payload.matchId, "matchId");

    const { data: matchData, error: matchError } = await ctx.supabase
      .from("matches")
      .select("phase, home_goals, away_goals, qualified_team_id")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) return handleDbError(matchError);
    const match = matchData as MatchResultRow | null;
    if (!match || match.home_goals === null || match.away_goals === null) {
      return jsonError("MATCH_RESULT_NOT_AVAILABLE", "Resultado no disponible.", 404);
    }
    const homeGoals = match.home_goals;
    const awayGoals = match.away_goals;

    let requiresConfirmation = false;
    if (match.phase === "groups") {
      const { data: config, error: configError } = await ctx.supabase
        .from("site_config")
        .select("value")
        .eq("key", "scoring_mode")
        .maybeSingle();

      if (configError) return handleDbError(configError);
      requiresConfirmation = config?.value !== "per_match";
    }

    const { data: submissions, error: submissionsError } = requiresConfirmation
      ? await ctx.supabase
        .from("phase_submissions")
        .select("user_id")
        .eq("phase", match.phase)
      : { data: [], error: null };

    if (submissionsError) return handleDbError(submissionsError);
    const confirmedUserIds = new Set(
      (submissions as unknown as Array<Pick<PhaseSubmissionsRow, "user_id">>)
        .map((row) => row.user_id),
    );

    const { data, error } = await ctx.supabase
      .from("predictions")
      .select("user_id, home_goals, away_goals, predicted_qualified_team_id, profiles(nickname)")
      .eq("match_id", matchId);

    if (error) return handleDbError(error);

    const predictions: PredictionWithNickname[] = (data as unknown as PredictionWithProfileRow[]).map((row) => ({
      nickname: row.profiles?.nickname ?? "Sin nombre",
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
      points: requiresConfirmation && !confirmedUserIds.has(row.user_id)
        ? 0
        : computeMatchPoints({
          phase: match.phase,
          homeGoals,
          awayGoals,
          qualifiedTeamId: match.qualified_team_id,
          predictedHomeGoals: row.home_goals,
          predictedAwayGoals: row.away_goals,
          predictedQualifiedTeamId: row.predicted_qualified_team_id,
        }),
    })).sort((a, b) => a.nickname.localeCompare(b.nickname));

    return jsonOk({ predictions });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
