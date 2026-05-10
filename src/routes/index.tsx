import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { RequireAuth } from '#/components/layout/require-auth'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { useApp } from '#/context/app-context'
import { toVenDateTimeLabel } from '#/lib/time'
import { TEAMS, getTeam } from '#/lib/teams'
import type { Match, MatchStatus } from '#/lib/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { currentUser, state, leaderboard, updateFavoriteTeam } = useApp()
  const [selectedTeamId, setSelectedTeamId] = useState(currentUser?.teamId ?? TEAMS[0]?.id ?? 'arg')
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [isChangeFavoriteOpen, setIsChangeFavoriteOpen] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    setSelectedTeamId(currentUser.teamId)
  }, [currentUser])

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  if (!currentUser.onboardingCompleted) {
    return <Navigate to="/onboarding" />
  }

  const now = Date.now()
  const orderedMatches = [...state.matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  )

  const favoriteTeam = currentUser.teamId ? getTeam(currentUser.teamId) : null
  const favoriteMatches = favoriteTeam
    ? orderedMatches.filter(
        (match) => match.homeTeamId === favoriteTeam.id || match.awayTeamId === favoriteTeam.id,
      )
    : []

  const favoriteLatestFinal = [...favoriteMatches]
    .filter((match) => match.status === 'final')
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())[0]

  const favoriteNextMatch = favoriteMatches.find((match) => new Date(match.kickoffAt).getTime() >= now)

  const nextTournamentMatch = orderedMatches.find((match) => new Date(match.kickoffAt).getTime() >= now)

  const userStanding = leaderboard.find((row) => row.userId === currentUser.id)
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits
    const aTime = a.firstConfirmedAt ? new Date(a.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.firstConfirmedAt ? new Date(b.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })
  const userRank = sortedLeaderboard.findIndex((row) => row.userId === currentUser.id) + 1
  const leaderboardTop = sortedLeaderboard.slice(0, 5)

  return (
    <RequireAuth>
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-6">

        <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(118deg,#070b12_0%,#0a1220_36%,#0d1324_62%,#0f161e_100%)] p-6 md:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[rgba(111,0,255,0.24)] blur-3xl" />
          <div className="absolute left-[28%] top-[-7rem] h-56 w-56 rounded-full bg-[rgba(55,83,255,0.2)] blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[rgba(185,255,0,0.2)] blur-3xl" />
          <div className="absolute -bottom-28 right-[15%] h-56 w-56 rounded-full bg-[rgba(255,74,22,0.2)] blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex rounded-full border border-[rgba(185,255,0,0.45)] bg-[rgba(185,255,0,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#cfff4f]">
              Quiniela Mundial 2026
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
              Tu panel de juego, <span className="text-[#b9ff00]">en tiempo real</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-200 md:text-base">
              Sigue a tu equipo, revisa tus puntos y escala posiciones con cada jornada.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/quiniela"
                className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-black no-underline transition hover:brightness-110"
              >
                Ir a mi quiniela
              </Link>
              <Link
                to="/posiciones"
                className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-[rgba(9,18,29,0.7)] px-5 text-sm font-semibold text-white no-underline transition hover:bg-[rgba(14,26,40,0.9)]"
              >
                Ver posiciones
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Tu score" value={userStanding ? `${userStanding.points} pts` : 'Sin puntos'} accent="lime" />
          <KpiCard title="Tu posicion" value={userRank > 0 ? `#${userRank}` : 'Sin ranking'} accent="violet" />
          <MatchKpiCard title="Proximo de tu equipo" match={favoriteNextMatch} status="scheduled" />
          <MatchKpiCard title="Proximo del torneo" match={nextTournamentMatch} status="scheduled" />
        </section>

        {!favoriteTeam ? (
          <section className="mt-6">
            <Card className="border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.08)]">
              <h2 className="text-xl font-bold text-[var(--primary)]">Elige tu equipo favorito</h2>
              <p className="mt-2 text-sm text-zinc-200">
                Completa tu perfil para activar widgets personalizados de resultados y proximos
                partidos.
              </p>
              <div className="mt-4">
                <Link
                  to="/onboarding"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--secondary)] no-underline"
                >
                  Elegir equipo favorito
                </Link>
              </div>
            </Card>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="border-[rgba(111,0,255,0.38)] bg-[linear-gradient(180deg,rgba(14,18,30,0.94)_0%,rgba(12,17,25,0.94)_100%)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Tu equipo favorito</p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {favoriteTeam.flag} {favoriteTeam.name}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedTeamId(currentUser.teamId)
                    setIsChangeFavoriteOpen(true)
                  }}
                >
                  Cambiar
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MatchDetailCard title="Ultimo resultado" match={favoriteLatestFinal} emptyLabel="Sin partidos finalizados" />
                <MatchDetailCard title="Siguiente partido" match={favoriteNextMatch} emptyLabel="No hay proximos partidos" />
              </div>
            </Card>

            <Card className="border-[rgba(55,83,255,0.32)] bg-[linear-gradient(180deg,rgba(10,17,27,0.95)_0%,rgba(10,16,22,0.95)_100%)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Leaderboard</p>
                  <h2 className="mt-1 text-xl font-black text-white">Top de la quiniela</h2>
                </div>
                <Link to="/posiciones" className="text-sm font-semibold text-[var(--primary)] no-underline">
                  Ir a posiciones
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {leaderboardTop.length === 0 ? (
                  <p className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-3 py-4 text-sm text-zinc-300">
                    Todavia no hay posiciones calculadas.
                  </p>
                ) : (
                  leaderboardTop.map((row, idx) => (
                    <div
                      key={row.userId}
                      className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                    >
                      <p className="text-sm text-white">
                        <span className="mr-2 text-zinc-400">#{idx + 1}</span>
                        {row.nickname}
                      </p>
                      <p className="text-sm font-semibold text-[var(--primary)]">{row.points} pts</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>
        )}

        {isChangeFavoriteOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              if (savingFavorite) return
              setIsChangeFavoriteOpen(false)
            }}
          >
            <Card className="w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
              <h2 className="text-xl font-black text-[var(--primary)]">Cambiar pais favorito</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Selecciona tu equipo y confirma para actualizar tu perfil.
              </p>

              <div className="mt-4">
                <select
                  value={selectedTeamId}
                  onChange={(event) => setSelectedTeamId(event.target.value)}
                  disabled={savingFavorite}
                  className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white"
                >
                  {TEAMS.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.flag} {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangeFavoriteOpen(false)}
                  disabled={savingFavorite}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={savingFavorite || selectedTeamId === currentUser.teamId}
                  onClick={async () => {
                    setSavingFavorite(true)
                    const result = await updateFavoriteTeam(selectedTeamId)
                    setSavingFavorite(false)
                    if (!result.ok) {
                      toast.error(result.message)
                      return
                    }
                    toast.success('Pais favorito actualizado.')
                    setIsChangeFavoriteOpen(false)
                  }}
                >
                  {savingFavorite ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </main>
    </RequireAuth>
  )
}

