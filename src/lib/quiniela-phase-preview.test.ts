import { describe, expect, it } from 'vitest'
import { resolveDisplayedPhase } from '#/lib/quiniela-phase-preview'
import type { PhaseKey } from '#/lib/types'

const ACTIVE_PHASE: PhaseKey = 'groups'

describe('resolveDisplayedPhase', () => {
  it('returns active phase for non-admin users', () => {
    expect(resolveDisplayedPhase(ACTIVE_PHASE, false, 'semifinals')).toBe('groups')
  })

  it('returns active phase when preview phase is missing', () => {
    expect(resolveDisplayedPhase(ACTIVE_PHASE, true, undefined)).toBe('groups')
  })

  it('returns active phase when preview phase is invalid', () => {
    expect(resolveDisplayedPhase(ACTIVE_PHASE, true, 'invalid')).toBe('groups')
  })

  it('returns preview phase for admins when valid', () => {
    expect(resolveDisplayedPhase(ACTIVE_PHASE, true, 'semifinals')).toBe('semifinals')
  })
})
