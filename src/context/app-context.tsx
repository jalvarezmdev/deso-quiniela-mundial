import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { computeMatchPoints } from '#/lib/game'
import {
  invokeAdminQuinielasAction,
  invokeQuinielasAction,
  type ListMatchesResultDTO,
  type MatchDTO,
} from '#/lib/quinielas-api'
import {
  invokeUsersAction,
  type AdminMutationResultDTO,
  type AdminUserDTO,
  type BasicUserDTO,
  type SessionUserDTO,
} from '#/lib/users-api'
import { nowIso } from '#/lib/time'
import { getTeam } from '#/lib/teams'
import {
  PHASE_ORDER,
  getActivePhase,
  getPhaseWindow,
  isPhaseEditable,
  isPhaseLocked,
} from '#/lib/phase-flow'
import {
  PHASES,
  type AppState,
  type LeaderboardRow,
  type Match,
  type PhaseKey,
  type PhaseSubmission,
  type Prediction,
  type User,
} from '#/lib/types'

const STORAGE_KEY = 'quiniela_state_v1'
const SESSION_TOKEN_KEY = 'quiniela_session_token_v1'
const HYDRATION_SAFE_NOW_ISO = '2026-01-01T00:00:00.000Z'

const MS_MATCH_WINDOW = 2 * 60 * 60 * 1000

function isPinValid(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

function wasPhaseConfirmed(submissions: PhaseSubmission[], userId: string, phase: PhaseKey): boolean {
  return submissions.some((submission) => submission.userId === userId && submission.phase === phase)
}

function defaultMatches(): Match[] {
  return [
    {
      id: 'ga-1',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'mex',
      awayTeamId: 'zaf',
      kickoffAt: '2026-06-11T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'ga-2',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'kor',
      awayTeamId: 'cze',
      kickoffAt: '2026-06-11T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'ga-3',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'mex',
      awayTeamId: 'kor',
      kickoffAt: '2026-06-18T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'ga-4',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'cze',
      awayTeamId: 'zaf',
      kickoffAt: '2026-06-18T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'ga-5',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'cze',
      awayTeamId: 'mex',
      kickoffAt: '2026-06-24T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'ga-6',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'zaf',
      awayTeamId: 'kor',
      kickoffAt: '2026-06-24T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-1',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'can',
      awayTeamId: 'bih',
      kickoffAt: '2026-06-12T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-2',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'qat',
      awayTeamId: 'sui',
      kickoffAt: '2026-06-13T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-3',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'can',
      awayTeamId: 'qat',
      kickoffAt: '2026-06-18T21:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-4',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'sui',
      awayTeamId: 'bih',
      kickoffAt: '2026-06-18T23:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-5',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'sui',
      awayTeamId: 'can',
      kickoffAt: '2026-06-24T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gb-6',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'bih',
      awayTeamId: 'qat',
      kickoffAt: '2026-06-24T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-1',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'bra',
      awayTeamId: 'mar',
      kickoffAt: '2026-06-13T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-2',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'hai',
      awayTeamId: 'sco',
      kickoffAt: '2026-06-13T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-3',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'bra',
      awayTeamId: 'hai',
      kickoffAt: '2026-06-19T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-4',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'sco',
      awayTeamId: 'mar',
      kickoffAt: '2026-06-19T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-5',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'sco',
      awayTeamId: 'bra',
      kickoffAt: '2026-06-24T21:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gc-6',
      phase: 'groups',
      groupName: 'Grupo C',
      homeTeamId: 'mar',
      awayTeamId: 'hai',
      kickoffAt: '2026-06-24T23:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-1',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'usa',
      awayTeamId: 'par',
      kickoffAt: '2026-06-12T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-2',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'aus',
      awayTeamId: 'tur',
      kickoffAt: '2026-06-13T23:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-3',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'usa',
      awayTeamId: 'aus',
      kickoffAt: '2026-06-19T21:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-4',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'tur',
      awayTeamId: 'par',
      kickoffAt: '2026-06-19T23:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-5',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'tur',
      awayTeamId: 'usa',
      kickoffAt: '2026-06-25T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'gd-6',
      phase: 'groups',
      groupName: 'Grupo D',
      homeTeamId: 'par',
      awayTeamId: 'aus',
      kickoffAt: '2026-06-25T23:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'r16-1',
      phase: 'roundOf16',
      groupName: null,
      homeTeamId: 'arg',
      awayTeamId: 'usa',
      kickoffAt: '2026-07-03T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'r8-1',
      phase: 'roundOf8',
      groupName: null,
      homeTeamId: 'arg',
      awayTeamId: 'eng',
      kickoffAt: '2026-07-09T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'r4-1',
      phase: 'roundOf4',
      groupName: null,
      homeTeamId: 'bra',
      awayTeamId: 'fra',
      kickoffAt: '2026-07-14T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 's-1',
      phase: 'semifinals',
      groupName: null,
      homeTeamId: 'arg',
      awayTeamId: 'bra',
      kickoffAt: '2026-07-18T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'f-1',
      phase: 'final',
      groupName: null,
      homeTeamId: 'arg',
      awayTeamId: 'eng',
      kickoffAt: '2026-07-22T20:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
  ]
}

function buildInitialState(): AppState {
  return {
    users: [],
    matches: defaultMatches(),
    predictions: [],
    submissions: [],
    windowOverrides: [],
    lastLiveSyncAt: null,
  }
}

function readState(): AppState {
  if (typeof window === 'undefined') {
    return buildInitialState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return buildInitialState()
  }

  try {
    return JSON.parse(raw) as AppState
  } catch {
    return buildInitialState()
  }
}

function persistState(state: AppState) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function mapMatchDTO(match: MatchDTO): Match {
  return {
    id: match.id,
    phase: match.phase,
    groupName: match.groupName,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    kickoffAt: match.kickoffAt,
    status: match.status,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    qualifiedTeamId: match.qualifiedTeamId,
    manualOverride: match.manualOverride,
    source: match.source,
    externalMatchRef: match.externalMatchRef,
  }
}

function mergeMatches(currentMatches: Match[], matchesFromDb: MatchDTO[]): Match[] {
  const sanitizedMatches = matchesFromDb.map(mapMatchDTO)
  return sanitizedMatches.length > 0 ? sanitizedMatches : currentMatches
}

function readSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY)
}

