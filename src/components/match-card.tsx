import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { MatchPredictionsDialog } from '#/components/match-predictions-dialog'
import type { Match, Prediction, Team } from '#/lib/types'
import { toVenShortDateLabel, toVenShortTimeLabel } from '#/lib/time'

function statusLabel(status: Match['status']) {
  if (status === 'final') return 'FT'
  if (status === 'live') return 'LIVE'
  return 'PRG'
}

function statusClassName(status: Match['status']) {
  if (status === 'final') return 'text-zinc-200'
  if (status === 'live') return 'text-red-300'
  return 'text-zinc-400'
}

type MatchCardProps = {
  match: Match
  home: Team
  away: Team
  phaseLabel: string
  prediction?: Prediction | null
  points?: number
}

export function MatchCard({
  match,
  home,
  away,
  phaseLabel,
  prediction,
  points,
}: MatchCardProps) {
  const isLiveHighlighted = match.status === 'live'
  const cardClassName = isLiveHighlighted
    ? 'rounded-lg border-lime-400/60 bg-lime-500/5 ring-1 ring-lime-400/30 p-3 md:p-4'
    : 'rounded-lg p-3 md:p-4'

  const [showPredictions, setShowPredictions] = useState(false)

  const showPredictionRow = prediction !== undefined

  return (
    <Card className={cardClassName}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {(match.groupName ?? 'Eliminatoria').toUpperCase()} · {phaseLabel}
        </p>
        {points !== undefined && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/5 px-2.5 py-0.5">
            <Trophy className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-xs font-bold uppercase text-[var(--accent)]">
              +{points} pts
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xl font-extrabold text-[var(--primary)]">
              {home.flag} {home.name}
            </p>
            <span className="text-2xl font-black text-zinc-200">{match.homeGoals ?? '-'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xl font-extrabold text-[var(--primary)]">
              {away.flag} {away.name}
            </p>
            <span className="text-2xl font-black text-zinc-200">{match.awayGoals ?? '-'}</span>
          </div>
        </div>

        <div className="h-px bg-zinc-800 md:hidden" />

        <div className="flex items-center justify-between gap-3 md:min-w-28 md:flex-col md:items-end md:justify-center">
          <span className={`text-sm font-bold tracking-wide ${statusClassName(match.status)}`}>
            {statusLabel(match.status)}
          </span>
          <p className="text-xs text-zinc-400">{toVenShortDateLabel(match.kickoffAt)}</p>
          <p className="text-xs text-zinc-500">{toVenShortTimeLabel(match.kickoffAt)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {showPredictionRow ? (
          prediction ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/5 px-3 py-1">
              <span className="text-xs font-bold uppercase text-[var(--accent)]">
                Tu prediccion: {prediction.homeGoals}-{prediction.awayGoals}
                {prediction.predictedQualifiedTeamId ? ' (avanza)' : ''}
              </span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">Sin prediccion</span>
          )
        ) : null}
        {['live', 'final'].includes(match.status) && (
          <button
            type="button"
            onClick={() => setShowPredictions(true)}
            className="rounded-lg border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
          >
            Ver Resultados
          </button>
        )}
      </div>
      <MatchPredictionsDialog
        match={match}
        open={showPredictions}
        onClose={() => setShowPredictions(false)}
      />
    </Card>
  )
}