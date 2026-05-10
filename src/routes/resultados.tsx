import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'
import { toVenDateTimeLabel } from '#/lib/time'

export const Route = createFileRoute('/resultados')({
  component: ResultadosPage,
})

function ResultadosPage() {
  const { state, refreshLive } = useApp()

  useEffect(() => {
    refreshLive()
    const timer = window.setInterval(() => {
      refreshLive()
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [refreshLive])

  const sortedMatches = [...state.matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  )

  return (
    <RequireAuth>
      <PageShell
        title="Resultados del dia"
        subtitle="Fuente LIVE: scraping SofaScore (fallback manual admin). Horario oficial America/Caracas."
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Ultima sincronizacion:{' '}
            {state.lastLiveSyncAt ? toVenDateTimeLabel(state.lastLiveSyncAt) : 'sin sincronizar'}
          </p>
          <Button variant="outline" onClick={refreshLive}>
            Refrescar
          </Button>
        </div>

        <section className="grid gap-3">
          {sortedMatches.map((match) => {
            const home = getTeam(match.homeTeamId)
            const away = getTeam(match.awayTeamId)

            return (
              <Card key={match.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {match.groupName ?? 'Eliminatoria'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{toVenDateTimeLabel(match.kickoffAt)}</p>
                </div>

                <div className="flex items-center gap-3 text-lg font-black text-[var(--primary)]">
                  <span>
                    {home.flag} {home.name}
                  </span>
                  <span className="rounded-md bg-zinc-100 px-3 py-1 text-base">
                    {match.homeGoals ?? '-'} : {match.awayGoals ?? '-'}
                  </span>
                  <span>
                    {away.flag} {away.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      match.status === 'live'
                        ? 'bg-red-100 text-red-700'
                        : match.status === 'final'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-200 text-zinc-700'
                    }
                  >
                    {match.status === 'live' ? 'LIVE' : match.status === 'final' ? 'FINAL' : 'PROGRAMADO'}
                  </Badge>
                  {match.manualOverride ? <Badge className="bg-amber-100 text-amber-700">Manual</Badge> : null}
                </div>
              </Card>
            )
          })}
        </section>
      </PageShell>
    </RequireAuth>
  )
}
