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
  const { leaderboard } = useApp()

  return (
    <RequireAuth>
      <PageShell title="Posiciones de la quiniela" subtitle="Desempate: exactos, luego quien confirmo antes.">
        <Card className="overflow-hidden p-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-100 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Exactos</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => {
                const team = getTeam(row.teamId)
                const isLast = index === leaderboard.length - 1 && leaderboard.length > 1

                return (
                  <tr key={row.userId} className="border-t border-zinc-200">
                    <td className="px-4 py-3 font-semibold">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--primary)]">
                        {team.flag} {row.nickname}
                      </span>{' '}
                      {isLast ? <span title="Ultimo lugar">💩</span> : null}
                    </td>
                    <td className="px-4 py-3 font-black text-[var(--primary)]">{row.points}</td>
                    <td className="px-4 py-3">{row.exactHits}</td>
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
      </PageShell>
    </RequireAuth>
  )
}
