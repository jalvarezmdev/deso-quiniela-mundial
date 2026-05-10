import { Link, Navigate } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Card } from '#/components/ui/card'
import { useApp } from '#/context/app-context'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { currentUser } = useApp()

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  if (!currentUser.onboardingCompleted) {
    return <Navigate to="/onboarding" />
  }

  return (
    <RequireAuth>
      <PageShell
        title="Panel principal"
        subtitle="Sigue resultados del dia, revisa posiciones y monta tu quiniela por fases"
      >
        <section className="grid gap-4 md:grid-cols-3">
          <Link to="/resultados" className="no-underline">
            <Card className="h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50">
              <h2 className="text-lg font-bold text-[var(--primary)]">Resultados del dia</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Partidos en vivo, finalizados y horario en Venezuela.
              </p>
            </Card>
          </Link>

          <Link to="/posiciones" className="no-underline">
            <Card className="h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50">
              <h2 className="text-lg font-bold text-[var(--primary)]">Posiciones</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Ranking por puntos, exactos y desempates.
              </p>
            </Card>
          </Link>

          <Link to="/quiniela" className="no-underline">
            <Card className="h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50">
              <h2 className="text-lg font-bold text-[var(--primary)]">Montar quiniela</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Completa y confirma solo la fase habilitada.
              </p>
            </Card>
          </Link>
        </section>
      </PageShell>
    </RequireAuth>
  )
}
