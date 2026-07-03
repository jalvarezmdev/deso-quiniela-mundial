// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResultSummaryMatches } from './use-result-summary-matches'
import type { Match } from '#/lib/types'

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'arg',
    awayTeamId: 'mex',
    kickoffAt: '2026-06-11T17:00:00.000Z',
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
    ...overrides,
  }
}

describe('useResultSummaryMatches', () => {
  it('returns all live matches and the three most recent final matches', () => {
    const matches: Match[] = [
      createMatch({
        id: 'final-old',
        status: 'final',
        kickoffAt: '2026-06-11T17:00:00.000Z',
        homeGoals: 1,
        awayGoals: 0,
      }),
      createMatch({
        id: 'live-later',
        status: 'live',
        kickoffAt: '2026-06-12T21:00:00.000Z',
        homeGoals: 1,
        awayGoals: 1,
      }),
      createMatch({
        id: 'scheduled-next',
        status: 'scheduled',
        kickoffAt: '2026-06-13T17:00:00.000Z',
      }),
      createMatch({
        id: 'final-newest',
        status: 'final',
        kickoffAt: '2026-06-12T19:00:00.000Z',
        homeGoals: 2,
        awayGoals: 0,
      }),
      createMatch({
        id: 'live-earlier',
        status: 'live',
        kickoffAt: '2026-06-12T17:00:00.000Z',
        homeGoals: 0,
        awayGoals: 0,
      }),
      createMatch({
        id: 'final-middle',
        status: 'final',
        kickoffAt: '2026-06-12T15:00:00.000Z',
        homeGoals: 3,
        awayGoals: 1,
      }),
      createMatch({
        id: 'final-recent',
        status: 'final',
        kickoffAt: '2026-06-12T13:00:00.000Z',
        homeGoals: 2,
        awayGoals: 2,
      }),
    ]

    const { result } = renderHook(() => useResultSummaryMatches(matches))

    expect(result.current.liveMatches.map((match) => match.id)).toEqual([
      'live-earlier',
      'live-later',
    ])
    expect(result.current.recentFinalMatches.map((match) => match.id)).toEqual([
      'final-newest',
      'final-middle',
      'final-recent',
    ])
  })
})
