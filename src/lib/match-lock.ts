// src/lib/match-lock.ts

import type { Match } from './types'

/**
 * Determines if a match is locked for prediction editing.
 * Locked when: status is 'final', status is 'live', or now >= kickoff_at.
 */
export function isMatchLocked(match: Match, now: Date = new Date()): boolean {
  if (match.status === 'final') return true
  if (match.status === 'live') return true

  const kickoff = new Date(match.kickoffAt)
  if (now.getTime() >= kickoff.getTime()) return true

  return false
}

/**
 * Determines if a user can predict a specific match.
 * Predictions are editable only before kickoff. Regular users also need the
 * phase to be unconfirmed.
 */
export function canPredictMatch(match: Match, isAdmin: boolean, phaseConfirmed: boolean, now: Date = new Date()): boolean {
  if (isMatchLocked(match, now)) return false
  if (isAdmin) return true
  if (phaseConfirmed) return false
  return match.status === 'scheduled'
}
