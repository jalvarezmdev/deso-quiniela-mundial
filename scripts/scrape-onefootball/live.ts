import type { Browser } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { connectBrowser } from "./brightdata.ts";
import { mapCardToMatch } from "./index.ts";
import { buildTeamGroupMap, resolveTeamId } from "./mappings.ts";
import type { DesoQuinielaMatch, RawMatchCard, ScrapedMatch, ScrapePayload } from "./types.ts";
import { DesoQuiniela } from "./lib/deso-quiniela.ts";

const DRY_RUN = process.argv.includes("--dry-run");

const TOURNAMENT_URL =
  "https://onefootball.com/en/competition/fifa-world-cup-12/results";
const EDGE_FUNCTION_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/scrape-onefootball`
  : "https://sfhwktnwcumwmohizbtm.supabase.co/functions/v1/scrape-onefootball";
const EDGE_FUNCTION_LIST_MATCHES = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/quinielas`
  : "https://sfhwktnwcumwmohizbtm.supabase.co/functions/v1/quinielas";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SCRAPE_SECRET = process.env.SCRAPE_SECRET ?? "";

const SCRIPT_DIR = import.meta.dirname ?? ".";
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../../tests");
const TEAMS_META_PATH = resolve(
  SCRIPT_DIR,
  "../../supabase/functions/_shared/data/worldcup.teams_meta.json",
);

type QualifiedTeamInput = {
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeamName?: string;
  awayTeamName?: string;
  cardText?: string;
};

export function extractVisibleLiveMatchCardsFromDocument(
  targetDocument?: Document,
): RawMatchCard[] {
  const document = targetDocument ?? globalThis.document;
  const liveStatusPattern =
    /\blive\b|\b1h\b|\b2h\b|\bht\b|\bet\b|extra\s*time/i;
  const finalStatusPattern =
    /full\s*time|\bft\b|\baet\b|\bpens?\b|after\s+pen/i;
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="match"]'),
  );
  const cards: RawMatchCard[] = [];

  for (const link of links) {
    const href = link.getAttribute("href") ?? "";
    const matchRef =
      /\/match\/(\d+)/.exec(href)?.[1] ?? /(\d{7,})/.exec(href)?.[1] ?? "";
    if (!matchRef) continue;

    const style = link.ownerDocument.defaultView?.getComputedStyle(link);
    if (style?.display === "none" || style?.visibility === "hidden") continue;

    const imgs = Array.from(link.querySelectorAll("img[alt]"));
    const homeTeamName = imgs[0]?.getAttribute("alt")?.trim() ?? "";
    const awayTeamName = imgs[1]?.getAttribute("alt")?.trim() ?? "";
    if (!homeTeamName || !awayTeamName) continue;

    const spans = Array.from(link.querySelectorAll("span"));
    const scoreSpans = spans
      .map((span) => span.textContent?.trim() ?? "")
      .filter((text) => /^\d+$/.test(text));

    const altText = imgs
      .map((img) => img.getAttribute("alt")?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    const visibleText = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const cardText = [altText, visibleText].filter(Boolean).join(" ");
    const statusEl = link.querySelector(
      '[class*="status"], [class*="Status"], [class*="period"]',
    );
    const rawStatusText = statusEl?.textContent?.trim() ?? "";
    const statusSource = rawStatusText || cardText;
    const status = liveStatusPattern.test(statusSource)
      ? "live"
      : finalStatusPattern.test(statusSource)
        ? "final"
        : "scheduled";
    if (status !== "live" && status !== "final") continue;
    const statusText =
      status === "live" ? "live" : rawStatusText || "Full time";

    const heading = Array.from(link.querySelectorAll("h2, h3"))
      .map((node) => node.textContent?.trim() ?? "")
      .find(Boolean);
    const roundName = heading ?? "";
    const timeEl = link.querySelector("time");
    const dateText =
      timeEl?.textContent?.trim() ||
      timeEl?.getAttribute("datetime")?.trim() ||
      "";

    cards.push({
      matchRef,
      homeTeamName,
      awayTeamName,
      homeScore: scoreSpans[0] ?? null,
      awayScore: scoreSpans[1] ?? null,
      statusText,
      dateText,
      roundName,
      cardText,
    });
  }

  const liveCards = cards.filter((card) =>
    liveStatusPattern.test(card.statusText || card.cardText || ""),
  );
  if (liveCards.length > 0) return liveCards;

  return cards.slice(0, 1);
}

export function selectLiveSyncCandidates(
  matches: ScrapedMatch[],
): ScrapedMatch[] {
  const liveMatches = matches.filter((match) => match.status === "live");
  if (liveMatches.length > 0) return liveMatches;
  const firstFinal = matches.find((match) => match.status === "final");
  return firstFinal ? [firstFinal] : [];
}

