import { createFileRoute } from '@tanstack/react-router'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Card } from '#/components/ui/card'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'

export const Route = createFileRoute('/posiciones')({
  component: PosicionesPage,
})

function PosicionesPage() {
  const { leaderboard, currentUser } = useApp()
  const topThree = leaderboard.slice(0, 3)
  const maxExactHits = leaderboard.reduce((max, row) => Math.max(max, row.exactHits), 0)

  return (
    <RequireAuth>
      <PageShell title="Posiciones de la quiniela" subtitle="Desempate: exactos, luego quien confirmo antes.">
        <div className="space-y-6">
          <Card className="border-[var(--line)] bg-[var(--surface-1)]/95 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {topThree.map((row, index) => {
                const rank = index + 1
                const team = getTeam(row.teamId)
                const isCurrentUser = currentUser?.id === row.userId

                return (
                  <article
                    key={row.userId}
                    className={`rounded-xl border p-4 transition ${
                      rank === 1
                        ? 'border-[var(--accent)] bg-[var(--surface-0)] shadow-[0_0_0_1px_rgba(204,255,0,0.2),0_0_28px_rgba(204,255,0,0.16)]'
                        : 'border-[var(--line)] bg-[var(--surface-0)]/80'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Posicion {rank}
                      </span>
                      {isCurrentUser ? (
                        <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                          Tu
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xl font-black text-[var(--primary)]">
                      {team.flag} {row.nickname}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/70 p-2">
                        <p className="text-xs uppercase tracking-[0.1em] text-zinc-400">Puntos</p>
                        <p className="text-lg font-black text-[var(--primary)]">{row.points}</p>
                      </div>
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/70 p-2">
                        <p className="text-xs uppercase tracking-[0.1em] text-zinc-400">Exactos</p>
                        <p className="text-lg font-black text-zinc-100">{row.exactHits}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
              {topThree.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-0)]/60 px-4 py-8 text-center text-zinc-400">
                  Aun no hay usuarios registrados.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden border-[var(--line)] bg-[var(--surface-1)]/95 p-0">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-zinc-300">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Exactos</th>
                  <th className="px-4 py-3 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => {
                  const team = getTeam(row.teamId)
                  const isCurrentUser = currentUser?.id === row.userId
                  const progress = maxExactHits > 0 ? Math.round((row.exactHits / maxExactHits) * 100) : 0

                  return (
                    <tr
                      key={row.userId}
                      className={`border-t border-[var(--line)] ${
                        isCurrentUser ? 'bg-[var(--accent)]/8' : 'bg-[var(--surface-1)]/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-zinc-100">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--primary)]">
                            {team.flag} {row.nickname}
                          </span>
                          {isCurrentUser ? (
                            <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                              usuario actual
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="min-w-6 font-semibold text-zinc-100">{row.exactHits}</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[var(--primary)]">{row.points}</td>
                    </tr>
                  )
                })}
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      Aun no hay usuarios registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      </PageShell>
    </RequireAuth>
  )
}
