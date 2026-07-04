export type ScrapedMatch = {
  externalMatchRef: string
  phase: string
  groupName: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  kickoffAt: string | null
  status: "scheduled" | "live" | "final"
  homeGoals: number | null
  awayGoals: number | null
  qualifiedTeamId?: string | null
}

export type RawMatchCard = {
  matchRef: string
  homeTeamName: string
  awayTeamName: string
  homeScore: string | null
  awayScore: string | null
  statusText: string
  dateText: string
  roundName: string
  cardText?: string
}

export type ScrapePayload = {
  scrapedAt: string
  source: string
  tournamentUrl: string
  totalMatches: number
  matches: ScrapedMatch[]
}
