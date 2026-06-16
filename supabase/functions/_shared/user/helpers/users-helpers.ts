/// <reference lib="deno.ns" />

import { corsHeaders as supabaseCorsHeaders } from "jsr:@supabase/supabase-js@2/cors";

export type ProfilesRow = {
  id: string;
  email: string;
  nickname: string;
  team_id: string;
  pin_hash: string;
  is_admin: boolean;
  onboarding_completed: boolean;
  token_version: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SessionUserDTO = {
  id: string;
  email: string;
  nickname: string;
  teamId: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type BasicUserDTO = {
  id: string;
  nickname: string;
  teamId: string;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type AdminUserDTO = {
  id: string;
  email: string;
  nickname: string;
  teamId: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type RequestEnvelope = {
  action?: string;
  payload?: Record<string, unknown>;
};

export const PIN_REGEX = /^\d{6}$/;
export const MAX_NICKNAME_LENGTH = 50;

export const corsHeaders = { ...supabaseCorsHeaders };

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function normalizeNickname(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function countNicknameCharacters(nickname: string): number {
  return Array.from(nickname).length;
}

export function normalizeTeamId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function normalizePin(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function extractSessionToken(payload: Record<string, unknown>): string {
  if (typeof payload.sessionToken !== "string") return "";
  return payload.sessionToken.trim();
}

export function getEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

export function toSessionUser(profile: ProfilesRow): SessionUserDTO {
  return {
    id: profile.id,
    email: profile.email,
    nickname: profile.nickname,
    teamId: profile.team_id,
    isAdmin: profile.is_admin,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at,
  };
}

export function toBasicUser(profile: ProfilesRow): BasicUserDTO {
  return {
    id: profile.id,
    nickname: profile.nickname,
    teamId: profile.team_id,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
  };
}

export function toAdminUser(profile: ProfilesRow): AdminUserDTO {
  return {
    id: profile.id,
    email: profile.email,
    nickname: profile.nickname,
    teamId: profile.team_id,
    isAdmin: profile.is_admin,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at,
  };
}

export function handleDbError(
  err: { code?: string; message?: string } | null,
): Response {
  if (!err) {
    return jsonError("DB_ERROR", "Error de base de datos.", 500);
  }

  if (err.code === "23505") {
    if (err.message?.includes("ux_profiles_email_active")) {
      return jsonError(
        "EMAIL_ALREADY_EXISTS",
        "Ese correo ya esta registrado.",
        409,
      );
    }
    if (err.message?.includes("ux_profiles_nickname_active")) {
      return jsonError(
        "NICKNAME_ALREADY_EXISTS",
        "Ese apodo ya esta registrado.",
        409,
      );
    }
  }

  return jsonError("DB_ERROR", err.message ?? "Error de base de datos.", 500);
}
