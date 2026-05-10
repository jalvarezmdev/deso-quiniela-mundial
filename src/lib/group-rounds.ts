import type { Match } from '#/lib/types'

export type GroupRound = 1 | 2 | 3
export type GroupBucket = {
  groupName: string
  matches: Match[]
}

function byKickoffThenIdAsc(a: Match, b: Match): number {
  const kickoffDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
  if (kickoffDiff !== 0) return kickoffDiff
  return a.id.localeCompare(b.id)
}

export function getGroupMatchRoundMap(matches: Match[]): Map<string, GroupRound> {
  const groups = new Map<string, Match[]>()

  for (const match of matches) {
    if (match.phase !== 'groups') continue
    const key = match.groupName ?? 'Sin grupo'
    const current = groups.get(key) ?? []
    current.push(match)
    groups.set(key, current)
  }

  const roundByMatchId = new Map<string, GroupRound>()

  for (const groupMatches of groups.values()) {
    const sorted = [...groupMatches].sort(byKickoffThenIdAsc)

    for (let index = 0; index < sorted.length; index += 1) {
      const match = sorted[index]
      if (!match) continue
      const round = index < 2 ? 1 : index < 4 ? 2 : 3
      roundByMatchId.set(match.id, round)
    }
  }

  return roundByMatchId
}

export function groupMatchesByGroupName(matches: Match[]): GroupBucket[] {
  const groups = new Map<string, Match[]>()

  for (const match of matches) {
    const key = (match.groupName ?? 'Sin grupo').trim() || 'Sin grupo'
    const current = groups.get(key) ?? []
    current.push(match)
    groups.set(key, current)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupMatches]) => ({
      groupName,
      matches: [...groupMatches].sort(byKickoffThenIdAsc),
    }))
}
