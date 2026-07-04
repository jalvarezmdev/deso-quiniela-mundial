import type { Browser, Page } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import "dotenv/config"
import { connectBrowser } from "./brightdata.ts"
import { resolveTeamId, mapRoundToPhaseKey, buildTeamGroupMap, resolveGroupName } from "./mappings.ts"
import type { ScrapedMatch, RawMatchCard, ScrapePayload } from "./types.ts"

const DRY_RUN = process.argv.includes("--dry-run")

const TOURNAMENT_URL = "https://onefootball.com/en/competition/fifa-world-cup-12/results"
const TOURNAMENT_KNOCKOUT_GAMES = "https://onefootball.com/en/competition/fifa-world-cup-12/kotree"

const EDGE_FUNCTION_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/scrape-onefootball`
  : "https://sfhwktnwcumwmohizbtm.supabase.co/functions/v1/scrape-onefootball"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ""
const SCRAPE_SECRET = process.env.SCRAPE_SECRET ?? ""

const SCRIPT_DIR = import.meta.dirname ?? "."
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../../tests")
const TEAMS_META_PATH = resolve(SCRIPT_DIR, "../../supabase/functions/_shared/data/worldcup.teams_meta.json")

// Click "Show all results" and wait for content to load
async function expandAllResults(page: Page): Promise<void> {
  // Use page.evaluate to click "Show all results" directly via JS
  const clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll("button")
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "Show all results") {
        btn.click()
        return true
      }
    }
    return false
  })

  if (clicked) {
    console.log("[scraper] Clicked 'Show all results' via JS")
    await page.waitForTimeout(5000)

    // Scroll down to trigger lazy loading
    for (let i = 0; i < 10; i++) {
      if (page.isClosed()) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {})
      await page.waitForTimeout(1000)
    }

    if (!page.isClosed()) {
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      await page.waitForTimeout(1000)
    }

    console.log("[scraper] All results loaded")
    return
  }

  console.log("[scraper] 'Show all results' button not found — continuing with current data")
}

export function extractKnockoutMatchCardsFromDocument(targetDocument?: Document): RawMatchCard[] {
  const document = targetDocument ?? globalThis.document
  const results: RawMatchCard[] = []
  const nodes = document.querySelectorAll('[class*="KoTreeNode_container"]')

  for (const node of nodes) {
    const imgs = Array.from(node.querySelectorAll("img[alt]"))
    if (imgs.length < 2) continue

    const homeTeamName = imgs[0]?.getAttribute("alt")?.trim() ?? ""
    const awayTeamName = imgs[1]?.getAttribute("alt")?.trim() ?? ""
    const normalizedHome = homeTeamName.replace(/^Icon:\s*/i, "").trim().toLowerCase()
    const normalizedAway = awayTeamName.replace(/^Icon:\s*/i, "").trim().toLowerCase()
    const hasPlaceholder = !normalizedHome ||
      !normalizedAway ||
      normalizedHome.includes("winner") ||
      normalizedAway.includes("winner") ||
      normalizedHome.includes("loser") ||
      normalizedAway.includes("loser") ||
      normalizedHome.includes("tbd") ||
      normalizedAway.includes("tbd") ||
      normalizedHome.includes("to be decided") ||
      normalizedAway.includes("to be decided") ||
      normalizedHome.includes("runner-up") ||
      normalizedAway.includes("runner-up") ||
      normalizedHome.includes("runner up") ||
      normalizedAway.includes("runner up")
    if (hasPlaceholder) {
      continue
    }

    const link = node.matches('a[href*="/match/"]')
      ? node
      : node.querySelector('a[href*="/match/"]')
    const href = link?.getAttribute("href") ?? node.getAttribute("href") ?? ""
    const matchRef = /\/match\/(\d+)/.exec(href)?.[1] ?? /(\d{7,})/.exec(href)?.[1] ?? ""

    const time = node.querySelector("time")
    const datetime = time?.getAttribute("datetime")?.trim()
    const explicitDate = node.querySelector('[class*="date"], [class*="Date"], [class*="time"], [class*="Time"]')
    const children = Array.from(node.children)
    const dateText = datetime ||
      explicitDate?.textContent?.trim() ||
      children[1]?.textContent?.trim() ||
      ""

    let roundName = ""
    const stage = node.parentElement?.closest('[class*="KoTreeStage"]')
    const stageLabel = stage?.querySelector('[class*="KoTreeStage_labelText"]')
    const stageText = stageLabel?.textContent?.trim() ?? ""
    if (stageText) {
      roundName = stageText
    } else {
      const labels = Array.from(node.ownerDocument.querySelectorAll('[class*="KoTreeStage_labelText"]'))
      for (let i = labels.length - 1; i >= 0; i--) {
        const label = labels[i]
        if (label && (label.compareDocumentPosition(node) & 4) !== 0) {
          const text = label.textContent?.trim() ?? ""
          if (text) {
            roundName = text
            break
          }
        }
      }
    }

    results.push({
      matchRef,
      homeTeamName,
      awayTeamName,
      homeScore: null,
      awayScore: null,
      statusText: "scheduled",
      dateText,
      roundName,
    })
  }

  return results
}

async function extractKnockoutMatchCards(page: Page): Promise<RawMatchCard[]> {
  return page.evaluate(extractKnockoutMatchCardsFromDocument)
}

// Extract raw match cards from the DOM
async function extractMatchCards(page: Page): Promise<RawMatchCard[]> {
  return page.evaluate(() => {
    const results: Array<{
      matchRef: string
      homeTeamName: string
      awayTeamName: string
      homeScore: string | null
      awayScore: string | null
      statusText: string
      dateText: string
      roundName: string
    }> = []

    // Collect all elements in document order: headers and match links
    const allNodes = document.querySelectorAll('h3, h2, [class*="sectionHeader"], a[href*="match"]')
    let currentRound = ""

    for (const node of allNodes) {
      // Check if this is a round header
      const isHeader = node.tagName === "H3" || node.tagName === "H2" || node.className.includes("sectionHeader")
      if (isHeader) {
        const text = node.textContent?.trim()
        if (text && (
          text.includes("Round of") || text.includes("Group stage") ||
          text.includes("Quarter") || text.includes("Semi") ||
          text === "Final" || text.includes("Third place")
        )) {
          currentRound = text
        }
        continue
      }

      // Otherwise it's a match link
      const link = node as HTMLAnchorElement
      const href = link.getAttribute("href") || ""
      const idMatch = /(\d{7,})/.exec(href)?.[1] || ""
      if (!idMatch) continue

      // Try to find team names from img alt attributes
      const imgs = link.querySelectorAll("img[alt]")
      let homeTeamName = imgs[0]?.getAttribute("alt") || ""
      let awayTeamName = imgs[1]?.getAttribute("alt") || ""

      // If no imgs, try text content
      if (!homeTeamName && !awayTeamName) {
        const textContent = link.textContent || ""
        // Try to extract from structured text
        const parts = textContent.split(/\d+/).filter(Boolean)
        if (parts.length >= 2) {
          homeTeamName = parts[0].trim()
          awayTeamName = parts[1].trim()
        }
      }

      // Score
      const scores: string[] = []
      const spans = link.querySelectorAll("span")
      for (const span of spans) {
        const t = span.textContent?.trim()
        if (t && /^\d+$/.test(t)) {
          const parentEl = span.parentElement
          const cls = parentEl?.className || ""
          if (cls.includes("score") || cls.includes("Score") || cls.includes("result") || cls.includes("goals")) {
            scores.push(t)
          }
        }
      }

      // Fallback: positional scoring
      if (scores.length === 0) {
        for (const span of spans) {
          const t = span.textContent?.trim()
          if (t && /^\d+$/.test(t)) scores.push(t)
        }
      }

      // Status — try multiple approaches
      let statusText = ""
      const statusEl = link.querySelector('[class*="status"], [class*="Status"], [class*="period"]')
      if (statusEl) statusText = statusEl.textContent?.trim() || ""

      // Fallback: check for FT, Live, etc. in any text element
      if (!statusText) {
        const allText = link.textContent || ""
        if (/full\s*time|ft\b/i.test(allText)) statusText = "Full time"
        else if (/\blive\b|\b1h\b|\b2h\b|\bet\b/i.test(allText)) statusText = "live"
        else if (/\bpens?\b/i.test(allText)) statusText = "Pens"
        else if (/\baet\b/i.test(allText)) statusText = "AET"
      }

      // If we have scores but no status, it's likely a final
      if (!statusText && scores.length >= 2) {
        statusText = "Full time"
      }

      // Date
      const timeEl = link.querySelector("time")
      const dateText = timeEl?.textContent?.trim() || link.querySelector('[class*="date"]')?.textContent?.trim() || ""

      if (homeTeamName && awayTeamName) {
        results.push({
          matchRef: idMatch,
          homeTeamName,
          awayTeamName,
          homeScore: scores[0] ?? null,
          awayScore: scores[1] ?? null,
          statusText,
          dateText,
          roundName: currentRound,
        })
      }
    }

    return results
  })
}

function parseStatus(raw: string): "scheduled" | "live" | "final" {
  const lower = raw.trim().toLowerCase()
  if (!lower) return "scheduled"

  // Live indicators
  if (lower.includes("live") || lower.includes("1h") || lower.includes("2h") ||
      lower.includes("half") || lower.includes("et") || lower.includes("extra")) {
    return "live"
  }

  // Final indicators
  if (lower.includes("full time") || lower.includes("ft") || lower.includes("final") ||
      lower.includes("aet") || lower.includes("pens") || lower.includes("after pen")) {
    return "final"
  }

  return "scheduled"
}

function parseScore(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

function parseDate(dateText: string): string | null {
  if (!dateText) return null
  const trimmed = dateText.trim()

  // "Today" / "Yesterday"
  const now = new Date()
  if (/^today$/i.test(trimmed)) {
    return now.toISOString()
  }
  if (/^yesterday$/i.test(trimmed)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d.toISOString()
  }

  // DD/MM/YYYY format
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (match) {
    const [, dd, mm, yyyy] = match
    const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0))
    return date.toISOString()
  }

  const timestamp = Date.parse(trimmed)
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toISOString()
  }

  return null
}

export function mapCardToMatch(
  card: RawMatchCard,
  teamGroupMap: Map<string, string>,
): ScrapedMatch | null {
  const homeTeamId = resolveTeamId(card.homeTeamName)
  const awayTeamId = resolveTeamId(card.awayTeamName)

  if (!homeTeamId || !awayTeamId) {
    console.log(`  [!] Could not map: "${card.homeTeamName}" / "${card.awayTeamName}"`)
    return null
  }

  const { phase, groupName: roundGroup } = mapRoundToPhaseKey(card.roundName)
  const groupName = resolveGroupName(homeTeamId, teamGroupMap)

  // Only assign group_name for group phase matches
  const isGroupPhase = phase === "groups"

  return {
    externalMatchRef: card.matchRef,
    phase,
    groupName: isGroupPhase ? groupName ?? roundGroup : null,
    homeTeamId,
    awayTeamId,
    kickoffAt: parseDate(card.dateText),
    status: parseStatus(card.statusText),
    homeGoals: parseScore(card.homeScore),
    awayGoals: parseScore(card.awayScore),
  }
}

async function dismissCookieConsent(page: Page): Promise<void> {
  try {
    const cookieSelectors = [
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept All")',
      'button:has-text("Allow All")',
      '#onetrust-accept-btn-handler',
    ]
    for (const sel of cookieSelectors) {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click()
        console.log(`[scraper] Dismissed cookie consent via: ${sel}`)
        await page.waitForTimeout(2000)
        return
      }
    }
  } catch {
    // no cookie banner
  }
}

function mergeMatches(resultsMatches: ScrapedMatch[], knockoutMatches: ScrapedMatch[]): ScrapedMatch[] {
  const byRef = new Map<string, ScrapedMatch>()
  for (const match of resultsMatches) {
    byRef.set(match.externalMatchRef, match)
  }
  for (const match of knockoutMatches) {
    if (!match.externalMatchRef || byRef.has(match.externalMatchRef)) continue
    byRef.set(match.externalMatchRef, match)
  }
  return Array.from(byRef.values())
}

async function scrapeScheduledKnockoutMatches(
  page: Page,
  teamGroupMap: Map<string, string>,
): Promise<ScrapedMatch[]> {
  console.log("[scraper] Navigating to OneFootball knockout tree...")
  await page.goto(TOURNAMENT_KNOCKOUT_GAMES, { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForSelector('[class*="KoTreeNode_container"]', { timeout: 30000 })
  await dismissCookieConsent(page)

  const rawCards = await extractKnockoutMatchCards(page)
  console.log(`[scraper] Extracted ${rawCards.length} raw knockout match cards`)

  const matches: ScrapedMatch[] = []
  for (const card of rawCards) {
    const match = mapCardToMatch(card, teamGroupMap)
    if (!match) continue
    if (!match.kickoffAt) {
      console.log(`  [!] Skipping knockout match without kickoff: ${card.homeTeamName} / ${card.awayTeamName}`)
      continue
    }
    matches.push(match)
    console.log(
      `  [ko] ${match.homeTeamId} vs ${match.awayTeamId} | ${match.phase} | ${match.status}`,
    )
  }

  return matches
}

function buildPayload(matches: ScrapedMatch[]): ScrapePayload {
  return {
    scrapedAt: new Date().toISOString(),
    source: "onefootball",
    tournamentUrl: TOURNAMENT_URL,
    totalMatches: matches.length,
    matches,
  }
}

function saveDryRun(payload: ScrapePayload): void {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `onefootball-dry-run-${timestamp}.json`
  const filePath = resolve(OUTPUT_DIR, filename)
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8")
  console.log(`[dry-run] Saved ${payload.matches.length} matches to ${filePath}`)
}

async function sendToSupabase(matches: ScrapedMatch[]): Promise<void> {
  if (matches.length === 0) {
    console.log("[send] No matches to send")
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
  }

  console.log(`[send] Posting ${matches.length} matches to edge function...`)

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

export async function scrapeAllResults(browser: Browser): Promise<ScrapedMatch[]> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    console.log("[scraper] Navigating to OneFootball results page...")
    await page.goto(TOURNAMENT_URL, { waitUntil: "domcontentloaded", timeout: 60000 })

    // Wait for match content to appear
    await page.waitForSelector('[class*="MatchCard"], [class*="matchCard"], a[href*="match"]', {
      timeout: 30000,
    })
    console.log("[scraper] Page loaded")

    await dismissCookieConsent(page)

    // Click "Show all results" to load everything
    await expandAllResults(page)

    // Extract all match cards
    const rawCards = await extractMatchCards(page)
    console.log(`[scraper] Extracted ${rawCards.length} raw match cards`)

    // Load team-to-group mapping
    const teamGroupMap = buildTeamGroupMap(TEAMS_META_PATH)

    // Map cards to match objects
    const allMatches: ScrapedMatch[] = []
    for (const card of rawCards) {
      const match = mapCardToMatch(card, teamGroupMap)
      if (match) {
        allMatches.push(match)
        console.log(
          `  [ok] ${match.homeTeamId ?? "?"} ${match.homeGoals !== null ? `${match.homeGoals}-${match.awayGoals}` : "vs"} ${match.awayTeamId ?? "?"} | ${match.phase}${match.groupName ? ` (${match.groupName})` : ""} | ${match.status}`,
        )
      }
    }

    console.log(`\n[scraper] Mapped ${allMatches.length}/${rawCards.length} matches`)

    try {
      const knockoutMatches = await scrapeScheduledKnockoutMatches(page, teamGroupMap)
      const mergedMatches = mergeMatches(allMatches, knockoutMatches)
      console.log(
        `[scraper] Added ${mergedMatches.length - allMatches.length} scheduled knockout matches from tree`,
      )
      return mergedMatches
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[scraper] Knockout tree scrape skipped: ${message}`)
      return allMatches
    }
  } finally {
    await context.close()
  }
}

async function main() {
  console.log("[scraper] OneFootball World Cup Scraper")
  if (DRY_RUN) console.log("[scraper] DRY RUN MODE — will save to tests/ instead of posting")

  let browser: Browser
  try {
    browser = await connectBrowser()
  } catch (err) {
    console.error("[scraper] Failed to connect to Bright Data:", err)
    process.exit(1)
  }

  try {
    const matches = await scrapeAllResults(browser)

    if (DRY_RUN) {
      saveDryRun(buildPayload(matches))
    } else if (matches.length > 0) {
      await sendToSupabase(matches)
    } else {
      console.log("[scraper] No matches found")
    }

    console.log("[scraper] Done")
  } catch (err) {
    console.error("[scraper] Fatal error:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

// Only run when this is the entry file (not when imported by live.ts)
const isDirectRun = process.argv[1]?.includes("index.ts")
if (isDirectRun) {
  main()
}
