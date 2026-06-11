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
    createMatch,
    deleteMatch,
    setPhaseOverride,
    getPhaseWindowAtNow,
    resetUserPin,
    softDeleteUser,
    refreshUsers,
    currentUser,
    scoringMode,
    getScoringConfig,
    updateScoringConfig,
  } = useApp()

  const [notice, setNotice] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [loadingScoringConfig, setLoadingScoringConfig] = useState(true)

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

  async function onSaveWindow(event: FormEvent<HTMLFormElement>, phase: PhaseKey) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const opensAt = String(form.get('opensAt') ?? '')
    const closesAt = String(form.get('closesAt') ?? '')

    if (!opensAt || !closesAt) {
      setNotice('Debes completar apertura y cierre.')
      return
    }

    const response = await setPhaseOverride(phase, fromVenDateTimeInput(opensAt), fromVenDateTimeInput(closesAt))
    if (!response.ok) {
      setNotice(response.message)
      return
    }
    setNotice('Ventana de fase actualizada.')
  }

  async function onCreateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const phase = String(form.get('phase') ?? 'groups') as PhaseKey
    const status = String(form.get('status') ?? 'scheduled') as 'scheduled' | 'live' | 'final'
    const homeTeamId = String(form.get('homeTeamId') ?? '').trim()
    const awayTeamId = String(form.get('awayTeamId') ?? '').trim()
    const qualifiedTeamId = String(form.get('qualifiedTeamId') ?? '').trim()
    const groupNameRaw = String(form.get('groupName') ?? '').trim()

    const response = await createMatch({
      id: String(form.get('id') ?? '').trim(),
      phase,
      groupName: groupNameRaw || null,
      homeTeamId,
      awayTeamId,
      kickoffAt: new Date(String(form.get('kickoffAt') ?? '')).toISOString(),
      status,
      homeGoals: status === 'scheduled' ? null : Number(form.get('homeGoals')),
      awayGoals: status === 'scheduled' ? null : Number(form.get('awayGoals')),
      qualifiedTeamId: phase === 'groups' || status === 'scheduled' ? null : qualifiedTeamId || null,
      manualOverride: true,
    })

    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('Partido creado correctamente.')
    event.currentTarget.reset()
  }

  async function onDeleteMatch(matchId: string) {
    const ok = window.confirm('Esta accion elimina logicamente el partido. Continuar?')
    if (!ok) return

    const response = await deleteMatch(matchId)
    if (!response.ok) {
      setNotice(response.message)
      return
    }

    setNotice('Partido eliminado correctamente.')
  }

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    void refreshUsers()
  }, [currentUser?.isAdmin, refreshUsers])

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    void getScoringConfig().then(() => setLoadingScoringConfig(false))
  }, [currentUser?.isAdmin, getScoringConfig])

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

  async function onUpdateScoringConfig(mode: 'phase_confirmation' | 'per_match') {
    const response = await updateScoringConfig(mode)
    if (!response.ok) {
      setNotice(response.message)
      return
    }
    setNotice('Modo de puntuacion actualizado.')
  }

  return (
    <RequireAdmin>
      <PageShell title="Panel de administrador" subtitle="Gestion de cruces directos, resultados, ventanas y soporte de PIN.">
        {notice ? <p className="mb-4 rounded-md bg-zinc-800 p-3 text-sm text-zinc-200">{notice}</p> : null}

        <section className="grid gap-4">
          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Cruces directos y resultados</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Edicion manual con prioridad sobre scraping.
            </p>

            <form onSubmit={(event) => void onCreateMatch(event)} className="mt-4 rounded-lg border border-zinc-700 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-300">Crear partido</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div>
                  <Label>ID</Label>
                  <Input name="id" placeholder="ga-1" required />
                </div>
                <div>
                  <Label>Fase</Label>
                  <select name="phase" className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm">
                    {PHASES.map((phase) => (
                      <option key={phase.key} value={phase.key}>{phase.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Input name="groupName" placeholder="Grupo A (opcional)" />
                </div>
                <div>
                  <Label>Kickoff UTC</Label>
                  <Input name="kickoffAt" type="datetime-local" required />
                </div>
                <div>
                  <Label>Local (teamId)</Label>
                  <Input name="homeTeamId" placeholder="arg" required />
                </div>
                <div>
                  <Label>Visitante (teamId)</Label>
                  <Input name="awayTeamId" placeholder="eng" required />
                </div>
                <div>
                  <Label>Goles local</Label>
                  <Input name="homeGoals" type="number" min={0} defaultValue={0} />
                </div>
                <div>
                  <Label>Goles visita</Label>
                  <Input name="awayGoals" type="number" min={0} defaultValue={0} />
                </div>
                <div>
                  <Label>Clasificado</Label>
                  <Input name="qualifiedTeamId" placeholder="arg (si aplica)" />
                </div>
                <div>
                  <Label>Estatus</Label>
                  <select name="status" className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm">
                    <option value="scheduled">SCHEDULED</option>
                    <option value="live">LIVE</option>
                    <option value="final">FINAL</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="submit" variant="outline">Crear partido</Button>
              </div>
            </form>

            <div className="mt-4 grid gap-4">
              {editableMatches.map((match) => {
                const home = getTeam(match.homeTeamId)
                const away = getTeam(match.awayTeamId)
                const isKnockout = match.phase !== 'groups'

                return (
                  <form key={match.id} onSubmit={(event) => void onSaveResult(event, match.id, match.phase)} className="rounded-lg border border-zinc-700 p-4">
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
                            className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm"
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
                          className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm"
                        >
                          <option value="scheduled">SCHEDULED</option>
                          <option value="live">LIVE</option>
                          <option value="final">FINAL</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="outline" onClick={() => void onDeleteMatch(match.id)}>
                        Eliminar
                      </Button>
                      <Button type="submit">Guardar resultado</Button>
                    </div>
                  </form>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Ventanas de habilitacion por fase</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Override manual sobre reglas automaticas de apertura/cierre.
            </p>

            <div className="mt-4 grid gap-4">
              {PHASES.map((phase) => {
                const currentWindow = getPhaseWindowAtNow(phase.key)

                return (
                  <form key={phase.key} onSubmit={(event) => void onSaveWindow(event, phase.key)} className="rounded-lg border border-zinc-700 p-4">
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
            <h2 className="text-lg font-black text-[var(--primary)]">Modo de Puntuacion</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Selecciona como se calculan los puntos.
            </p>

            <div className="mt-4 flex gap-3">
              <Button
                variant={scoringMode === 'phase_confirmation' ? 'default' : 'outline'}
                disabled={loadingScoringConfig}
                onClick={() => void onUpdateScoringConfig('phase_confirmation')}
              >
                Confirmacion por Fase
              </Button>
              <Button
                variant={scoringMode === 'per_match' ? 'default' : 'outline'}
                disabled={loadingScoringConfig}
                onClick={() => void onUpdateScoringConfig('per_match')}
              >
                Por Partido
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-[var(--primary)]">Recuperacion de PIN</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Reset manual por admin, PIN de 6 digitos.
            </p>

            <div className="mt-4 grid gap-3">
              {state.users.map((user) => (
                <form key={user.id} onSubmit={(event) => onResetPin(event, user.id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-700 p-3">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold text-[var(--primary)]">{user.nickname}</p>
                    <p className="text-xs text-zinc-400">{user.email ?? 'Sin correo'}</p>
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