export function resolveVenezuelanKickoffAt(dateText: string): string | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(
      dateText.trim(),
    );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0", millisecond = "0"] =
    match;
  const utcDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 1,
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, "0")),
    ),
  );
  if (Number.isNaN(utcDate.getTime())) return null;

  const venezuelanFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    
  });

  return venezuelanFormatter.format(utcDate).replace(", ", "T").replace(" PM", "");
}

export function deriveQualifiedTeamId(
  input: QualifiedTeamInput,
): string | null {
  if (input.phase === "groups") return null;
  if (!input.homeTeamId || !input.awayTeamId) return null;
  if (input.homeGoals === null || input.awayGoals === null) return null;

  if (input.homeGoals > input.awayGoals) return input.homeTeamId;
  if (input.awayGoals > input.homeGoals) return input.awayTeamId;

  const text = input.cardText?.toLowerCase() ?? "";
  const homePattern = new RegExp(
    `${escapeRegExp(normalizeTeamName(input.homeTeamName) ?? input.homeTeamId)}.{0,60}(pens|penalties|winner|qualified|advance|win)`,
    "i",
  );
  const awayPattern = new RegExp(
    `${escapeRegExp(normalizeTeamName(input.awayTeamName) ?? input.awayTeamId)}.{0,60}(pens|penalties|winner|qualified|advance|win)`,
    "i",
  );
  if (homePattern.test(text)) return input.homeTeamId;
  if (awayPattern.test(text)) return input.awayTeamId;

  return null;
}

function normalizeTeamName(teamName: string | undefined): string | null {
  const normalized = teamName
    ?.replace(/^Icon:\s*/i, "")
    .trim()
    .toLowerCase();
  return normalized || null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addQualifiedTeam(
  match: ScrapedMatch,
  card: RawMatchCard,
): ScrapedMatch {
  if (match.status !== "final" || match.phase === "groups") return match;

  return {
    ...match,
    qualifiedTeamId: deriveQualifiedTeamId({
      phase: match.phase,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      homeTeamName: card.homeTeamName,
      awayTeamName: card.awayTeamName,
      cardText: card.cardText,
    }),
  };
}

function buildPayload(matches: ScrapedMatch[]): ScrapePayload {
  return {
    scrapedAt: new Date().toISOString(),
    source: "onefootball-live",
    tournamentUrl: TOURNAMENT_URL,
    totalMatches: matches.length,
    matches,
  };
}

function saveDryRun(payload: ScrapePayload): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `onefootball-live-dry-run-${timestamp}.json`;
  const filePath = resolve(OUTPUT_DIR, filename);
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `[dry-run] Saved ${payload.matches.length} live matches to ${filePath}`,
  );
}

async function sendToSupabase(matches: ScrapedMatch[], desoQuiniela: DesoQuiniela): Promise<void> {
  if (matches.length === 0) {
    console.log("[send] No live matches to send");
    return;
  }

  const payload = {
    matches: matches.map((m) => ({
      externalMatchRef: m.externalMatchRef,
      phase: m.phase,
      groupName: m.groupName,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      kickoffAt: m.kickoffAt,
      status: m.status,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      qualifiedTeamId: m.qualifiedTeamId ?? null,
    })),
    syncMode: "live",
  };

  console.log(
    `[send] Posting ${matches.length} live matches to edge function...`,
  );
  
  const result = await desoQuiniela.storeMatches(payload);

  console.log(
    `[send] ok=${result.ok} | inserted=${result.inserted} | updated=${result.updated}`,
  );

  if (!result.ok) {
    throw new Error(`[send] Error: ${JSON.stringify(result)}`);
  }
}

