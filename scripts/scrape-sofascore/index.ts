import { chromium } from "playwright"
import type { Page } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { resolveTeamId, mapRoundToPhaseKey, buildTeamGroupMap, resolveGroupName } from "./mappings.ts"

const DRY_RUN = process.argv.includes("--dry-run")

const TOURNAMENT_URL =
  "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210"
const EDGE_FUNCTION_URL =
  "https://gkzzioxyulibwvdvkjmy.supabase.co/functions/v1/scrape-sofascore"
// const SUPABASE_ANON_KEY = "sb_publishable_8WEd6F-fQ9JiVOhfA6Pzpw_F2eYF4Fv" // production
const SUPABASE_ANON_KEY = "sb_publishable_NSMBuMTwApAjK4DAGeLcjw_vxcZi7oM" // staging

const SCRIPT_DIR = import.meta.dirname ?? "."
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../../tests")
const BROWSER_DATA_DIR = resolve(SCRIPT_DIR, "../.browser-data")
const TEAMS_META_PATH = resolve(SCRIPT_DIR, "../../supabase/functions/_shared/data/worldcup.teams_meta.json")

type ScrapedMatch = {
  externalMatchRef: string
  phase: string
  groupName: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  kickoffAt: string | null
  status: "scheduled" | "live" | "final"
  homeGoals: number | null
  awayGoals: number | null
}

type RawCard = {
  matchRef: string
  homeTeamName: string
  awayTeamName: string
  homeScore: string | null
  awayScore: string | null
  statusText: string
  dateText: string
}

async function extractCardsFromDOM(page: Page): Promise<RawCard[]> {
  return page.evaluate(() => {
    const tabpanel = document.querySelector('[role="tabpanel"]')
    if (!tabpanel) return []

    const cards = tabpanel.querySelectorAll('a[class*="event-hl-"]')
    const results: Array<{
      matchRef: string
      homeTeamName: string
      awayTeamName: string
      homeScore: string | null
      awayScore: string | null
      statusText: string
      dateText: string
    }> = []

    for (const card of cards) {
      const href = card.getAttribute("href") || ""
      const dataId = card.getAttribute("data-id") || ""
      const idMatch = dataId || /#id:(\d+)/.exec(href)?.[1] || ""
      if (!idMatch) continue

      const imgs = card.querySelectorAll("img[alt]")
      const homeTeamName = imgs[0]?.getAttribute("alt") || ""
      const awayTeamName = imgs[1]?.getAttribute("alt") || ""

      const spans = card.querySelectorAll("span")
      const numericSpans: string[] = []
      for (const span of spans) {
        const t = span.textContent?.trim()
        if (t && /^\d+$/.test(t)) numericSpans.push(t)
      }

      const homeScore = numericSpans[0] ?? null
      const awayScore = numericSpans[1] ?? null

      const bdis = card.querySelectorAll("bdi")
      const dateText = bdis[0]?.textContent?.trim() || ""

      const statusText =
        card.textContent?.match(/\b(FT|HT|AP|AET|PEN|Not started|Scheduled)\b/i)?.[0] ?? ""

      results.push({
        matchRef: idMatch,
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        statusText,
        dateText,
      })
    }

    return results
  })
}

async function getRoundOptions(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tabpanel = document.querySelector('[role="tabpanel"]')
    if (!tabpanel) return []

    const combobox = tabpanel.querySelector('[role="combobox"]')
    if (!combobox) return []

    const text = combobox.textContent?.trim()
    return text ? [text] : []
  })
}

function parseStatus(raw: string): "scheduled" | "live" | "final" {
  const lower = raw.trim().toLowerCase()
  if (!lower || lower === "not started" || lower === "scheduled") return "scheduled"
  if (lower === "ft" || lower === "ended" || lower === "final" || lower === "ap" || lower === "aet") return "final"
  if (lower === "ht" || lower === "live" || lower === "1h" || lower === "2h" || lower === "et") return "live"
  return "scheduled"
}

function parseScore(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

function parseKickoffFromCard(dateText: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(dateText.trim())
  if (!match) return null
  const [, dd, mm, yy] = match
  const year = Number(yy) < 50 ? 2000 + Number(yy) : 1900 + Number(yy)
  const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd), 0, 0, 0))
  return date.toISOString()
}

function mapCardToMatch(
  card: RawCard,
  roundName: string,
  teamGroupMap: Map<string, string>,
): ScrapedMatch | null {
  const homeTeamId = resolveTeamId(card.homeTeamName)
  const awayTeamId = resolveTeamId(card.awayTeamName)

  if (!homeTeamId && !awayTeamId) {
    console.log(`  [!] Could not map: "${card.homeTeamName}" / "${card.awayTeamName}"`)
    return null
  }

  const { phase } = mapRoundToPhaseKey(roundName)
  const groupName = resolveGroupName(homeTeamId, teamGroupMap)

  return {
    externalMatchRef: card.matchRef,
    phase: groupName ? "groups" : phase,
    groupName,
    homeTeamId,
    awayTeamId,
    kickoffAt: parseKickoffFromCard(card.dateText),
    status: parseStatus(card.statusText),
    homeGoals: parseScore(card.homeScore),
    awayGoals: parseScore(card.awayScore),
  }
}

function buildPayload(matches: ScrapedMatch[]) {
  return {
    scrapedAt: new Date().toISOString(),
    tournamentUrl: TOURNAMENT_URL,
    totalMatches: matches.length,
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
    })),
  }
}

