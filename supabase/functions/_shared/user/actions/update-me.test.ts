/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { handleUpdateMe } from "./update-me.ts";
import type { ProfilesRow } from "../helpers/users-helpers.ts";

const now = "2026-06-16T00:00:00.000Z";
const me: ProfilesRow = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "user@example.com",
  nickname: "Asdrubal",
  team_id: "arg",
  pin_hash: "hash",
  is_admin: false,
  onboarding_completed: false,
  token_version: 1,
  last_login_at: now,
  created_at: now,
  updated_at: now,
  deleted_at: null,
};

async function readJson(response: Response) {
  return await response.json() as {
    ok: boolean;
    data?: { user: { nickname: string } };
    error?: { code: string; message: string };
  };
}

Deno.test("update_me accepts a 50-character nickname", async () => {
  const nickname = "a".repeat(50);
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    from(table: string) {
      assertEquals(table, "profiles");
      return {
        update(row: Record<string, unknown>) {
          updates.push(row);
          return {
            eq() {
              return {
                is() {
                  return {
                    select() {
                      return {
                        single: () =>
                          Promise.resolve({
                            data: { ...me, nickname },
                            error: null,
                          }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const response = await handleUpdateMe({
    supabase: supabase as never,
    payload: { nickname },
    me,
  });

  const body = await readJson(response);
  assertEquals(response.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.data?.user.nickname, nickname);
  assertEquals(updates[0]?.nickname, nickname);
});

Deno.test("update_me rejects a 51-character nickname", async () => {
  const supabase = {
    from() {
      throw new Error("database should not be called");
    },
  };

  const response = await handleUpdateMe({
    supabase: supabase as never,
    payload: { nickname: "a".repeat(51) },
    me,
  });

  const body = await readJson(response);
  assertEquals(response.status, 400);
  assertEquals(body.ok, false);
  assertEquals(body.error?.code, "VALIDATION_ERROR");
});
