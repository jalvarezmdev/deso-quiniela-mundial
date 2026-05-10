import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonOk,
  normalizeNickname,
  normalizeTeamId,
  type ProfilesRow,
  toSessionUser,
} from "../helpers/users-helpers.ts";

export async function handleUpdateMe({
  supabase,
  payload,
  me,
}: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  me: ProfilesRow;
}): Promise<Response> {
  const nickname = normalizeNickname(payload.nickname);
  const teamId = normalizeTeamId(payload.teamId);
  const onboardingCompleted = payload.onboardingCompleted;

  const updates: Record<string, unknown> = {};

  if (nickname) updates.nickname = nickname;
  if (teamId) updates.team_id = teamId;
  if (typeof onboardingCompleted === "boolean") {
    updates.onboarding_completed = onboardingCompleted;
  }

  if (Object.keys(updates).length === 0) {
    return jsonOk({ user: toSessionUser(me) });
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", me.id)
    .is("deleted_at", null)
    .select("*")
    .single<ProfilesRow>();

  if (error || !updated) {
    return handleDbError(error);
  }

  return jsonOk({ user: toSessionUser(updated) });
}
