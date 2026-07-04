export type ScrapeSyncMode = "all" | "live";
export type MatchStatus = "scheduled" | "live" | "final";

type SyncPolicyInput = {
  syncMode: ScrapeSyncMode;
  incomingStatus: MatchStatus | undefined;
  existingStatus: MatchStatus | null;
  hasManualOverride: boolean;
};

export function isAuthorizedScrapeRequest(
  headers: Headers,
  expectedSecret: string,
): boolean {
  if (!expectedSecret) return false;
  return headers.get("x-scrape-secret") === expectedSecret;
}

export function parseScrapeSyncMode(value: unknown): ScrapeSyncMode {
  return value === "live" ? "live" : "all";
}

export function shouldApplyIncomingMatch(input: SyncPolicyInput): boolean {
  if (input.hasManualOverride) return false;

  if (input.syncMode === "live" && input.incomingStatus === "final") {
    return input.existingStatus === "live";
  }

  return true;
}
