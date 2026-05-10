import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import {
  handleDbError,
  jsonError,
  jsonOk,
  normalizeNickname,
  type ProfilesRow,
} from "../helpers/users-helpers.ts";

export async function handleAdminSoftDelete({
  supabase,
  payload,
  meId,
}: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  meId: string;
}): Promise<Response> {
  const userId = normalizeNickname(payload.userId);

  if (!userId) {
    return jsonError("VALIDATION_ERROR", "userId es obligatorio.", 400);
  }

  if (userId === meId) {
    return jsonError(
      "CANNOT_DELETE_SELF",
      "No puedes eliminar tu propio usuario admin.",
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

  const { error: deleteError } = await supabase
    .from("profiles")
    .update({
      deleted_at: new Date().toISOString(),
      token_version: target.token_version + 1,
    })
    .eq("id", target.id)
    .is("deleted_at", null);

  if (deleteError) {
    return handleDbError(deleteError);
  }

  return jsonOk({ userId: target.id });
}
