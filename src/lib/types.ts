export type PhaseKey =
  | 'groups'
  | 'roundOf16'
  | 'roundOf8'
  | 'roundOf4'
  | 'semifinals'
  | 'final'

export type MatchStatus = 'scheduled' | 'live' | 'final'

export type Team = {
  id: string
  name: string
  flag: string
}

export type User = {
  id: string
  email: string
  nickname: string
  teamId: string
  pinHash: string
  isAdmin: boolean
  onboardingCompleted: boolean
  createdAt: string
}

export type Match = {
  id: string
  phase: PhaseKey
  groupName: string | null
  homeTeamId: string
  awayTeamId: string
  kickoffAt: string
  status: MatchStatus
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId: string | null
  manualOverride: boolean
}

export type Prediction = {
  userId: string
  phase: PhaseKey
  matchId: string
  homeGoals: number
  awayGoals: number
  predictedQualifiedTeamId: string | null
  updatedAt: string
}

export type PhaseSubmission = {
  userId: string
  phase: PhaseKey
  confirmedAt: string
  autoConfirmed: boolean
}

export type PhaseWindowOverride = {
  phase: PhaseKey
  opensAt: string
  closesAt: string
}

export type AppState = {
  users: User[]
  matches: Match[]
  predictions: Prediction[]
  submissions: PhaseSubmission[]
  windowOverrides: PhaseWindowOverride[]
  lastLiveSyncAt: string | null
}

export type LeaderboardRow = {
  userId: string
  nickname: string
  teamId: string
  points: number
  exactHits: number
  firstConfirmedAt: string | null
}

export const PHASES: { key: PhaseKey; label: string }[] = [
  { key: 'groups', label: 'Fase de Grupos' },
  { key: 'roundOf16', label: '16vos' },
  { key: 'roundOf8', label: '8vos' },
  { key: 'roundOf4', label: '4tos' },
  { key: 'semifinals', label: 'Semifinales' },
  { key: 'final', label: 'Final' },
]
