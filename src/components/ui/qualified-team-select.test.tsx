// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QualifiedTeamSelect } from './qualified-team-select'
import { TEAMS } from '#/lib/teams'

describe('QualifiedTeamSelect', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all classified teams and excludes non-classified ids', () => {
    render(<QualifiedTeamSelect value={TEAMS[0]!.id} onChange={() => undefined} />)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(48)
    expect(screen.queryByRole('option', { name: /Venezuela/i })).toBeNull()
  })

  it('calls onChange with selected team id', () => {
    const onChange = vi.fn()
    render(<QualifiedTeamSelect value={TEAMS[0]!.id} onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: TEAMS[1]!.id },
    })

    expect(onChange).toHaveBeenCalledWith(TEAMS[1]!.id)
  })

  it('supports disabled state', () => {
    render(<QualifiedTeamSelect value={TEAMS[0]!.id} onChange={() => undefined} disabled />)
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true)
  })
})
