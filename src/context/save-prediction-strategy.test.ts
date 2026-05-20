import { describe, expect, it, vi } from "vitest";
import {
  hasLocalPrediction,
  savePredictionWithFallback,
  type SavePredictionInput,
} from "./save-prediction-strategy";
import type { QuinielasResponse } from "#/lib/quinielas-api";
import type { PredictionDTO } from "#/lib/quinielas-api";
import type { Prediction } from "#/lib/types";

function okResponse(): QuinielasResponse<{ prediction: PredictionDTO }> {
  return {
    ok: true,
    data: {
      prediction: {
        userId: "user-1",
        phase: "groups",
        matchId: "match-1",
        homeGoals: 1,
        awayGoals: 0,
        predictedQualifiedTeamId: null,
        updatedAt: "2026-06-10T20:00:00.000Z",
      },
    },
  };
}

function errorResponse(
  code: string,
): QuinielasResponse<{ prediction: PredictionDTO }> {
  return {
    ok: false,
    error: {
      code,
      message: code,
    },
  };
}

const payload: SavePredictionInput = {
  phase: "groups",
  matchId: "match-1",
  homeGoals: 1,
  awayGoals: 0,
  predictedQualifiedTeamId: null,
};

describe("save-prediction-strategy", () => {
  it("detects when a local prediction exists", () => {
    const predictions: Prediction[] = [
      {
        userId: "user-1",
        phase: "groups",
        matchId: "match-1",
        homeGoals: 2,
        awayGoals: 1,
        predictedQualifiedTeamId: null,
        updatedAt: "2026-06-10T20:00:00.000Z",
      },
    ];

    expect(
      hasLocalPrediction(predictions, {
        userId: "user-1",
        phase: "groups",
        matchId: "match-1",
      }),
    ).toBe(true);
    expect(
      hasLocalPrediction(predictions, {
        userId: "user-1",
        phase: "groups",
        matchId: "match-2",
      }),
    ).toBe(false);
  });

  it("uses update first when local prediction exists", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(okResponse());

    const result = await savePredictionWithFallback(request, payload, true);

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenNthCalledWith(1, "update_prediction", payload);
  });

  it("uses create first when local prediction does not exist", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(okResponse());

    const result = await savePredictionWithFallback(request, payload, false);

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenNthCalledWith(1, "create_prediction", payload);
  });

  it("falls back update->create on NOT_FOUND", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(errorResponse("NOT_FOUND"))
      .mockResolvedValueOnce(okResponse());

    const result = await savePredictionWithFallback(request, payload, true);

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, "update_prediction", payload);
    expect(request).toHaveBeenNthCalledWith(2, "create_prediction", payload);
  });

  it("falls back create->update on CONFLICT", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(errorResponse("CONFLICT"))
      .mockResolvedValueOnce(okResponse());

    const result = await savePredictionWithFallback(request, payload, false);

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, "create_prediction", payload);
    expect(request).toHaveBeenNthCalledWith(2, "update_prediction", payload);
  });
});
