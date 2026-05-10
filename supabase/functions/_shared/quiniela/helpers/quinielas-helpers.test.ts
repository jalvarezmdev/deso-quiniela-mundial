/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertFalse,
  assertThrows,
} from "jsr:@std/assert";
import {
  computeEffectiveCloseAt,
  computePhaseWindow,
  MATCH_STATUSES,
  parseIsoDateString,
  parsePhaseKey,
  parseScore,
  parseStatus,
  PHASE_KEYS,
} from "./quinielas-helpers.ts";

Deno.test("parsePhaseKey accepts valid phase keys", () => {
  for (const phase of PHASE_KEYS) {
    assertEquals(parsePhaseKey(phase), phase);
  }
});

Deno.test("parsePhaseKey rejects unknown values", () => {
  assertThrows(() => parsePhaseKey("invalid"));
  assertThrows(() => parsePhaseKey(123));
});

Deno.test("parseStatus accepts known statuses", () => {
  for (const status of MATCH_STATUSES) {
    assertEquals(parseStatus(status), status);
  }
});

Deno.test("parseScore accepts null and non-negative integers", () => {
  assertEquals(parseScore(null), null);
  assertEquals(parseScore(0), 0);
  assertEquals(parseScore(3), 3);
  assertThrows(() => parseScore(-1));
  assertThrows(() => parseScore(1.5));
});

Deno.test("parseIsoDateString normalizes to ISO format", () => {
  const parsed = parseIsoDateString("2026-06-11T18:00:00-04:00");
  assertEquals(parsed, "2026-06-11T22:00:00.000Z");
});

Deno.test("computeEffectiveCloseAt prefers override close", () => {
  const closeAt = computeEffectiveCloseAt({
    overrideCloseAt: "2026-06-11T19:00:00.000Z",
    earliestKickoffAt: "2026-06-11T20:00:00.000Z",
  });

  assertEquals(closeAt, "2026-06-11T19:00:00.000Z");
});

Deno.test("computeEffectiveCloseAt falls back to earliest kickoff", () => {
  const closeAt = computeEffectiveCloseAt({
    overrideCloseAt: null,
    earliestKickoffAt: "2026-06-11T20:00:00.000Z",
  });

  assertEquals(closeAt, "2026-06-11T20:00:00.000Z");
});

Deno.test("computePhaseWindow returns unlocked when no boundaries exist", () => {
  const window = computePhaseWindow({
    override: null,
    earliestKickoffAt: null,
    nowIso: "2026-06-11T10:00:00.000Z",
  });

  assertEquals(window.closeAt, null);
  assertFalse(window.locked);
});

Deno.test("computePhaseWindow returns locked when now >= closeAt", () => {
  const window = computePhaseWindow({
    override: {
      opensAt: "2026-06-11T09:00:00.000Z",
      closesAt: "2026-06-11T10:00:00.000Z",
    },
    earliestKickoffAt: "2026-06-11T12:00:00.000Z",
    nowIso: "2026-06-11T10:00:00.000Z",
  });

  assertEquals(window.closeAt, "2026-06-11T10:00:00.000Z");
  assert(window.locked);
});
