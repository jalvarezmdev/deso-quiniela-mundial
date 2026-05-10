import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { PHASES } from '#/lib/types'
import { useApp } from '#/context/app-context'

export function Header() {
  const { currentUser, logout, activePhase } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const phaseLabel = PHASES.find((phase) => phase.key === activePhase)?.label ?? activePhase

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--secondary)]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="inline-flex items-center no-underline">
          <img src="/desocupaos-white.png" alt="Deso Cupaos" className="h-10 w-auto md:h-12" />
        </Link>

        {currentUser ? (
          <>
            <nav className="ml-4 hidden items-center gap-2 md:flex">
              {[
                ['/', 'Inicio'],
                ['/resultados', 'Resultados'],
                ['/posiciones', 'Posiciones'],
                ['/quiniela', 'Montar quiniela'],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  to={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium no-underline transition ${
                    location.pathname === href
                      ? 'bg-[var(--accent)] text-zinc-900'
                      : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {currentUser.isAdmin ? (
                <Link
                  to="/admin"
                  className={`rounded-md px-3 py-2 text-sm font-medium no-underline transition ${
                    location.pathname === '/admin'
                      ? 'bg-[var(--accent)] text-zinc-900'
                      : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  Admin
                </Link>
              ) : null}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-zinc-300 sm:inline">
                Fase activa: <strong>{phaseLabel}</strong>
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-semibold text-zinc-200">
                {currentUser.nickname}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  logout()
                  navigate({ to: '/ingreso' })
                }}
              >
                Salir
              </Button>
            </div>
          </>
        ) : (
          <div className="ml-auto">
            <Link
              to="/ingreso"
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white no-underline"
            >
              Ingresar
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
