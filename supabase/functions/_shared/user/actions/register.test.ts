/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { handleRegister } from "./register.ts";

const validPayload = {
  email: "user@example.com",
  nickname: "Asdrubal",
  teamId: "arg",
  pin: "123456",
  secretPhrase: "esto desocupao",
};

function buildProfile(overrides: Record<string, unknown>) {
  const now = "2026-06-16T00:00:00.000Z";
  return {
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
    ...overrides,
  };
}

async function readJson(response: Response) {
  return await response.json() as {
    ok: boolean;
    data?: { user: { nickname: string } };
    error?: { code: string; message: string };
  };
}

Deno.test("register accepts a 50-character nickname", async () => {
  const nickname = "a".repeat(50);
  const insertedRows: Array<Record<string, unknown>> = [];
  const supabase = {
    from(table: string) {
      assertEquals(table, "profiles");
      return {
        insert(row: Record<string, unknown>) {
          insertedRows.push(row);
          return {
            select() {
              return {
                single: () =>
                  Promise.resolve({
                    data: buildProfile({ nickname: row.nickname }),
                    error: null,
                  }),
              };
            },
          };
        },
      };
    },
  };

  const response = await handleRegister({
    supabase: supabase as never,
    payload: { ...validPayload, nickname },
    appJwtSecret: "test-secret",
  });

  const body = await readJson(response);
  assertEquals(response.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.data?.user.nickname, nickname);
  assertEquals(insertedRows[0]?.nickname, nickname);
});

Deno.test("register rejects a 51-character nickname", async () => {
  const supabase = {
    from() {
      throw new Error("database should not be called");
    },
  };

  const response = await handleRegister({
    supabase: supabase as never,
    payload: { ...validPayload, nickname: "a".repeat(51) },
    appJwtSecret: "test-secret",
  });

  const body = await readJson(response);
  assertEquals(response.status, 400);
  assertEquals(body.ok, false);
  assertEquals(body.error?.code, "VALIDATION_ERROR");
});
