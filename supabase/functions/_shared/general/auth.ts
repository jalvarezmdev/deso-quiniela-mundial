import {
  handleDbError,
  jsonError,
  type ProfilesRow,
} from "../user/helpers/users-helpers.ts";
import type { SupabaseAdminClient } from "./supabase-client.ts";

type JwtClaims = {
  sub: string;
  is_admin: boolean;
  token_version: number;
  iat: number;
  exp: number;
};

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const textEncoder = new TextEncoder();

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function safeBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a[i] ^ b[i];
  }
  return out === 0;
}

async function hmacSha256(input: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(input),
  );
  return new Uint8Array(signature);
}

export async function signJwt(
  claims: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const content = `${encodedHeader}.${encodedClaims}`;
  const signature = await hmacSha256(content, secret);
  return `${content}.${base64UrlEncode(signature)}`;
}

async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtClaims | null> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  const content = `${headerPart}.${payloadPart}`;
  const expectedSignature = await hmacSha256(content, secret);
  const actualSignature = base64UrlDecode(signaturePart);

  if (!safeBytesEqual(expectedSignature, actualSignature)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadPart)),
    ) as JwtClaims;
    if (typeof claims.sub !== "string") return null;
    if (typeof claims.exp !== "number") return null;
    if (typeof claims.iat !== "number") return null;
    if (typeof claims.token_version !== "number") return null;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= nowSeconds) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export async function authenticate(
  supabase: SupabaseAdminClient,
  sessionToken: string,
  appJwtSecret: string,
): Promise<{ profile: ProfilesRow } | { error: Response }> {
  const claims = await verifyJwt(sessionToken, appJwtSecret);
  if (!claims) {
    return {
      error: jsonError("INVALID_SESSION", "Sesion invalida o expirada.", 401),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .is("deleted_at", null)
    .maybeSingle<ProfilesRow>();

  if (error) {
    return { error: handleDbError(error) };
  }

  if (!profile) {
    return {
      error: jsonError("INVALID_SESSION", "Sesion invalida o expirada.", 401),
    };
  }

  if (profile.token_version !== claims.token_version) {
    return {
      error: jsonError("INVALID_SESSION", "Sesion invalida o expirada.", 401),
    };
  }

  return { profile };
}

export function buildSessionTokenPayload(
  profile: ProfilesRow,
): Record<string, unknown> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    sub: profile.id,
    is_admin: profile.is_admin,
    token_version: profile.token_version,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
  };
}
