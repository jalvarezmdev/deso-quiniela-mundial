// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchActionButton } from './match-action-button'
import type { Match, Prediction } from '#/lib/types'

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId: 'mex',
    awayTeamId: 'zaf',
    kickoffAt: '2026-06-11T17:00:00.000Z',
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

describe('MatchActionButton', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders "Cargar" when no prediction and canEdit is true', () => {
    const onOpen = vi.fn()
    render(
      <MatchActionButton
        match={createMatch()}
        prediction={null}
        canEdit={true}
        phaseConfirmed={false}
        onOpen={onOpen}
      />,
    )
    expect(screen.getByText('Cargar')).toBeTruthy()
  })

  it('renders "Actualizar" when prediction exists and canEdit is true', () => {
    const onOpen = vi.fn()
    render(
      <MatchActionButton
        match={createMatch()}
        prediction={createPrediction()}
        canEdit={true}
        phaseConfirmed={false}
        onOpen={onOpen}
      />,
    )
    expect(screen.getByText('Actualizar')).toBeTruthy()
  })

  it('does not render when canEdit is false (match locked)', () => {
    const onOpen = vi.fn()
    render(
      <MatchActionButton
        match={createMatch()}
        prediction={null}
        canEdit={false}
        phaseConfirmed={false}
        onOpen={onOpen}
      />,
    )
    expect(screen.queryByText('Cargar')).toBeNull()
    expect(screen.queryByText('Actualizar')).toBeNull()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('does not render when phase is confirmed and prediction exists', () => {
    const onOpen = vi.fn()
    render(
      <MatchActionButton
        match={createMatch()}
        prediction={createPrediction()}
        canEdit={true}
        phaseConfirmed={true}
        onOpen={onOpen}
      />,
    )
    expect(screen.queryByText('Actualizar')).toBeNull()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('renders "Cargar" when phase is confirmed but no prediction and canEdit is true', () => {
    const onOpen = vi.fn()
    render(
      <MatchActionButton
        match={createMatch()}
        prediction={null}
        canEdit={true}
        phaseConfirmed={true}
        onOpen={onOpen}
      />,
    )
    expect(screen.getByText('Cargar')).toBeTruthy()
  })

  it('calls onOpen with the match when clicked', () => {
    const onOpen = vi.fn()
    const match = createMatch()
    render(
      <MatchActionButton
        match={match}
        prediction={null}
        canEdit={true}
        phaseConfirmed={false}
        onOpen={onOpen}
      />,
    )
    fireEvent.click(screen.getByText('Cargar'))
    expect(onOpen).toHaveBeenCalledWith(match)
  })
})
