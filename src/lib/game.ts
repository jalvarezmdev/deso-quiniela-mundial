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

  if (isKnockoutPhase(outcome.phase)) {
    const actualDraw = resultSign(outcome.homeGoals, outcome.awayGoals) === 0
    const predictedDraw = resultSign(prediction.homeGoals, prediction.awayGoals) === 0
    const correctQualifiedTeam =
      Boolean(outcome.qualifiedTeamId) &&
      prediction.predictedQualifiedTeamId === outcome.qualifiedTeamId

    if (actualDraw) {
      const scorePoints = exactScore ? 3 : predictedDraw ? 1 : 0
      const qualifierPoints = correctQualifiedTeam ? 1 : 0
      return scorePoints + qualifierPoints
    }

    if (exactScore) return 3
    return correctQualifiedTeam ? 1 : 0
  }

  if (exactScore) {
    return 3
  }

  const expectedSign = resultSign(outcome.homeGoals, outcome.awayGoals)
  const predictedSign = resultSign(prediction.homeGoals, prediction.awayGoals)

  return expectedSign === predictedSign ? 1 : 0
}