function persistSessionToken(sessionToken: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!sessionToken) {
    window.localStorage.removeItem(SESSION_TOKEN_KEY)
    return
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
}

function applyAutomaticLiveStatus(state: AppState): AppState {
  const now = new Date()
  const matches = state.matches.map((match) => {
    if (match.status === 'final') {
      return match
    }

    const kickoff = new Date(match.kickoffAt).getTime()
    const nowMs = now.getTime()

    if (nowMs >= kickoff && nowMs < kickoff + MS_MATCH_WINDOW) {
      return {
        ...match,
        status: 'live',
      }
    }

    if (nowMs >= kickoff + MS_MATCH_WINDOW && match.homeGoals !== null && match.awayGoals !== null) {
      return {
        ...match,
        status: 'final',
      }
    }

    return match
  })

  return {
    ...state,
    matches,
    lastLiveSyncAt: now.toISOString(),
  }
}

function applyAutoConfirm(state: AppState): AppState {
  const now = new Date()
  const newSubmissions = [...state.submissions]

  for (const user of state.users) {
    for (const phase of PHASE_ORDER) {
      if (!isPhaseLocked(state, phase, now)) {
        continue
      }

      if (wasPhaseConfirmed(newSubmissions, user.id, phase)) {
        continue
      }

      const hasDraft = state.predictions.some(
        (prediction) => prediction.userId === user.id && prediction.phase === phase,
      )

      if (!hasDraft) {
        continue
      }

      newSubmissions.push({
        userId: user.id,
        phase,
        confirmedAt: now.toISOString(),
        autoConfirmed: true,
      })
    }
  }

  return {
    ...state,
    submissions: newSubmissions,
  }
}

function hasScorableFinalOutcome(
  match: Match,
): match is Match & { status: 'final'; homeGoals: number; awayGoals: number } {
  if (match.status !== 'final') return false
  if (match.homeGoals == null || match.awayGoals == null) return false
  if (match.phase !== 'groups' && !match.qualifiedTeamId) return false
  return true
}

