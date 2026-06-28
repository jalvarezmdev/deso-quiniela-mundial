import { describe, expect, it } from 'vitest'
import { getMatchPoints, getUserMatchPointsMap } from './calculate-points'
import type { Match, Prediction } from './types'

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'mex',
    awayTeamId: 'zaf',
    kickoffAt: new Date().toISOString(),
    status: 'final',
    homeGoals: 2,
    awayGoals: 0,
    qualifiedTeamId: null,
    manualOverride: false,
    ...overrides,
  }
}

function createPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    userId: 'user-1',
    phase: 'groups',
    matchId: 'match-1',
    homeGoals: 2,
    awayGoals: 0,
    predictedQualifiedTeamId: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('getMatchPoints', () => {
  it('returns null when match has no scores (scheduled)', () => {
    expect(
      getMatchPoints(
        createMatch({ status: 'scheduled', homeGoals: null, awayGoals: null }),
        createPrediction({ homeGoals: 2, awayGoals: 0 }),
      ),
    ).toBeNull()
  })

  it('returns null when match has no scores (null goals)', () => {
    expect(
      getMatchPoints(
        createMatch({ homeGoals: null, awayGoals: 0 }),
        createPrediction({ homeGoals: 2, awayGoals: 0 }),
      ),
    ).toBeNull()
  })

  it('returns 3 points for exact score in group phase', () => {
    expect(
      getMatchPoints(
        createMatch({ homeGoals: 2, awayGoals: 0 }),
        createPrediction({ homeGoals: 2, awayGoals: 0 }),
      ),
    ).toBe(3)
  })

  it('returns 1 point for correct result sign in group phase', () => {
    expect(
      getMatchPoints(
        createMatch({ homeGoals: 3, awayGoals: 0 }),
        createPrediction({ homeGoals: 2, awayGoals: 0 }),
      ),
    ).toBe(1)
  })

  it('returns 0 points for wrong result sign in group phase', () => {
    expect(
      getMatchPoints(
        createMatch({ homeGoals: 0, awayGoals: 2 }),
        createPrediction({ homeGoals: 2, awayGoals: 0 }),
      ),
    ).toBe(0)
  })

  it('returns 1 point for correct qualified team in knockout', () => {
    expect(
      getMatchPoints(
        createMatch({ phase: 'roundOf16', homeGoals: 2, awayGoals: 1, qualifiedTeamId: 'mex' }),
        createPrediction({ phase: 'roundOf16', homeGoals: 0, awayGoals: 0, predictedQualifiedTeamId: 'mex' }),
      ),
    ).toBe(1)
  })

  it('returns 0 points for wrong qualified team in knockout', () => {
    expect(
      getMatchPoints(
        createMatch({ phase: 'roundOf16', homeGoals: 2, awayGoals: 1, qualifiedTeamId: 'mex' }),
        createPrediction({ phase: 'roundOf16', homeGoals: 0, awayGoals: 0, predictedQualifiedTeamId: 'zaf' }),
      ),
    ).toBe(0)
  })

  it('returns 3 points for exact non-draw knockout score with wrong qualified team', () => {
    expect(
      getMatchPoints(
        createMatch({ phase: 'roundOf16', homeGoals: 2, awayGoals: 0, qualifiedTeamId: 'mex' }),
        createPrediction({ phase: 'roundOf16', homeGoals: 2, awayGoals: 0, predictedQualifiedTeamId: 'zaf' }),
      ),
    ).toBe(3)
  })

  it('returns 4 points for exact knockout draw and correct qualified team', () => {
    expect(
      getMatchPoints(
        createMatch({ phase: 'roundOf16', homeGoals: 3, awayGoals: 3, qualifiedTeamId: 'mex' }),
        createPrediction({ phase: 'roundOf16', homeGoals: 3, awayGoals: 3, predictedQualifiedTeamId: 'mex' }),
      ),
    ).toBe(4)
  })

  it('returns points for live matches too', () => {
    expect(
      getMatchPoints(
        createMatch({ status: 'live', homeGoals: 3, awayGoals: 0 }),
        createPrediction({ homeGoals: 1, awayGoals: 0 }),
      ),
    ).toBe(1)
  })
})

describe('getUserMatchPointsMap', () => {
  const matches: Match[] = [
    createMatch({ id: 'ga-1', status: 'final', homeGoals: 2, awayGoals: 0 }),
    createMatch({ id: 'gd-1', status: 'live', homeGoals: 3, awayGoals: 0, homeTeamId: 'usa', awayTeamId: 'par' }),
    createMatch({ id: 'gs-1', status: 'scheduled', homeGoals: null, awayGoals: null }),
  ]

  const predictions: Prediction[] = [
    createPrediction({ userId: 'user-1', matchId: 'ga-1', homeGoals: 2, awayGoals: 0 }),
    createPrediction({ userId: 'user-1', matchId: 'gd-1', homeGoals: 2, awayGoals: 1 }),
    createPrediction({ userId: 'user-1', matchId: 'gs-1', homeGoals: 1, awayGoals: 0 }),
    createPrediction({ userId: 'user-2', matchId: 'ga-1', homeGoals: 0, awayGoals: 2 }),
  ]

  it('returns map only for matches with scores for the given user', () => {
    const result = getUserMatchPointsMap(matches, predictions, 'user-1')

    // ga-1: exact score → 3 points
    expect(result['ga-1']).toBe(3)
    // gd-1: predicted 2-1, actual 3-0 → correct sign → 1 point
    expect(result['gd-1']).toBe(1)
    // gs-1: scheduled, no scores → should NOT be in the map
    expect(result['gs-1']).toBeUndefined()
  })

  it('returns empty map when user has no predictions', () => {
    const result = getUserMatchPointsMap(matches, predictions, 'user-3')
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('returns empty map when no matches have scores', () => {
    const result = getUserMatchPointsMap(
      [createMatch({ id: 'gs-1', status: 'scheduled', homeGoals: null, awayGoals: null })],
      [createPrediction({ matchId: 'gs-1' })],
      'user-1',
    )
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('returns empty map with empty inputs', () => {
    const result = getUserMatchPointsMap([], [], 'user-1')
    expect(Object.keys(result)).toHaveLength(0)
  })
})
