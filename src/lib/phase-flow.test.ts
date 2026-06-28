import { describe, expect, it } from 'vitest'
import { getActivePhase, isPhaseEditable } from './phase-flow'
import type { AppState, Match, MatchStatus, PhaseKey } from './types'

function createMatch(phase: PhaseKey, kickoffAt: string, status: MatchStatus): Match {
  return {
    id: `${phase}-1`,
    phase,
    groupName: phase === 'groups' ? 'Grupo A' : null,
    homeTeamId: 'arg',
    awayTeamId: 'eng',
    kickoffAt,
    status,
    homeGoals: status === 'final' ? 1 : null,
    awayGoals: status === 'final' ? 0 : null,
    qualifiedTeamId: status === 'final' && phase !== 'groups' ? 'arg' : null,
    manualOverride: false,
  }
}

function createState(statusByPhase: Partial<Record<PhaseKey, MatchStatus>> = {}): AppState {
  return {
    users: [],
    predictions: [],
    submissions: [],
    windowOverrides: [],
    lastLiveSyncAt: null,
    matches: [
      createMatch('groups', '2026-06-11T17:00:00.000Z', statusByPhase.groups ?? 'scheduled'),
      createMatch('roundOf16', '2026-07-03T20:00:00.000Z', statusByPhase.roundOf16 ?? 'scheduled'),
      createMatch('roundOf8', '2026-07-09T20:00:00.000Z', statusByPhase.roundOf8 ?? 'scheduled'),
      createMatch('roundOf4', '2026-07-14T20:00:00.000Z', statusByPhase.roundOf4 ?? 'scheduled'),
      createMatch('semifinals', '2026-07-18T20:00:00.000Z', statusByPhase.semifinals ?? 'scheduled'),
      createMatch('final', '2026-07-22T20:00:00.000Z', statusByPhase.final ?? 'scheduled'),
    ],
  }
}

describe('phase flow', () => {
  it('starts in groups and allows editing groups even before opensAt', () => {
    const state = createState()
    const now = new Date('2026-05-09T10:00:00.000Z')

    expect(getActivePhase(state, now)).toBe('groups')
    expect(isPhaseEditable(state, 'groups', now)).toBe(true)
    expect(isPhaseEditable(state, 'roundOf16', now)).toBe(false)
  })

  it('falls back to next non-closed phase when none is editable', () => {
    const state = createState()
    const now = new Date('2026-06-14T00:00:00.000Z')

    expect(isPhaseEditable(state, 'groups', now)).toBe(false)
    expect(isPhaseEditable(state, 'roundOf16', now)).toBe(false)
    expect(getActivePhase(state, now)).toBe('roundOf16')
  })

  it('unlocks knockout editing only after previous phase is final', () => {
    const state = createState({ groups: 'final' })
    const now = new Date('2026-06-14T00:00:00.000Z')

    expect(isPhaseEditable(state, 'roundOf16', now)).toBe(true)
    expect(getActivePhase(state, now)).toBe('roundOf16')
  })

  it('returns final when every phase is closed', () => {
    const state = createState({
      groups: 'final',
      roundOf16: 'final',
      roundOf8: 'final',
      roundOf4: 'final',
      semifinals: 'final',
      final: 'final',
    })
    const now = new Date('2026-08-01T00:00:00.000Z')

    expect(getActivePhase(state, now)).toBe('final')
    expect(isPhaseEditable(state, 'final', now)).toBe(false)
  })

  it('keeps a knockout phase active while it still has a future scheduled match', () => {
    const state = createState({ groups: 'final' })
    state.matches = [
      createMatch('groups', '2026-06-11T17:00:00.000Z', 'final'),
      createMatch('roundOf16', '2026-06-28T19:00:00.000Z', 'final'),
      createMatch('roundOf16', '2026-06-29T20:30:00.000Z', 'scheduled'),
      createMatch('roundOf8', '2026-07-04T17:00:00.000Z', 'scheduled'),
    ]

    const now = new Date('2026-06-29T12:00:00.000Z')

    expect(isPhaseEditable(state, 'roundOf16', now)).toBe(true)
    expect(getActivePhase(state, now)).toBe('roundOf16')
  })
})
