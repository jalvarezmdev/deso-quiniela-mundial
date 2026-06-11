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
