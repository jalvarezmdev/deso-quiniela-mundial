import {
  validatePredictedQualifiedTeam,
} from "./parse-prediction-inputs.ts";
import { ValidationError } from "./quinielas-helpers.ts";

Deno.test("validatePredictedQualifiedTeam rejects group predictions with predicted qualified team", () => {
  try {
    validatePredictedQualifiedTeam({
      phase: "groups",
      homeTeamId: "mex",
      awayTeamId: "zaf",
      predictedQualifiedTeamId: "mex",
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});

Deno.test("validatePredictedQualifiedTeam rejects team outside match teams", () => {
  try {
    validatePredictedQualifiedTeam({
      phase: "roundOf16",
      homeTeamId: "arg",
      awayTeamId: "bra",
      predictedQualifiedTeamId: "eng",
    });
    throw new Error("Expected ValidationError");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
});
