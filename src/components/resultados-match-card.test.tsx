// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ResultadosMatchCard } from './resultados-match-card'
import type { Match, Team } from '#/lib/types'

const home: Team = { id: 'arg', name: 'Argentina', flag: '🇦🇷' }
const away: Team = { id: 'bra', name: 'Brasil', flag: '🇧🇷' }

function createMatch(patch: Partial<Match> = {}): Match {
  return {
    id: 'm-1',
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'arg',
    awayTeamId: 'bra',
    kickoffAt: '2026-06-11T17:00:00.000Z',
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
    ...patch,
  }
}

describe('ResultadosMatchCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders group and phase metadata line', () => {
    const match = createMatch()
    render(<ResultadosMatchCard match={match} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('GRUPO A · Fase de Grupos')).toBeTruthy()
  })

  it('maps statuses to compact labels', () => {
    const scheduled = createMatch({ status: 'scheduled' })
    const live = createMatch({ id: 'm-2', status: 'live' })
    const final = createMatch({ id: 'm-3', status: 'final' })

    const { rerender } = render(
      <ResultadosMatchCard match={scheduled} home={home} away={away} phaseLabel="Fase de Grupos" />,
    )
    expect(screen.getByText('PRG')).toBeTruthy()

    rerender(<ResultadosMatchCard match={live} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('LIVE')).toBeTruthy()

    rerender(<ResultadosMatchCard match={final} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('FT')).toBeTruthy()
  })

  it('shows hyphen fallback scores when goals are null', () => {
    const match = createMatch({ homeGoals: null, awayGoals: null })
    render(<ResultadosMatchCard match={match} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getAllByText('-')).toHaveLength(2)
  })

  it('shows manual chip only when manual override is true', () => {
    const autoMatch = createMatch({ manualOverride: false })
    const manualMatch = createMatch({ id: 'm-2', manualOverride: true })

    const { rerender } = render(
      <ResultadosMatchCard match={autoMatch} home={home} away={away} phaseLabel="Fase de Grupos" />,
    )
    expect(screen.queryByText('MANUAL')).toBeNull()

    rerender(<ResultadosMatchCard match={manualMatch} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('MANUAL')).toBeTruthy()
  })

  it('adds live highlight styles when requested', () => {
    const match = createMatch({ status: 'live' })
    const { container } = render(
      <ResultadosMatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        isLiveHighlighted
      />,
    )

    const card = container.firstElementChild
    expect(card?.className.includes('ring-lime-400/30')).toBe(true)
  })
})
