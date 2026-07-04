import { describe, expect, it } from "vitest"
import {
  isAuthorizedScrapeRequest,
  type MatchStatus,
  type ScrapeSyncMode,
  shouldApplyIncomingMatch,
} from "./sync-policy.ts"

type PolicyOverrides = {
  syncMode?: ScrapeSyncMode
  incomingStatus?: MatchStatus
  existingStatus?: MatchStatus | null
  hasManualOverride?: boolean
}

describe("OneFootball sync policy", () => {
  it("requires the configured scrape secret", () => {
    expect(isAuthorizedScrapeRequest(new Headers(), "secret")).toBe(false)
    expect(
      isAuthorizedScrapeRequest(new Headers({ "x-scrape-secret": "wrong" }), "secret"),
    ).toBe(false)
    expect(
      isAuthorizedScrapeRequest(new Headers({ "x-scrape-secret": "secret" }), "secret"),
    ).toBe(true)
  })

  it("does not apply scraper updates over manual overrides", () => {
    expect(policy({ hasManualOverride: true })).toBe(false)
  })

  it("only uses live-mode final candidates to close existing live matches", () => {
    expect(policy({ syncMode: "live", incomingStatus: "final", existingStatus: "live" })).toBe(true)

    expect(policy({ syncMode: "live", incomingStatus: "final", existingStatus: "final" })).toBe(false)

    expect(policy({ syncMode: "live", incomingStatus: "final", existingStatus: null })).toBe(false)
  })
})

function policy(overrides: PolicyOverrides): boolean {
  return shouldApplyIncomingMatch({
    syncMode: overrides.syncMode ?? "all",
    incomingStatus: overrides.incomingStatus ?? "live",
    existingStatus: overrides.existingStatus ?? "scheduled",
    hasManualOverride: overrides.hasManualOverride ?? false,
  })
}
