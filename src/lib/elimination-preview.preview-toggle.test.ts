import { describe, expect, it } from 'vitest'
import { buildKnockoutMatchViews } from '#/lib/elimination-preview'

describe('buildKnockoutMatchViews preview toggle', () => {
  it('does not create preview cards when toggle is off', () => {
    const result = buildKnockoutMatchViews('roundOf16', [], false)
    expect(result.views[0]?.kind).toBe('placeholder')
    expect(result.views.filter((view) => view.kind === 'previewAvailable')).toHaveLength(0)
  })

  it('converts only first placeholder into previewAvailable when toggle is on', () => {
    const result = buildKnockoutMatchViews('roundOf16', [], true)
    expect(result.views[0]?.kind).toBe('previewAvailable')
    expect(result.views.filter((view) => view.kind === 'previewAvailable')).toHaveLength(1)
    expect(result.views.filter((view) => view.kind === 'placeholder')).toHaveLength(15)
  })

  it('does not affect groups phase even when toggle is on', () => {
    const result = buildKnockoutMatchViews('groups', [], true)
    expect(result.views.filter((view) => view.kind === 'previewAvailable')).toHaveLength(0)
  })
})
