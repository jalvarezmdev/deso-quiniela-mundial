/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { computeMatchPoints } from "./scoring.ts";

const knockoutCases = [
  {
    name: "non-exact draw and correct qualified team",
    input: {
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "arg",
      predictedHomeGoals: 0,
      predictedAwayGoals: 0,
      predictedQualifiedTeamId: "arg",
    },
    expected: 2,
  },
  {
    name: "exact draw and correct qualified team",
    input: {
      homeGoals: 3,
      awayGoals: 3,
      qualifiedTeamId: "arg",
      predictedHomeGoals: 3,
      predictedAwayGoals: 3,
      predictedQualifiedTeamId: "arg",
    },
    expected: 4,
  },
  {
    name: "exact non-draw score and correct qualified team",
    input: {
      homeGoals: 2,
      awayGoals: 0,
      qualifiedTeamId: "arg",
      predictedHomeGoals: 2,
      predictedAwayGoals: 0,
      predictedQualifiedTeamId: "arg",
    },
    expected: 3,
  },
  {
    name: "exact draw and wrong qualified team",
    input: {
      homeGoals: 3,
      awayGoals: 3,
      qualifiedTeamId: "mar",
      predictedHomeGoals: 3,
      predictedAwayGoals: 3,
      predictedQualifiedTeamId: "arg",
    },
    expected: 3,
  },
  {
    name: "non-exact draw and wrong qualified team",
    input: {
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "mar",
      predictedHomeGoals: 0,
      predictedAwayGoals: 0,
      predictedQualifiedTeamId: "arg",
    },
    expected: 1,
  },
  {
    name: "non-draw prediction and correct qualified team after a draw",
    input: {
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "arg",
      predictedHomeGoals: 2,
      predictedAwayGoals: 1,
      predictedQualifiedTeamId: "arg",
    },
    expected: 1,
  },
];

for (const testCase of knockoutCases) {
  Deno.test(`compute match points gives ${testCase.expected} for ${testCase.name}`, () => {
    assertEquals(
      computeMatchPoints({
        phase: "roundOf16",
        ...testCase.input,
      }),
      testCase.expected,
    );
  });
}
