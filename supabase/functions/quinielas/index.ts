import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { authenticate } from "../_shared/general/auth.ts";
import {
  getSupabaseAdminClient,
  type SupabaseAdminClient,
} from "../_shared/general/supabase-client.ts";
import type {
  AdminActionContext,
  AuthenticatedActionContext,
  PublicActionContext,
} from "../_shared/quiniela/helpers/action-types.ts";
import {
  asRecord,
  corsHeaders,
  extractSessionToken,
  getEnv,
  jsonError,
  type RequestEnvelope,
  ValidationError,
} from "../_shared/quiniela/helpers/quinielas-helpers.ts";
import { handleCreateMatch } from "../_shared/quiniela/actions/create-match.ts";
import { handleCreatePhaseSubmission } from "../_shared/quiniela/actions/create-phase-submission.ts";
import { handleCreatePhaseWindowOverride } from "../_shared/quiniela/actions/create-phase-window-override.ts";
import { handleCreatePrediction } from "../_shared/quiniela/actions/create-prediction.ts";
import { handleDeleteMatch } from "../_shared/quiniela/actions/delete-match.ts";
import { handleDeletePhaseSubmission } from "../_shared/quiniela/actions/delete-phase-submission.ts";
import { handleDeletePhaseWindowOverride } from "../_shared/quiniela/actions/delete-phase-window-override.ts";
import { handleDeletePrediction } from "../_shared/quiniela/actions/delete-prediction.ts";
import { handleGetMatch } from "../_shared/quiniela/actions/get-match.ts";
import { handleGetMyPhaseSubmission } from "../_shared/quiniela/actions/get-my-phase-submission.ts";
import { handleGetMyPrediction } from "../_shared/quiniela/actions/get-my-prediction.ts";
import { handleGetPhaseWindowOverride } from "../_shared/quiniela/actions/get-phase-window-override.ts";
import { handleListLeaderboard } from "../_shared/quiniela/actions/list-leaderboard.ts";
import { handleListMatches } from "../_shared/quiniela/actions/list-matches.ts";
import { handleListMyPhaseSubmissions } from "../_shared/quiniela/actions/list-my-phase-submissions.ts";
import { handleListMyPredictions } from "../_shared/quiniela/actions/list-my-predictions.ts";
import { handleListPhaseSubmissionsAdmin } from "../_shared/quiniela/actions/list-phase-submissions-admin.ts";
import { handleListPhaseWindowOverrides } from "../_shared/quiniela/actions/list-phase-window-overrides.ts";
import { handleListPredictionsAdmin } from "../_shared/quiniela/actions/list-predictions-admin.ts";
import { handleGetScoringConfig } from "../_shared/quiniela/actions/get-scoring-config.ts";
import { handleUpdateScoringConfig } from "../_shared/quiniela/actions/update-scoring-config.ts";
import { handleUpdateMatch } from "../_shared/quiniela/actions/update-match.ts";
import { handleUpdatePhaseSubmission } from "../_shared/quiniela/actions/update-phase-submission.ts";
import { handleUpdatePhaseWindowOverride } from "../_shared/quiniela/actions/update-phase-window-override.ts";
import { handleUpdatePrediction } from "../_shared/quiniela/actions/update-prediction.ts";
import { handleListMyMatchPoints } from "../_shared/quiniela/actions/list-my-match-points.ts";

type PublicAction =
  | "get_match"
  | "list_matches"
  | "get_phase_window_override"
  | "list_phase_window_overrides"
  | "get_scoring_config";

type AuthenticatedAction =
  | "create_prediction"
  | "get_my_prediction"
  | "list_my_predictions"
  | "update_prediction"
  | "delete_prediction"
  | "create_phase_submission"
  | "get_my_phase_submission"
  | "list_my_phase_submissions"
  | "delete_phase_submission"
  | "list_leaderboard"
  | "list_my_match_points";

type AdminAction =
  | "create_match"
  | "update_match"
  | "delete_match"
  | "create_phase_window_override"
  | "update_phase_window_override"
  | "delete_phase_window_override"
  | "list_predictions_admin"
  | "update_phase_submission"
  | "list_phase_submissions_admin"
  | "update_scoring_config";

const publicActionHandlers: Record<
  PublicAction,
  (ctx: PublicActionContext) => Promise<Response>
