import { describe, expect, it } from 'vitest'
import { buildKnockoutMatchViews, getEliminationPreviewSlotsByPhase } from '#/lib/elimination-preview'
import type { Match, PhaseKey } from '#/lib/types'

function createRealMatch(input: Partial<Match> & Pick<Match, 'id' | 'phase' | 'kickoffAt' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    id: input.id,
    phase: input.phase,
    groupName: input.groupName ?? null,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    kickoffAt: input.kickoffAt,
    status: input.status ?? 'scheduled',
    homeGoals: input.homeGoals ?? null,
    awayGoals: input.awayGoals ?? null,
    qualifiedTeamId: input.qualifiedTeamId ?? null,
    manualOverride: input.manualOverride ?? false,
    source: input.source,
    externalMatchRef: input.externalMatchRef ?? null,
  }
}

describe('elimination preview slots', () => {
  it('maps expected counts by phase and excludes third-place', () => {
    expect(getEliminationPreviewSlotsByPhase('roundOf16')).toHaveLength(16)
    expect(getEliminationPreviewSlotsByPhase('roundOf8')).toHaveLength(8)
    expect(getEliminationPreviewSlotsByPhase('roundOf4')).toHaveLength(4)
    expect(getEliminationPreviewSlotsByPhase('semifinals')).toHaveLength(2)
    expect(getEliminationPreviewSlotsByPhase('final')).toHaveLength(1)

    const all = [
      ...getEliminationPreviewSlotsByPhase('roundOf16'),
      ...getEliminationPreviewSlotsByPhase('roundOf8'),
      ...getEliminationPreviewSlotsByPhase('roundOf4'),
      ...getEliminationPreviewSlotsByPhase('semifinals'),
      ...getEliminationPreviewSlotsByPhase('final'),
    ]

    expect(all.some((slot) => slot.team1Slot.startsWith('L'))).toBe(false)
  })

  it('converts source date/time with utc offset into utc iso', () => {
    const first = getEliminationPreviewSlotsByPhase('roundOf16')[0]
    expect(first?.kickoffAt).toBe('2026-06-28T19:00:00.000Z')
    expect(first?.team1Slot).toBe('2A')
    expect(first?.team2Slot).toBe('2B')
  })

  it('replaces placeholders with real matches by phase + kickoff', () => {
    const real = createRealMatch({
      id: 'real-r32-1',
      phase: 'roundOf16',
      kickoffAt: '2026-06-28T19:00:00.000Z',
      homeTeamId: 'arg',
      awayTeamId: 'bra',
    })

    const result = buildKnockoutMatchViews('roundOf16', [real])

    expect(result.expectedCount).toBe(16)
    expect(result.missingCount).toBe(15)
    expect(result.views).toHaveLength(16)
    expect(result.views[0]?.kind).toBe('real')
    if (result.views[0]?.kind === 'real') {
      expect(result.views[0].match.id).toBe('real-r32-1')
    }
  })

  it('returns only real matches for non-knockout phases', () => {
    const real = createRealMatch({
      id: 'g-1',
      phase: 'groups',
      kickoffAt: '2026-06-11T19:00:00.000Z',
      homeTeamId: 'arg',
      awayTeamId: 'bra',
    })

    const result = buildKnockoutMatchViews('groups' as PhaseKey, [real])
    expect(result.expectedCount).toBe(0)
    expect(result.missingCount).toBe(0)
    expect(result.views).toHaveLength(1)
    expect(result.views[0]?.kind).toBe('real')
  })
})
