// supabase/functions/_shared/quiniela/helpers/match-lock.ts

const MATCH_LIVE_WINDOW_MS = parseInt(
  Deno.env.get("MATCH_LIVE_WINDOW_MS") || "7200000" // default 2 hours
);

type MatchLockInput = {
  status: string;
  kickoff_at: string;
};

/**
 * Determines if a match is locked for prediction editing.
 * Locked when: status is 'final', status is 'live', or now > kickoff_at + window.
 */
export function isMatchLocked(match: MatchLockInput, now: Date): boolean {
  if (match.status === "final") return true;
  if (match.status === "live") return true;

  const kickoff = new Date(match.kickoff_at);
  if (now.getTime() > kickoff.getTime() + MATCH_LIVE_WINDOW_MS) return true;

  return false;
}

/**
 * Determines if a match result can be set/modified.
 * Results can only be set on scheduled matches before the time window.
 */
export function canSetResult(match: MatchLockInput, now: Date): boolean {
  if (match.status === "final") return false;
  if (match.status === "live") return false;

  const kickoff = new Date(match.kickoff_at);
  if (now.getTime() > kickoff.getTime() + MATCH_LIVE_WINDOW_MS) return false;

  return true;
}
