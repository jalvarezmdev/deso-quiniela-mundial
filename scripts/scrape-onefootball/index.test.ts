import { describe, expect, it } from "vitest"
import { JSDOM } from "jsdom"
import {
  extractKnockoutMatchCardsFromDocument,
  mapCardToMatch,
} from "./index.ts"

describe("OneFootball knockout scraping", () => {
  it("can be serialized into Playwright page.evaluate without esbuild helpers", () => {
    expect(extractKnockoutMatchCardsFromDocument.toString()).not.toContain("__name(")
  })

  it("extracts only scheduled knockout cards with two concrete teams", () => {
    const dom = new JSDOM(`
      <section class="KoTreeStage_container__demo">
        <div class="KoTreeStage_labelText__QxIk9">Round of 16</div>
        <a class="KoTreeNode_container__rUNXr" href="/en/match/2650301">
          <div>
            <img alt="Icon: Argentina" />
            <img alt="Icon: Spain" />
          </div>
          <div>
            <span>04/07/2026</span>
          </div>
        </a>
        <a class="KoTreeNode_container__rUNXr" href="/en/match/2650302">
          <div>
            <img alt="Winner Match 1" />
            <img alt="Icon: France" />
          </div>
          <div>
            <span>05/07/2026</span>
          </div>
        </a>
      </section>
    `)

    const cards = extractKnockoutMatchCardsFromDocument(dom.window.document)

    expect(cards).toEqual([
      {
        matchRef: "2650301",
        homeTeamName: "Icon: Argentina",
        awayTeamName: "Icon: Spain",
        homeScore: null,
        awayScore: null,
        statusText: "scheduled",
        dateText: "04/07/2026",
        roundName: "Round of 16",
      },
    ])

    expect(mapCardToMatch(cards[0]!, new Map())).toMatchObject({
      externalMatchRef: "2650301",
      phase: "roundOf8",
      homeTeamId: "arg",
      awayTeamId: "esp",
      status: "scheduled",
      homeGoals: null,
      awayGoals: null,
      kickoffAt: "2026-07-04T00:00:00.000Z",
    })
  })

  it("uses the closest preceding stage label for each knockout card", () => {
    const dom = new JSDOM(`
      <div>
        <div class="KoTreeStage_labelText__QxIk9">Round of 16</div>
        <a class="KoTreeNode_container__rUNXr" href="/en/match/2650301">
          <div>
            <img alt="Argentina" />
            <img alt="Spain" />
          </div>
          <div>04/07/2026</div>
        </a>

        <div class="KoTreeStage_labelText__QxIk9">Quarter-finals</div>
        <a class="KoTreeNode_container__rUNXr" href="/en/match/2650310">
          <div>
            <img alt="Brazil" />
            <img alt="France" />
          </div>
          <div>10/07/2026</div>
        </a>
      </div>
    `)

    const cards = extractKnockoutMatchCardsFromDocument(dom.window.document)

    expect(cards.map((card) => card.roundName)).toEqual([
      "Round of 16",
      "Quarter-finals",
    ])
  })
})
