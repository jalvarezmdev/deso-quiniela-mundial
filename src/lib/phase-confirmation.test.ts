import { describe, expect, it } from 'vitest'
import { getPhaseConfirmationState } from './phase-confirmation'
import type { Match, Prediction } from './types'

function createMatch(id: string): Match {
  return {
    id,
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'mex',
    awayTeamId: 'zaf',
    kickoffAt: '2026-06-11T20:00:00.000Z',
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
  }
}

function createPrediction(matchId: string): Prediction {
  return {
    userId: 'user-1',
    phase: 'groups',
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    predictedQualifiedTeamId: null,
    updatedAt: '2026-06-10T20:00:00.000Z',
  }
}

describe('getPhaseConfirmationState', () => {
  it('rejects confirmation when the phase has no matches', () => {
    const state = getPhaseConfirmationState({
      editable: true,
      phaseMatches: [],
      phasePredictions: [],
      missingFixtureCount: 0,
    })

    expect(state.canConfirmPhase).toBe(false)
    expect(state.missingPredictionCount).toBe(0)
    expect(state.savedMatchesCount).toBe(0)
  })

  it('rejects confirmation when any phase match is missing a prediction', () => {
    const state = getPhaseConfirmationState({
      editable: true,
      phaseMatches: [createMatch('match-1'), createMatch('match-2')],
      phasePredictions: [createPrediction('match-1')],
      missingFixtureCount: 0,
    })

    expect(state.canConfirmPhase).toBe(false)
    expect(state.missingPredictionCount).toBe(1)
    expect(state.savedMatchesCount).toBe(1)
  })

  it('rejects confirmation while knockout fixtures are missing', () => {
    const state = getPhaseConfirmationState({
      editable: true,
      phaseMatches: [createMatch('match-1')],
      phasePredictions: [createPrediction('match-1')],
      missingFixtureCount: 1,
    })

    expect(state.canConfirmPhase).toBe(false)
    expect(state.missingPredictionCount).toBe(0)
  })

  it('allows confirmation only when every phase match has a prediction', () => {
    const state = getPhaseConfirmationState({
      editable: true,
      phaseMatches: [createMatch('match-1'), createMatch('match-2')],
      phasePredictions: [
        createPrediction('match-1'),
        createPrediction('match-2'),
        createPrediction('stale-match'),
      ],
      missingFixtureCount: 0,
    })

    expect(state.canConfirmPhase).toBe(true)
    expect(state.missingPredictionCount).toBe(0)
    expect(state.savedMatchesCount).toBe(2)
  })
})