async function scrapeVisibleLiveResults(
  browser: Browser,
  desoQuiniela: DesoQuiniela,
): Promise<ScrapedMatch[]> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log("[scraper] Navigating to OneFootball results page...");
    await page.goto(TOURNAMENT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector(
      '[class*="MatchCard"], [class*="matchCard"], a[href*="match"]',
      {
        timeout: 30000,
      },
    );

    // fetch matches
    const matchesListRes = await desoQuiniela.getMatches();
    const matchesData: DesoQuinielaMatch[] = matchesListRes?.data?.matches ?? [];

    const targetedLiveMatches = matchesData.filter(match => match.status === 'live');

    const rawCards = await page.evaluate((): RawMatchCard[] => {
      const cards: RawMatchCard[] = [];
      const phaseContainers = Array.from(document.querySelectorAll('.MatchCardsList_matches__EDfv_')).map((element) => {
        const phaseTitle = (element.parentElement?.querySelector('.SectionHeader_subtitle__PDbwW') as HTMLHeadingElement).innerText ?? 'Unkown Phase';
        return {
          phaseTitle,
          phaseContainer: element,
        }
      });

      for (const phase of phaseContainers) {
        const phaseMatches = phase.phaseContainer?.querySelectorAll<HTMLAnchorElement>('.MatchCard_matchCard__LynP5');
        for (const phaseMatch of phaseMatches) {
          const href = phaseMatch.getAttribute("href") ?? "";
          const matchRef =
            /\/match\/(\d+)/.exec(href)?.[1] ?? /(\d{7,})/.exec(href)?.[1] ?? "";
          const liveComponent =
            phaseMatch.querySelector(
              ".SimpleMatchCard_simpleMatchCard__live__7ffkD",
            ) as HTMLSpanElement;
          const isLiveMatch = liveComponent !== null
          const finalMatchContainer = phaseMatch.querySelector('.SimpleMatchCard_simpleMatchCard__infoMessage__ypUgN') as HTMLSpanElement;
          const isFinalMatch = finalMatchContainer !== null && finalMatchContainer.innerText.toLowerCase() === "full time";
          if (!matchRef) continue;
          const imgs = Array.from(phaseMatch.querySelectorAll("img[alt]"));
          const homeTeamName =
            imgs[0]?.getAttribute("alt")?.trim().replace("Icon: ", "") ?? "";
          const awayTeamName =
            imgs[1]?.getAttribute("alt")?.trim().replace("Icon: ", "") ?? "";
          const matchMetadata = phaseMatch.querySelectorAll(
            ".SimpleMatchCard_simpleMatchCard__teamContent__8_4_T",
          );

          let homeScore = "0";
          let awayScore = "0";
          if (matchMetadata) {
            homeScore = (
              matchMetadata[0].querySelector(
                ".SimpleMatchCardTeam_simpleMatchCardTeam__score__NeZ2W",
              ) as HTMLSpanElement
            ).innerText;
            awayScore = (
              matchMetadata[1].querySelector(
                ".SimpleMatchCardTeam_simpleMatchCardTeam__score__NeZ2W",
              ) as HTMLSpanElement
            ).innerText;
          }

          const timeEl = phaseMatch.querySelector("time");
          const dateText =
            timeEl?.dateTime ||
            timeEl?.getAttribute("datetime")?.trim() ||
            timeEl?.textContent?.trim() ||
            "";

          cards.push({
            matchRef,
            homeTeamName,
            awayTeamName,
            homeScore,
            awayScore,
            statusText: isLiveMatch ? "live" : isFinalMatch ? "final" : "scheduled",
            dateText,
            roundName: phase.phaseTitle,
          });
        }
      }

      return cards;
    });

    const preparedGames = rawCards.map((game) => ({
      ...game,
      homeTeam: resolveTeamId(game.homeTeamName),
      awayTeam: resolveTeamId(game.awayTeamName),
    }))

    const candidateLiveMatches = preparedGames.filter((match) => targetedLiveMatches.find((targetMatch) => targetMatch.homeTeamId === match.homeTeam && targetMatch.awayTeamId === match.awayTeam))
    if (candidateLiveMatches.length <= 0) {
      console.log('[scraper] No candidate games in live');
      return [];
    }

    const teamGroupMap = buildTeamGroupMap(TEAMS_META_PATH);
    const matches = candidateLiveMatches
    .map((card) => {
      const match = mapCardToMatch(card, teamGroupMap);
      if (!match) return null;
      return addQualifiedTeam(match, card);
    })
    .filter((match): match is ScrapedMatch => match !== null);
    
    return selectLiveSyncCandidates(matches);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log("[scraper] OneFootball Live Results Scraper");
  if (DRY_RUN)
    console.log(
      "[scraper] DRY RUN MODE — will save to tests/ instead of posting",
    );

  let browser: Browser;
  const desoQuiniela = new DesoQuiniela();
  try {
    browser = await connectBrowser();
  } catch (err) {
    console.error("[scraper] Failed to connect to Bright Data:", err);
    process.exit(1);
  }

  try {
    const liveMatches = await scrapeVisibleLiveResults(browser, desoQuiniela);
    console.log(
      `[scraper] Found ${liveMatches.length} live/final candidate matches`,
    );

    if (DRY_RUN) {
      saveDryRun(buildPayload(liveMatches));
    } else if (liveMatches.length > 0) {
      await sendToSupabase(liveMatches, desoQuiniela);
    } else {
      console.log("[scraper] No live matches to update");
    }

    console.log("[scraper] Done");
  } catch (err) {
    console.error("[scraper] Fatal error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

const isDirectRun = process.argv[1]?.includes("live.ts");
if (isDirectRun) {
  main();
}
