import { useMemo } from 'react'
import type { Match } from '#/lib/types'

export function useResultSummaryMatches(matches: Match[]) {
  return useMemo(() => {
    const liveMatches = matches
      .filter((match) => match.status === 'live')
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())

    const recentFinalMatches = matches
      .filter((match) => match.status === 'final')
      .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
      .slice(0, 3)

    return { liveMatches, recentFinalMatches }
  }, [matches])
}
