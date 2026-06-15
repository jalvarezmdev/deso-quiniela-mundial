import { useEffect, useState } from 'react'
import {
  invokeAuthenticatedQuinielasAction,
  type ListPredictionsForMatchResultDTO,
} from '#/lib/quinielas-api'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'
import type { Match } from '#/lib/types'

type MatchPredictionsDialogProps = {
  match: Match
  open: boolean
  onClose: () => void
}

export function MatchPredictionsDialog({
  match,
  open,
  onClose,
}: MatchPredictionsDialogProps) {
  const { sessionToken } = useApp()
  const [predictions, setPredictions] = useState<
    ListPredictionsForMatchResultDTO['predictions']
  >([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const home = getTeam(match.homeTeamId)
  const away = getTeam(match.awayTeamId)

  useEffect(() => {
    if (!open || !sessionToken) return

    let cancelled = false

    setLoading(true)
    setErrorMessage(null)
    setPredictions([])

    invokeAuthenticatedQuinielasAction<
      { matchId: string },
      ListPredictionsForMatchResultDTO
    >('list_predictions_for_match', sessionToken, { matchId: match.id }).then(
      (response) => {
        if (cancelled) return
        if (response.ok) {
          setPredictions(response.data.predictions)
        } else {
          setErrorMessage(response.error.message)
        }
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [open, sessionToken, match.id])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--primary)]">
            {home.flag} {home.name} vs {away.flag} {away.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            X
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-zinc-400">Cargando predicciones...</p>
          ) : errorMessage ? (
            <p className="text-sm text-red-400">{errorMessage}</p>
          ) : predictions.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay predicciones para este partido
            </p>
          ) : (
            <ul className="grid gap-2">
              {predictions.map((pred, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-bold text-[var(--accent)]">
                      +{pred.points} PTS
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-200">
                      {pred.nickname}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[var(--primary)]">
                    {pred.homeGoals} - {pred.awayGoals}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
