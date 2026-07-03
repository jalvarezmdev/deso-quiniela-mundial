// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchCard } from './match-card'
import type { Match, Prediction, Team } from '#/lib/types'

vi.mock('#/components/match-predictions-dialog', () => ({
  MatchPredictionsDialog: () => null,
}))

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

const prediction: Prediction = {
  userId: 'u1',
  phase: 'groups',
  matchId: 'm-1',
  homeGoals: 2,
  awayGoals: 1,
  predictedQualifiedTeamId: null,
  updatedAt: '2026-06-10T12:00:00.000Z',
}

describe('MatchCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders group and phase metadata line', () => {
    const match = createMatch()
    render(<MatchCard match={match} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('GRUPO A · Fase de Grupos')).toBeTruthy()
  })

  it('maps statuses to compact labels', () => {
    const scheduled = createMatch()
    const live = createMatch({ id: 'm-2', status: 'live' })
    const final = createMatch({ id: 'm-3', status: 'final' })

    const { rerender } = render(
      <MatchCard match={scheduled} home={home} away={away} phaseLabel="Fase de Grupos" />,
    )
    expect(screen.getByText('PRG')).toBeTruthy()

    rerender(<MatchCard match={live} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('LIVE')).toBeTruthy()

    rerender(<MatchCard match={final} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('FT')).toBeTruthy()
  })

  it('shows hyphen fallback scores when goals are null', () => {
    const match = createMatch({ homeGoals: null, awayGoals: null })
    render(<MatchCard match={match} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getAllByText('-')).toHaveLength(2)
  })

  it('adds live highlight styles for live matches', () => {
    const match = createMatch({ status: 'live' })
    const { container } = render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
      />,
    )

    const card = container.firstElementChild
    expect(card?.className.includes('ring-lime-400/30')).toBe(true)
  })

  it('shows Ver Resultados button only when match status is final or live', () => {
    const scheduled = createMatch()
    const { rerender } = render(
      <MatchCard match={scheduled} home={home} away={away} phaseLabel="Fase de Grupos" />,
    )
    expect(screen.queryByText('Ver Resultados')).toBeNull()

    const final = createMatch({ status: 'final' })
    rerender(<MatchCard match={final} home={home} away={away} phaseLabel="Fase de Grupos" />)
    expect(screen.getByText('Ver Resultados')).toBeTruthy()
  })

  it('shows Tu prediccion badge when prediction is provided', () => {
    const match = createMatch({ status: 'final', homeGoals: 2, awayGoals: 1 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        prediction={prediction}
      />,
    )
    expect(screen.getByText('Tu prediccion: 2-1')).toBeTruthy()
  })

  it('shows Sin prediccion label when prediction is null', () => {
    const match = createMatch({ status: 'final', homeGoals: 2, awayGoals: 1 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        prediction={null}
      />,
    )
    expect(screen.getByText('Sin prediccion')).toBeTruthy()
  })

  it('hides prediction row when prediction is undefined', () => {
    const match = createMatch({ status: 'final', homeGoals: 2, awayGoals: 1 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
      />,
    )
    expect(screen.queryByText('Tu prediccion')).toBeNull()
    expect(screen.queryByText('Sin prediccion')).toBeNull()
  })

  it('shows points trophy chip when points are provided', () => {
    const match = createMatch({ status: 'final', homeGoals: 2, awayGoals: 1 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        points={3}
      />,
    )
    expect(screen.getByText('+3 pts')).toBeTruthy()
  })

  it('shows admin result button only for live matches with save handler', () => {
    const onSaveLiveResult = vi.fn()
    const scheduled = createMatch()
    const { rerender } = render(
      <MatchCard
        match={scheduled}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        canEditLiveResult
        onSaveLiveResult={onSaveLiveResult}
      />,
    )
    expect(screen.queryByText('Cargar resultado')).toBeNull()

    const live = createMatch({ status: 'live', homeGoals: 0, awayGoals: 0 })
    rerender(
      <MatchCard
        match={live}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        canEditLiveResult
        onSaveLiveResult={onSaveLiveResult}
      />,
    )
    expect(screen.getByText('Cargar resultado')).toBeTruthy()
  })

  it('saves a live group-stage result from the admin dialog', async () => {
    const onSaveLiveResult = vi.fn(async () => ({ ok: true as const }))
    const match = createMatch({ status: 'live', homeGoals: 1, awayGoals: 0 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        canEditLiveResult
        onSaveLiveResult={onSaveLiveResult}
      />,
    )

    fireEvent.click(screen.getByText('Cargar resultado'))
    fireEvent.change(screen.getByLabelText('Goles Argentina'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Goles Brasil'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Estatus'), { target: { value: 'final' } })
    fireEvent.click(screen.getByText('Guardar resultado'))

    await waitFor(() => {
      expect(onSaveLiveResult).toHaveBeenCalledWith({
        matchId: 'm-1',
        homeGoals: 2,
        awayGoals: 1,
        qualifiedTeamId: null,
        status: 'final',
      })
    })
  })

  it('shows an error when the admin live result save fails', async () => {
    const onSaveLiveResult = vi.fn(async () => ({
      ok: false as const,
      message: 'No se pudo guardar.',
    }))
    const match = createMatch({ status: 'live', homeGoals: 1, awayGoals: 0 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        canEditLiveResult
        onSaveLiveResult={onSaveLiveResult}
      />,
    )

    fireEvent.click(screen.getByText('Cargar resultado'))
    fireEvent.click(screen.getByText('Guardar resultado'))

    expect(await screen.findByText('No se pudo guardar.')).toBeTruthy()
    expect(screen.getByText('Guardar resultado')).toBeTruthy()
  })

  it('recovers when the admin live result save throws', async () => {
    const onSaveLiveResult = vi.fn(async () => {
      throw new Error('network')
    })
    const match = createMatch({ status: 'live', homeGoals: 1, awayGoals: 0 })
    render(
      <MatchCard
        match={match}
        home={home}
        away={away}
        phaseLabel="Fase de Grupos"
        canEditLiveResult
        onSaveLiveResult={onSaveLiveResult}
      />,
    )

    fireEvent.click(screen.getByText('Cargar resultado'))
    fireEvent.click(screen.getByText('Guardar resultado'))

    expect(await screen.findByText('No se pudo guardar el resultado.')).toBeTruthy()
    expect(screen.getByText('Guardar resultado')).toBeTruthy()
  })
})
