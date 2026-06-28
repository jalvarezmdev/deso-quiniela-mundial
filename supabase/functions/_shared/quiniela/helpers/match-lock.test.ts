/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { isMatchLocked } from "./match-lock.ts";

Deno.test("isMatchLocked closes predictions exactly at kickoff", () => {
  const match = {
    status: "scheduled",
    kickoff_at: "2026-06-28T19:00:00.000Z",
  };

  assertEquals(isMatchLocked(match, new Date("2026-06-28T18:59:59.999Z")), false);
  assertEquals(isMatchLocked(match, new Date("2026-06-28T19:00:00.000Z")), true);
});
