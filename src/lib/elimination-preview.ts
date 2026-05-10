import type { Match, PhaseKey } from "#/lib/types";

type SourceEliminationRow = {
  round: "Round of 32" | "Round of 16" | "Quarter-final" | "Semi-final" | "Final";
  date: string;
  time: string;
  team1: string;
  team2: string;
};

export type EliminationPreviewSlot = {
  phase: Exclude<PhaseKey, "groups">;
  kickoffAt: string;
  team1Slot: string;
  team2Slot: string;
};

export type QuinielaMatchView =
  | { kind: "real"; match: Match }
  | { kind: "placeholder"; slot: EliminationPreviewSlot }
  | { kind: "previewAvailable"; slot: EliminationPreviewSlot };

const ELIMINATION_SOURCE_ROWS: SourceEliminationRow[] = [
  { round: "Round of 32", date: "2026-06-28", time: "12:00 UTC-7", team1: "2A", team2: "2B" },
  { round: "Round of 32", date: "2026-06-29", time: "16:30 UTC-4", team1: "1E", team2: "3A/B/C/D/F" },
  { round: "Round of 32", date: "2026-06-29", time: "19:00 UTC-6", team1: "1F", team2: "2C" },
  { round: "Round of 32", date: "2026-06-29", time: "12:00 UTC-5", team1: "1C", team2: "2F" },
  { round: "Round of 32", date: "2026-06-30", time: "17:00 UTC-4", team1: "1I", team2: "3C/D/F/G/H" },
  { round: "Round of 32", date: "2026-06-30", time: "12:00 UTC-5", team1: "2E", team2: "2I" },
  { round: "Round of 32", date: "2026-06-30", time: "19:00 UTC-6", team1: "1A", team2: "3C/E/F/H/I" },
  { round: "Round of 32", date: "2026-07-01", time: "12:00 UTC-4", team1: "1L", team2: "3E/H/I/J/K" },
  { round: "Round of 32", date: "2026-07-01", time: "17:00 UTC-7", team1: "1D", team2: "3B/E/F/I/J" },
  { round: "Round of 32", date: "2026-07-01", time: "13:00 UTC-7", team1: "1G", team2: "3A/E/H/I/J" },
  { round: "Round of 32", date: "2026-07-02", time: "19:00 UTC-4", team1: "2K", team2: "2L" },
  { round: "Round of 32", date: "2026-07-02", time: "12:00 UTC-7", team1: "1H", team2: "2J" },
  { round: "Round of 32", date: "2026-07-02", time: "20:00 UTC-7", team1: "1B", team2: "3E/F/G/I/J" },
  { round: "Round of 32", date: "2026-07-03", time: "18:00 UTC-4", team1: "1J", team2: "2H" },
  { round: "Round of 32", date: "2026-07-03", time: "20:30 UTC-5", team1: "1K", team2: "3D/E/I/J/L" },
  { round: "Round of 32", date: "2026-07-03", time: "13:00 UTC-5", team1: "2D", team2: "2G" },
  { round: "Round of 16", date: "2026-07-04", time: "17:00 UTC-4", team1: "W74", team2: "W77" },
  { round: "Round of 16", date: "2026-07-04", time: "12:00 UTC-5", team1: "W73", team2: "W75" },
  { round: "Round of 16", date: "2026-07-05", time: "16:00 UTC-4", team1: "W76", team2: "W78" },
  { round: "Round of 16", date: "2026-07-05", time: "18:00 UTC-6", team1: "W79", team2: "W80" },
  { round: "Round of 16", date: "2026-07-06", time: "14:00 UTC-5", team1: "W83", team2: "W84" },
  { round: "Round of 16", date: "2026-07-06", time: "17:00 UTC-7", team1: "W81", team2: "W82" },
  { round: "Round of 16", date: "2026-07-07", time: "12:00 UTC-4", team1: "W86", team2: "W88" },
  { round: "Round of 16", date: "2026-07-07", time: "13:00 UTC-7", team1: "W85", team2: "W87" },
  { round: "Quarter-final", date: "2026-07-09", time: "16:00 UTC-4", team1: "W89", team2: "W90" },
  { round: "Quarter-final", date: "2026-07-10", time: "12:00 UTC-7", team1: "W93", team2: "W94" },
  { round: "Quarter-final", date: "2026-07-11", time: "17:00 UTC-4", team1: "W91", team2: "W92" },
  { round: "Quarter-final", date: "2026-07-11", time: "20:00 UTC-5", team1: "W95", team2: "W96" },
  { round: "Semi-final", date: "2026-07-14", time: "14:00 UTC-5", team1: "W97", team2: "W98" },
  { round: "Semi-final", date: "2026-07-15", time: "15:00 UTC-4", team1: "W99", team2: "W100" },
  { round: "Final", date: "2026-07-19", time: "15:00 UTC-4", team1: "W101", team2: "W102" },
];

