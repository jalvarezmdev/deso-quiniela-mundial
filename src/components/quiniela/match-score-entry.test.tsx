// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchScoreEntry } from './match-score-entry'
import type { Match, Prediction } from '#/lib/types'

function futureKickoffAt(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString()
}

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'mex',
    awayTeamId: 'zaf',
    kickoffAt: futureKickoffAt(),
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
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
    awayGoals: 1,
    predictedQualifiedTeamId: null,
    updatedAt: '2026-06-10T20:00:00.000Z',
    ...overrides,
  }
}

describe('MatchScoreEntry', () => {
  afterEach(() => {
    cleanup()
  })

  it('preloads an existing prediction and submits edited group scores', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch()}
        prediction={createPrediction()}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/mex/i), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/zaf/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 3,
      awayGoals: 0,
      predictedQualifiedTeamId: null,
    })
  })

  it('submits the qualified team for knockout matches', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch({ phase: 'roundOf16', homeTeamId: 'arg', awayTeamId: 'bra' })}
        prediction={null}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/arg/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/bra/i), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('combobox', { name: /clasificado final/i }), {
      target: { value: 'arg' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 1,
      awayGoals: 1,
      predictedQualifiedTeamId: 'arg',
    })
  })

  it('auto-selects the home team when home score is winning in knockout', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch({ phase: 'roundOf16', homeTeamId: 'arg', awayTeamId: 'bra' })}
        prediction={null}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/arg/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/bra/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 2,
      awayGoals: 0,
      predictedQualifiedTeamId: 'arg',
    })
  })

  it('auto-selects the away team when away score is winning in knockout', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch({ phase: 'roundOf16', homeTeamId: 'arg', awayTeamId: 'bra' })}
        prediction={null}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/arg/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/bra/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 0,
      awayGoals: 2,
      predictedQualifiedTeamId: 'bra',
    })
  })

  it('lets a clear winner overwrite a previous manual qualified team', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch({ phase: 'roundOf16', homeTeamId: 'arg', awayTeamId: 'bra' })}
        prediction={null}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: /clasificado final/i }), {
      target: { value: 'arg' },
    })
    fireEvent.change(screen.getByLabelText(/arg/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/bra/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 0,
      awayGoals: 1,
      predictedQualifiedTeamId: 'bra',
    })
  })

  it('keeps the selected qualified team when knockout score returns to a draw', () => {
    const onSubmit = vi.fn()
    render(
      <MatchScoreEntry
        match={createMatch({ phase: 'roundOf16', homeTeamId: 'arg', awayTeamId: 'bra' })}
        prediction={createPrediction({
          phase: 'roundOf16',
          homeGoals: 1,
          awayGoals: 1,
          predictedQualifiedTeamId: 'arg',
        })}
        isSaving={false}
        onCancel={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/arg/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/bra/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      homeGoals: 2,
      awayGoals: 2,
      predictedQualifiedTeamId: 'arg',
    })
  })
})
