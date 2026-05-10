import { PHASES, type AppState, type Match, type PhaseKey } from './types'
import { nowIso } from './time'

const MS_DAY = 24 * 60 * 60 * 1000
const MS_MATCH_WINDOW = 2 * 60 * 60 * 1000

export const PHASE_ORDER: PhaseKey[] = PHASES.map((phase) => phase.key)

function findPhaseIndex(phase: PhaseKey): number {
  return PHASE_ORDER.indexOf(phase)
}

function getMatchesByPhase(matches: Match[], phase: PhaseKey): Match[] {
  return matches.filter((match) => match.phase === phase)
}

function getPhaseFirstKickoff(matches: Match[], phase: PhaseKey): Date {
  const phaseMatches = getMatchesByPhase(matches, phase)
  const sorted = [...phaseMatches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  )

  return new Date(sorted[0]?.kickoffAt ?? nowIso())
}

function getPreviousPhase(phase: PhaseKey): PhaseKey | null {
  const index = findPhaseIndex(phase)
  if (index <= 0) return null
  return PHASE_ORDER[index - 1] ?? null
}

export function isPhaseResultsComplete(matches: Match[], phase: PhaseKey): boolean {
  const phaseMatches = getMatchesByPhase(matches, phase)
  if (phaseMatches.length === 0) return false
  return phaseMatches.every((match) => match.status === 'final')
}

export function getPhaseWindow(state: AppState, phase: PhaseKey): { opensAt: Date; closesAt: Date } {
  const override = state.windowOverrides.find((item) => item.phase === phase)
  const closesAt = override
    ? new Date(override.closesAt)
    : getPhaseFirstKickoff(state.matches, phase)

  if (override) {
    return {
      opensAt: new Date(override.opensAt),
      closesAt,
    }
  }

  if (phase === 'groups') {
    return {
      opensAt: new Date(closesAt.getTime() - 7 * MS_DAY),
      closesAt,
    }
  }

  const previousPhase = getPreviousPhase(phase)
  if (!previousPhase) {
    return {
      opensAt: new Date(closesAt.getTime() - 2 * MS_DAY),
      closesAt,
    }
  }

  const previousPhaseMatches = getMatchesByPhase(state.matches, previousPhase)
  if (previousPhaseMatches.length === 0) {
    return {
      opensAt: new Date(closesAt.getTime() - 2 * MS_DAY),
      closesAt,
    }
  }

  const maxKickoff = Math.max(
    ...previousPhaseMatches.map((match) => new Date(match.kickoffAt).getTime()),
  )

  return {
    opensAt: new Date(maxKickoff + MS_MATCH_WINDOW),
    closesAt,
  }
}

export function isPhaseLocked(state: AppState, phase: PhaseKey, now: Date): boolean {
  const { closesAt } = getPhaseWindow(state, phase)
  return now.getTime() >= closesAt.getTime()
}

function hasPreviousPhaseResults(state: AppState, phase: PhaseKey): boolean {
  const previous = getPreviousPhase(phase)
  return previous ? isPhaseResultsComplete(state.matches, previous) : true
}

export function isPhaseEditable(state: AppState, phase: PhaseKey, now: Date): boolean {
  if (isPhaseLocked(state, phase, now)) {
    return false
  }

  if (phase === 'groups') {
    return true
  }

  if (!hasPreviousPhaseResults(state, phase)) {
    return false
  }

  const { opensAt } = getPhaseWindow(state, phase)
  return now.getTime() >= opensAt.getTime()
}

export function getActivePhase(state: AppState, now: Date): PhaseKey {
  for (const phase of PHASE_ORDER) {
    if (isPhaseEditable(state, phase, now)) {
      return phase
    }
  }

  for (const phase of PHASE_ORDER) {
    if (!isPhaseLocked(state, phase, now)) {
      return phase
    }
  }

  return 'final'
}
