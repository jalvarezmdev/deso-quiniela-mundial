import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { getEnv } from "../user/helpers/users-helpers.ts";

let adminClient: ReturnType<typeof createClient> | null = null;

export type SupabaseAdminClient = ReturnType<typeof createClient>;

export function getSupabaseAdminClient(): SupabaseAdminClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey);
  return adminClient;
}
