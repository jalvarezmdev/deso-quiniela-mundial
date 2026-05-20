/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import {
  getMissingFixtureCount,
  getMissingPredictionMatchIds,
} from "./phase-submission-completion.ts";

Deno.test("getMissingPredictionMatchIds returns missing active match ids", () => {
  const missing = getMissingPredictionMatchIds({
    matchIds: ["match-1", "match-2"],
    predictionMatchIds: ["match-1"],
  });

  assertEquals(missing, ["match-2"]);
});

Deno.test("getMissingPredictionMatchIds ignores stale prediction ids", () => {
  const missing = getMissingPredictionMatchIds({
    matchIds: ["match-1"],
    predictionMatchIds: ["match-1", "stale-match"],
  });

  assertEquals(missing, []);
});

Deno.test("getMissingPredictionMatchIds accepts exactly complete prediction sets", () => {
  const missing = getMissingPredictionMatchIds({
    matchIds: ["match-1", "match-2"],
    predictionMatchIds: ["match-2", "match-1"],
  });

  assertEquals(missing, []);
});

Deno.test("getMissingFixtureCount rejects partial knockout fixture sets", () => {
  assertEquals(
    getMissingFixtureCount("roundOf16", ["2026-06-28T19:00:00.000Z"]),
    15,
  );
  assertEquals(getMissingFixtureCount("final", ["2026-07-19T19:00:00.000Z"]), 0);
});

Deno.test("getMissingFixtureCount does not require a fixed group count", () => {
  assertEquals(getMissingFixtureCount("groups", ["2026-06-11T20:00:00.000Z"]), 0);
});

Deno.test("getMissingFixtureCount rejects duplicate or unexpected knockout slots", () => {
  const kickoffAts = [
    "2026-06-28T19:00:00.000Z",
    "2026-06-28T19:00:00.000Z",
    "2026-06-28T20:00:00.000Z",
  ];

  assertEquals(getMissingFixtureCount("roundOf16", kickoffAts), 15);
});