function saveDryRun(payload: ReturnType<typeof buildPayload>): void {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `sofascore-dry-run-${timestamp}.json`
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
    })),
  }

  console.log(`[send] Posting ${matches.length} matches to edge function...`)

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as Record<string, unknown>
  console.log(
    `[send] ok=${result.ok} | inserted=${result.inserted} | updated=${result.updated} | skipped=${result.skippedManualOverride}`,
  )

  if (!result.ok) {
    console.error(`[send] Error: ${JSON.stringify(result)}`)
  }
}

async function main() {
  console.log("[scraper] Launching browser...")
  if (DRY_RUN) console.log("[scraper] DRY RUN MODE — will save to tests/ instead of posting")

  mkdirSync(BROWSER_DATA_DIR, { recursive: true })
  const context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
    viewport: { width: 1280, height: 900 },
  })
  const page = context.pages()[0] ?? (await context.newPage())

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false })
  })

  console.log("[scraper] Loading team-to-group mapping...")
  const teamGroupMap = buildTeamGroupMap(TEAMS_META_PATH)
  console.log(`[scraper] Loaded ${teamGroupMap.size} team group mappings`)

  try {
    console.log("[scraper] Opening Sofascore...")
    await page.goto(TOURNAMENT_URL, { waitUntil: "domcontentloaded", timeout: 60000 })

    console.log("[scraper] ")
    console.log("[scraper] ═══════════════════════════════════════")
    console.log("[scraper]   Waiting 25s for Cloudflare verification")
    console.log("[scraper]   Complete the challenge in the browser")
    console.log("[scraper] ═══════════════════════════════════════")
    console.log("[scraper] ")

    await page.waitForTimeout(25000)

    await page.waitForFunction(
      () => {
        const content = document.querySelector("main")?.textContent ?? ""
        return content.includes("Group") || content.includes("Matches") || content.includes("Standings")
      },
      { timeout: 30000 },
    )

    console.log("[scraper] Cloudflare passed. Clicking 'By round' tab...")

    const byRoundTab = page.locator(".tabs__tab", { hasText: "By round" })
    await byRoundTab.click()
    await page.waitForTimeout(3000)

    const tabpanel = page.locator('[role="tabpanel"]')
    const combobox = tabpanel.locator('[role="combobox"]')

    console.log("[scraper] Reading round selector...")
    await combobox.click()
    await page.waitForTimeout(1000)

    const roundOptions = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="option"], [role="listbox"] li, [class*="option"]')
      const options: string[] = []
      for (const item of items) {
        const text = item.textContent?.trim()
        if (text && text.length < 50) options.push(text)
      }
      return [...new Set(options)]
    })

    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)

    console.log(`[scraper] Found ${roundOptions.length} rounds: ${roundOptions.join(", ")}`)

    if (roundOptions.length === 0) {
      console.log("[scraper] No round options found, extracting from current view...")
      const cards = await extractCardsFromDOM(page)
      console.log(`[scraper] Found ${cards.length} match cards`)

      const allMatches: ScrapedMatch[] = []
      for (const card of cards) {
        const match = mapCardToMatch(card, "groups", teamGroupMap)
        if (match) {
          allMatches.push(match)
          console.log(
            `  [ok] ${match.homeTeamId ?? "?"} ${match.homeGoals !== null ? `${match.homeGoals}-${match.awayGoals}` : "vs"} ${match.awayTeamId ?? "?"} | ${match.phase} | ${match.status}`,
          )
        }
      }

      if (DRY_RUN) {
        saveDryRun(buildPayload(allMatches))
      } else if (allMatches.length > 0) {
        await sendToSupabase(allMatches)
      }

      console.log("[scraper] Done")
      return
    }

    const allMatches: ScrapedMatch[] = []
    let totalCards = 0

    for (const roundName of roundOptions) {
      console.log(`\n[scraper] Selecting round: ${roundName}`)
      await combobox.click()
      await page.waitForTimeout(1000)

      const clicked = await page.evaluate((target: string) => {
        const items = document.querySelectorAll('[role="option"], [role="listbox"] li, [class*="option"]')
        for (const item of items) {
          if (item.textContent?.trim() === target) {
            (item as HTMLElement).click()
            return true
          }
        }
        return false
      }, roundName)

      if (!clicked) {
        console.log(`  [!] Could not click round option: ${roundName}`)
        continue
      }

      await page.waitForTimeout(3000)

      const cards = await extractCardsFromDOM(page)
      totalCards += cards.length
      console.log(`  Found ${cards.length} matches`)

      for (const card of cards) {
        const match = mapCardToMatch(card, roundName, teamGroupMap)
        if (match) {
          allMatches.push(match)
          console.log(
            `  [ok] ${match.homeTeamId ?? "?"} ${match.homeGoals !== null ? `${match.homeGoals}-${match.awayGoals}` : "vs"} ${match.awayTeamId ?? "?"} | ${match.phase}${match.groupName ? ` (${match.groupName})` : ""} | ${match.status}`,
          )
        }
      }
    }

    console.log(`\n[scraper] Total cards: ${totalCards}, mapped matches: ${allMatches.length}`)

    if (DRY_RUN) {
      saveDryRun(buildPayload(allMatches))
    } else if (allMatches.length > 0) {
      await sendToSupabase(allMatches)
    }

    console.log("[scraper] Done")
  } catch (err) {
    console.error("[scraper] Fatal error:", err)
  } finally {
    await context.close()
  }
}

main()
