// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TEAMS } from '#/lib/teams'
import { Route } from './admin'

const appState = vi.hoisted(() => ({
  state: {
    users: [],
    matches: [],
    predictions: [],
    submissions: [],
    windowOverrides: [],
    lastLiveSyncAt: null,
  },
  setMatchResult: vi.fn(),
  createMatch: vi.fn(),
  deleteMatch: vi.fn(),
  setPhaseOverride: vi.fn(),
  getPhaseWindowAtNow: vi.fn(() => ({
    opensAt: new Date('2026-06-28T00:00:00.000Z'),
    closesAt: new Date('2026-06-29T00:00:00.000Z'),
  })),
  resetUserPin: vi.fn(),
  softDeleteUser: vi.fn(),
  refreshUsers: vi.fn(),
  currentUser: {
    id: 'admin-1',
    email: 'admin@example.com',
    nickname: 'Admin',
    teamId: 'arg',
    isAdmin: true,
    onboardingCompleted: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  scoringMode: 'phase_confirmation',
  getScoringConfig: vi.fn(async () => undefined),
  updateScoringConfig: vi.fn(),
  forcedActivePhase: null,
  getForcedActivePhase: vi.fn(async () => undefined),
  updateForcedActivePhase: vi.fn(),
}))

vi.mock('#/context/app-context', () => ({
  useApp: () => appState,
}))

vi.mock('#/components/layout/require-auth', () => ({
  RequireAdmin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('AdminPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('uses country selects for creating match teams', () => {
    const AdminPage = Route.options.component!

    render(<AdminPage />)

    const homeSelect = screen.getByRole('combobox', { name: /local/i })
    const awaySelect = screen.getByRole('combobox', { name: /visitante/i })

    expect(homeSelect).toHaveProperty('name', 'homeTeamId')
    expect(awaySelect).toHaveProperty('name', 'awayTeamId')
    expect(homeSelect).toHaveProperty('value', TEAMS[0]?.id)
    expect(awaySelect).toHaveProperty('value', TEAMS[1]?.id)
    expect(screen.getAllByRole('option', { name: /argentina/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('option', { name: /brazil/i }).length).toBeGreaterThanOrEqual(2)
  })
})
