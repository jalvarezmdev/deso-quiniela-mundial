import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AppProvider } from '#/context/app-context'
import { useApp } from '#/context/app-context'
import { Footer } from '#/components/layout/footer'
import { Header } from '#/components/layout/header'
import { LoadingScreen } from '#/components/layout/loading-screen'
import { Toaster } from 'react-hot-toast'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Quiniela Mundial 2026',
      },
      {
        name: 'description',
        content: 'App para montar quinielas por fases con resultados en vivo y ranking.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning className="min-h-screen">
        <AppProvider>
          <RootLayout>{children}</RootLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0f1d2d',
                color: '#e5e7eb',
                border: '1px solid #243447',
              },
              success: {
                style: {
                  border: '1px solid #84cc16',
                },
              },
              error: {
                style: {
                  border: '1px solid #ef4444',
                },
              },
            }}
          />
        </AppProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

export function RootLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useApp()

  if (!ready) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[var(--surface-0)]">
        <LoadingScreen />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="relative flex-1 overflow-hidden pb-20 md:pb-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(80% 120% at 50% -10%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, #030507 0%, #080c11 52%, #04070a 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 8px)',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-28 -top-20 -z-10 rotate-[18deg]">
          <div className="h-[120vh] w-12 bg-[#6f00ff]/90" />
          <div className="mt-4 h-[120vh] w-14 bg-[#b9ff00]/90" />
          <div className="mt-4 h-[120vh] w-20 bg-[#ff4a16]/95" />
        </div>
        {children}
      </div>
      {!currentUser ? <Footer /> : null}
    </div>
  )
}
