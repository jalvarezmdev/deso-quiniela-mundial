/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert";
import { handleDeletePrediction } from "./delete-prediction.ts";

Deno.test("delete prediction allows knockout deletion before that match kickoff even after phase started", async () => {
  const calls: string[] = [];
  const supabase = {
    from(table: string) {
      if (table === "phase_window_overrides") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "matches") {
        return {
          select(columns: string) {
            if (columns === "kickoff_at") {
              return {
                eq() {
                  return {
                    is() {
                      return {
                        order() {
                          return {
                            limit: () =>
                              Promise.resolve({
                                data: [{ kickoff_at: "2026-06-28T19:00:00.000Z" }],
                                error: null,
                              }),
                          };
                        },
                      };
                    },
                  };
                },
              };
            }

            return {
              eq() {
                return {
                  eq() {
                    return {
                      is() {
                        return {
                          maybeSingle: () =>
                            Promise.resolve({
                              data: {
                                id: "ko-2",
                                phase: "roundOf16",
                                kickoff_at: "2999-06-29T20:30:00.000Z",
                                status: "scheduled",
                              },
                              error: null,
                            }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "predictions") {
        return {
          delete() {
            calls.push("delete_prediction");
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          select() {
                            return {
                              maybeSingle: () =>
                                Promise.resolve({
                                  data: { user_id: "user-1" },
                                  error: null,
                                }),
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      return {
        delete() {
          calls.push("delete_match_points");
          return {
            eq() {
              return {
                eq: () => Promise.resolve({ error: null }),
              };
            },
          };
        },
      };
    },
  };

  const response = await handleDeletePrediction({
    supabase: supabase as never,
    payload: { phase: "roundOf16", matchId: "ko-2" },
    me: { id: "user-1" } as never,
  });

  assertEquals(await response.json(), {
    ok: true,
    data: { deleted: true },
  });
  assertEquals(calls, ["delete_prediction", "delete_match_points"]);
});
