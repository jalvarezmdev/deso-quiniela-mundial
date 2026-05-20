import type {
  PredictionDTO,
  QuinielasAction,
  QuinielasResponse,
} from "#/lib/quinielas-api";
import type { PhaseKey, Prediction } from "#/lib/types";

export type SavePredictionInput = {
  phase: PhaseKey;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  predictedQualifiedTeamId: string | null;
};

type SavePredictionAction = Extract<
  QuinielasAction,
  "create_prediction" | "update_prediction"
>;

type SavePredictionResult = QuinielasResponse<{ prediction: PredictionDTO }>;

type SavePredictionRequestFn = (
  action: SavePredictionAction,
  payload: SavePredictionInput,
) => Promise<SavePredictionResult>;

type PredictionIdentity = {
  userId: string;
  phase: SavePredictionInput["phase"];
  matchId: string;
};

export function hasLocalPrediction(
  predictions: Prediction[],
  identity: PredictionIdentity,
): boolean {
  return predictions.some(
    (item) =>
      item.userId === identity.userId &&
      item.phase === identity.phase &&
      item.matchId === identity.matchId,
  );
}

export async function savePredictionWithFallback(
  request: SavePredictionRequestFn,
  payload: SavePredictionInput,
  hasPrediction: boolean,
): Promise<SavePredictionResult> {
  const primaryAction: SavePredictionAction = hasPrediction
    ? "update_prediction"
    : "create_prediction";
  const secondaryAction: SavePredictionAction = hasPrediction
    ? "create_prediction"
    : "update_prediction";
  const fallbackCode = hasPrediction ? "NOT_FOUND" : "CONFLICT";

  const primaryResponse = await request(primaryAction, payload);
  if (primaryResponse.ok) {
    return primaryResponse;
  }

  if (primaryResponse.error.code !== fallbackCode) {
    return primaryResponse;
  }

  return request(secondaryAction, payload);
}
