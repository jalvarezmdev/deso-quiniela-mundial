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

  it('awards 1 point in knockout when predicted qualified team matches actual', () => {
    const points = computeMatchPoints(
      {
        phase: 'roundOf16',
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: 'arg',
      },
      {
        homeGoals: 0,
        awayGoals: 0,
        predictedQualifiedTeamId: 'arg',
      },
    )

    expect(points).toBe(1)
  })
})
