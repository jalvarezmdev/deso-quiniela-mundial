import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  invokeAdminQuinielasAction,
  invokeAuthenticatedQuinielasAction,
  invokeQuinielasAction,
  type LeaderboardRowDTO,
  type ListLeaderboardResultDTO,
  type ListMatchesResultDTO,
  type ListMyPhaseSubmissionsResultDTO,
  type ListMyPredictionsResultDTO,
  type ListPhaseWindowOverridesResultDTO,
  type MatchDTO,
  type PhaseSubmissionDTO,
  type PhaseWindowOverrideDTO,
  type PredictionDTO,
} from '#/lib/quinielas-api'
import {
  invokeUsersAction,
  type AdminMutationResultDTO,
  type AdminUserDTO,
  type BasicUserDTO,
  type SessionUserDTO,
} from '#/lib/users-api'
import {
  PHASE_ORDER,
  getActivePhase,
  getPhaseWindow,
  isPhaseEditable,
  isPhaseLocked,
} from '#/lib/phase-flow'
import {
  type AppState,
  type LeaderboardRow,
  type Match,
  type PhaseKey,
  type PhaseSubmission,
  type Prediction,
  type User,
} from '#/lib/types'
import {
  hasLocalPrediction,
  savePredictionWithFallback,
  type SavePredictionInput,
} from './save-prediction-strategy'

const SESSION_TOKEN_KEY = 'quiniela_session_token_v1'
const HYDRATION_SAFE_NOW_ISO = '2026-01-01T00:00:00.000Z'
const MAX_NICKNAME_LENGTH = 50

