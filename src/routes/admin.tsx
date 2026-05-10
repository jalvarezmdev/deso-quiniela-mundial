import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { RequireAdmin } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'
import {
  fromVenDateTimeInput,
  toVenDateTimeInputValue,
  toVenDateTimeLabel,
} from '#/lib/time'
import { PHASES, type PhaseKey } from '#/lib/types'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function isKnockout(phase: PhaseKey) {
  return phase !== 'groups'
}

function AdminPage() {
  const {
    state,
    setMatchResult,
    setPhaseOverride,
    getPhaseWindowAtNow,
    resetUserPin,
  } = useApp()

  const [notice, setNotice] = useState<string | null>(null)

  const knockoutMatches = useMemo(
    () => state.matches.filter((match) => isKnockout(match.phase)),
    [state.matches],
  )

  function onSaveResult(event: FormEvent<HTMLFormElement>, matchId: string) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const homeGoals = Number(form.get('homeGoals'))
    const awayGoals = Number(form.get('awayGoals'))
    const qualifiedTeamId = String(form.get('qualifiedTeamId') ?? '')
    const status = String(form.get('status') ?? 'final') as 'live' | 'final'

    const response = setMatchResult({
      matchId,
      homeGoals,
      awayGoals,
      qualifiedTeamId: qualifiedTeamId || null,
      status,
    })

    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('Resultado actualizado por admin.')
  }

  function onSaveWindow(event: FormEvent<HTMLFormElement>, phase: PhaseKey) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const opensAt = String(form.get('opensAt') ?? '')
    const closesAt = String(form.get('closesAt') ?? '')

    if (!opensAt || !closesAt) {
      setNotice('Debes completar apertura y cierre.')
      return
    }

    setPhaseOverride(phase, fromVenDateTimeInput(opensAt), fromVenDateTimeInput(closesAt))
    setNotice('Ventana de fase actualizada.')
  }

  function onResetPin(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const newPin = String(form.get('newPin') ?? '')
    const response = resetUserPin(userId, newPin)

    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('PIN reseteado correctamente.')
    event.currentTarget.reset()
  }

  return (
    <RequireAdmin>
      <PageShell title="Panel de administrador" subtitle="Gestion de cruces directos, resultados, ventanas y soporte de PIN.">
        {notice ? <p className="mb-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">{notice}</p> : null}

        <section className="grid gap-4">
          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Cruces directos y resultados</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Edicion manual con prioridad sobre scraping.
            </p>

            <div className="mt-4 grid gap-4">
              {knockoutMatches.map((match) => {
                const home = getTeam(match.homeTeamId)
                const away = getTeam(match.awayTeamId)

                return (
                  <form key={match.id} onSubmit={(event) => onSaveResult(event, match.id)} className="rounded-lg border border-zinc-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-[var(--primary)]">
                        {home.flag} {home.name} vs {away.flag} {away.name}
                      </p>
                      <Badge>{toVenDateTimeLabel(match.kickoffAt)}</Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <Label>Goles local</Label>
                        <Input name="homeGoals" type="number" defaultValue={String(match.homeGoals ?? 0)} min={0} required />
                      </div>
                      <div>
                        <Label>Goles visita</Label>
                        <Input name="awayGoals" type="number" defaultValue={String(match.awayGoals ?? 0)} min={0} required />
                      </div>
                      <div>
                        <Label>Clasificado</Label>
                        <select
                          name="qualifiedTeamId"
                          defaultValue={match.qualifiedTeamId ?? ''}
                          className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
                          required
                        >
                          <option value={home.id}>{home.flag} {home.name}</option>
                          <option value={away.id}>{away.flag} {away.name}</option>
                        </select>
                      </div>
                      <div>
                        <Label>Estatus</Label>
                        <select
                          name="status"
                          defaultValue={match.status === 'live' ? 'live' : 'final'}
                          className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
                        >
                          <option value="live">LIVE</option>
                          <option value="final">FINAL</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button type="submit">Guardar resultado</Button>
                    </div>
                  </form>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Ventanas de habilitacion por fase</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Override manual sobre reglas automaticas de apertura/cierre.
            </p>

            <div className="mt-4 grid gap-4">
              {PHASES.map((phase) => {
                const currentWindow = getPhaseWindowAtNow(phase.key)

                return (
                  <form key={phase.key} onSubmit={(event) => onSaveWindow(event, phase.key)} className="rounded-lg border border-zinc-200 p-4">
                    <p className="font-semibold text-[var(--primary)]">{phase.label}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Apertura (VE)</Label>
                        <Input
                          name="opensAt"
                          type="datetime-local"
                          defaultValue={toVenDateTimeInputValue(currentWindow.opensAt.toISOString())}
                          required
                        />
                      </div>
                      <div>
                        <Label>Cierre (VE)</Label>
                        <Input
                          name="closesAt"
                          type="datetime-local"
                          defaultValue={toVenDateTimeInputValue(currentWindow.closesAt.toISOString())}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="submit" variant="outline">
                        Guardar ventana
                      </Button>
                    </div>
                  </form>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Recuperacion de PIN</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Reset manual por admin, PIN de 6 digitos.
            </p>

            <div className="mt-4 grid gap-3">
              {state.users.map((user) => (
                <form key={user.id} onSubmit={(event) => onResetPin(event, user.id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold text-[var(--primary)]">{user.nickname}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                  <div>
                    <Label>Nuevo PIN</Label>
                    <Input name="newPin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
                  </div>
                  <Button type="submit" variant="outline">
                    Resetear
                  </Button>
                </form>
              ))}
            </div>
          </Card>
        </section>
      </PageShell>
    </RequireAdmin>
  )
}
