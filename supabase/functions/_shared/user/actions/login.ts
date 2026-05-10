import bcrypt from "npm:bcryptjs@2.4.3";
import { buildSessionTokenPayload, signJwt } from "../../general/auth.ts";
import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
  normalizeEmail,
  normalizePin,
  PIN_REGEX,
  type ProfilesRow,
  toSessionUser,
} from "../helpers/users-helpers.ts";

export async function handleLogin({
  supabase,
  payload,
  appJwtSecret,
}: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  appJwtSecret: string;
}): Promise<Response> {
  const email = normalizeEmail(payload.email);
  const pin = normalizePin(payload.pin);

  if (!email || !pin) {
    return jsonError("VALIDATION_ERROR", "Correo y PIN son obligatorios.", 400);
  }

  if (!PIN_REGEX.test(pin)) {
    return jsonError("INVALID_CREDENTIALS", "Credenciales invalidas.", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle<ProfilesRow>();

  if (error) {
    return handleDbError(error);
  }

  if (!profile) {
    return jsonError("INVALID_CREDENTIALS", "Credenciales invalidas.", 401);
  }

  const matched = await bcrypt.compare(pin, profile.pin_hash);
  if (!matched) {
    return jsonError("INVALID_CREDENTIALS", "Credenciales invalidas.", 401);
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.id)
    .select("*")
    .single<ProfilesRow>();

  if (updateError || !updated) {
    return handleDbError(updateError);
  }

  const sessionToken = await signJwt(
    buildSessionTokenPayload(updated),
    appJwtSecret,
  );
  return jsonOk({
    sessionToken,
    user: toSessionUser(updated),
  });
}
