import bcrypt from "npm:bcryptjs@2.4.3";
import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
  normalizeNickname,
  normalizePin,
  PIN_REGEX,
  type ProfilesRow,
} from "../helpers/users-helpers.ts";

export async function handleAdminResetPin({
  supabase,
  payload,
}: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
}): Promise<Response> {
  const userId = normalizeNickname(payload.userId);
  const newPin = normalizePin(payload.newPin);

  if (!userId || !newPin) {
    return jsonError(
      "VALIDATION_ERROR",
      "userId y newPin son obligatorios.",
      400,
    );
  }

  if (!PIN_REGEX.test(newPin)) {
    return jsonError(
      "INVALID_PIN",
      "El nuevo PIN debe tener 6 digitos numericos.",
      400,
    );
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle<ProfilesRow>();

  if (targetError) {
    return handleDbError(targetError);
  }

  if (!target) {
    return jsonError("USER_NOT_FOUND", "Usuario no encontrado.", 404);
  }

  const pinHash = await bcrypt.hash(newPin, 12);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      pin_hash: pinHash,
      token_version: target.token_version + 1,
    })
    .eq("id", target.id)
    .is("deleted_at", null);

  if (updateError) {
    return handleDbError(updateError);
  }

  return jsonOk({ userId: target.id });
}
