import type { Match, Prediction } from './types'

type PhaseConfirmationInput = {
  editable: boolean
  phaseMatches: Match[]
  phasePredictions: Prediction[]
  missingFixtureCount: number
}

type PhaseConfirmationState = {
  savedMatchesCount: number
  totalMatchesCount: number
  missingPredictionCount: number
  canConfirmPhase: boolean
}

export function getPhaseConfirmationState({
  editable,
  phaseMatches,
  phasePredictions,
  missingFixtureCount,
}: PhaseConfirmationInput): PhaseConfirmationState {
  const matchIds = new Set(phaseMatches.map((match) => match.id))
  const predictedMatchIds = new Set(
    phasePredictions
      .filter((prediction) => matchIds.has(prediction.matchId))
      .map((prediction) => prediction.matchId),
  )
  const totalMatchesCount = matchIds.size
  const savedMatchesCount = predictedMatchIds.size
  const missingPredictionCount = totalMatchesCount - savedMatchesCount

  return {
    savedMatchesCount,
    totalMatchesCount,
    missingPredictionCount,
    canConfirmPhase:
      editable &&
      totalMatchesCount > 0 &&
      missingFixtureCount === 0 &&
      missingPredictionCount === 0,
  }
}
