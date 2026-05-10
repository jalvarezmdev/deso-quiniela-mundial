import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
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

function AdminPage() {
  const {
    state,
    setMatchResult,
    setPhaseOverride,
    getPhaseWindowAtNow,
    resetUserPin,
    softDeleteUser,
    refreshUsers,
    currentUser,
  } = useApp()

  const [notice, setNotice] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const editableMatches = useMemo(
    () => [...state.matches].sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()),
    [state.matches],
  )

  async function onSaveResult(event: FormEvent<HTMLFormElement>, matchId: string, phase: PhaseKey) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const homeGoals = Number(form.get('homeGoals'))
    const awayGoals = Number(form.get('awayGoals'))
    const qualifiedTeamId = String(form.get('qualifiedTeamId') ?? '')
    const status = String(form.get('status') ?? 'final') as 'scheduled' | 'live' | 'final'
    const isKnockout = phase !== 'groups'

    const payload =
      status === 'scheduled'
        ? {
            matchId,
            homeGoals: null,
            awayGoals: null,
            qualifiedTeamId: null,
            status,
          }
        : {
            matchId,
            homeGoals,
            awayGoals,
            qualifiedTeamId: isKnockout ? qualifiedTeamId || null : null,
            status,
          }

    const response = await setMatchResult(payload)

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

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    void refreshUsers()
  }, [currentUser?.isAdmin, refreshUsers])

  async function onResetPin(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault()
    setBusyUserId(userId)

    const form = new FormData(event.currentTarget)
    const newPin = String(form.get('newPin') ?? '')
    const response = await resetUserPin(userId, newPin)
    setBusyUserId(null)

    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('PIN reseteado correctamente.')
    event.currentTarget.reset()
  }

  async function onSoftDelete(userId: string) {
    const ok = window.confirm('Esta accion elimina logicamente al usuario y cierra sus sesiones. Continuar?')
    if (!ok) return

    setBusyUserId(userId)
    const response = await softDeleteUser(userId)
    setBusyUserId(null)

    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('Usuario eliminado logicamente.')
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
              {editableMatches.map((match) => {
                const home = getTeam(match.homeTeamId)
                const away = getTeam(match.awayTeamId)
                const isKnockout = match.phase !== 'groups'

                return (
                  <form key={match.id} onSubmit={(event) => void onSaveResult(event, match.id, match.phase)} className="rounded-lg border border-zinc-200 p-4">
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
                        {isKnockout ? (
                          <select
                            name="qualifiedTeamId"
                            defaultValue={match.qualifiedTeamId ?? ''}
                            className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
                            required
                          >
                            <option value={home.id}>{home.flag} {home.name}</option>
                            <option value={away.id}>{away.flag} {away.name}</option>
                          </select>
                        ) : (
                          <Input value="N/A (fase de grupos)" readOnly />
                        )}
                      </div>
                      <div>
                        <Label>Estatus</Label>
                        <select
                          name="status"
                          defaultValue={match.status === 'live' ? 'live' : 'final'}
                          className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
                        >
                          <option value="scheduled">SCHEDULED</option>
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
                    <p className="text-xs text-zinc-500">{user.email ?? 'Sin correo'}</p>
                  </div>
                  <div>
                    <Label>Nuevo PIN</Label>
                    <Input name="newPin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
                  </div>
                  <Button type="submit" variant="outline" disabled={busyUserId === user.id}>
                    {busyUserId === user.id ? 'Procesando...' : 'Resetear'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyUserId === user.id}
                    onClick={() => onSoftDelete(user.id)}
                  >
                    Eliminar
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