function KpiCard({
  title,
  value,
  accent = 'blue',
}: {
  title: string
  value: string
  accent?: 'blue' | 'lime' | 'violet'
}) {
  const accentStyles =
    accent === 'lime'
      ? 'border-[rgba(185,255,0,0.4)] shadow-[0_0_28px_rgba(185,255,0,0.14)]'
      : accent === 'violet'
        ? 'border-[rgba(111,0,255,0.42)] shadow-[0_0_28px_rgba(111,0,255,0.18)]'
        : 'border-[rgba(55,83,255,0.4)] shadow-[0_0_28px_rgba(55,83,255,0.14)]'

  return (
    <Card
      className={`bg-[linear-gradient(180deg,#101b28_0%,#0b151f_100%)] ${accentStyles}`}
    >
      <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </Card>
  )
}

function MatchKpiCard({ title, match, status }: { title: string; match?: Match; status: MatchStatus }) {
  const home = match ? getTeam(match.homeTeamId) : null
  const away = match ? getTeam(match.awayTeamId) : null

  return (
    <Card className="bg-[linear-gradient(180deg,#111d29_0%,#0c1722_100%)]">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
      {!match || !home || !away ? (
        <p className="mt-3 text-sm text-zinc-300">Sin datos por ahora.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-white">
            {home.flag} {home.name} vs {away.flag} {away.name}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{toVenDateTimeLabel(match.kickoffAt)}</p>
          {status === 'scheduled' ? null : (
            <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
              {match.homeGoals} - {match.awayGoals}
            </p>
          )}
        </>
      )}
    </Card>
  )
}

function MatchDetailCard({
  title,
  match,
  emptyLabel,
}: {
  title: string
  match?: Match
  emptyLabel: string
}) {
  if (!match) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
        <p className="mt-2 text-sm text-zinc-300">{emptyLabel}</p>
      </div>
    )
  }

  const home = getTeam(match.homeTeamId)
  const away = getTeam(match.awayTeamId)

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
      <p className="mt-2 text-sm text-white">
        {home.flag} {home.name}
      </p>
      <p className="text-sm text-white">
        {away.flag} {away.name}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{toVenDateTimeLabel(match.kickoffAt)}</p>
      {match.status === 'final' ? (
        <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
          {match.homeGoals} - {match.awayGoals}
        </p>
      ) : null}
    </div>
  )
}
