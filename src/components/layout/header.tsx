import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { BarChart3, Home, LogOut, Settings, Trophy, UserCircle2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { PHASES } from '#/lib/types'
import { useApp } from '#/context/app-context'

export function Header() {
  const { currentUser, logout, activePhase } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const phaseLabel = PHASES.find((phase) => phase.key === activePhase)?.label ?? activePhase
  const navItems = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/resultados', label: 'Resultados', icon: Trophy },
    { to: '/posiciones', label: 'Posiciones', icon: BarChart3 },
    { to: '/quiniela', label: 'Quiniela', icon: UserCircle2 },
  ] as const

  const allNavItems = currentUser?.isAdmin
    ? [...navItems, { to: '/admin', label: 'Admin', icon: Settings }]
    : navItems

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--secondary)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="inline-flex items-center no-underline">
          <img src="/desocupaos-white.png" alt="Deso Cupaos" className="h-10 w-auto md:h-12" />
        </Link>

        {currentUser ? (
          <>
            <nav className="ml-4 hidden items-center gap-2 md:flex">
              {allNavItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium no-underline transition ${
                    location.pathname === to
                      ? 'bg-white text-zinc-900'
                      : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-zinc-300 lg:inline">
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
                <LogOut size={16} />
                Salir
              </Button>
            </div>
          </>
        ) : (
          <div className="ml-auto">
            <Link
              to="/ingreso"
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-zinc-900 no-underline"
            >
              Ingresar
            </Link>
          </div>
        )}
        </div>
      </header>

      {currentUser ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--secondary)]/95 px-2 py-2 backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1">
            {allNavItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium leading-none no-underline transition ${
                  location.pathname === to
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </>
  )
}
