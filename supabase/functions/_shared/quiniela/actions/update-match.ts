import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type MatchesRow,
  toMatchDTO,
} from "../helpers/quinielas-helpers.ts";
import {
  parseUpdateMatchPatch,
  validateMatchOutcomeConsistency,
} from "../helpers/parse-inputs.ts";
import { computeAndStoreMatchPoints } from "../helpers/scoring.ts";

function toDbPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {};

  if ("phase" in patch) dbPatch.phase = patch.phase;
  if ("groupName" in patch) dbPatch.group_name = patch.groupName;
  if ("homeTeamId" in patch) dbPatch.home_team_id = patch.homeTeamId;
  if ("awayTeamId" in patch) dbPatch.away_team_id = patch.awayTeamId;
  if ("kickoffAt" in patch) dbPatch.kickoff_at = patch.kickoffAt;
  if ("status" in patch) dbPatch.status = patch.status;
  if ("homeGoals" in patch) dbPatch.home_goals = patch.homeGoals;
  if ("awayGoals" in patch) dbPatch.away_goals = patch.awayGoals;
  if ("qualifiedTeamId" in patch) {
    dbPatch.qualified_team_id = patch.qualifiedTeamId;
  }
  if ("manualOverride" in patch) dbPatch.manual_override = patch.manualOverride;

  return dbPatch;
}

export async function handleUpdateMatch(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const { id, patch } = parseUpdateMatchPatch(ctx.payload);

    const { data: currentMatch, error: currentMatchError } = await ctx.supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle<MatchesRow>();

    if (currentMatchError) {
      return handleDbError(currentMatchError);
    }

    if (!currentMatch) {
      return jsonError("NOT_FOUND", "Partido no encontrado.", 404);
    }

    validateMatchOutcomeConsistency({
      phase: "phase" in patch ? patch.phase! : currentMatch.phase,
      homeTeamId: "homeTeamId" in patch
        ? patch.homeTeamId!
        : currentMatch.home_team_id,
      awayTeamId: "awayTeamId" in patch
        ? patch.awayTeamId!
        : currentMatch.away_team_id,
      status: "status" in patch ? patch.status! : currentMatch.status,
      homeGoals: "homeGoals" in patch ? patch.homeGoals! : currentMatch.home_goals,
      awayGoals: "awayGoals" in patch ? patch.awayGoals! : currentMatch.away_goals,
      qualifiedTeamId: "qualifiedTeamId" in patch
        ? patch.qualifiedTeamId!
        : currentMatch.qualified_team_id,
    });

    const { data, error } = await ctx.supabase
      .from("matches")
      .update(toDbPatch(patch))
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle<MatchesRow>();

    if (error) {
      return handleDbError(error);
    }

    if (!data) {
      return jsonError("NOT_FOUND", "Partido no encontrado.", 404);
    }

    if (data.status === "final" || data.status === "live") {
      await computeAndStoreMatchPoints(ctx.supabase, {
        matchId: data.id,
        phase: data.phase,
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        qualifiedTeamId: data.qualified_team_id,
      });
    }

    if (data.status === "scheduled") {
      await ctx.supabase
        .from("match_points")
        .delete()
        .eq("match_id", data.id);
    }

    return jsonOk({ match: toMatchDTO(data) });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
