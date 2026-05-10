import {
  parseCreateMatchInput,
} from "./parse-inputs.ts";
import { ValidationError } from "./quinielas-helpers.ts";

Deno.test("parseCreateMatchInput rejects scheduled matches with scores", () => {
  try {
    parseCreateMatchInput({
      id: "r16-1",
      phase: "roundOf16",
      homeTeamId: "arg",
      awayTeamId: "bra",
      kickoffAt: "2026-07-01T18:00:00.000Z",
      status: "scheduled",
      homeGoals: 1,
      awayGoals: 0,
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});

Deno.test("parseCreateMatchInput rejects final knockout matches without qualified team", () => {
  try {
    parseCreateMatchInput({
      id: "r16-1",
      phase: "roundOf16",
      homeTeamId: "arg",
      awayTeamId: "bra",
      kickoffAt: "2026-07-01T18:00:00.000Z",
      status: "final",
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: null,
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});

Deno.test("parseCreateMatchInput rejects group matches with qualified team", () => {
  try {
    parseCreateMatchInput({
      id: "ga-1",
      phase: "groups",
      homeTeamId: "mex",
      awayTeamId: "zaf",
      kickoffAt: "2026-06-11T17:00:00.000Z",
      status: "final",
      homeGoals: 2,
      awayGoals: 0,
      qualifiedTeamId: "mex",
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});

Deno.test("parseCreateMatchInput rejects qualified team outside match teams", () => {
  try {
    parseCreateMatchInput({
      id: "r16-1",
      phase: "roundOf16",
      homeTeamId: "arg",
      awayTeamId: "bra",
      kickoffAt: "2026-07-01T18:00:00.000Z",
      status: "final",
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "eng",
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});
