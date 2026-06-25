import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Match, Team } from '#/lib/types'

export type LiveResultInput = {
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId: string | null
  status: 'live' | 'final'
}

export type LiveResultSaveResult = { ok: true } | { ok: false; message: string }

type LiveResultDialogProps = {
  match: Match
  home: Team
  away: Team
  open: boolean
  onClose: () => void
  onSave: (payload: LiveResultInput) => Promise<LiveResultSaveResult>
}

export function LiveResultDialog({ match, home, away, open, onClose, onSave }: LiveResultDialogProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const isKnockout = match.phase !== 'groups'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)

    const form = new FormData(event.currentTarget)
    const status = String(form.get('status') ?? 'live') as 'live' | 'final'
    const qualifiedTeamId = String(form.get('qualifiedTeamId') ?? '')

    try {
      const response = await onSave({
        matchId: match.id,
        homeGoals: Number(form.get('homeGoals')),
        awayGoals: Number(form.get('awayGoals')),
        qualifiedTeamId: isKnockout ? qualifiedTeamId || null : null,
        status,
      })

      if (!response.ok) {
        setNotice(response.message)
        return
      }

      onClose()
    } catch {
      setNotice('No se pudo guardar el resultado.')
    } finally {
      setSaving(false)
    }
  }

  function closeDialog() {
    if (saving) return
    setNotice(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`live-result-title-${match.id}`}
        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`live-result-title-${match.id}`} className="text-lg font-black text-white">
              Cargar resultado
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {home.flag} {home.name} vs {away.flag} {away.name}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={saving}
            className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 transition hover:border-zinc-500"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Goles {home.name}
            <input
              name="homeGoals"
              type="number"
              min={0}
              defaultValue={String(match.homeGoals ?? 0)}
              required
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Goles {away.name}
            <input
              name="awayGoals"
              type="number"
              min={0}
              defaultValue={String(match.awayGoals ?? 0)}
              required
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white"
            />
          </label>

          {isKnockout ? (
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Clasificado
              <select
                name="qualifiedTeamId"
                defaultValue={match.qualifiedTeamId ?? ''}
                required
                className="h-10 rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white"
              >
                <option value="">Seleccionar</option>
                <option value={home.id}>{home.flag} {home.name}</option>
                <option value={away.id}>{away.flag} {away.name}</option>
              </select>
            </label>
          ) : null}

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Estatus
            <select
              name="status"
              defaultValue={match.status === 'final' ? 'final' : 'live'}
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white"
            >
              <option value="live">LIVE</option>
              <option value="final">FINAL</option>
            </select>
          </label>

          {notice ? <p className="rounded-md bg-red-950/60 p-2 text-sm text-red-200">{notice}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeDialog}
              disabled={saving}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[var(--secondary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar resultado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
