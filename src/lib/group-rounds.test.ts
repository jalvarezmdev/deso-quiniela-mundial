import { describe, expect, it } from 'vitest'
import { getGroupMatchRoundMap, groupMatchesByGroupName } from './group-rounds'
import type { Match } from './types'

function createGroupMatch(
  id: string,
  groupName: string,
  kickoffAt: string,
): Match {
  return {
    id,
    phase: 'groups',
    groupName,
    homeTeamId: 'arg',
    awayTeamId: 'eng',
    kickoffAt,
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
  }
}

describe('getGroupMatchRoundMap', () => {
  it('maps each group matches by kickoff order into rounds 1, 2, and 3', () => {
    const matches: Match[] = [
      createGroupMatch('ga-1', 'Grupo A', '2026-06-11T17:00:00.000Z'),
      createGroupMatch('ga-2', 'Grupo A', '2026-06-11T20:00:00.000Z'),
      createGroupMatch('ga-3', 'Grupo A', '2026-06-18T17:00:00.000Z'),
      createGroupMatch('ga-4', 'Grupo A', '2026-06-18T20:00:00.000Z'),
      createGroupMatch('ga-5', 'Grupo A', '2026-06-24T17:00:00.000Z'),
      createGroupMatch('ga-6', 'Grupo A', '2026-06-24T20:00:00.000Z'),
    ]

    const roundMap = getGroupMatchRoundMap(matches)

    expect(roundMap.get('ga-1')).toBe(1)
    expect(roundMap.get('ga-2')).toBe(1)
    expect(roundMap.get('ga-3')).toBe(2)
    expect(roundMap.get('ga-4')).toBe(2)
    expect(roundMap.get('ga-5')).toBe(3)
    expect(roundMap.get('ga-6')).toBe(3)
  })

  it('computes rounds independently for each group', () => {
    const matches: Match[] = [
      createGroupMatch('ga-1', 'Grupo A', '2026-06-11T17:00:00.000Z'),
      createGroupMatch('ga-2', 'Grupo A', '2026-06-11T20:00:00.000Z'),
      createGroupMatch('gb-1', 'Grupo B', '2026-06-12T17:00:00.000Z'),
      createGroupMatch('gb-2', 'Grupo B', '2026-06-12T20:00:00.000Z'),
      createGroupMatch('ga-3', 'Grupo A', '2026-06-18T17:00:00.000Z'),
      createGroupMatch('gb-3', 'Grupo B', '2026-06-18T20:00:00.000Z'),
    ]

    const roundMap = getGroupMatchRoundMap(matches)

    expect(roundMap.get('ga-1')).toBe(1)
    expect(roundMap.get('ga-2')).toBe(1)
    expect(roundMap.get('ga-3')).toBe(2)
    expect(roundMap.get('gb-1')).toBe(1)
    expect(roundMap.get('gb-2')).toBe(1)
    expect(roundMap.get('gb-3')).toBe(2)
  })

  it('uses match id as tiebreaker when kickoff time is the same', () => {
    const matches: Match[] = [
      createGroupMatch('ga-2', 'Grupo A', '2026-06-11T17:00:00.000Z'),
      createGroupMatch('ga-1', 'Grupo A', '2026-06-11T17:00:00.000Z'),
      createGroupMatch('ga-4', 'Grupo A', '2026-06-18T17:00:00.000Z'),
      createGroupMatch('ga-3', 'Grupo A', '2026-06-18T17:00:00.000Z'),
    ]

    const roundMap = getGroupMatchRoundMap(matches)

    expect(roundMap.get('ga-1')).toBe(1)
    expect(roundMap.get('ga-2')).toBe(1)
    expect(roundMap.get('ga-3')).toBe(2)
    expect(roundMap.get('ga-4')).toBe(2)
  })
})

describe('groupMatchesByGroupName', () => {
  it('groups matches by group name and sorts groups alphabetically', () => {
    const matches: Match[] = [
      createGroupMatch('gb-2', 'Grupo B', '2026-06-13T20:00:00.000Z'),
      createGroupMatch('ga-1', 'Grupo A', '2026-06-11T17:00:00.000Z'),
      createGroupMatch('gb-1', 'Grupo B', '2026-06-12T17:00:00.000Z'),
    ]

    const groups = groupMatchesByGroupName(matches)

    expect(groups.map((group) => group.groupName)).toEqual(['Grupo A', 'Grupo B'])
    expect(groups[0]?.matches.map((match) => match.id)).toEqual(['ga-1'])
    expect(groups[1]?.matches.map((match) => match.id)).toEqual(['gb-1', 'gb-2'])
  })

  it('uses Sin grupo fallback when group name is null', () => {
    const matches: Match[] = [
      {
        ...createGroupMatch('g-1', 'Grupo A', '2026-06-11T17:00:00.000Z'),
        groupName: null,
      },
    ]

    const groups = groupMatchesByGroupName(matches)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.groupName).toBe('Sin grupo')
    expect(groups[0]?.matches[0]?.id).toBe('g-1')
  })
})
