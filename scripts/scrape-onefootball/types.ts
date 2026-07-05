export type MatchStatus = "scheduled" | "live" | "final"
export type ScrapedMatch = {
  externalMatchRef: string;
  phase: string;
  groupName: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffAt: string | null;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId?: string | null;
};

export type RawMatchCard = {
  matchRef: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: string | null;
  awayScore: string | null;
  statusText: string;
  dateText: string;
  roundName?: string;
  cardText?: string;
};

export type ScrapePayload = {
  scrapedAt: string;
  source: string;
  tournamentUrl: string;
  totalMatches: number;
  matches: ScrapedMatch[];
};

export type DesoQuinielaMatch = {
  id: string;
  phase: string;
  groupName: string | null;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId: string | null;
  manualOverride: boolean;
  source: string | null;
  externalMatchRef: string | null;
  updatedAt: string;
};
