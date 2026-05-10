import { Card } from '#/components/ui/card'
import type { Match, Team } from '#/lib/types'
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

type ResultadosMatchCardProps = {
  match: Match
  home: Team
  away: Team
  phaseLabel: string
  isLiveHighlighted?: boolean
}

export function ResultadosMatchCard({
  match,
  home,
  away,
  phaseLabel,
  isLiveHighlighted = false,
}: ResultadosMatchCardProps) {
  const cardClassName = isLiveHighlighted
    ? 'rounded-lg border-lime-400/60 bg-lime-500/5 ring-1 ring-lime-400/30 p-3 md:p-4'
    : 'rounded-lg p-3 md:p-4'

  return (
    <Card className={cardClassName}>
      <p className="text-xs text-zinc-500">
        {(match.groupName ?? 'Eliminatoria').toUpperCase()} · {phaseLabel}
      </p>

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
          {match.manualOverride ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              MANUAL
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
