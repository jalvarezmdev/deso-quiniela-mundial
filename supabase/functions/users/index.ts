import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { authenticate } from "../_shared/general/auth.ts";
import {
  getSupabaseAdminClient,
  type SupabaseAdminClient,
} from "../_shared/general/supabase-client.ts";
import {
  corsHeaders,
  extractSessionToken,
  getEnv,
  jsonError,
  type ProfilesRow,
  type RequestEnvelope,
} from "../_shared/user/helpers/users-helpers.ts";
import { handleAdminResetPin } from "../_shared/user/actions/admin-reset-pin.ts";
import { handleAdminSoftDelete } from "../_shared/user/actions/admin-soft-delete.ts";
import { handleListAdmin } from "../_shared/user/actions/list-admin.ts";
import { handleListBasic } from "../_shared/user/actions/list-basic.ts";
import { handleLogin } from "../_shared/user/actions/login.ts";
import { handleMe } from "../_shared/user/actions/me.ts";
import { handleRegister } from "../_shared/user/actions/register.ts";
import { handleUpdateMe } from "../_shared/user/actions/update-me.ts";

type PublicAction = "register" | "login";
type AuthenticatedAction = "me" | "update_me" | "list_basic";
type AdminAction = "list_admin" | "admin_reset_pin" | "admin_soft_delete";

type PublicActionHandler = (ctx: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  appJwtSecret: string;
}) => Promise<Response>;

type AuthenticatedActionHandler = (ctx: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  me: ProfilesRow;
}) => Promise<Response> | Response;

type AdminActionHandler = (ctx: {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  me: ProfilesRow;
}) => Promise<Response>;

const publicActionHandlers: Record<PublicAction, PublicActionHandler> = {
  register: ({ supabase, payload, appJwtSecret }) =>
    handleRegister({ supabase, payload, appJwtSecret }),
  login: ({ supabase, payload, appJwtSecret }) =>
    handleLogin({ supabase, payload, appJwtSecret }),
};

const authenticatedActionHandlers: Record<
  AuthenticatedAction,
  AuthenticatedActionHandler
> = {
  me: ({ me }) => handleMe(me),
  update_me: ({ supabase, payload, me }) =>
    handleUpdateMe({ supabase, payload, me }),
  list_basic: ({ supabase }) => handleListBasic(supabase),
};

const adminActionHandlers: Record<AdminAction, AdminActionHandler> = {
  list_admin: ({ supabase }) => handleListAdmin(supabase),
  admin_reset_pin: ({ supabase, payload }) =>
    handleAdminResetPin({ supabase, payload }),
  admin_soft_delete: ({ supabase, payload, me }) =>
    handleAdminSoftDelete({ supabase, payload, meId: me.id }),
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
  const payload = body.payload ?? {};
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
    return publicHandler({ supabase, payload, appJwtSecret });
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
