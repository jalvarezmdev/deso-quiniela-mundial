import type { SupabaseAdminClient } from "../../general/supabase-client.ts";
import type { PhaseKey, ProfilesRow } from "./quinielas-helpers.ts";

export type PublicActionContext = {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
};

export type AuthenticatedActionContext = {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  me: ProfilesRow;
};

export type AdminActionContext = {
  supabase: SupabaseAdminClient;
  payload: Record<string, unknown>;
  me: ProfilesRow;
};

export type MatchWriteInput = {
  id: string;
  phase: PhaseKey;
  groupName: string | null;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: "scheduled" | "live" | "final";
  homeGoals: number | null;
  awayGoals: number | null;
  qualifiedTeamId: string | null;
  manualOverride: boolean;
};
