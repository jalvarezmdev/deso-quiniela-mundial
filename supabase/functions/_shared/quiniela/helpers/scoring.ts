// supabase/functions/_shared/quiniela/helpers/scoring.ts

type ScoringInput = {
  phase: string;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId: string | null;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  predictedQualifiedTeamId: string | null;
};

/**
 * Compute points for a single match prediction.
 * - Exact score: 3 points
 * - Group phase result sign match: 1 point
 * - Knockout qualified team match: 1 point
 * - Wrong: 0 points
 */
export function computeMatchPoints(input: ScoringInput): number {
  // Exact score match: 3 points
  if (
    input.homeGoals === input.predictedHomeGoals &&
    input.awayGoals === input.predictedAwayGoals
  ) {
    return 3;
  }

  // Group phase: result sign match = 1 point
  if (input.phase === "groups") {
    const actualSign = Math.sign(input.homeGoals - input.awayGoals);
    const predictedSign = Math.sign(
      input.predictedHomeGoals - input.predictedAwayGoals
    );
    return actualSign === predictedSign ? 1 : 0;
  }

  // Knockout phase: qualified team match = 1 point
  return input.qualifiedTeamId === input.predictedQualifiedTeamId ? 1 : 0;
}

/**
 * Result sign helper: 1 (home win), 0 (draw), -1 (away win)
 */
export function resultSign(homeGoals: number, awayGoals: number): 1 | 0 | -1 {
  return Math.sign(homeGoals - awayGoals) as 1 | 0 | -1;
}

/**
 * Fetch scoring mode, compute points for all predictions, upsert into match_points.
 */
export async function computeAndStoreMatchPoints(
  supabase: any,
  match: { matchId: string; phase: string; homeGoals: number | null; awayGoals: number | null; qualifiedTeamId: string | null }
): Promise<void> {
  // Check scoring mode
  const { data: config } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "scoring_mode")
    .maybeSingle();

  const mode = config?.value ?? "phase_confirmation";
  if (mode !== "per_match") return;

  // Need both scores to compute
  if (match.homeGoals === null || match.awayGoals === null) return;
  const homeGoals = match.homeGoals;
  const awayGoals = match.awayGoals;

  // Fetch all predictions for this match
  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id, home_goals, away_goals, predicted_qualified_team_id")
    .eq("match_id", match.matchId);

  if (!predictions?.length) return;

  // Compute and upsert points
  const rows = predictions.map((pred: any) => ({
    user_id: pred.user_id,
    match_id: match.matchId,
    phase: match.phase,
    points: computeMatchPoints({
      phase: match.phase,
      homeGoals,
      awayGoals,
      qualifiedTeamId: match.qualifiedTeamId,
      predictedHomeGoals: pred.home_goals,
      predictedAwayGoals: pred.away_goals,
      predictedQualifiedTeamId: pred.predicted_qualified_team_id,
    }),
    computed_at: new Date().toISOString(),
  }));

  await supabase
    .from("match_points")
    .upsert(rows, { onConflict: "user_id,match_id" });
}
