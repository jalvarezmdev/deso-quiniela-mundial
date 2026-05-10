import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonOk,
  type ProfilesRow,
  toAdminUser,
} from "../helpers/users-helpers.ts";

export async function handleListAdmin(
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

  const users = (data as ProfilesRow[]).map(toAdminUser);
  return jsonOk({ users });
}
