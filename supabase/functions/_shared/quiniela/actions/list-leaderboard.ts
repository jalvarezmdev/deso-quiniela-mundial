import type { AuthenticatedActionContext } from '../helpers/action-types.ts'
import { computeMatchPoints } from '../helpers/scoring.ts'
import {
  handleDbError,
  jsonOk,
  type MatchesRow,
  type PhaseSubmissionsRow,
  type PredictionsRow,
  type ProfilesRow,
} from '../helpers/quinielas-helpers.ts'

type LeaderboardRow = {
  userId: string
  nickname: string
  teamId: string
  points: number
  exactHits: number
  firstConfirmedAt: string | null
}

export async function handleListLeaderboard(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  const [{ data: users, error: usersError }, { data: matches, error: matchesError }, { data: predictions, error: predictionsError }, {
    data: submissions,
    error: submissionsError,
  }] = await Promise.all([
    ctx.supabase
      .from('profiles')
      .select('id,nickname,team_id,deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    ctx.supabase
      .from('matches')
      .select('*')
      .is('deleted_at', null)
      .in('status', ['final', 'live']),
    ctx.supabase
      .from('predictions')
      .select('*'),
    ctx.supabase
      .from('phase_submissions')
      .select('*'),
  ])

  if (usersError) return handleDbError(usersError)
  if (matchesError) return handleDbError(matchesError)
  if (predictionsError) return handleDbError(predictionsError)
  if (submissionsError) return handleDbError(submissionsError)

  const { data: config } = await ctx.supabase
    .from('site_config')
    .select('value')
    .eq('key', 'scoring_mode')
    .maybeSingle()

  const scoringMode = config?.value ?? 'phase_confirmation'

  const matchesById = new Map((matches as MatchesRow[]).map((match) => [match.id, match]))

  const submissionKey = (userId: string, phase: string) => `${userId}::${phase}`
  const submittedSet = new Set(
    (submissions as PhaseSubmissionsRow[]).map((submission) => submissionKey(submission.user_id, submission.phase)),
  )

  const firstConfirmedAtByUser = new Map<string, string | null>()
  for (const submission of submissions as PhaseSubmissionsRow[]) {
    const current = firstConfirmedAtByUser.get(submission.user_id)
    if (!current || new Date(submission.confirmed_at).getTime() < new Date(current).getTime()) {
      firstConfirmedAtByUser.set(submission.user_id, submission.confirmed_at)
    }
  }

  const rows = new Map<string, LeaderboardRow>()

  for (const user of users as Pick<ProfilesRow, 'id' | 'nickname' | 'team_id'>[]) {
    rows.set(user.id, {
      userId: user.id,
      nickname: user.nickname,
      teamId: user.team_id,
      points: 0,
      exactHits: 0,
      firstConfirmedAt: firstConfirmedAtByUser.get(user.id) ?? null,
    })
  }

  for (const prediction of predictions as PredictionsRow[]) {
    const row = rows.get(prediction.user_id)
    if (!row) continue

    if (!submittedSet.has(submissionKey(prediction.user_id, prediction.phase))) {
      continue
    }

    const match = matchesById.get(prediction.match_id)
    if (!match || match.home_goals == null || match.away_goals == null) {
      continue
    }

    const gained = computeMatchPoints({
      phase: match.phase,
      homeGoals: match.home_goals,
      awayGoals: match.away_goals,
      qualifiedTeamId: match.qualified_team_id,
      predictedHomeGoals: prediction.home_goals,
      predictedAwayGoals: prediction.away_goals,
      predictedQualifiedTeamId: prediction.predicted_qualified_team_id,
    })

    row.points += gained
    if (gained === 3) {
      row.exactHits += 1
    }
  }

  let leaderboard = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits

    const aTs = a.firstConfirmedAt ? new Date(a.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER
    const bTs = b.firstConfirmedAt ? new Date(b.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER
    return aTs - bTs
  })

  if (scoringMode === 'per_match') {
    const { data: matchPointsData } = await ctx.supabase
      .from('match_points')
      .select('user_id, points, computed_at')

    if (matchPointsData?.length) {
      const userAggregates = new Map<string, { points: number; exactHits: number; firstComputedAt: string }>()

      for (const row of matchPointsData) {
        const existing = userAggregates.get(row.user_id) ?? { points: 0, exactHits: 0, firstComputedAt: row.computed_at }
        existing.points += row.points
        if (row.points === 3) existing.exactHits += 1
        if (row.computed_at < existing.firstComputedAt) existing.firstComputedAt = row.computed_at
        userAggregates.set(row.user_id, existing)
      }

      leaderboard = (users as Pick<ProfilesRow, 'id' | 'nickname' | 'team_id'>[])
        .filter((p) => userAggregates.has(p.id))
        .map((p) => {
          const agg = userAggregates.get(p.id)!
          return {
            userId: p.id,
            nickname: p.nickname,
            teamId: p.team_id,
            points: agg.points,
            exactHits: agg.exactHits,
            firstConfirmedAt: agg.firstComputedAt,
          }
        })
        .sort((a, b) =>
          b.points - a.points || b.exactHits - a.exactHits || a.firstConfirmedAt.localeCompare(b.firstConfirmedAt),
        )
    } else {
      leaderboard = []
    }
  }

  return jsonOk({ leaderboard })
}
