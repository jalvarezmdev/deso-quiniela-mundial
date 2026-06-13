// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuinielaMatchFlow } from './quiniela-match-flow'
import {
  QuinielaMatchFlowProvider,
  useQuinielaMatchFlowController,
  type SavePredictionInput,
} from './quiniela-match-flow-context'
import type { Match, Prediction } from '#/lib/types'

function futureKickoffAt(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString()
}

function createMatch(id: string, homeTeamId: string, awayTeamId: string): Match {
  return {
    id,
    phase: 'groups',
    groupName: 'Grupo A',
    homeTeamId,
    awayTeamId,
    kickoffAt: futureKickoffAt(),
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    qualifiedTeamId: null,
    manualOverride: false,
  }
}

const matches = [
  createMatch('match-1', 'mex', 'zaf'),
  createMatch('match-2', 'usa', 'can'),
]

type RenderFlowOptions = {
  flowMatches?: Match[]
  predictions?: Prediction[]
  queryClient?: QueryClient
  autoOpen?: boolean
  savePrediction?: (input: SavePredictionInput) => Promise<{ ok: true } | { ok: false; message: string }>
  onComplete?: () => void
  onSaveError?: (message: string) => void
}

type FlowHarnessOptions = Omit<RenderFlowOptions, 'queryClient'>

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function FlowHarness({
  flowMatches = matches,
  predictions = [],
  autoOpen = true,
  savePrediction = vi.fn().mockResolvedValue({ ok: true }),
  onComplete = () => undefined,
  onSaveError = () => undefined,
}: FlowHarnessOptions) {
  const hasAutoOpened = useRef(false)
  const controller = useQuinielaMatchFlowController({
    userId: 'user-1',
    phase: 'groups',
    roundFilter: 'all',
    matches: flowMatches,
    predictions,
    savePrediction,
    onComplete,
    onSaveError,
  })

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current && !controller.isOpen) {
      hasAutoOpened.current = true
      controller.open()
    }
  }, [autoOpen, controller])

  return (
    <QuinielaMatchFlowProvider value={controller}>
      <QuinielaMatchFlow />
    </QuinielaMatchFlowProvider>
  )
}

function renderFlow(options: RenderFlowOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <FlowHarness
        flowMatches={options.flowMatches}
        predictions={options.predictions}
        autoOpen={options.autoOpen}
        savePrediction={options.savePrediction}
        onComplete={options.onComplete}
        onSaveError={options.onSaveError}
      />
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

describe('QuinielaMatchFlow', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the first match and advances after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true })
    renderFlow({ savePrediction: onSave })

    expect(await screen.findByText('1 / 2')).toBeTruthy()
    expect(screen.getByLabelText(/mex/i)).toBeTruthy()

    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))

    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())
    expect(screen.getByLabelText(/usa/i)).toBeTruthy()
    expect(onSave).toHaveBeenCalledWith({
      phase: 'groups',
      matchId: 'match-1',
      homeGoals: 0,
      awayGoals: 0,
      predictedQualifiedTeamId: null,
    })
  })

  it('stays on the same match after a failed save', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, message: 'No se pudo guardar.' })
    const onSaveError = vi.fn()
    renderFlow({ savePrediction: onSave, onSaveError })

    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSaveError).toHaveBeenCalledWith('No se pudo guardar.')
    expect(screen.getByText('1 / 2')).toBeTruthy()
    expect(screen.getByLabelText(/mex/i)).toBeTruthy()
  })

  it('closes and completes after saving the last match', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true })
    const onComplete = vi.fn()
    renderFlow({ flowMatches: [matches[0]!], savePrediction: onSave, onComplete })

    fireEvent.click(await screen.findByRole('button', { name: /finalizar/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('prefills predictions for the active flow match', async () => {
    const prediction: Prediction = {
      userId: 'user-1',
      phase: 'groups',
      matchId: 'match-1',
      homeGoals: 4,
      awayGoals: 2,
      predictedQualifiedTeamId: null,
      updatedAt: '2026-06-10T20:00:00.000Z',
    }

    renderFlow({ predictions: [prediction] })

    await waitFor(() =>
      expect((screen.getByLabelText(/mex/i) as HTMLInputElement).value).toBe('4'),
    )
    expect((screen.getByLabelText(/zaf/i) as HTMLInputElement).value).toBe('2')
  })

  it('renders as a modal dialog, focuses the first score input, and closes on Escape', async () => {
    renderFlow()

    expect(await screen.findByRole('dialog', { name: /cargar quiniela/i })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/mex/i)))

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes from the first match when using the close button in the form', async () => {
    renderFlow()

    fireEvent.click(await screen.findByRole('button', { name: /^cerrar$/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('moves to the previous match when canceling after the first match', async () => {
    renderFlow()

    fireEvent.change(await screen.findByRole('combobox', { name: /buscar partido/i }), {
      target: { value: 'match-2' },
    })
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /anterior/i }))

    await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())
    expect(screen.getByRole('dialog', { name: /cargar quiniela/i })).toBeTruthy()
    expect(screen.getByLabelText(/mex/i)).toBeTruthy()
  })

  it('closes from a later match when using the top close button', async () => {
    renderFlow()

    fireEvent.change(await screen.findByRole('combobox', { name: /buscar partido/i }), {
      target: { value: 'match-2' },
    })
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /cerrar cargar quiniela/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes with the top close button while a save is pending', async () => {
    const onSave = vi.fn(
      () => new Promise<{ ok: true }>(() => undefined),
    )
    renderFlow({ savePrediction: onSave })

    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByRole('button', { name: /cerrar cargar quiniela/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes on Escape while a save is pending', async () => {
    const onSave = vi.fn(
      () => new Promise<{ ok: true }>(() => undefined),
    )
    renderFlow({ savePrediction: onSave })

    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('jumps to a selected match from the top search control', async () => {
    renderFlow()

    fireEvent.change(await screen.findByRole('combobox', { name: /buscar partido/i }), {
      target: { value: 'match-2' },
    })

    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())
    expect(screen.getByLabelText(/usa/i)).toBeTruthy()
  })

  it('remounts the dialog panel when selecting a different match', async () => {
    renderFlow()

    const firstPanel = await screen.findByTestId('quiniela-flow-dialog-panel')

    fireEvent.change(await screen.findByRole('combobox', { name: /buscar partido/i }), {
      target: { value: 'match-2' },
    })

    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())

    const secondPanel = await screen.findByTestId('quiniela-flow-dialog-panel')
    expect(secondPanel).not.toBe(firstPanel)
  })

  it('preserves the active match when remounted with the same query client and scope', async () => {
    const queryClient = createTestQueryClient()
    const firstView = renderFlow({ queryClient })

    fireEvent.change(await screen.findByRole('combobox', { name: /buscar partido/i }), {
      target: { value: 'match-2' },
    })
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())

    firstView.unmount()
    renderFlow({ queryClient, autoOpen: false })

    expect(await screen.findByText('2 / 2')).toBeTruthy()
    expect(screen.getByLabelText(/usa/i)).toBeTruthy()
  })
})
