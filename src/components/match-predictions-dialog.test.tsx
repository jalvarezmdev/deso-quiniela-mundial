// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchPredictionsDialog } from './match-predictions-dialog'
import type { Match } from '#/lib/types'

const match: Match = {
  id: 'm-1',
  phase: 'groups',
  groupName: 'Grupo A',
  homeTeamId: 'arg',
  awayTeamId: 'bra',
  kickoffAt: '2026-06-11T17:00:00.000Z',
  status: 'final',
  homeGoals: 2,
  awayGoals: 1,
  qualifiedTeamId: null,
  manualOverride: false,
}

vi.mock('#/context/app-context', () => ({
  useApp: () => ({
    sessionToken: 'test-token',
  }),
}))

vi.mock('#/lib/quinielas-api', () => ({
  invokeAuthenticatedQuinielasAction: vi.fn().mockResolvedValue({
    ok: true,
    data: { predictions: [] },
  }),
}))

describe('MatchPredictionsDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not render when closed', () => {
    render(<MatchPredictionsDialog match={match} open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Argentina vs Brasil')).toBeNull()
  })

  it('renders match title when open', () => {
    render(<MatchPredictionsDialog match={match} open={true} onClose={vi.fn()} />)
    const heading = screen.getByRole('heading')
    expect(heading.textContent).toContain('Argentina')
    expect(heading.textContent).toContain('Brazil')
  })
})
