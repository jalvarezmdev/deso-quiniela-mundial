/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { handleListPredictionsForMatch } from "./list-predictions-for-match.ts";

Deno.test("list predictions for match includes zero and positive points", async () => {
  const supabase = {
    from(table: string) {
      if (table === "matches") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({
                    data: {
                      phase: "groups",
                      home_goals: 2,
                      away_goals: 1,
                      qualified_team_id: null,
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "site_config") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({
                    data: { value: "phase_confirmation" },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "phase_submissions") {
        return {
          select() {
            return {
              eq: () => Promise.resolve({
                data: [{ user_id: "user-2" }],
                error: null,
              }),
            };
          },
        };
      }

      return {
        select() {
          return {
            eq: () => Promise.resolve({
              data: [
                {
                  user_id: "user-1",
                  home_goals: 0,
                  away_goals: 2,
                  predicted_qualified_team_id: null,
                  profiles: { nickname: "Asdrubal" },
                },
                {
                  user_id: "user-2",
                  home_goals: 2,
                  away_goals: 1,
                  predicted_qualified_team_id: null,
                  profiles: { nickname: "Juan" },
                },
                {
                  user_id: "user-3",
                  home_goals: 2,
                  away_goals: 1,
                  predicted_qualified_team_id: null,
                  profiles: { nickname: "Rene" },
                },
              ],
              error: null,
            }),
          };
        },
      };
    },
  };

  const response = await handleListPredictionsForMatch({
    supabase: supabase as never,
    payload: { matchId: "match-1" },
    me: {} as never,
  });

  assertEquals(await response.json(), {
    ok: true,
    data: {
      predictions: [
        { nickname: "Asdrubal", homeGoals: 0, awayGoals: 2, predictedQualifiedTeamId: null, points: 0 },
        { nickname: "Juan", homeGoals: 2, awayGoals: 1, predictedQualifiedTeamId: null, points: 3 },
        { nickname: "Rene", homeGoals: 2, awayGoals: 1, predictedQualifiedTeamId: null, points: 0 },
      ],
    },
  });
});

Deno.test("list predictions for knockout match scores users without phase submission", async () => {
  const supabase = {
    from(table: string) {
      if (table === "matches") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({
                    data: {
                      phase: "roundOf16",
                      home_goals: 1,
                      away_goals: 1,
                      qualified_team_id: "arg",
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "site_config") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({
                    data: { value: "phase_confirmation" },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "phase_submissions") {
        return {
          select() {
            return {
              eq: () => Promise.resolve({
                data: [],
                error: null,
              }),
            };
          },
        };
      }

      return {
        select() {
          return {
            eq: () => Promise.resolve({
              data: [
                {
                  user_id: "user-1",
                  home_goals: 0,
                  away_goals: 0,
                  predicted_qualified_team_id: "arg",
                  profiles: { nickname: "Ana" },
                },
              ],
              error: null,
            }),
          };
        },
      };
    },
  };

  const response = await handleListPredictionsForMatch({
    supabase: supabase as never,
    payload: { matchId: "match-1" },
    me: {} as never,
  });

  assertEquals(await response.json(), {
    ok: true,
    data: {
      predictions: [
        { nickname: "Ana", homeGoals: 0, awayGoals: 0, predictedQualifiedTeamId: "arg", points: 2 },
      ],
    },
  });
});

Deno.test("list predictions for knockout exact draw includes qualified team and 4 points", async () => {
  const supabase = {
    from(table: string) {
      if (table === "matches") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({
                    data: {
                      phase: "roundOf16",
                      home_goals: 2,
                      away_goals: 2,
                      qualified_team_id: "mar",
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      return {
        select() {
          return {
            eq: () => Promise.resolve({
              data: [
                {
                  user_id: "user-1",
                  home_goals: 2,
                  away_goals: 2,
                  predicted_qualified_team_id: "mar",
                  profiles: { nickname: "Juan Alvarez" },
                },
              ],
              error: null,
            }),
          };
        },
      };
    },
  };

  const response = await handleListPredictionsForMatch({
    supabase: supabase as never,
    payload: { matchId: "ned-mar" },
    me: {} as never,
  });

  assertEquals(await response.json(), {
    ok: true,
    data: {
      predictions: [
        {
          nickname: "Juan Alvarez",
          homeGoals: 2,
          awayGoals: 2,
          predictedQualifiedTeamId: "mar",
          points: 4,
        },
      ],
    },
  });
});