function calculateLeaderboard(state: AppState): LeaderboardRow[] {
  const rows: LeaderboardRow[] = state.users.map((user) => {
    const userPredictions = state.predictions.filter((prediction) => prediction.userId === user.id)
    const userSubmissions = state.submissions.filter((submission) => submission.userId === user.id)

    let points = 0
    let exactHits = 0

    for (const prediction of userPredictions) {
      const match = state.matches.find((item) => item.id === prediction.matchId)
      if (!match || !hasScorableFinalOutcome(match)) {
        continue
      }

      const isSubmitted = userSubmissions.some((submission) => submission.phase === prediction.phase)
      if (!isSubmitted) {
        continue
      }

      const gained = computeMatchPoints(
        {
          phase: match.phase,
          homeGoals: match.homeGoals,
          awayGoals: match.awayGoals,
          qualifiedTeamId: match.qualifiedTeamId,
        },
        {
          homeGoals: prediction.homeGoals,
          awayGoals: prediction.awayGoals,
          predictedQualifiedTeamId: prediction.predictedQualifiedTeamId,
        },
      )

      points += gained

      if (gained === 3) {
        exactHits += 1
      }
    }

    const firstConfirmedAt = userSubmissions
      .map((submission) => submission.confirmedAt)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null

    return {
      userId: user.id,
      nickname: user.nickname,
      teamId: user.teamId,
      points,
      exactHits,
      firstConfirmedAt,
    }
  })

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits

    const aTs = a.firstConfirmedAt ? new Date(a.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER
    const bTs = b.firstConfirmedAt ? new Date(b.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER

    return aTs - bTs
  })
}

function mapSessionUser(user: SessionUserDTO): User {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    teamId: user.teamId,
    isAdmin: user.isAdmin,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }
}

function mapBasicUser(user: BasicUserDTO): User {
  return {
    id: user.id,
    email: null,
    nickname: user.nickname,
    teamId: user.teamId,
    isAdmin: false,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    lastLoginAt: null,
  }
}

function mapAdminUser(user: AdminUserDTO): User {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    teamId: user.teamId,
    isAdmin: user.isAdmin,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }
}

function formatUsersError(message: string): { ok: false; message: string } {
  return { ok: false, message }
}

type RegisterInput = {
  email: string
  nickname: string
  teamId: string
  pin: string
  secretPhrase: string
}

type LoginInput = {
  email: string
  pin: string
}

type SavePredictionInput = {
  phase: PhaseKey
  matchId: string
  homeGoals: number
  awayGoals: number
  predictedQualifiedTeamId: string | null
}

type SetResultInput = {
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId: string | null
  status: 'scheduled' | 'live' | 'final'
}

type ActionResult = { ok: true } | { ok: false; message: string }

