// src/lib/match-lock.ts

import type { Match } from './types'

const MATCH_LIVE_WINDOW_MS = parseInt(
  import.meta.env.VITE_MATCH_LIVE_WINDOW_MS || '7200000' // default 2 hours
)

/**
 * Determines if a match is locked for prediction editing.
 * Locked when: status is 'final', status is 'live', or now > kickoff_at + window.
 */
export function isMatchLocked(match: Match, now: Date = new Date()): boolean {
  if (match.status === 'final') return true
  if (match.status === 'live') return true

  const kickoff = new Date(match.kickoffAt)
  if (now.getTime() > kickoff.getTime() + MATCH_LIVE_WINDOW_MS) return true

  return false
}

/**
 * Determines if a user can predict a specific match.
 * Admins can always predict. Regular users only on 'scheduled' matches
 * when they haven't confirmed the phase.
 */
export function canPredictMatch(match: Match, isAdmin: boolean, phaseConfirmed: boolean): boolean {
  if (isAdmin) return true
  if (phaseConfirmed) return false
  return match.status === 'scheduled'
}

