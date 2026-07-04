import type { Browser } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import "dotenv/config"
import { connectBrowser } from "./brightdata.ts"
import { mapCardToMatch } from "./index.ts"
import { buildTeamGroupMap } from "./mappings.ts"
import type { RawMatchCard, ScrapedMatch, ScrapePayload } from "./types.ts"

const DRY_RUN = process.argv.includes("--dry-run")

const TOURNAMENT_URL = "https://onefootball.com/en/competition/fifa-world-cup-12/results"
const EDGE_FUNCTION_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/scrape-onefootball`
  : "https://sfhwktnwcumwmohizbtm.supabase.co/functions/v1/scrape-onefootball"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ""
const SCRAPE_SECRET = process.env.SCRAPE_SECRET ?? ""

const SCRIPT_DIR = import.meta.dirname ?? "."
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../../tests")
const TEAMS_META_PATH = resolve(SCRIPT_DIR, "../../supabase/functions/_shared/data/worldcup.teams_meta.json")

type QualifiedTeamInput = {
  phase: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeGoals: number | null
  awayGoals: number | null
  homeTeamName?: string
  awayTeamName?: string
  cardText?: string
}

export function extractVisibleLiveMatchCardsFromDocument(targetDocument?: Document): RawMatchCard[] {
  const document = targetDocument ?? globalThis.document
  const liveStatusPattern = /\blive\b|\b1h\b|\b2h\b|\bht\b|\bet\b|extra\s*time/i
  const finalStatusPattern = /full\s*time|\bft\b|\baet\b|\bpens?\b|after\s+pen/i
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="match"]'))
  const cards: RawMatchCard[] = []

  for (const link of links) {
    const href = link.getAttribute("href") ?? ""
    const matchRef = /\/match\/(\d+)/.exec(href)?.[1] ?? /(\d{7,})/.exec(href)?.[1] ?? ""
    if (!matchRef) continue

    const style = link.ownerDocument.defaultView?.getComputedStyle(link)
    if (style?.display === "none" || style?.visibility === "hidden") continue

    const imgs = Array.from(link.querySelectorAll("img[alt]"))
    const homeTeamName = imgs[0]?.getAttribute("alt")?.trim() ?? ""
    const awayTeamName = imgs[1]?.getAttribute("alt")?.trim() ?? ""
    if (!homeTeamName || !awayTeamName) continue

    const spans = Array.from(link.querySelectorAll("span"))
    const scoreSpans = spans
      .map((span) => span.textContent?.trim() ?? "")
      .filter((text) => /^\d+$/.test(text))

    const altText = imgs
      .map((img) => img.getAttribute("alt")?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
    const visibleText = link.textContent?.replace(/\s+/g, " ").trim() ?? ""
    const cardText = [altText, visibleText].filter(Boolean).join(" ")
    const statusEl = link.querySelector('[class*="status"], [class*="Status"], [class*="period"]')
    const rawStatusText = statusEl?.textContent?.trim() ?? ""
    const statusSource = rawStatusText || cardText
    const status = liveStatusPattern.test(statusSource)
      ? "live"
      : finalStatusPattern.test(statusSource)
        ? "final"
        : "scheduled"
    if (status !== "live" && status !== "final") continue
    const statusText = status === "live" ? "live" : rawStatusText || "Full time"

    const heading = Array.from(link.querySelectorAll("h2, h3"))
      .map((node) => node.textContent?.trim() ?? "")
      .find(Boolean)
    const roundName = heading ?? ""
    const timeEl = link.querySelector("time")
    const dateText = timeEl?.textContent?.trim() || timeEl?.getAttribute("datetime")?.trim() || ""

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
    })
  }

  const liveCards = cards.filter((card) => liveStatusPattern.test(card.statusText || card.cardText || ""))
  if (liveCards.length > 0) return liveCards

  return cards.slice(0, 1)
}

export function selectLiveSyncCandidates(matches: ScrapedMatch[]): ScrapedMatch[] {
  const liveMatches = matches.filter((match) => match.status === "live")
  if (liveMatches.length > 0) return liveMatches
  const firstFinal = matches.find((match) => match.status === "final")
  return firstFinal ? [firstFinal] : []
}

export function deriveQualifiedTeamId(input: QualifiedTeamInput): string | null {
  if (input.phase === "groups") return null
  if (!input.homeTeamId || !input.awayTeamId) return null
  if (input.homeGoals === null || input.awayGoals === null) return null

  if (input.homeGoals > input.awayGoals) return input.homeTeamId
  if (input.awayGoals > input.homeGoals) return input.awayTeamId

  const text = input.cardText?.toLowerCase() ?? ""
  const homePattern = new RegExp(
    `${escapeRegExp(normalizeTeamName(input.homeTeamName) ?? input.homeTeamId)}.{0,60}(pens|penalties|winner|qualified|advance|win)`,
    "i",
  )
  const awayPattern = new RegExp(
    `${escapeRegExp(normalizeTeamName(input.awayTeamName) ?? input.awayTeamId)}.{0,60}(pens|penalties|winner|qualified|advance|win)`,
    "i",
  )
  if (homePattern.test(text)) return input.homeTeamId
  if (awayPattern.test(text)) return input.awayTeamId

  return null
}

function normalizeTeamName(teamName: string | undefined): string | null {
  const normalized = teamName?.replace(/^Icon:\s*/i, "").trim().toLowerCase()
  return normalized || null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function addQualifiedTeam(match: ScrapedMatch, card: RawMatchCard): ScrapedMatch {
  if (match.status !== "final" || match.phase === "groups") return match

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
  }
}

function buildPayload(matches: ScrapedMatch[]): ScrapePayload {
  return {
    scrapedAt: new Date().toISOString(),
    source: "onefootball-live",
    tournamentUrl: TOURNAMENT_URL,
    totalMatches: matches.length,
    matches,
  }
}

function saveDryRun(payload: ScrapePayload): void {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `onefootball-live-dry-run-${timestamp}.json`
  const filePath = resolve(OUTPUT_DIR, filename)
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8")
  console.log(`[dry-run] Saved ${payload.matches.length} live matches to ${filePath}`)
}

async function sendToSupabase(matches: ScrapedMatch[]): Promise<void> {
  if (matches.length === 0) {
    console.log("[send] No live matches to send")
    return
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
  }

  console.log(`[send] Posting ${matches.length} live matches to edge function...`)

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "x-scrape-secret": SCRAPE_SECRET,
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as Record<string, unknown>
  console.log(
    `[send] ok=${result.ok} | inserted=${result.inserted} | updated=${result.updated} | skipped=${result.skippedManualOverride}`,
  )

  if (!result.ok) {
    throw new Error(`[send] Error: ${JSON.stringify(result)}`)
  }
}

async function scrapeVisibleLiveResults(browser: Browser): Promise<ScrapedMatch[]> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    console.log("[scraper] Navigating to OneFootball results page...")
    await page.goto(TOURNAMENT_URL, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForSelector('[class*="MatchCard"], [class*="matchCard"], a[href*="match"]', {
      timeout: 30000,
    })

    const rawCards = await page.evaluate(extractVisibleLiveMatchCardsFromDocument)
    console.log(`[scraper] Extracted ${rawCards.length} visible live/final candidate cards`)

    const teamGroupMap = buildTeamGroupMap(TEAMS_META_PATH)
    const matches = rawCards
      .map((card) => {
        const match = mapCardToMatch(card, teamGroupMap)
        return match ? addQualifiedTeam(match, card) : null
      })
      .filter((match): match is ScrapedMatch => match !== null)

    return selectLiveSyncCandidates(matches)
  } finally {
    await context.close()
  }
}

async function main() {
  console.log("[scraper] OneFootball Live Results Scraper")
  if (DRY_RUN) console.log("[scraper] DRY RUN MODE — will save to tests/ instead of posting")

  let browser: Browser
  try {
    browser = await connectBrowser()
  } catch (err) {
    console.error("[scraper] Failed to connect to Bright Data:", err)
    process.exit(1)
  }

  try {
    const liveMatches = await scrapeVisibleLiveResults(browser)
    console.log(`[scraper] Found ${liveMatches.length} live/final candidate matches`)

    if (DRY_RUN) {
      saveDryRun(buildPayload(liveMatches))
    } else if (liveMatches.length > 0) {
      await sendToSupabase(liveMatches)
    } else {
      console.log("[scraper] No live matches to update")
    }

    console.log("[scraper] Done")
  } catch (err) {
    console.error("[scraper] Fatal error:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

const isDirectRun = process.argv[1]?.includes("live.ts")
if (isDirectRun) {
  main()
}