function isPinValid(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

function countNicknameCharacters(nickname: string): number {
  return Array.from(nickname).length
}

function wasPhaseConfirmed(submissions: PhaseSubmission[], userId: string, phase: PhaseKey): boolean {
  return submissions.some((submission) => submission.userId === userId && submission.phase === phase)
}

function buildInitialState(): AppState {
  return {
    users: [],
    matches: [],
    predictions: [],
    submissions: [],
    windowOverrides: [],
    lastLiveSyncAt: null,
  }
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

function mapPredictionDTO(prediction: PredictionDTO): Prediction {
  return {
    userId: prediction.userId,
    phase: prediction.phase,
    matchId: prediction.matchId,
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
    predictedQualifiedTeamId: prediction.predictedQualifiedTeamId,
    updatedAt: prediction.updatedAt,
  }
}

function mapSubmissionDTO(submission: PhaseSubmissionDTO): PhaseSubmission {
  return {
    userId: submission.userId,
    phase: submission.phase,
    confirmedAt: submission.confirmedAt,
    autoConfirmed: submission.autoConfirmed,
  }
}

function mapWindowOverrideDTO(windowOverride: PhaseWindowOverrideDTO) {
  return {
    phase: windowOverride.phase,
    opensAt: windowOverride.opensAt,
    closesAt: windowOverride.closesAt,
  }
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

type SetResultInput = {
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId: string | null
  status: 'scheduled' | 'live' | 'final'
}

type CreateMatchInput = {
  id: string
  phase: PhaseKey
  groupName: string | null
  homeTeamId: string
  awayTeamId: string
  kickoffAt: string
  status: 'scheduled' | 'live' | 'final'
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId: string | null
  manualOverride?: boolean
}

type ActionResult = { ok: true } | { ok: false; message: string }

type AppContextValue = {
  authResolved: boolean
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
  updateFavoriteTeam: (teamId: string) => Promise<ActionResult>
  savePrediction: (payload: SavePredictionInput) => Promise<ActionResult>
  confirmPhase: (phase: PhaseKey) => Promise<ActionResult>
  refreshLive: () => void
  refreshMatches: () => Promise<void>
  refreshQuinielaData: () => Promise<void>
  refreshLeaderboard: () => Promise<void>
  setMatchResult: (payload: SetResultInput) => Promise<ActionResult>
  createMatch: (payload: CreateMatchInput) => Promise<ActionResult>
  deleteMatch: (matchId: string) => Promise<ActionResult>
  setPhaseOverride: (phase: PhaseKey, opensAt: string, closesAt: string) => Promise<ActionResult>
  resetUserPin: (userId: string, newPin: string) => Promise<ActionResult>
  softDeleteUser: (userId: string) => Promise<ActionResult>
  refreshUsers: () => Promise<void>
  canEditPhase: (phase: PhaseKey) => boolean
  isPhaseEditableAtNow: (phase: PhaseKey) => boolean
  isPhaseConfirmed: (phase: PhaseKey) => boolean
  isPhaseLockedAtNow: (phase: PhaseKey) => boolean
  getPhaseWindowAtNow: (phase: PhaseKey) => { opensAt: Date; closesAt: Date }
  scoringMode: 'phase_confirmation' | 'per_match'
  getScoringConfig: () => Promise<ActionResult>
  updateScoringConfig: (mode: 'phase_confirmation' | 'per_match') => Promise<ActionResult>
  forcedActivePhase: PhaseKey | null
  getForcedActivePhase: () => Promise<ActionResult>
  updateForcedActivePhase: (phase: PhaseKey | null) => Promise<ActionResult>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authResolved, setAuthResolved] = useState(false)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AppState>(buildInitialState)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [scoringMode, setScoringMode] = useState<'phase_confirmation' | 'per_match'>('phase_confirmation')
  const [forcedActivePhase, setForcedActivePhase] = useState<PhaseKey | null>(null)

  const syncSignedUser = useCallback((updatedUser: SessionUserDTO) => {
    const updated = mapSessionUser(updatedUser)
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
    setLeaderboard((prev) =>
      prev.map((row) =>
        row.userId === updated.id
          ? {
              ...row,
              teamId: updated.teamId,
              nickname: updated.nickname,
            }
          : row,
      ),
    )
  }, [])

  const refreshUsersWithSession = useCallback(async (token: string, isAdmin: boolean) => {
    if (isAdmin) {
      const adminListResponse = await invokeUsersAction<
        { sessionToken: string },
        { users: AdminUserDTO[] }
      >('list_admin', { sessionToken: token })

      if (!adminListResponse.ok) {
        return
      }

      setState((prev) => ({ ...prev, users: adminListResponse.data.users.map(mapAdminUser) }))
      return
    }

    const basicListResponse = await invokeUsersAction<
      { sessionToken: string },
      { users: BasicUserDTO[] }
    >('list_basic', { sessionToken: token })

    if (!basicListResponse.ok) {
      return
    }

    setState((prev) => ({ ...prev, users: basicListResponse.data.users.map(mapBasicUser) }))
  }, [])

  const refreshMatches = useCallback(async () => {
    const [matchesResponse, windowsResponse] = await Promise.all([
      invokeQuinielasAction<{ limit: number }, ListMatchesResultDTO>('list_matches', { limit: 512 }),
      invokeQuinielasAction<Record<string, never>, ListPhaseWindowOverridesResultDTO>(
        'list_phase_window_overrides',
        {},
      ),
    ])

    if (!matchesResponse.ok) {
      return
    }

    setState((prev) => ({
      ...prev,
      matches: matchesResponse.data.matches.map(mapMatchDTO),
      windowOverrides: windowsResponse.ok
        ? windowsResponse.data.windowOverrides.map(mapWindowOverrideDTO)
        : prev.windowOverrides,
      lastLiveSyncAt: new Date().toISOString(),
    }))
  }, [])

  const refreshQuinielaDataWithToken = useCallback(async (token: string) => {
    const [predictionsResponse, submissionsResponse] = await Promise.all([
      invokeAuthenticatedQuinielasAction<{ phase?: PhaseKey }, ListMyPredictionsResultDTO>(
        'list_my_predictions',
        token,
        {},
      ),
      invokeAuthenticatedQuinielasAction<{ phase?: PhaseKey }, ListMyPhaseSubmissionsResultDTO>(
        'list_my_phase_submissions',
        token,
        {},
      ),
    ])

    setState((prev) => ({
      ...prev,
      predictions: predictionsResponse.ok ? predictionsResponse.data.predictions.map(mapPredictionDTO) : [],
      submissions: submissionsResponse.ok ? submissionsResponse.data.submissions.map(mapSubmissionDTO) : [],
    }))
  }, [])

  const refreshQuinielaData = useCallback(async () => {
    if (!sessionToken) {
      setState((prev) => ({ ...prev, predictions: [], submissions: [] }))
      return
    }

    await refreshQuinielaDataWithToken(sessionToken)
  }, [refreshQuinielaDataWithToken, sessionToken])

  const refreshLeaderboardWithToken = useCallback(async (token: string) => {
    const response = await invokeAuthenticatedQuinielasAction<Record<string, never>, ListLeaderboardResultDTO>(
      'list_leaderboard',
      token,
      {},
    )

    if (!response.ok) {
      setLeaderboard([])
      return
    }

    setLeaderboard(response.data.leaderboard as LeaderboardRowDTO[])
  }, [])

  const refreshLeaderboard = useCallback(async () => {
    if (!sessionToken) {
      setLeaderboard([])
      return
    }

    await refreshLeaderboardWithToken(sessionToken)
  }, [refreshLeaderboardWithToken, sessionToken])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const storedToken = readSessionToken()
      if (!storedToken) {
        if (!cancelled) {
          setAuthResolved(true)
        }
      } else {
        const meResponse = await invokeUsersAction<{ sessionToken: string }, { user: SessionUserDTO }>('me', {
          sessionToken: storedToken,
        })

        if (cancelled) return

        if (!meResponse.ok) {
          setSessionToken(null)
          setCurrentUser(null)
          setLeaderboard([])
          setAuthResolved(true)
        } else {
          const meUser = mapSessionUser(meResponse.data.user)
          setSessionToken(storedToken)
          setCurrentUser(meUser)
          setAuthResolved(true)

          await Promise.all([
            refreshUsersWithSession(storedToken, meUser.isAdmin),
            refreshQuinielaDataWithToken(storedToken),
            refreshLeaderboardWithToken(storedToken),
          ])
        }
      }

      if (cancelled) return

      await refreshMatches()

      if (cancelled) return

      const forcedPhaseResponse = await invokeQuinielasAction<Record<string, never>, { forcedActivePhase: PhaseKey | null }>(
        'get_forced_active_phase',
        {},
      )
      if (!cancelled && forcedPhaseResponse.ok) {
        setForcedActivePhase(forcedPhaseResponse.data.forcedActivePhase)
      }

      if (!cancelled) {
        setReady(true)
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [refreshLeaderboardWithToken, refreshMatches, refreshQuinielaDataWithToken, refreshUsersWithSession])

  useEffect(() => {
    if (!ready) return
    persistSessionToken(sessionToken)
  }, [ready, sessionToken])

  const activePhase = useMemo(() => {
    if (forcedActivePhase) return forcedActivePhase
    const now = ready ? new Date() : new Date(HYDRATION_SAFE_NOW_ISO)
    return getActivePhase(state, now)
  }, [ready, state, forcedActivePhase])

  const teamsById = useMemo(() => {
    const output: Record<string, string> = {}
    for (const user of state.users) {
      output[user.id] = user.teamId
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

    if (countNicknameCharacters(nickname) > MAX_NICKNAME_LENGTH) {
      return formatUsersError(`El nombre o apodo no puede superar ${MAX_NICKNAME_LENGTH} caracteres.`)
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

    await Promise.all([
      refreshUsersWithSession(registerResponse.data.sessionToken, signedUser.isAdmin),
      refreshQuinielaDataWithToken(registerResponse.data.sessionToken),
      refreshLeaderboardWithToken(registerResponse.data.sessionToken),
    ])

    return { ok: true }
  }, [refreshLeaderboardWithToken, refreshQuinielaDataWithToken, refreshUsersWithSession])

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

    await Promise.all([
      refreshUsersWithSession(loginResponse.data.sessionToken, signedUser.isAdmin),
      refreshMatches(),
      refreshQuinielaDataWithToken(loginResponse.data.sessionToken),
      refreshLeaderboardWithToken(loginResponse.data.sessionToken),
    ])

    return { ok: true }
  }, [refreshLeaderboardWithToken, refreshMatches, refreshQuinielaDataWithToken, refreshUsersWithSession])

  const logout = useCallback(() => {
    setSessionToken(null)
    setCurrentUser(null)
    setLeaderboard([])
    setState((prev) => ({ ...prev, predictions: [], submissions: [] }))
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

    syncSignedUser(updateResponse.data.user)

    return { ok: true }
  }, [currentUser, sessionToken, syncSignedUser])

  const updateFavoriteTeam = useCallback(async (teamId: string): Promise<ActionResult> => {
    if (!currentUser || !sessionToken) {
      return formatUsersError('Debes iniciar sesion.')
    }

    const normalizedTeamId = teamId.trim()
    if (!normalizedTeamId) {
      return formatUsersError('Equipo invalido.')
    }

    if (normalizedTeamId === currentUser.teamId) {
      return { ok: true }
    }

    const updateResponse = await invokeUsersAction<
      { sessionToken: string; teamId: string },
      { user: SessionUserDTO }
    >('update_me', {
      sessionToken,
      teamId: normalizedTeamId,
    })

    if (!updateResponse.ok) {
      return formatUsersError(updateResponse.error.message)
    }

    syncSignedUser(updateResponse.data.user)

    return { ok: true }
  }, [currentUser, sessionToken, syncSignedUser])

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

  const refreshLive = useCallback(() => {
    void refreshMatches()
  }, [refreshMatches])

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

    await refreshLeaderboard()

    return { ok: true }
  }, [currentUser?.isAdmin, refreshLeaderboard, sessionToken])

  const createMatch = useCallback(async (payload: CreateMatchInput): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede crear partidos.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<CreateMatchInput, { match: MatchDTO }>('create_match', sessionToken, {
      ...payload,
      manualOverride: payload.manualOverride ?? true,
    })

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setState((prev) => ({
      ...prev,
      matches: [...prev.matches, mapMatchDTO(response.data.match)].sort(
        (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
      ),
    }))

    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const deleteMatch = useCallback(async (matchId: string): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede eliminar partidos.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<{ id: string }, { match: MatchDTO }>('delete_match', sessionToken, {
      id: matchId,
    })

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setState((prev) => ({
      ...prev,
      matches: prev.matches.filter((match) => match.id !== matchId),
      predictions: prev.predictions.filter((prediction) => prediction.matchId !== matchId),
    }))

    await refreshLeaderboard()

    return { ok: true }
  }, [currentUser?.isAdmin, refreshLeaderboard, sessionToken])

  const setPhaseOverride = useCallback(async (phase: PhaseKey, opensAt: string, closesAt: string): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede actualizar ventanas.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<
      { phase: PhaseKey; opensAt: string; closesAt: string },
      { windowOverride: PhaseWindowOverrideDTO }
    >('create_phase_window_override', sessionToken, {
      phase,
      opensAt,
      closesAt,
    })

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    const mapped = mapWindowOverrideDTO(response.data.windowOverride)

    setState((prev) => {
      const next = prev.windowOverrides.filter((item) => item.phase !== phase)
      next.push(mapped)
      return {
        ...prev,
        windowOverrides: next,
      }
    })

    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

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

    await Promise.all([
      refreshUsersWithSession(sessionToken, true),
      refreshLeaderboard(),
    ])

    return { ok: true }
  }, [currentUser?.isAdmin, refreshLeaderboard, refreshUsersWithSession, sessionToken])

  const getScoringConfig = useCallback(async (): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede ver configuracion.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<Record<string, never>, { scoringMode: 'phase_confirmation' | 'per_match' }>(
      'get_scoring_config',
      sessionToken,
      {},
    )

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setScoringMode(response.data.scoringMode)
    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const updateScoringConfig = useCallback(async (mode: 'phase_confirmation' | 'per_match'): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede actualizar configuracion.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<{ scoringMode: 'phase_confirmation' | 'per_match' }, { scoringMode: 'phase_confirmation' | 'per_match' }>(
      'update_scoring_config',
      sessionToken,
      { scoringMode: mode },
    )

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setScoringMode(response.data.scoringMode)
    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const getForcedActivePhase = useCallback(async (): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede ver configuracion.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeQuinielasAction<Record<string, never>, { forcedActivePhase: PhaseKey | null }>(
      'get_forced_active_phase',
      {},
    )

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setForcedActivePhase(response.data.forcedActivePhase)
    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const updateForcedActivePhase = useCallback(async (phase: PhaseKey | null): Promise<ActionResult> => {
    if (!currentUser?.isAdmin) {
      return { ok: false, message: 'Solo admin puede actualizar configuracion.' }
    }

    if (!sessionToken) {
      return { ok: false, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const response = await invokeAdminQuinielasAction<{ forcedActivePhase: PhaseKey | null }, { forcedActivePhase: PhaseKey | null }>(
      'update_forced_active_phase',
      sessionToken,
      { forcedActivePhase: phase },
    )

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    setForcedActivePhase(response.data.forcedActivePhase)
    return { ok: true }
  }, [currentUser?.isAdmin, sessionToken])

  const isPhaseConfirmed = useCallback((phase: PhaseKey) => {
    if (!currentUser) return false
    return wasPhaseConfirmed(state.submissions, currentUser.id, phase)
  }, [currentUser, state.submissions])

  const savePrediction = useCallback(async (payload: SavePredictionInput): Promise<ActionResult> => {
    if (!currentUser) {
      return { ok: false as const, message: 'Debes iniciar sesion.' }
    }

    if (!sessionToken) {
      return { ok: false as const, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    const match = state.matches.find(m => m.id === payload.matchId && m.phase === payload.phase)

    if (!match) {
      return { ok: false as const, message: 'Partido no encontrado.' }
    }

    if (match.status !== 'scheduled') {
      return { ok: false as const, message: 'No se puede modificar el pronostico: el partido esta en curso o finalizado.' }
    }

    if (!currentUser.isAdmin && isPhaseConfirmed(payload.phase)) {
      return { ok: false as const, message: 'La fase ya fue confirmada y no admite cambios.' }
    }

    const hasPrediction = hasLocalPrediction(state.predictions, {
      userId: currentUser.id,
      phase: payload.phase,
      matchId: payload.matchId,
    })
    const response = await savePredictionWithFallback(
      (action, input) =>
        invokeAuthenticatedQuinielasAction<SavePredictionInput, { prediction: PredictionDTO }>(
          action,
          sessionToken,
          input,
        ),
      payload,
      hasPrediction,
    )

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    const updatedPrediction = mapPredictionDTO(response.data.prediction)
    setState((prev) => {
      const nextPredictions = [...prev.predictions]
      const existingIndex = nextPredictions.findIndex(
        (item) =>
          item.userId === currentUser.id &&
          item.phase === payload.phase &&
          item.matchId === payload.matchId,
      )

      if (existingIndex >= 0) {
        nextPredictions[existingIndex] = updatedPrediction
      } else {
        nextPredictions.push(updatedPrediction)
      }

      return {
        ...prev,
        predictions: nextPredictions,
      }
    })

    return { ok: true }
  }, [currentUser, sessionToken, state.predictions, state.matches, isPhaseConfirmed])

  const confirmPhase = useCallback(async (phase: PhaseKey): Promise<ActionResult> => {
    if (!currentUser) {
      return { ok: false as const, message: 'Debes iniciar sesion.' }
    }

    if (!sessionToken) {
      return { ok: false as const, message: 'Sesion invalida. Inicia sesion de nuevo.' }
    }

    if (isPhaseConfirmed(phase)) {
      return { ok: false as const, message: 'Esta fase ya fue confirmada.' }
    }

    const response = await invokeAuthenticatedQuinielasAction<
      { phase: PhaseKey },
      { submission: PhaseSubmissionDTO }
    >('create_phase_submission', sessionToken, { phase })

    if (!response.ok) {
      return { ok: false, message: response.error.message }
    }

    const submission = mapSubmissionDTO(response.data.submission)

    setState((prev) => ({
      ...prev,
      submissions: [...prev.submissions.filter((item) => !(item.userId === submission.userId && item.phase === submission.phase)), submission],
    }))

    await refreshLeaderboard()

    return { ok: true }
  }, [currentUser, sessionToken, isPhaseConfirmed, refreshLeaderboard])

  const isPhaseLockedAtNow = useCallback((phase: PhaseKey) => {
    if (!ready) return false
    return isPhaseLocked(state, phase, new Date())
  }, [ready, state])

  const getPhaseWindowAtNow = useCallback((phase: PhaseKey) => {
    return getPhaseWindow(state, phase)
  }, [state])

  const value: AppContextValue = {
    authResolved,
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
    updateFavoriteTeam,
    savePrediction,
    confirmPhase,
    refreshLive,
    refreshMatches,
    refreshQuinielaData,
    refreshLeaderboard,
    setMatchResult,
    createMatch,
    deleteMatch,
    setPhaseOverride,
    resetUserPin,
    softDeleteUser,
    refreshUsers,
    canEditPhase,
    isPhaseEditableAtNow,
    isPhaseConfirmed,
    isPhaseLockedAtNow,
    getPhaseWindowAtNow,
    scoringMode,
    getScoringConfig,
    updateScoringConfig,
    forcedActivePhase,
    getForcedActivePhase,
    updateForcedActivePhase,
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
