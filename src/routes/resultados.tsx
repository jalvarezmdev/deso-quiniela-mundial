import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ResultadosMatchCard } from '#/components/resultados-match-card'
import { useApp } from '#/context/app-context'
import { invokeAuthenticatedQuinielasAction, type ListMyMatchPointsResultDTO } from '#/lib/quinielas-api'
import { getGroupMatchRoundMap } from '#/lib/group-rounds'
import { getTeam } from '#/lib/teams'
import { toVenDateTimeLabel } from '#/lib/time'
import { PHASES, type PhaseKey } from '#/lib/types'

export const Route = createFileRoute('/resultados')({
  component: ResultadosPage,
})

function ResultadosPage() {
  const { state, refreshLive, scoringMode, sessionToken } = useApp()
  const [countryFilter, setCountryFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('todos')
  const [matchdayFilter, setMatchdayFilter] = useState('todas')
  const [matchPoints, setMatchPoints] = useState<Record<string, number>>({})

  useEffect(() => {
    if (scoringMode !== 'per_match' || !sessionToken) return

    invokeAuthenticatedQuinielasAction<Record<string, never>, ListMyMatchPointsResultDTO>(
      'list_my_match_points',
      sessionToken,
      {},
    ).then((response) => {
      if (response.ok) {
        const map: Record<string, number> = {}
        for (const entry of response.data.matchPoints) {
          map[entry.matchId] = entry.points
        }
        setMatchPoints(map)
      }
    })
  }, [scoringMode, sessionToken])

  useEffect(() => {
    refreshLive()
    const timer = window.setInterval(() => {
      refreshLive()
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [refreshLive])

  const sortedMatches = useMemo(
    () =>
      [...state.matches].sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()),
    [state.matches],
  )
  const groupRoundMap = useMemo(() => getGroupMatchRoundMap(sortedMatches), [sortedMatches])

  function phaseLabel(phase: PhaseKey): string {
    return PHASES.find((item) => item.key === phase)?.label ?? phase
  }

  function matchdayLabel(matchId: string, phase: PhaseKey): string {
    if (phase === 'groups') {
      const round = groupRoundMap.get(matchId)
      if (round) return `Jornada ${round}`
    }
    return phaseLabel(phase)
  }

  const allGroups = useMemo(() => {
    const groupSet = new Set<string>()
    for (const match of sortedMatches) {
      groupSet.add((match.groupName ?? 'Sin grupo').trim() || 'Sin grupo')
    }
    return [...groupSet].sort((a, b) => a.localeCompare(b))
  }, [sortedMatches])

  const allMatchdays = useMemo(() => {
    const matchdaySet = new Set<string>()
    for (const match of sortedMatches) {
      matchdaySet.add(matchdayLabel(match.id, match.phase))
    }
    return [...matchdaySet].sort((a, b) => a.localeCompare(b, 'es'))
  }, [sortedMatches, groupRoundMap])

  const filteredMatches = useMemo(() => {
    const normalizedCountryFilter = countryFilter.trim().toLowerCase()

    return sortedMatches.filter((match) => {
      const home = getTeam(match.homeTeamId)
      const away = getTeam(match.awayTeamId)
      const normalizedGroup = (match.groupName ?? 'Sin grupo').trim() || 'Sin grupo'
      const normalizedMatchday = matchdayLabel(match.id, match.phase)

      const countryPass =
        normalizedCountryFilter.length === 0 ||
        home.name.toLowerCase().includes(normalizedCountryFilter) ||
        away.name.toLowerCase().includes(normalizedCountryFilter)
      const groupPass = groupFilter === 'todos' || normalizedGroup === groupFilter
      const matchdayPass = matchdayFilter === 'todas' || normalizedMatchday === matchdayFilter

      return countryPass && groupPass && matchdayPass
    })
  }, [countryFilter, groupFilter, matchdayFilter, sortedMatches, groupRoundMap])

  const matchesByMatchday = useMemo(() => {
    const grouped = new Map<string, typeof filteredMatches>()
    for (const match of filteredMatches) {
      const key = matchdayLabel(match.id, match.phase)
      const current = grouped.get(key) ?? []
      current.push(match)
      grouped.set(key, current)
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([label, matches]) => ({ label, matches }))
  }, [filteredMatches, groupRoundMap])

  return (
    <RequireAuth>
      <PageShell
        title="Resultados del dia"
        subtitle="Fixture base desde matches + marcadores sincronizados por scraper/admin. Horario oficial America/Caracas."
      >
        <div className="mb-5 rounded-2xl border border-[var(--accent)]/60 bg-[var(--accent)]/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]/90">
                Feed oficial
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Ultima sincronizacion:{' '}
                {state.lastLiveSyncAt ? toVenDateTimeLabel(state.lastLiveSyncAt) : 'sin sincronizar'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refreshLive()}>
              Refrescar
            </Button>
          </div>
        </div>

        <section className="mb-5 grid gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Buscar pais
            <Input
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              placeholder="Ej: Mexico, Argentina..."
            />
          </label>

          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Grupo</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
                  groupFilter === 'todos'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--secondary)]'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                }`}
                onClick={() => setGroupFilter('todos')}
              >
                Todos
              </button>
              {allGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
                    groupFilter === group
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--secondary)]'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                  }`}
                  onClick={() => setGroupFilter(group)}
                >
                  {group.replace('Grupo ', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Seleccionar jornada</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  matchdayFilter === 'todas'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--secondary)]'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                }`}
                onClick={() => setMatchdayFilter('todas')}
              >
                Todas
              </button>
              {allMatchdays.map((matchday) => (
                <button
                  key={matchday}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    matchdayFilter === matchday
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--secondary)]'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                  }`}
                  onClick={() => setMatchdayFilter(matchday)}
                >
                  {matchday}
                </button>
              ))}
            </div>
          </div>
        </section>

        {matchesByMatchday.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            No hay partidos para el filtro seleccionado.
          </p>
        ) : (
          <section className="grid gap-4">
            {matchesByMatchday.map((bucket) => (
              <div key={bucket.label} className="grid gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">{bucket.label}</h3>
                {bucket.matches.map((match) => {
                  const home = getTeam(match.homeTeamId)
                  const away = getTeam(match.awayTeamId)

                  return (
                    <div key={match.id}>
                      <ResultadosMatchCard
                        match={match}
                        home={home}
                        away={away}
                        phaseLabel={phaseLabel(match.phase)}
                        isLiveHighlighted={match.status === 'live'}
                      />
                      {scoringMode === 'per_match' && matchPoints[match.id] !== undefined && (
                        <p className="mt-1 text-sm font-medium text-green-600">
                          +{matchPoints[match.id]} puntos
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </section>
        )}
      </PageShell>
    </RequireAuth>
  )
}
