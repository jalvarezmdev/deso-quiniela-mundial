import { useMemo } from 'react'
import type { Match } from '#/lib/types'

export function useLastPlayedMatches(matches: Match[]) {
  return useMemo(() => {
    const liveOrFinal = matches.filter(
      (m) => m.status === 'live' || m.status === 'final',
    )
    if (liveOrFinal.length === 0) return []
    const maxKickoff = Math.max(
      ...liveOrFinal.map((m) => new Date(m.kickoffAt).getTime()),
    )
    return liveOrFinal.filter(
      (m) => new Date(m.kickoffAt).getTime() === maxKickoff,
    )
  }, [matches])
}
