type PhaseKey =
  | "groups"
  | "roundOf16"
  | "roundOf8"
  | "roundOf4"
  | "semifinals"
  | "final";

type SourceEliminationRow = {
  round: "Round of 32" | "Round of 16" | "Quarter-final" | "Semi-final" | "3rd Place" | "Final";
  date: string;
  time: string;
};

// IMPORTANT: Keep in sync with src/lib/elimination-preview.ts
const ELIMINATION_SOURCE_ROWS: SourceEliminationRow[] = [
  { round: "Round of 32", date: "2026-06-28", time: "12:00 UTC-7" },
  { round: "Round of 32", date: "2026-06-29", time: "16:30 UTC-4" },
  { round: "Round of 32", date: "2026-06-29", time: "19:00 UTC-6" },
  { round: "Round of 32", date: "2026-06-29", time: "12:00 UTC-5" },
  { round: "Round of 32", date: "2026-06-30", time: "17:00 UTC-4" },
  { round: "Round of 32", date: "2026-06-30", time: "12:00 UTC-5" },
  { round: "Round of 32", date: "2026-06-30", time: "19:00 UTC-6" },
  { round: "Round of 32", date: "2026-07-01", time: "12:00 UTC-4" },
  { round: "Round of 32", date: "2026-07-01", time: "17:00 UTC-7" },
  { round: "Round of 32", date: "2026-07-01", time: "13:00 UTC-7" },
  { round: "Round of 32", date: "2026-07-02", time: "19:00 UTC-4" },
  { round: "Round of 32", date: "2026-07-02", time: "12:00 UTC-7" },
  { round: "Round of 32", date: "2026-07-02", time: "20:00 UTC-7" },
  { round: "Round of 32", date: "2026-07-03", time: "18:00 UTC-4" },
  { round: "Round of 32", date: "2026-07-03", time: "20:30 UTC-5" },
  { round: "Round of 32", date: "2026-07-03", time: "13:00 UTC-5" },
  { round: "Round of 16", date: "2026-07-04", time: "17:00 UTC-4" },
  { round: "Round of 16", date: "2026-07-04", time: "12:00 UTC-5" },
  { round: "Round of 16", date: "2026-07-05", time: "16:00 UTC-4" },
  { round: "Round of 16", date: "2026-07-05", time: "18:00 UTC-6" },
  { round: "Round of 16", date: "2026-07-06", time: "14:00 UTC-5" },
  { round: "Round of 16", date: "2026-07-06", time: "17:00 UTC-7" },
  { round: "Round of 16", date: "2026-07-07", time: "12:00 UTC-4" },
  { round: "Round of 16", date: "2026-07-07", time: "13:00 UTC-7" },
  { round: "Quarter-final", date: "2026-07-09", time: "16:00 UTC-4" },
  { round: "Quarter-final", date: "2026-07-10", time: "12:00 UTC-7" },
  { round: "Quarter-final", date: "2026-07-11", time: "17:00 UTC-4" },
  { round: "Quarter-final", date: "2026-07-11", time: "20:00 UTC-5" },
  { round: "Semi-final", date: "2026-07-14", time: "14:00 UTC-5" },
  { round: "Semi-final", date: "2026-07-15", time: "15:00 UTC-4" },
  { round: "3rd Place", date: "2026-07-18", time: "17:00 UTC-4"},
  { round: "Final", date: "2026-07-19", time: "15:00 UTC-4" },
];

function mapRoundToPhase(round: SourceEliminationRow["round"]): Exclude<PhaseKey, "groups"> {
  if (round === "Round of 32") return "roundOf16";
  if (round === "Round of 16") return "roundOf8";
  if (round === "Quarter-final") return "roundOf4";
  if (round === "Semi-final") return "semifinals";
  if (round === "3rd Place") return "final";
  return "final";
}

function parseKickoffAtToIso(date: string, timeWithOffset: string): string {
  const match = /^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec(timeWithOffset.trim());
  if (!match) throw new Error(`Invalid elimination time format: ${timeWithOffset}`);
  const [, hh, mm, offsetRaw] = match;
  const offset = Number(offsetRaw);
  return new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(hh) - offset,
    Number(mm),
    0,
    0,
  )).toISOString();
}

const EXPECTED_KNOCKOUT_KICKOFFS_BY_PHASE = ELIMINATION_SOURCE_ROWS.reduce(
  (acc, row) => {
    const phase = mapRoundToPhase(row.round);
    acc[phase].add(parseKickoffAtToIso(row.date, row.time));
    return acc;
  },
  {
    roundOf16: new Set<string>(),
    roundOf8: new Set<string>(),
    roundOf4: new Set<string>(),
    semifinals: new Set<string>(),
    final: new Set<string>(),
  } satisfies Record<Exclude<PhaseKey, "groups">, Set<string>>,
);

export function getMissingFixtureCount(
  phase: PhaseKey,
  activeMatchKickoffAts: string[],
): number {
  const expectedKickoffs =
    EXPECTED_KNOCKOUT_KICKOFFS_BY_PHASE[phase as Exclude<PhaseKey, "groups">];
  if (!expectedKickoffs) return 0;

  const activeKickoffs = new Set(
    activeMatchKickoffAts.map((kickoffAt) => new Date(kickoffAt).toISOString()),
  );
  let presentCount = 0;
  for (const expectedKickoff of expectedKickoffs) {
    if (activeKickoffs.has(expectedKickoff)) presentCount += 1;
  }
  return Math.max(expectedKickoffs.size - presentCount, 0);
}

export function getMissingPredictionMatchIds({
  matchIds,
  predictionMatchIds,
}: {
  matchIds: string[];
  predictionMatchIds: string[];
}): string[] {
  const predictedMatchIds = new Set(predictionMatchIds);
  return matchIds.filter((matchId) => !predictedMatchIds.has(matchId));
}
