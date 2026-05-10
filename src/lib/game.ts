import type { PhaseKey } from './types'

export type MatchOutcome = {
  phase: PhaseKey
  homeGoals: number
  awayGoals: number
  qualifiedTeamId: string | null
}

export type MatchPrediction = {
  homeGoals: number
  awayGoals: number
  predictedQualifiedTeamId: string | null
}

function resultSign(homeGoals: number, awayGoals: number): 1 | 0 | -1 {
  if (homeGoals > awayGoals) return 1
  if (homeGoals < awayGoals) return -1
  return 0
}

function isKnockoutPhase(phase: PhaseKey): boolean {
  return phase !== 'groups'
}

export function computeMatchPoints(
  outcome: MatchOutcome,
  prediction: MatchPrediction,
): number {
  const exactScore =
    outcome.homeGoals === prediction.homeGoals &&
    outcome.awayGoals === prediction.awayGoals

  if (exactScore) {
    return 3
  }

  if (isKnockoutPhase(outcome.phase)) {
    if (
      outcome.qualifiedTeamId &&
      prediction.predictedQualifiedTeamId === outcome.qualifiedTeamId
    ) {
      return 1
    }

    return 0
  }

  const expectedSign = resultSign(outcome.homeGoals, outcome.awayGoals)
  const predictedSign = resultSign(prediction.homeGoals, prediction.awayGoals)

  return expectedSign === predictedSign ? 1 : 0
}