function mapRoundToPhase(round: SourceEliminationRow["round"]): Exclude<PhaseKey, "groups"> {
  if (round === "Round of 32") return "roundOf16";
  if (round === "Round of 16") return "roundOf8";
  if (round === "Quarter-final") return "roundOf4";
  if (round === "Semi-final") return "semifinals";
  return "final";
}

function parseKickoffAtToIso(date: string, timeWithOffset: string): string {
  const match = /^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec(timeWithOffset.trim());
  if (!match) {
    throw new Error(`Invalid elimination time format: ${timeWithOffset}`);
  }
  const [, hh, mm, offsetRaw] = match;
  const offset = Number(offsetRaw);
  const utcMs = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(hh) - offset,
    Number(mm),
    0,
    0,
  );
  return new Date(utcMs).toISOString();
}

const ELIMINATION_SLOTS: EliminationPreviewSlot[] = ELIMINATION_SOURCE_ROWS.map((row) => ({
  phase: mapRoundToPhase(row.round),
  kickoffAt: parseKickoffAtToIso(row.date, row.time),
  team1Slot: row.team1,
  team2Slot: row.team2,
}));

function byKickoffAsc(a: { kickoffAt: string }, b: { kickoffAt: string }): number {
  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

export function getEliminationPreviewSlotsByPhase(
  phase: PhaseKey,
): EliminationPreviewSlot[] {
  if (phase === "groups") return [];
  return ELIMINATION_SLOTS.filter((item) => item.phase === phase).sort(byKickoffAsc);
}

function phaseKickoffKey(phase: PhaseKey, kickoffAt: string): string {
  return `${phase}|${new Date(kickoffAt).toISOString()}`;
}

export function buildKnockoutMatchViews(phase: PhaseKey, phaseRealMatches: Match[]): {
  views: QuinielaMatchView[];
  expectedCount: number;
  missingCount: number;
}
export function buildKnockoutMatchViews(
  phase: PhaseKey,
  phaseRealMatches: Match[],
  previewEnabled: boolean,
): {
  views: QuinielaMatchView[];
  expectedCount: number;
  missingCount: number;
}
export function buildKnockoutMatchViews(
  phase: PhaseKey,
  phaseRealMatches: Match[],
  previewEnabled = false,
): {
  views: QuinielaMatchView[];
  expectedCount: number;
  missingCount: number;
} {
  const sortedReal = [...phaseRealMatches].sort(byKickoffAsc);
  if (phase === "groups") {
    return {
      views: sortedReal.map((match) => ({ kind: "real", match })),
      expectedCount: 0,
      missingCount: 0,
    };
  }

  const slots = getEliminationPreviewSlotsByPhase(phase);
  const realByKey = new Map(sortedReal.map((match) => [phaseKickoffKey(match.phase, match.kickoffAt), match]));

  const views = slots.map((slot) => {
    const real = realByKey.get(phaseKickoffKey(phase, slot.kickoffAt));
    if (real) {
      return { kind: "real", match: real } as const;
    }
    return { kind: "placeholder", slot } as const;
  });

  const viewsWithPreview = previewEnabled
    ? (() => {
        const firstPlaceholderIndex = views.findIndex((item) => item.kind === "placeholder");
        if (firstPlaceholderIndex < 0) return views;
        return views.map((item, index) =>
          index === firstPlaceholderIndex && item.kind === "placeholder"
            ? { kind: "previewAvailable", slot: item.slot }
            : item,
        );
      })()
    : views;

  return {
    views: viewsWithPreview,
    expectedCount: slots.length,
    missingCount: views.filter((item) => item.kind === "placeholder").length,
  };
}
