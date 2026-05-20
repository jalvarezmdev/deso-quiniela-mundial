import type { Match, PhaseKey } from '#/lib/types'

export type GroupRound = 1 | 2 | 3
export type GroupBucket = {
  groupName: string
  matches: Match[]
}
export type GroupRoundProps = {
  matches: Match[];
  activePhase: PhaseKey;
  filter: GroupRound | 'all';
}

export const GROUP_ROUNDS: GroupRound[] = [1, 2, 3];

function byKickoffThenIdAsc(a: Match, b: Match): number {
  const kickoffDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
  if (kickoffDiff !== 0) return kickoffDiff
  return a.id.localeCompare(b.id)
}

export function filteredGroupRounds(filter: GroupRound | 'all') {
  return filter === 'all' ? GROUP_ROUNDS : [filter]
}

export function getGroupRounds({
  matches, 
  activePhase, 
  filter
}: GroupRoundProps) {
  if (activePhase !== "groups") return [];
  return filteredGroupRounds(filter).flatMap((round) => {
    const roundMatches = matches.filter(
      (match) => getGroupMatchRoundMap(matches).get(match.id) === round,
    );
    return roundMatches.length === 0
      ? []
      : [{ round, groups: groupMatchesByGroupName(roundMatches) }];
  })
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
