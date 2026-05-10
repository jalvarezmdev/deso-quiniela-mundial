import type { AdminActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  type MatchesRow,
  toMatchDTO,
} from "../helpers/quinielas-helpers.ts";
import { parseCreateMatchInput } from "../helpers/parse-inputs.ts";

export async function handleCreateMatch(
  ctx: AdminActionContext,
): Promise<Response> {
  try {
    const input = parseCreateMatchInput(ctx.payload);

    const { data, error } = await ctx.supabase
      .from("matches")
      .insert({
        id: input.id,
        phase: input.phase,
        group_name: input.groupName,
        home_team_id: input.homeTeamId,
        away_team_id: input.awayTeamId,
        kickoff_at: input.kickoffAt,
        status: input.status,
        home_goals: input.homeGoals,
        away_goals: input.awayGoals,
        qualified_team_id: input.qualifiedTeamId,
        manual_override: input.manualOverride,
      })
      .select("*")
      .single<MatchesRow>();

    if (error || !data) {
      return handleDbError(error);
    }

    return jsonOk({ match: toMatchDTO(data) }, 201);
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
