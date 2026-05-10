import bcrypt from "npm:bcryptjs@2.4.3";
import { buildSessionTokenPayload, signJwt } from "../../general/auth.ts";
import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  getEnv,
  handleDbError,
  jsonError,
  jsonOk,
  normalizeEmail,
  normalizeNickname,
  normalizePin,
  normalizeTeamId,
  PIN_REGEX,
  type ProfilesRow,
  toSessionUser,
} from "../helpers/users-helpers.ts";

export async function handleRegister({
  supabase,
  payload,
  appJwtSecret,
}: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  appJwtSecret: string;
}): Promise<Response> {
  const email = normalizeEmail(payload.email);
  const nickname = normalizeNickname(payload.nickname);
  const teamId = normalizeTeamId(payload.teamId);
  const pin = normalizePin(payload.pin);
  const secretPhrase = normalizeNickname(payload.secretPhrase).toLowerCase();

  if (!email || !nickname || !teamId || !pin) {
    return jsonError(
      "VALIDATION_ERROR",
      "Todos los campos son obligatorios.",
      400,
    );
  }

  if (!PIN_REGEX.test(pin)) {
    return jsonError(
      "INVALID_PIN",
      "El PIN debe tener 6 digitos numericos.",
      400,
    );
  }

  const expectedSecret =
    (getEnv("REGISTRATION_SECRET") || getEnv("VITE_REGISTRATION_SECRET") ||
      "esto desocupao")
      .trim()
      .toLowerCase();

  if (!secretPhrase || secretPhrase !== expectedSecret) {
    return jsonError("INVALID_SECRET_PHRASE", "Palabra secreta invalida.", 403);
  }

  const adminEmails = getEnv("ADMIN_EMAILS")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const pinHash = await bcrypt.hash(pin, 12);
  const isAdmin = adminEmails.includes(email);

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({
      id: crypto.randomUUID(),
      email,
      nickname,
      team_id: teamId,
      pin_hash: pinHash,
      is_admin: isAdmin,
      onboarding_completed: false,
      token_version: 1,
      last_login_at: new Date().toISOString(),
    })
    .select("*")
    .single<ProfilesRow>();

  if (error || !inserted) {
    return handleDbError(error);
  }

  const sessionToken = await signJwt(
    buildSessionTokenPayload(inserted),
    appJwtSecret,
  );
  return jsonOk({
    sessionToken,
    user: toSessionUser(inserted),
  });
}
