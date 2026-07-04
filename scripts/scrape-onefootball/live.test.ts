import { describe, expect, it } from "vitest"
import { JSDOM } from "jsdom"
import { readFileSync } from "node:fs"
import {
  deriveQualifiedTeamId,
  extractVisibleLiveMatchCardsFromDocument,
  selectLiveSyncCandidates,
} from "./live.ts"
import type { ScrapedMatch } from "./types.ts"

describe("OneFootball live scraping", () => {
  it("can be serialized into Playwright page.evaluate without outer helper references", () => {
    const serialized = extractVisibleLiveMatchCardsFromDocument.toString()

    expect(serialized).not.toContain("__name(")
    expect(serialized).not.toContain("firstMatchId(")
    expect(serialized).not.toContain("cardStatus(")
  })

  it("keeps page.evaluate helpers serializable by tsx", () => {
    const source = readFileSync(new URL("./live.ts", import.meta.url), "utf8")

    expect(source).not.toContain("const getMatchId = (")
    expect(source).not.toContain("const getCardStatus = (")
    expect(source).not.toContain("function getMatchId(")
    expect(source).not.toContain("function getCardStatus(")
  })

  it("extracts all visible live cards without expanding historical results", () => {
    const dom = new JSDOM(`
      <main>
        <a href="/en/match/1111111">
          <h3>Round of 16</h3>
          <img alt="Icon: Argentina" />
          <img alt="Icon: Spain" />
          <span class="score">1</span>
          <span class="score">0</span>
          <span class="status">LIVE</span>
        </a>
        <a href="/en/match/2222222">
          <h3>Round of 16</h3>
          <img alt="Icon: Brazil" />
          <img alt="Icon: France" />
          <span class="score">2</span>
          <span class="score">2</span>
          <span class="status">LIVE</span>
        </a>
        <a href="/en/match/3333333">
          <h3>Round of 16</h3>
          <img alt="Icon: Germany" />
          <img alt="Icon: Japan" />
          <span class="score">3</span>
          <span class="score">1</span>
          <span class="status">Full time</span>
        </a>
      </main>
    `)

    const cards = extractVisibleLiveMatchCardsFromDocument(dom.window.document)

    expect(cards.map((card) => card.matchRef)).toEqual(["1111111", "2222222"])
    expect(cards.every((card) => card.statusText === "live")).toBe(true)
  })

  it("uses the first visible final card only when there are no live cards", () => {
    const dom = new JSDOM(`
      <main>
        <a href="/en/match/1111111">
          <img alt="Icon: Argentina" />
          <img alt="Icon: Spain" />
          <span class="score">1</span>
          <span class="score">0</span>
          <span class="status">Full time</span>
        </a>
        <a href="/en/match/2222222">
          <img alt="Icon: Brazil" />
          <img alt="Icon: France" />
          <span class="score">2</span>
          <span class="score">1</span>
          <span class="status">Full time</span>
        </a>
      </main>
    `)

    const cards = extractVisibleLiveMatchCardsFromDocument(dom.window.document)

    expect(cards.map((card) => card.matchRef)).toEqual(["1111111"])
    expect(cards[0]?.statusText).toBe("Full time")
  })

  it("filters mapped matches to live rows and a single final close candidate", () => {
    const matches: ScrapedMatch[] = [
      buildMatch("1111111", "live"),
      buildMatch("2222222", "live"),
      buildMatch("3333333", "final"),
      buildMatch("4444444", "final"),
    ]

    expect(selectLiveSyncCandidates(matches).map((match) => match.externalMatchRef)).toEqual([
      "1111111",
      "2222222",
    ])

    expect(
      selectLiveSyncCandidates(matches.filter((match) => match.status === "final")).map(
        (match) => match.externalMatchRef,
      ),
    ).toEqual(["3333333"])
  })

  it("derives knockout qualified team from score when there is a winner", () => {
    expect(
      deriveQualifiedTeamId({
        phase: "roundOf16",
        homeTeamId: "arg",
        awayTeamId: "esp",
        homeGoals: 2,
        awayGoals: 1,
        cardText: "Argentina 2 Spain 1 Full time",
      }),
    ).toBe("arg")

    expect(
      deriveQualifiedTeamId({
        phase: "roundOf16",
        homeTeamId: "arg",
        awayTeamId: "esp",
        homeGoals: 2,
        awayGoals: 2,
        cardText: "Argentina 2 Spain 2 Full time",
      }),
    ).toBeNull()
  })

  it("derives knockout qualified team from penalty winner text", () => {
    expect(
      deriveQualifiedTeamId({
        phase: "roundOf16",
        homeTeamId: "arg",
        awayTeamId: "esp",
        homeGoals: 2,
        awayGoals: 2,
        homeTeamName: "Icon: Argentina",
        awayTeamName: "Icon: Spain",
        cardText: "Argentina win on penalties",
      }),
    ).toBe("arg")
  })
})

function buildMatch(
  externalMatchRef: string,
  status: ScrapedMatch["status"],
): ScrapedMatch {
  return {
    externalMatchRef,
    phase: "groups",
    groupName: "Grupo A",
    homeTeamId: "arg",
    awayTeamId: "esp",
    kickoffAt: "2026-07-04T00:00:00.000Z",
    status,
    homeGoals: status === "scheduled" ? null : 1,
    awayGoals: status === "scheduled" ? null : 0,
  }
}
