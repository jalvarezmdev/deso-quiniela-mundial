import type { Browser } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { connectBrowser } from "./brightdata.ts";
import { mapCardToMatch } from "./index.ts";
import { buildTeamGroupMap, resolveTeamId } from "./mappings.ts";
import type {
  DesoQuinielaMatch,
  RawMatchCard,
  ScrapedMatch,
  ScrapePayload,
} from "./types.ts";
import { DesoQuiniela } from "./lib/deso-quiniela.ts";

const DRY_RUN = process.argv.includes("--dry-run");

const TOURNAMENT_URL =
  "https://onefootball.com/en/competition/fifa-world-cup-12/results";

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

export function selectLiveSyncCandidates(
  matches: ScrapedMatch[],
): ScrapedMatch[] {
  const liveMatches = matches.filter((match) => match.status === "live");
  if (liveMatches.length > 0) return liveMatches;
  const firstFinal = matches.find((match) => match.status === "final");
  return firstFinal ? [firstFinal] : [];
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

async function sendToSupabase(
  matches: ScrapedMatch[],
  desoQuiniela: DesoQuiniela,
): Promise<void> {
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

    // Fetch matches
    console.log("[scraper] Fetching all matches at DESO");
    const matchesListRes = await desoQuiniela.getMatches();
    console.log("[scraper] Matches resolved at DESO");
    const matchesData: DesoQuinielaMatch[] =
      matchesListRes?.data?.matches ?? [];

    const targetedLiveMatches = matchesData.filter(
      (match) => match.status === "live",
    );

    console.log("[scraper] Checking OneFootball");
    const rawMatches = await page.evaluate((): RawMatchCard[] => {
      const matches: RawMatchCard[] = [];
      const COUNTRY_ICON_TEXT = "Icon: ";
      const DOM_ELEMENTS_CLASSES = {
        phaseContainer: ".MatchCardsList_matches__EDfv_",
        phaseTitle: ".SectionHeader_subtitle__PDbwW",
        phaseMatches: ".MatchCard_matchCard__LynP5",
        liveComponent: ".SimpleMatchCard_simpleMatchCard__live__7ffkD",
        fullTimeTextElement:
          ".SimpleMatchCard_simpleMatchCard__infoMessage__ypUgN",
        matchMetadataContainer:
          ".SimpleMatchCard_simpleMatchCard__teamContent__8_4_T",
        scoreSpanElement:
          ".SimpleMatchCardTeam_simpleMatchCardTeam__score__NeZ2W",
      };
      const REG_LINK = /\/match\/(\d+)/;
      const REG_MATCH_ID = /(\d{7,})/;
      const FULL_TIME_TAG = "full time";
      // ====

      const phaseContainers = Array.from(
        document.querySelectorAll(DOM_ELEMENTS_CLASSES.phaseContainer),
      ).map((element) => {
        const phaseTitle =
          (
            element.parentElement?.querySelector(
              DOM_ELEMENTS_CLASSES.phaseTitle,
            ) as HTMLHeadingElement
          ).innerText ?? "Unkown Phase";
        return {
          phaseTitle,
          phaseContainer: element,
        };
      });

      for (const phase of phaseContainers) {
        const phaseMatches =
          phase.phaseContainer?.querySelectorAll<HTMLAnchorElement>(
            DOM_ELEMENTS_CLASSES.phaseMatches,
          );
        for (const phaseMatch of phaseMatches) {
          const href = phaseMatch.getAttribute("href") ?? "";
          const matchRef =
            REG_LINK.exec(href)?.[1] ?? REG_MATCH_ID.exec(href)?.[1] ?? "";
          const liveComponent = phaseMatch.querySelector(
            DOM_ELEMENTS_CLASSES.liveComponent,
          ) as HTMLSpanElement;
          const isLiveMatch = liveComponent !== null;
          const finalMatchContainer = phaseMatch.querySelector(
            DOM_ELEMENTS_CLASSES.fullTimeTextElement,
          ) as HTMLSpanElement;
          const isFinalMatch =
            finalMatchContainer !== null &&
            finalMatchContainer.innerText.toLowerCase() === FULL_TIME_TAG;
          if (!matchRef) continue;
          const imgs = Array.from(phaseMatch.querySelectorAll("img[alt]"));
          const homeTeamName =
            imgs[0]
              ?.getAttribute("alt")
              ?.trim()
              .replace(COUNTRY_ICON_TEXT, "") ?? "";
          const awayTeamName =
            imgs[1]
              ?.getAttribute("alt")
              ?.trim()
              .replace(COUNTRY_ICON_TEXT, "") ?? "";
          const matchMetadata = phaseMatch.querySelectorAll(
            DOM_ELEMENTS_CLASSES.matchMetadataContainer,
          );

          let homeScore = "0";
          let awayScore = "0";
          if (matchMetadata) {
            homeScore = (
              matchMetadata[0].querySelector(
                DOM_ELEMENTS_CLASSES.scoreSpanElement,
              ) as HTMLSpanElement
            ).innerText;
            awayScore = (
              matchMetadata[1].querySelector(
                DOM_ELEMENTS_CLASSES.scoreSpanElement,
              ) as HTMLSpanElement
            ).innerText;
          }

          const timeEl = phaseMatch.querySelector("time");
          const dateText =
            timeEl?.dateTime ||
            timeEl?.getAttribute("datetime")?.trim() ||
            timeEl?.textContent?.trim() ||
            "";

          matches.push({
            matchRef,
            homeTeamName,
            awayTeamName,
            homeScore,
            awayScore,
            statusText: isLiveMatch
              ? "live"
              : isFinalMatch
                ? "final"
                : "scheduled",
            dateText,
            roundName: phase.phaseTitle,
          });
        }
      }

      return matches;
    });

    console.log("[scraper] Processing the matches...");
    const preparedMatches = rawMatches.map((match) => ({
      ...match,
      homeTeam: resolveTeamId(match.homeTeamName),
      awayTeam: resolveTeamId(match.awayTeamName),
    }));

    const candidateLiveMatches = preparedMatches.filter((match) =>
      targetedLiveMatches.find(
        (targetMatch) =>
          targetMatch.homeTeamId === match.homeTeam &&
          targetMatch.awayTeamId === match.awayTeam,
      ),
    );

    if (candidateLiveMatches.length <= 0) {
      console.log("[scraper] No candidate games LIVE");
      return [];
    }

    const teamGroupMap = buildTeamGroupMap(TEAMS_META_PATH);
    const toUpdateMatches = candidateLiveMatches
      .map((card) => {
        const match = mapCardToMatch(card, teamGroupMap);
        if (!match) return null;
        return addQualifiedTeam(match, card);
      })
      .filter((match): match is ScrapedMatch => match !== null);
    return selectLiveSyncCandidates(toUpdateMatches);
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
