import { useMemo } from 'react'
import { getTeam } from '#/lib/teams'
import { PHASES, type Match, type Prediction } from '#/lib/types'

export type NextMatchWithPrediction = {
  match: Match
  home: ReturnType<typeof getTeam>
  away: ReturnType<typeof getTeam>
  phaseLabel: string
  prediction: Prediction | null
}

export function useNextMatches(
  matches: Match[],
  predictions: Prediction[],
  userId: string,
): NextMatchWithPrediction[] {
  return useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === 'scheduled' || m.status === 'live')
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .slice(0, 3)

    return upcoming.map((match) => {
      const home = getTeam(match.homeTeamId)
      const away = getTeam(match.awayTeamId)
      const phaseLabel = PHASES.find((p) => p.key === match.phase)?.label ?? match.phase
      const prediction =
        predictions.find(
          (p) => p.matchId === match.id && p.userId === userId,
        ) ?? null

      return { match, home, away, phaseLabel, prediction }
    })
  }, [matches, predictions, userId])
}