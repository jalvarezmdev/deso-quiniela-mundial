import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'
import { toVenDateTimeLabel } from '#/lib/time'
import { PHASES, type Match, type PhaseKey } from '#/lib/types'

export const Route = createFileRoute('/quiniela')({
  component: QuinielaPage,
})

function phaseLabel(phase: PhaseKey): string {
  return PHASES.find((item) => item.key === phase)?.label ?? phase
}

function isKnockout(phase: PhaseKey): boolean {
  return phase !== 'groups'
}

function QuinielaPage() {
  const {
    state,
    currentUser,
    activePhase,
    savePrediction,
    confirmPhase,
    canEditPhase,
    isPhaseConfirmed,
    isPhaseLockedAtNow,
    getPhaseWindowAtNow,
  } = useApp()

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [homeGoals, setHomeGoals] = useState('0')
  const [awayGoals, setAwayGoals] = useState('0')
  const [qualifiedTeamId, setQualifiedTeamId] = useState<string>('')
  const [notice, setNotice] = useState<string | null>(null)

  const matches = useMemo(
    () =>
      state.matches
        .filter((match) => match.phase === activePhase)
        .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()),
    [activePhase, state.matches],
  )

  if (!currentUser) {
    return null
  }

  function openModal(match: Match) {
    const existing = state.predictions.find(
      (prediction) =>
        prediction.userId === currentUser.id &&
        prediction.phase === activePhase &&
        prediction.matchId === match.id,
    )

    setSelectedMatch(match)
    setHomeGoals(String(existing?.homeGoals ?? 0))
    setAwayGoals(String(existing?.awayGoals ?? 0))
    setQualifiedTeamId(existing?.predictedQualifiedTeamId ?? '')
    setNotice(null)
  }

  function onSaveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMatch) return

    const result = savePrediction({
      phase: selectedMatch.phase,
      matchId: selectedMatch.id,
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
      predictedQualifiedTeamId: isKnockout(selectedMatch.phase)
        ? qualifiedTeamId || null
        : null,
    })

    if (!result.ok) {
      setNotice(result.message)
      return
    }

    setNotice('Pronostico guardado.')
    setTimeout(() => setSelectedMatch(null), 400)
  }

  function onConfirmPhase() {
    const result = confirmPhase(activePhase)
    if (!result.ok) {
      setNotice(result.message)
      return
    }

    setNotice('Fase confirmada. Ya no podras editarla.')
  }

  const editable = canEditPhase(activePhase)
  const phaseWindow = getPhaseWindowAtNow(activePhase)

  return (
    <RequireAuth>
      <PageShell
        title="Montar quiniela"
        subtitle="Haz click en cada cruce para cargar goles. Guarda y confirma la fase activa."
      >
        <Card className="mb-4">
          <p className="text-sm text-zinc-600">
            Ventana fase activa <strong>{phaseLabel(activePhase)}</strong>:
            {' '}
            {toVenDateTimeLabel(phaseWindow.opensAt.toISOString())} -{' '}
            {toVenDateTimeLabel(phaseWindow.closesAt.toISOString())}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Estado:{' '}
            {isPhaseConfirmed(activePhase)
              ? 'confirmada'
              : isPhaseLockedAtNow(activePhase)
                ? 'cerrada'
                : 'abierta'}
          </p>
        </Card>

        <section className="mb-4 flex flex-wrap gap-2">
          {PHASES.map((phase) => (
            <Badge
              key={phase.key}
              className={
                phase.key === activePhase
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-zinc-200 text-zinc-700'
              }
            >
              {phase.label}
            </Badge>
          ))}
        </section>

        <section className="grid gap-3">
          {matches.map((match) => {
            const home = getTeam(match.homeTeamId)
            const away = getTeam(match.awayTeamId)
            const prediction = state.predictions.find(
              (item) =>
                item.userId === currentUser.id &&
                item.phase === activePhase &&
                item.matchId === match.id,
            )

            return (
              <Card key={match.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {match.groupName ?? phaseLabel(match.phase)}
                  </p>
                  <p className="text-sm text-zinc-600">{toVenDateTimeLabel(match.kickoffAt)}</p>
                </div>

                <div className="text-lg font-black text-[var(--primary)]">
                  {home.flag} {home.name} vs {away.flag} {away.name}
                </div>

                <div className="flex items-center gap-2">
                  {prediction ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      Guardado: {prediction.homeGoals}-{prediction.awayGoals}
                    </Badge>
                  ) : (
                    <Badge>Sin guardar</Badge>
                  )}

                  <Button onClick={() => openModal(match)} disabled={!editable}>
                    Cargar
                  </Button>
                </div>
              </Card>
            )
          })}
        </section>

        <div className="mt-6 flex items-center justify-end gap-2">
          {notice ? <p className="mr-auto text-sm text-zinc-700">{notice}</p> : null}
          <Button onClick={onConfirmPhase} disabled={!editable}>
            Confirmar {phaseLabel(activePhase)}
          </Button>
        </div>

        {selectedMatch ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-black text-[var(--primary)]">Cargar cruce</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {getTeam(selectedMatch.homeTeamId).name} vs {getTeam(selectedMatch.awayTeamId).name}
              </p>

              <form className="mt-4 space-y-3" onSubmit={onSaveMatch}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="homeGoals">Goles local</Label>
                    <Input
                      id="homeGoals"
                      type="number"
                      min={0}
                      value={homeGoals}
                      onChange={(event) => setHomeGoals(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayGoals">Goles visitante</Label>
                    <Input
                      id="awayGoals"
                      type="number"
                      min={0}
                      value={awayGoals}
                      onChange={(event) => setAwayGoals(event.target.value)}
                      required
                    />
                  </div>
                </div>

                {isKnockout(selectedMatch.phase) ? (
                  <div>
                    <Label htmlFor="qualified">Clasificado final</Label>
                    <select
                      id="qualified"
                      value={qualifiedTeamId}
                      onChange={(event) => setQualifiedTeamId(event.target.value)}
                      className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
                      required
                    >
                      <option value="">Selecciona clasificado</option>
                      <option value={selectedMatch.homeTeamId}>
                        {getTeam(selectedMatch.homeTeamId).flag} {getTeam(selectedMatch.homeTeamId).name}
                      </option>
                      <option value={selectedMatch.awayTeamId}>
                        {getTeam(selectedMatch.awayTeamId).flag} {getTeam(selectedMatch.awayTeamId).name}
                      </option>
                    </select>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedMatch(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </Card>
          </div>
        ) : null}
      </PageShell>
    </RequireAuth>
  )
}
