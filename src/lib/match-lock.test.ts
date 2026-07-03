import { describe, expect, it } from 'vitest'
import { canPredictMatch, isMatchLocked } from './match-lock'
import type { Match } from './types'

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'round-1',
    phase: 'roundOf16',
    groupName: null,
    homeTeamId: 'arg',
    awayTeamId: 'bra',
    kickoffAt: '2026-06-28T19:00:00.000Z',
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
    ...overrides,
  }
}

describe('match lock', () => {
  it('locks predictions at kickoff time', () => {
    const match = createMatch()

    expect(isMatchLocked(match, new Date('2026-06-28T18:59:59.999Z'))).toBe(false)
    expect(isMatchLocked(match, new Date('2026-06-28T19:00:00.000Z'))).toBe(true)
  })

  it('does not allow admins to predict after kickoff', () => {
    const match = createMatch()

    expect(canPredictMatch(match, true, false, new Date('2026-06-28T19:00:00.000Z'))).toBe(false)
  })

  it('allows scheduled unconfirmed predictions before kickoff', () => {
    const match = createMatch()

    expect(canPredictMatch(match, false, false, new Date('2026-06-28T18:59:59.999Z'))).toBe(true)
  })
})
