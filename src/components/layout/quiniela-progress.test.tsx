// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuinielaProgress } from './quiniela-progress'

describe('QuinielaProgress', () => {
  afterEach(() => {
    cleanup()
  })

  it('disables final submission while confirmation is not allowed', () => {
    render(
      <QuinielaProgress
        savedMatchesCount={1}
        totalMatchesCount={2}
        missingFixtureCount={0}
        missingPredictionCount={1}
        savedProgress={50}
        editable
        canConfirmPhase={false}
        onConfirmPhase={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /enviar quiniela final/i }).hasAttribute('disabled')).toBe(true)
  })

  it('shows missing prediction copy when saved predictions are incomplete', () => {
    render(
      <QuinielaProgress
        savedMatchesCount={1}
        totalMatchesCount={3}
        missingFixtureCount={0}
        missingPredictionCount={2}
        savedProgress={33}
        editable
        canConfirmPhase={false}
        onConfirmPhase={vi.fn()}
      />,
    )

    expect(screen.getByText('Faltan 2 pronosticos para habilitar confirmacion.')).toBeTruthy()
  })

  it('renders no progress bar when phase confirmation is disabled', () => {
    render(
      <QuinielaProgress
        savedMatchesCount={1}
        totalMatchesCount={1}
        missingFixtureCount={0}
        missingPredictionCount={0}
        savedProgress={100}
        editable
        canConfirmPhase={false}
        showConfirmPhase={false}
        onConfirmPhase={vi.fn()}
      />,
    )

    expect(screen.queryByText(/progreso quiniela/i)).toBeNull()
    expect(screen.queryByText(/1 \/ 1 cargados/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /guardar borrador/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /enviar quiniela final/i })).toBeNull()
  })
})
