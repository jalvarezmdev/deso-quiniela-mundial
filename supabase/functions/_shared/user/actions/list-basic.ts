import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonOk,
  type ProfilesRow,
  toBasicUser,
} from "../helpers/users-helpers.ts";

export async function handleListBasic(
  supabase: SupabaseAdminClient,
): Promise<Response> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return handleDbError(error);
  }

  const users = (data as ProfilesRow[]).map(toBasicUser);
  return jsonOk({ users });
}