> = {
  get_match: handleGetMatch,
  list_matches: handleListMatches,
  get_phase_window_override: handleGetPhaseWindowOverride,
  list_phase_window_overrides: handleListPhaseWindowOverrides,
  get_scoring_config: handleGetScoringConfig,
};

const authenticatedActionHandlers: Record<
  AuthenticatedAction,
  (ctx: AuthenticatedActionContext) => Promise<Response>
> = {
  create_prediction: handleCreatePrediction,
  get_my_prediction: handleGetMyPrediction,
  list_my_predictions: handleListMyPredictions,
  update_prediction: handleUpdatePrediction,
  delete_prediction: handleDeletePrediction,
  create_phase_submission: handleCreatePhaseSubmission,
  get_my_phase_submission: handleGetMyPhaseSubmission,
  list_my_phase_submissions: handleListMyPhaseSubmissions,
  delete_phase_submission: handleDeletePhaseSubmission,
  list_leaderboard: handleListLeaderboard,
  list_my_match_points: handleListMyMatchPoints,
};

const adminActionHandlers: Record<
  AdminAction,
  (ctx: AdminActionContext) => Promise<Response>
> = {
  create_match: handleCreateMatch,
  update_match: handleUpdateMatch,
  delete_match: handleDeleteMatch,
  create_phase_window_override: handleCreatePhaseWindowOverride,
  update_phase_window_override: handleUpdatePhaseWindowOverride,
  delete_phase_window_override: handleDeletePhaseWindowOverride,
  list_predictions_admin: handleListPredictionsAdmin,
  update_phase_submission: handleUpdatePhaseSubmission,
  list_phase_submissions_admin: handleListPhaseSubmissionsAdmin,
  update_scoring_config: handleUpdateScoringConfig,
};

function getActionHandler<TAction extends string, THandler>(
  handlers: Record<TAction, THandler>,
  action: string,
): THandler | null {
  if (!(action in handlers)) return null;
  return handlers[action as TAction];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const requestedHeaders = req.headers.get("access-control-request-headers");
    const requestedMethod = req.headers.get("access-control-request-method");

    const preflightHeaders: HeadersInit = {
      ...corsHeaders,
      ...(requestedHeaders
        ? { "Access-Control-Allow-Headers": requestedHeaders }
        : {}),
      ...(requestedMethod
        ? { "Access-Control-Allow-Methods": `${requestedMethod}, OPTIONS` }
        : {}),
      Vary:
        "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
    };

    return new Response("ok", {
      headers: preflightHeaders,
      status: 200,
    });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Metodo no permitido.", 405);
  }

  let body: RequestEnvelope;
  try {
    body = (await req.json()) as RequestEnvelope;
  } catch {
    return jsonError("INVALID_JSON", "Body JSON invalido.", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  let payload: Record<string, unknown>;
  try {
    payload = body.payload == null ? {} : asRecord(body.payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }
    return jsonError("VALIDATION_ERROR", "Payload invalido.", 400);
  }

  const appJwtSecret = getEnv("APP_JWT_SECRET");
  if (!appJwtSecret) {
    return jsonError(
      "SERVER_CONFIG_ERROR",
      "Falta APP_JWT_SECRET en la funcion.",
      500,
    );
  }

  let supabase: SupabaseAdminClient;
  try {
    supabase = getSupabaseAdminClient();
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Error de configuracion de Supabase.";
    return jsonError("SERVER_CONFIG_ERROR", message, 500);
  }

  const publicHandler = getActionHandler(publicActionHandlers, action);
  if (publicHandler) {
    return publicHandler({ supabase, payload });
  }

  const sessionToken = extractSessionToken(payload);
  if (!sessionToken) {
    return jsonError("MISSING_SESSION", "Debes enviar sessionToken.", 401);
  }

  const authResult = await authenticate(supabase, sessionToken, appJwtSecret);
  if ("error" in authResult) {
    return authResult.error;
  }

  const me = authResult.profile;

  const authenticatedHandler = getActionHandler(
    authenticatedActionHandlers,
    action,
  );
  if (authenticatedHandler) {
    return authenticatedHandler({ supabase, payload, me });
  }

  if (!me.is_admin) {
    return jsonError("FORBIDDEN", "No tienes permisos para esta accion.", 403);
  }

  const adminHandler = getActionHandler(adminActionHandlers, action);
  if (adminHandler) {
    return adminHandler({ supabase, payload, me });
  }

  return jsonError("UNKNOWN_ACTION", "Accion no soportada.", 400);
});
