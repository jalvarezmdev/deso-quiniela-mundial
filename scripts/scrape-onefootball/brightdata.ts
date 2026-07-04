import { chromium } from "playwright"
import "dotenv/config"

export const USE_LOCAL = process.argv.includes("--local")

export async function connectBrowser() {
  if (USE_LOCAL) {
    console.log("[browser] Launching local Chromium (no Bright Data)...")
    const browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox"],
      viewport: { width: 1280, height: 900 },
    })
    console.log("[browser] Local browser launched")
    return browser
  }

  const customerId = process.env.BD_CUSTOMER_ID
  const zoneName = process.env.BD_ZONE_NAME
  const zonePassword = process.env.BD_ZONE_PASSWORD

  if (!customerId || !zoneName || !zonePassword) {
    throw new Error(
      "Missing Bright Data credentials. Set BD_CUSTOMER_ID, BD_ZONE_NAME, BD_ZONE_PASSWORD in .env\n" +
      "Or use --local flag to test with local browser",
    )
  }

  const wsUrl = `wss://brd-customer-${customerId}-zone-${zoneName}:${zonePassword}@brd.superproxy.io:9222`

  console.log("[browser] Connecting to Bright Data Scraping Browser...")
  console.log(`[browser] URL: wss://brd-customer-${customerId}-zone-${zoneName}:***@brd.superproxy.io:9222`)

  try {
    const browser = await chromium.connectOverCDP(wsUrl)
    console.log("[browser] Connected to Bright Data")
    return browser
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[browser] Connection failed: ${msg}`)
    console.error("[browser] Troubleshooting:")
    console.error("  1. Is the zone active in Bright Data dashboard?")
    console.error("  2. Is the Customer ID correct (format: hl_XXXXXXXX)?")
    console.error("  3. Is the Zone Name exact (case-sensitive)?")
    console.error("  4. Is the Zone Password correct?")
    throw err
  }
}
