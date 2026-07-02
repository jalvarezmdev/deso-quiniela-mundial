import type { AuthenticatedActionContext } from '../helpers/action-types.ts'
import { handleDbError, jsonOk } from '../helpers/quinielas-helpers.ts'

type LeaderboardRow = {
  userId: string
  nickname: string
  teamId: string
  points: number
  exactHits: number
  firstConfirmedAt: string | null
}

type LeaderboardRpcRow = {
  user_id: string
  nickname: string
  team_id: string
  points: number
  exact_hits: number
  first_confirmed_at: string | null
}

// --- Cache ---

const CACHE_TTL_MS = 30_000 // 30 seconds

let cached: LeaderboardRow[] | null = null
let cachedAt = 0

export function invalidateLeaderboardCache(): void {
  cached = null
  cachedAt = 0
}

// --- Handler ---

export async function handleListLeaderboard(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  const now = Date.now()

  if (cached !== null && now - cachedAt < CACHE_TTL_MS) {
    return jsonOk({ leaderboard: cached })
  }

  const { data, error } = await ctx.supabase.rpc('compute_leaderboard')

  if (error) return handleDbError(error)

  const leaderboard: LeaderboardRow[] = (data as LeaderboardRpcRow[]).map((row) => ({
    userId: row.user_id,
    nickname: row.nickname,
    teamId: row.team_id,
    points: row.points,
    exactHits: row.exact_hits,
    firstConfirmedAt: row.first_confirmed_at,
  }))

  cached = leaderboard
  cachedAt = now

  return jsonOk({ leaderboard })
}
