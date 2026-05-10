import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  assertPhaseEditable,
  handleDbError,
  hasPhaseSubmission,
  isValidationError,
  jsonError,
  jsonOk,
  parsePhaseKey,
  type PhaseSubmissionsRow,
  toPhaseSubmissionDTO,
} from "../helpers/quinielas-helpers.ts";

export async function handleCreatePhaseSubmission(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const phase = parsePhaseKey(ctx.payload.phase);

    const lockedError = await assertPhaseEditable({
      supabase: ctx.supabase,
      phase,
    });
    if (lockedError) return lockedError;

    const alreadySubmitted = await hasPhaseSubmission({
      supabase: ctx.supabase,
      userId: ctx.me.id,
      phase,
    });
    if (alreadySubmitted instanceof Response) return alreadySubmitted;
    if (alreadySubmitted) {
      return jsonError("CONFLICT", "La fase ya fue confirmada.", 409);
    }

    const { count, error: countError } = await ctx.supabase
      .from("predictions")
      .select("match_id", { count: "exact", head: true })
      .eq("user_id", ctx.me.id)
      .eq("phase", phase);

    if (countError) return handleDbError(countError);
    if (!count || count < 1) {
      return jsonError(
        "VALIDATION_ERROR",
        "Debes tener al menos una prediccion para confirmar la fase.",
        400,
      );
    }

    const { data, error } = await ctx.supabase
      .from("phase_submissions")
      .insert({
        user_id: ctx.me.id,
        phase,
        confirmed_at: new Date().toISOString(),
        auto_confirmed: false,
      })
      .select("*")
      .single<PhaseSubmissionsRow>();

    if (error || !data) return handleDbError(error);

    return jsonOk({ submission: toPhaseSubmissionDTO(data) }, 201);
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
