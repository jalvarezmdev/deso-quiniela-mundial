// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RootLayout } from './__root'

const appState = vi.hoisted(() => ({
  ready: false,
  currentUser: null,
}))

vi.mock('#/context/app-context', () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApp: () => appState,
}))

vi.mock('#/components/layout/header', () => ({
  Header: () => <header>Header</header>,
}))

vi.mock('#/components/layout/footer', () => ({
  Footer: () => <footer>Footer</footer>,
}))

vi.mock('#/components/layout/loading-screen', () => ({
  LoadingScreen: () => <div>Cargando</div>,
}))

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))

describe('RootLayout', () => {
  afterEach(() => {
    cleanup()
    appState.ready = false
    appState.currentUser = null
  })

  it('shows only a fixed loading viewport until the app is ready', () => {
    render(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
    )

    expect(screen.getByText('Cargando')).toBeTruthy()
    const loading = screen.getByText('Cargando')
    expect(screen.queryByText('Header')).toBeNull()
    expect(screen.queryByText('Footer')).toBeNull()
    expect(screen.queryByText('Page content')).toBeNull()
    expect(loading.parentElement?.className).toContain('fixed')
    expect(loading.parentElement?.className).toContain('overflow-hidden')
  })

  it('renders the app layout after initial boot is ready', () => {
    appState.ready = true

    render(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
    )

    expect(screen.getByText('Header')).toBeTruthy()
    expect(screen.getByText('Footer')).toBeTruthy()
    expect(screen.getByText('Page content')).toBeTruthy()
    expect(screen.queryByText('Cargando')).toBeNull()
  })
})
