/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { handleListLeaderboard } from "./list-leaderboard.ts";

Deno.test("leaderboard combines confirmed group points with knockout points without phase submission", async () => {
  const users = [
    { id: "user-1", nickname: "Ana", team_id: "arg" },
    { id: "user-2", nickname: "Luis", team_id: "bra" },
    { id: "user-3", nickname: "Juan", team_id: "mar" },
  ];
  const matches = [
    {
      id: "group-1",
      phase: "groups",
      home_goals: 2,
      away_goals: 0,
      qualified_team_id: null,
    },
    {
      id: "ko-1",
      phase: "roundOf16",
      home_goals: 1,
      away_goals: 1,
      qualified_team_id: "arg",
    },
    {
      id: "ko-2",
      phase: "roundOf16",
      home_goals: 2,
      away_goals: 2,
      qualified_team_id: "mar",
    },
  ];
  const predictions = [
    {
      user_id: "user-1",
      phase: "groups",
      match_id: "group-1",
      home_goals: 2,
      away_goals: 0,
      predicted_qualified_team_id: null,
    },
    {
      user_id: "user-1",
      phase: "roundOf16",
      match_id: "ko-1",
      home_goals: 1,
      away_goals: 1,
      predicted_qualified_team_id: "bra",
    },
    {
      user_id: "user-2",
      phase: "groups",
      match_id: "group-1",
      home_goals: 2,
      away_goals: 0,
      predicted_qualified_team_id: null,
    },
    {
      user_id: "user-2",
      phase: "roundOf16",
      match_id: "ko-1",
      home_goals: 0,
      away_goals: 0,
      predicted_qualified_team_id: "arg",
    },
    {
      user_id: "user-3",
      phase: "roundOf16",
      match_id: "ko-2",
      home_goals: 2,
      away_goals: 2,
      predicted_qualified_team_id: "mar",
    },
  ];
  const submissions = [
    {
      user_id: "user-1",
      phase: "groups",
      confirmed_at: "2026-06-10T20:00:00.000Z",
    },
  ];

  const supabase = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select() {
            return {
              is() {
                return {
                  order: () => Promise.resolve({ data: users, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "matches") {
        return {
          select() {
            return {
              is() {
                return {
                  in: () => Promise.resolve({ data: matches, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "predictions") {
        return {
          select: () => Promise.resolve({ data: predictions, error: null }),
        };
      }

      if (table === "phase_submissions") {
        return {
          select: () => Promise.resolve({ data: submissions, error: null }),
        };
      }

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: () =>
                  Promise.resolve({
                    data: { value: "phase_confirmation" },
                    error: null,
                  }),
              };
            },
          };
        },
      };
    },
  };

  const response = await handleListLeaderboard({
    supabase: supabase as never,
    payload: {},
    me: {} as never,
  });

  assertEquals(await response.json(), {
    ok: true,
    data: {
      leaderboard: [
        {
          userId: "user-1",
          nickname: "Ana",
          teamId: "arg",
          points: 6,
          exactHits: 2,
          firstConfirmedAt: "2026-06-10T20:00:00.000Z",
        },
        {
          userId: "user-3",
          nickname: "Juan",
          teamId: "mar",
          points: 4,
          exactHits: 1,
          firstConfirmedAt: null,
        },
        {
          userId: "user-2",
          nickname: "Luis",
          teamId: "bra",
          points: 2,
          exactHits: 0,
          firstConfirmedAt: null,
        },
      ],
    },
  });
});
