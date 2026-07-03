// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchPredictionsDialog } from './match-predictions-dialog'
import type { Match } from '#/lib/types'
import { invokeAuthenticatedQuinielasAction } from '#/lib/quinielas-api'

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

  it('shows points for every user including zero', async () => {
    vi.mocked(invokeAuthenticatedQuinielasAction).mockResolvedValueOnce({
      ok: true,
      data: {
        predictions: [
          { nickname: 'Asdrubal', homeGoals: 0, awayGoals: 2, predictedQualifiedTeamId: null, points: 0 },
          { nickname: 'Juan', homeGoals: 2, awayGoals: 1, predictedQualifiedTeamId: null, points: 3 },
        ],
      },
    })

    render(<MatchPredictionsDialog match={match} open={true} onClose={vi.fn()} />)

    const zeroPoints = await screen.findByText('+0 PTS')
    const threePoints = screen.getByText('+3 PTS')

    expect(zeroPoints.nextElementSibling?.textContent).toBe('Asdrubal')
    expect(threePoints.nextElementSibling?.textContent).toBe('Juan')
  })

  it('shows knockout qualified team prediction with 4 points', async () => {
    vi.mocked(invokeAuthenticatedQuinielasAction).mockResolvedValueOnce({
      ok: true,
      data: {
        predictions: [
          {
            nickname: 'Juan Alvarez',
            homeGoals: 2,
            awayGoals: 2,
            predictedQualifiedTeamId: 'mar',
            points: 4,
          },
        ],
      },
    })

    render(
      <MatchPredictionsDialog
        match={{
          ...match,
          phase: 'roundOf16',
          homeTeamId: 'ned',
          awayTeamId: 'mar',
          homeGoals: 2,
          awayGoals: 2,
          qualifiedTeamId: 'mar',
        }}
        open={true}
        onClose={vi.fn()}
      />,
    )

    expect(await screen.findByText('+4 PTS')).toBeTruthy()
    expect(screen.getByText('Juan Alvarez')).toBeTruthy()
    expect(screen.getByText(/avanza/i).textContent).toContain('🇲🇦')
  })
})
