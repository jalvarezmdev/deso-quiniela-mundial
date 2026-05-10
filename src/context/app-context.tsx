import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { computeMatchPoints } from '#/lib/game'
import { nowIso } from '#/lib/time'
import { getTeam } from '#/lib/teams'
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
const SESSION_KEY = 'quiniela_session_user_v1'
const HYDRATION_SAFE_NOW_ISO = '2026-01-01T00:00:00.000Z'

const PHASE_ORDER: PhaseKey[] = PHASES.map((phase) => phase.key)
const MS_DAY = 24 * 60 * 60 * 1000
const MS_MATCH_WINDOW = 2 * 60 * 60 * 1000

function hashPin(pin: string): string {
  let hash = 0
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i)
    hash |= 0
  }
  return `p-${Math.abs(hash).toString(36)}`
}

function isPinValid(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

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

function isPhaseResultsComplete(matches: Match[], phase: PhaseKey): boolean {
  const phaseMatches = getMatchesByPhase(matches, phase)
  if (phaseMatches.length === 0) return false
  return phaseMatches.every((match) => match.status === 'final')
}

function getPhaseWindow(state: AppState, phase: PhaseKey): { opensAt: Date; closesAt: Date } {
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

  const prevPhaseMatches = getMatchesByPhase(state.matches, previousPhase)
  const maxKickoff = Math.max(
    ...prevPhaseMatches.map((match) => new Date(match.kickoffAt).getTime()),
  )

  return {
    opensAt: new Date(maxKickoff + MS_MATCH_WINDOW),
    closesAt,
  }
}

function isPhaseLocked(state: AppState, phase: PhaseKey, now: Date): boolean {
  const { closesAt } = getPhaseWindow(state, phase)
  return now.getTime() >= closesAt.getTime()
}

function isPhaseOpen(state: AppState, phase: PhaseKey, now: Date): boolean {
  const previous = getPreviousPhase(phase)
  const previousDone = previous ? isPhaseResultsComplete(state.matches, previous) : true

  const { opensAt } = getPhaseWindow(state, phase)
  return previousDone && now.getTime() >= opensAt.getTime() && !isPhaseLocked(state, phase, now)
}

function getActivePhase(state: AppState, now: Date): PhaseKey {
  for (const phase of PHASE_ORDER) {
    if (isPhaseOpen(state, phase, now)) {
      return phase
    }
  }

  return 'final'
}

function wasPhaseConfirmed(submissions: PhaseSubmission[], userId: string, phase: PhaseKey): boolean {
  return submissions.some((submission) => submission.userId === userId && submission.phase === phase)
}

function defaultMatches(): Match[] {
  return [
    {
      id: 'g-1',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'mex',
      awayTeamId: 'sui',
      kickoffAt: '2026-06-11T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'g-2',
      phase: 'groups',
      groupName: 'Grupo A',
      homeTeamId: 'arg',
      awayTeamId: 'jpn',
      kickoffAt: '2026-06-12T00:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'g-3',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'eng',
      awayTeamId: 'usa',
      kickoffAt: '2026-06-12T17:00:00.000Z',
      status: 'scheduled',
      homeGoals: null,
      awayGoals: null,
      qualifiedTeamId: null,
      manualOverride: false,
    },
    {
      id: 'g-4',
      phase: 'groups',
      groupName: 'Grupo B',
      homeTeamId: 'bra',
      awayTeamId: 'sen',
      kickoffAt: '2026-06-13T00:00:00.000Z',
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

function readSessionUserId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(SESSION_KEY)
}

function persistSessionUserId(userId: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!userId) {
    window.localStorage.removeItem(SESSION_KEY)
    return
  }

  window.localStorage.setItem(SESSION_KEY, userId)
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

function calculateLeaderboard(state: AppState): LeaderboardRow[] {
  const rows: LeaderboardRow[] = state.users.map((user) => {
    const userPredictions = state.predictions.filter((prediction) => prediction.userId === user.id)
    const userSubmissions = state.submissions.filter((submission) => submission.userId === user.id)

    let points = 0
    let exactHits = 0

    for (const prediction of userPredictions) {
      const match = state.matches.find((item) => item.id === prediction.matchId)
      if (!match || match.status !== 'final') {
        continue
      }

      const isSubmitted = userSubmissions.some((submission) => submission.phase === prediction.phase)
      if (!isSubmitted) {
        continue
      }

      const gained = computeMatchPoints(
        {
          phase: match.phase,
          homeGoals: match.homeGoals ?? 0,
          awayGoals: match.awayGoals ?? 0,
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
  homeGoals: number
  awayGoals: number
  qualifiedTeamId: string | null
  status: 'live' | 'final'
}

type AppContextValue = {
  ready: boolean
  state: AppState
  currentUser: User | null
  teamsById: Record<string, string>
  activePhase: PhaseKey
  leaderboard: LeaderboardRow[]
  login: (payload: LoginInput) => { ok: true } | { ok: false; message: string }
  register: (payload: RegisterInput) => { ok: true } | { ok: false; message: string }
  logout: () => void
  completeOnboarding: () => void
  savePrediction: (payload: SavePredictionInput) => { ok: true } | { ok: false; message: string }
  confirmPhase: (phase: PhaseKey) => { ok: true } | { ok: false; message: string }
  refreshLive: () => void
  setMatchResult: (payload: SetResultInput) => { ok: true } | { ok: false; message: string }
  setPhaseOverride: (phase: PhaseKey, opensAt: string, closesAt: string) => void
  resetUserPin: (userId: string, newPin: string) => { ok: true } | { ok: false; message: string }
  canEditPhase: (phase: PhaseKey) => boolean
  isPhaseConfirmed: (phase: PhaseKey) => boolean
  isPhaseLockedAtNow: (phase: PhaseKey) => boolean
  getPhaseWindowAtNow: (phase: PhaseKey) => { opensAt: Date; closesAt: Date }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AppState>(buildInitialState)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)

  useEffect(() => {
    const loaded = applyAutoConfirm(readState())
    setState(loaded)
    setSessionUserId(readSessionUserId())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    persistState(state)
  }, [ready, state])

  useEffect(() => {
    if (!ready) return
    persistSessionUserId(sessionUserId)
  }, [ready, sessionUserId])

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === sessionUserId) ?? null,
    [sessionUserId, state.users],
  )

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

  const register = useCallback((payload: RegisterInput) => {
    const email = payload.email.trim().toLowerCase()
    const nickname = payload.nickname.trim()
    const teamId = payload.teamId
    const expectedSecret = (import.meta.env.VITE_REGISTRATION_SECRET ?? 'esto desocupao')
      .trim()
      .toLowerCase()

    if (!email || !nickname || !teamId) {
      return { ok: false as const, message: 'Todos los campos son obligatorios.' }
    }

    if (!isPinValid(payload.pin)) {
      return { ok: false as const, message: 'El PIN debe tener 6 digitos numericos.' }
    }

    if (payload.secretPhrase.trim().toLowerCase() !== expectedSecret) {
      return { ok: false as const, message: 'Palabra secreta invalida.' }
    }

    if (state.users.some((user) => user.email === email)) {
      return { ok: false as const, message: 'Ese correo ya esta registrado.' }
    }

    if (state.users.some((user) => user.nickname.toLowerCase() === nickname.toLowerCase())) {
      return { ok: false as const, message: 'Ese apodo ya esta registrado.' }
    }

    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    const user: User = {
      id: crypto.randomUUID(),
      email,
      nickname,
      teamId,
      pinHash: hashPin(payload.pin),
      isAdmin: adminEmails.includes(email),
      onboardingCompleted: false,
      createdAt: nowIso(),
    }

    setState((prev) => ({
      ...prev,
      users: [...prev.users, user],
    }))
    setSessionUserId(user.id)

    return { ok: true as const }
  }, [state.users])

  const login = useCallback((payload: LoginInput) => {
    const email = payload.email.trim().toLowerCase()
    const user = state.users.find((candidate) => candidate.email === email)

    if (!user) {
      return { ok: false as const, message: 'No existe un usuario con ese correo.' }
    }

    if (!isPinValid(payload.pin)) {
      return { ok: false as const, message: 'PIN invalido.' }
    }

    if (user.pinHash !== hashPin(payload.pin)) {
      return { ok: false as const, message: 'PIN incorrecto.' }
    }

    setSessionUserId(user.id)
    return { ok: true as const }
  }, [state.users])

  const logout = useCallback(() => {
    setSessionUserId(null)
  }, [])

  const completeOnboarding = useCallback(() => {
    if (!currentUser) return

    setState((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              onboardingCompleted: true,
            }
          : user,
      ),
    }))
  }, [currentUser])

  const canEditPhase = useCallback((phase: PhaseKey) => {
    if (!ready || !currentUser) return false

    const now = new Date()

    if (phase !== getActivePhase(state, now)) {
      return false
    }

    if (wasPhaseConfirmed(state.submissions, currentUser.id, phase)) {
      return false
    }

    return !isPhaseLocked(state, phase, now)
  }, [ready, currentUser, state])

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

  const setMatchResult = useCallback((payload: SetResultInput) => {
    if (!currentUser?.isAdmin) {
      return { ok: false as const, message: 'Solo admin puede editar resultados.' }
    }

    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((match) =>
        match.id === payload.matchId
          ? {
              ...match,
              status: payload.status,
              homeGoals: payload.homeGoals,
              awayGoals: payload.awayGoals,
              qualifiedTeamId: payload.qualifiedTeamId,
              manualOverride: true,
            }
          : match,
      ),
    }))

    return { ok: true as const }
  }, [currentUser?.isAdmin])

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

  const resetUserPin = useCallback((userId: string, newPin: string) => {
    if (!currentUser?.isAdmin) {
      return { ok: false as const, message: 'Solo admin puede resetear PIN.' }
    }

    if (!isPinValid(newPin)) {
      return { ok: false as const, message: 'El nuevo PIN debe tener 6 digitos.' }
    }

    setState((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              pinHash: hashPin(newPin),
            }
          : user,
      ),
    }))

    return { ok: true as const }
  }, [currentUser?.isAdmin])

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
    canEditPhase,
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
