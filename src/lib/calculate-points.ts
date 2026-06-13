import { computeMatchPoints } from './game'
import type { Match, Prediction } from './types'

export function getMatchPoints(match: Match, prediction: Prediction): number | null {
  if (match.homeGoals == null || match.awayGoals == null) return null

  return computeMatchPoints(
    {
      phase: match.phase,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      qualifiedTeamId: match.qualifiedTeamId,
    },
    {
      homeGoals: prediction.homeGoals,
      awayGoals: prediction.awayGoals,
      predictedQualifiedTeamId: prediction.predictedQualifiedTeamId,
    },
  )
}

export function getUserMatchPointsMap(
  matches: Match[],
  predictions: Prediction[],
  userId: string,
): Record<string, number> {
  const userPredictions = predictions.filter((p) => p.userId === userId)
  const matchesById = new Map(matches.map((m) => [m.id, m]))

  const map: Record<string, number> = {}

  for (const prediction of userPredictions) {
    const match = matchesById.get(prediction.matchId)
    const points = match ? getMatchPoints(match, prediction) : null
    if (points !== null) {
      map[prediction.matchId] = points
    }
  }

  return map
}