type AppContextValue = {
  ready: boolean
  state: AppState
  currentUser: User | null
  teamsById: Record<string, string>
  activePhase: PhaseKey
  leaderboard: LeaderboardRow[]
  sessionToken: string | null
  login: (payload: LoginInput) => Promise<ActionResult>
  register: (payload: RegisterInput) => Promise<ActionResult>
  logout: () => void
  completeOnboarding: () => Promise<ActionResult>
  savePrediction: (payload: SavePredictionInput) => { ok: true } | { ok: false; message: string }
  confirmPhase: (phase: PhaseKey) => { ok: true } | { ok: false; message: string }
  refreshLive: () => void
  setMatchResult: (payload: SetResultInput) => Promise<ActionResult>
  setPhaseOverride: (phase: PhaseKey, opensAt: string, closesAt: string) => void
  resetUserPin: (userId: string, newPin: string) => Promise<ActionResult>
  softDeleteUser: (userId: string) => Promise<ActionResult>
  refreshUsers: () => Promise<void>
  canEditPhase: (phase: PhaseKey) => boolean
  isPhaseEditableAtNow: (phase: PhaseKey) => boolean
  isPhaseConfirmed: (phase: PhaseKey) => boolean
  isPhaseLockedAtNow: (phase: PhaseKey) => boolean
  getPhaseWindowAtNow: (phase: PhaseKey) => { opensAt: Date; closesAt: Date }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AppState>(buildInitialState)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const refreshUsersWithSession = useCallback(async (token: string, isAdmin: boolean) => {
    if (isAdmin) {
      const adminListResponse = await invokeUsersAction<
        { sessionToken: string },
        { users: AdminUserDTO[] }
      >('list_admin', { sessionToken: token })

      if (!adminListResponse.ok) {
        return
      }

      setState((prev) => applyAutoConfirm({ ...prev, users: adminListResponse.data.users.map(mapAdminUser) }))
      return
    }

    const basicListResponse = await invokeUsersAction<
      { sessionToken: string },
      { users: BasicUserDTO[] }
    >('list_basic', { sessionToken: token })

    if (!basicListResponse.ok) {
      return
    }

    setState((prev) => applyAutoConfirm({ ...prev, users: basicListResponse.data.users.map(mapBasicUser) }))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      let loaded = applyAutoConfirm(readState())

      const matchesResponse = await invokeQuinielasAction<{ limit: number }, ListMatchesResultDTO>('list_matches', {
        limit: 256,
      })

      if (matchesResponse.ok) {
        loaded = {
          ...loaded,
          matches: mergeMatches(loaded.matches, matchesResponse.data.matches),
        }
      }

      if (cancelled) return
      setState(loaded)

      const storedToken = readSessionToken()
      if (!storedToken) {
        setReady(true)
        return
      }

      const meResponse = await invokeUsersAction<{ sessionToken: string }, { user: SessionUserDTO }>('me', {
        sessionToken: storedToken,
      })

      if (cancelled) return

      if (!meResponse.ok) {
        setSessionToken(null)
        setCurrentUser(null)
        setReady(true)
        return
      }

      const meUser = mapSessionUser(meResponse.data.user)
      setSessionToken(storedToken)
      setCurrentUser(meUser)
      await refreshUsersWithSession(storedToken, meUser.isAdmin)
      if (cancelled) return
      setReady(true)
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [refreshUsersWithSession])

  useEffect(() => {
    if (!ready) return
    persistState(state)
  }, [ready, state])

  useEffect(() => {
    if (!ready) return
    persistSessionToken(sessionToken)
  }, [ready, sessionToken])

  const activePhase = useMemo(() => {
    const now = ready ? new Date() : new Date(HYDRATION_SAFE_NOW_ISO)
    return getActivePhase(state, now)
  }, [ready, state])

  const leaderboard = useMemo(() => calculateLeaderboard(state), [state])

  const teamsById = useMemo(() => {
    const output: Record<string, string> = {}
    for (const user of state.users) {
      output[user.id] = getTeam(user.teamId).flag
    }
    return output
  }, [state.users])

  const refreshUsers = useCallback(async () => {
    if (!sessionToken || !currentUser) {
      return
    }
    await refreshUsersWithSession(sessionToken, currentUser.isAdmin)
  }, [currentUser, refreshUsersWithSession, sessionToken])

  const isPhaseEditableAtNow = useCallback((phase: PhaseKey) => {
    if (!ready) return false
    return isPhaseEditable(state, phase, new Date())
  }, [ready, state])

  const register = useCallback(async (payload: RegisterInput): Promise<ActionResult> => {
    const email = payload.email.trim().toLowerCase()
    const nickname = payload.nickname.trim()
    const teamId = payload.teamId

    if (!email || !nickname || !teamId) {
      return formatUsersError('Todos los campos son obligatorios.')
    }

    if (!isPinValid(payload.pin)) {
      return formatUsersError('El PIN debe tener 6 digitos numericos.')
    }

    const registerResponse = await invokeUsersAction<
      RegisterInput,
      { sessionToken: string; user: SessionUserDTO }
    >('register', {
      email,
      nickname,
      teamId,
      pin: payload.pin,
      secretPhrase: payload.secretPhrase,
    })

    if (!registerResponse.ok) {
      return formatUsersError(registerResponse.error.message)
    }

    const signedUser = mapSessionUser(registerResponse.data.user)
    setSessionToken(registerResponse.data.sessionToken)
    setCurrentUser(signedUser)
    await refreshUsersWithSession(registerResponse.data.sessionToken, signedUser.isAdmin)

    return { ok: true }
  }, [refreshUsersWithSession])

  const login = useCallback(async (payload: LoginInput): Promise<ActionResult> => {
    if (!isPinValid(payload.pin)) {
      return formatUsersError('PIN invalido.')
    }

    const loginResponse = await invokeUsersAction<LoginInput, { sessionToken: string; user: SessionUserDTO }>(
      'login',
      {
        email: payload.email.trim().toLowerCase(),
        pin: payload.pin,
      },
    )

    if (!loginResponse.ok) {
      return formatUsersError(loginResponse.error.message)
    }

    const signedUser = mapSessionUser(loginResponse.data.user)
    setSessionToken(loginResponse.data.sessionToken)
    setCurrentUser(signedUser)
    await refreshUsersWithSession(loginResponse.data.sessionToken, signedUser.isAdmin)
    return { ok: true }
  }, [refreshUsersWithSession])

  const logout = useCallback(() => {
    setSessionToken(null)
    setCurrentUser(null)
  }, [])

  const completeOnboarding = useCallback(async (): Promise<ActionResult> => {
    if (!currentUser || !sessionToken) {
      return formatUsersError('Debes iniciar sesion.')
    }

    const updateResponse = await invokeUsersAction<
      { sessionToken: string; onboardingCompleted: boolean },
      { user: SessionUserDTO }
    >('update_me', {
      sessionToken,
      onboardingCompleted: true,
    })

    if (!updateResponse.ok) {
      return formatUsersError(updateResponse.error.message)
    }

    const updated = mapSessionUser(updateResponse.data.user)
    setCurrentUser(updated)
    setState((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === updated.id
          ? {
              ...user,
              nickname: updated.nickname,
              teamId: updated.teamId,
              onboardingCompleted: updated.onboardingCompleted,
              email: updated.email,
              isAdmin: updated.isAdmin,
              lastLoginAt: updated.lastLoginAt,
            }
          : user,
      ),
    }))

    return { ok: true }
  }, [currentUser, sessionToken])

  const canEditPhase = useCallback((phase: PhaseKey) => {
    if (!ready || !currentUser) return false

    if (phase !== activePhase) {
      return false
    }

    if (wasPhaseConfirmed(state.submissions, currentUser.id, phase)) {
      return false
    }

    return isPhaseEditableAtNow(phase)
  }, [ready, currentUser, activePhase, state.submissions, isPhaseEditableAtNow])

  const savePrediction = useCallback((payload: SavePredictionInput) => {
    if (!currentUser) {
      return { ok: false as const, message: 'Debes iniciar sesion.' }
    }

    if (!canEditPhase(payload.phase)) {
      return { ok: false as const, message: 'No puedes editar esa fase ahora.' }
    }

    setState((prev) => {
      const next = [...prev.predictions]
      const existingIndex = next.findIndex(
        (item) =>
          item.userId === currentUser.id &&
          item.phase === payload.phase &&
          item.matchId === payload.matchId,
      )

      const base: Prediction = {
        userId: currentUser.id,
        phase: payload.phase,
        matchId: payload.matchId,
        homeGoals: payload.homeGoals,
        awayGoals: payload.awayGoals,
        predictedQualifiedTeamId: payload.predictedQualifiedTeamId,
        updatedAt: nowIso(),
      }

      if (existingIndex >= 0) {
        next[existingIndex] = base
      } else {
        next.push(base)
      }

      return {
        ...prev,
        predictions: next,
      }
    })

    return { ok: true as const }
  }, [canEditPhase, currentUser])

  const confirmPhase = useCallback((phase: PhaseKey) => {
    if (!currentUser) {
      return { ok: false as const, message: 'Debes iniciar sesion.' }
    }

    if (!canEditPhase(phase)) {
      return { ok: false as const, message: 'Esta fase ya no se puede confirmar.' }
    }

    const hasPredictions = state.predictions.some(
      (prediction) => prediction.userId === currentUser.id && prediction.phase === phase,
    )

    if (!hasPredictions) {
      return { ok: false as const, message: 'Debes guardar al menos un partido.' }
    }

    setState((prev) => ({
      ...prev,
      submissions: [
        ...prev.submissions,
        {
          userId: currentUser.id,
          phase,
          confirmedAt: nowIso(),
          autoConfirmed: false,
        },
      ],
    }))

    return { ok: true as const }
  }, [canEditPhase, currentUser, state.predictions])

  const refreshLive = useCallback(() => {
    setState((prev) => applyAutoConfirm(applyAutomaticLiveStatus(prev)))
  }, [])

  const setMatchResult = useCallback(async (payload: SetResultInput): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false as const, message: 'Solo admin puede editar resultados.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<
      {
        id: string
        status: 'scheduled' | 'live' | 'final'
        homeGoals: number | null
        awayGoals: number | null
        qualifiedTeamId: string | null
        manualOverride: boolean
      },
      { match: MatchDTO }
    >('update_match', sessionToken, {
      id: payload.matchId,
      status: payload.status,
      homeGoals: payload.homeGoals,
      awayGoals: payload.awayGoals,
      qualifiedTeamId: payload.qualifiedTeamId,
      manualOverride: true,
    })

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    const updatedMatch = mapMatchDTO(response.data.match)
    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((match) => (match.id === payload.matchId ? updatedMatch : match)),
    }))

    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const setPhaseOverride = useCallback((phase: PhaseKey, opensAt: string, closesAt: string) => {
    if (!currentUser?.isAdmin) {
      return
    }

    setState((prev) => {
      const next = prev.windowOverrides.filter((item) => item.phase !== phase)
      next.push({ phase, opensAt, closesAt })
      return {
        ...prev,
        windowOverrides: next,
      }
    })
  }, [currentUser?.isAdmin])

  const resetUserPin = useCallback(async (userId: string, newPin: string): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return formatUsersError('Solo admin puede resetear PIN.')
    }

    if (!sessionToken) {
      return formatUsersError('Sesion invalida. Inicia sesion de nuevo.')
    }

    if (!isPinValid(newPin)) {
      return formatUsersError('El nuevo PIN debe tener 6 digitos.')
    }

    const resetResponse = await invokeUsersAction<
      { sessionToken: string; userId: string; newPin: string },
      AdminMutationResultDTO
    >('admin_reset_pin', {
      sessionToken,
      userId,
      newPin,
    })

    if (!resetResponse.ok) {
      return formatUsersError(resetResponse.error.message)
    }

    await refreshUsersWithSession(sessionToken, true)
    return { ok: true }
  }, [currentUser?.isAdmin, refreshUsersWithSession, sessionToken])

  const softDeleteUser = useCallback(async (userId: string): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return formatUsersError('Solo admin puede eliminar usuarios.')
    }

    if (!sessionToken) {
      return formatUsersError('Sesion invalida. Inicia sesion de nuevo.')
    }

    const deleteResponse = await invokeUsersAction<
      { sessionToken: string; userId: string },
      AdminMutationResultDTO
    >('admin_soft_delete', {
      sessionToken,
      userId,
    })

    if (!deleteResponse.ok) {
      return formatUsersError(deleteResponse.error.message)
    }

    setState((prev) => ({
      ...prev,
      predictions: prev.predictions.filter((prediction) => prediction.userId !== userId),
      submissions: prev.submissions.filter((submission) => submission.userId !== userId),
    }))

    await refreshUsersWithSession(sessionToken, true)
    return { ok: true }
  }, [currentUser?.isAdmin, refreshUsersWithSession, sessionToken])

  const isPhaseConfirmed = useCallback((phase: PhaseKey) => {
    if (!currentUser) return false
    return wasPhaseConfirmed(state.submissions, currentUser.id, phase)
  }, [currentUser, state.submissions])

  const isPhaseLockedAtNow = useCallback((phase: PhaseKey) => {
    if (!ready) return false
    return isPhaseLocked(state, phase, new Date())
  }, [ready, state])

  const getPhaseWindowAtNow = useCallback((phase: PhaseKey) => {
    return getPhaseWindow(state, phase)
  }, [state])

  const value: AppContextValue = {
    ready,
    state,
    currentUser,
    teamsById,
    activePhase,
    leaderboard,
    sessionToken,
    register,
    login,
    logout,
    completeOnboarding,
    savePrediction,
    confirmPhase,
    refreshLive,
    setMatchResult,
    setPhaseOverride,
    resetUserPin,
    softDeleteUser,
    refreshUsers,
    canEditPhase,
    isPhaseEditableAtNow,
    isPhaseConfirmed,
    isPhaseLockedAtNow,
    getPhaseWindowAtNow,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp debe usarse dentro de AppProvider')
  }

  return ctx
}

export function useRequireUser() {
  const app = useApp()
  if (!app.currentUser) {
    return null
  }

  return app.currentUser
}
