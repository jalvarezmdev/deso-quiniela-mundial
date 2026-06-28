import { describe, expect, it } from 'vitest'
import { computeMatchPoints } from './game'

describe('computeMatchPoints', () => {
  it('awards 3 points for exact score in group stage', () => {
    const points = computeMatchPoints(
      {
        phase: 'groups',
        homeGoals: 2,
        awayGoals: 1,
        qualifiedTeamId: null,
      },
      {
        homeGoals: 2,
        awayGoals: 1,
        predictedQualifiedTeamId: null,
      },
    )

    expect(points).toBe(3)
  })

  it('awards 1 point for correct winner in group stage', () => {
    const points = computeMatchPoints(
      {
        phase: 'groups',
        homeGoals: 3,
        awayGoals: 0,
        qualifiedTeamId: null,
      },
      {
        homeGoals: 1,
        awayGoals: 0,
        predictedQualifiedTeamId: null,
      },
    )

    expect(points).toBe(1)
  })

  it('awards 1 point for predicting draw without exact score', () => {
    const points = computeMatchPoints(
      {
        phase: 'groups',
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: null,
      },
      {
        homeGoals: 0,
        awayGoals: 0,
        predictedQualifiedTeamId: null,
      },
    )

    expect(points).toBe(1)
  })

  const knockoutCases = [
    {
      name: 'non-exact draw and correct qualified team',
      outcome: { homeGoals: 1, awayGoals: 1, qualifiedTeamId: 'arg' },
      prediction: { homeGoals: 0, awayGoals: 0, predictedQualifiedTeamId: 'arg' },
      expected: 2,
    },
    {
      name: 'exact draw and correct qualified team',
      outcome: { homeGoals: 3, awayGoals: 3, qualifiedTeamId: 'arg' },
      prediction: { homeGoals: 3, awayGoals: 3, predictedQualifiedTeamId: 'arg' },
      expected: 4,
    },
    {
      name: 'exact non-draw score and correct qualified team',
      outcome: { homeGoals: 2, awayGoals: 0, qualifiedTeamId: 'arg' },
      prediction: { homeGoals: 2, awayGoals: 0, predictedQualifiedTeamId: 'arg' },
      expected: 3,
    },
    {
      name: 'exact draw and wrong qualified team',
      outcome: { homeGoals: 3, awayGoals: 3, qualifiedTeamId: 'mar' },
      prediction: { homeGoals: 3, awayGoals: 3, predictedQualifiedTeamId: 'arg' },
      expected: 3,
    },
    {
      name: 'non-exact draw and wrong qualified team',
      outcome: { homeGoals: 1, awayGoals: 1, qualifiedTeamId: 'mar' },
      prediction: { homeGoals: 0, awayGoals: 0, predictedQualifiedTeamId: 'arg' },
      expected: 1,
    },
    {
      name: 'non-draw prediction and correct qualified team after a draw',
      outcome: { homeGoals: 1, awayGoals: 1, qualifiedTeamId: 'arg' },
      prediction: { homeGoals: 2, awayGoals: 1, predictedQualifiedTeamId: 'arg' },
      expected: 1,
    },
  ] as const

  it.each(knockoutCases)('awards $expected points for $name', ({ outcome, prediction, expected }) => {
    const points = computeMatchPoints(
      { phase: 'roundOf16', ...outcome },
      prediction,
    )

    expect(points).toBe(expected)
  })
})
