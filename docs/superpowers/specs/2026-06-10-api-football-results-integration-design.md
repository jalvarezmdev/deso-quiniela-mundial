# API-Football Results Integration Design

**Date:** 2026-06-10
**Status:** Approved
**Slug:** `api-football-results-integration`

## Overview

Integrate [API-FOOTBALL](https://www.api-football.com/) (v3) to automatically load match results into the existing `matches` table. This replaces the current manual-only results workflow with an automated polling mechanism, while preserving admin manual override capability.

- **League ID:** `1` (World Cup)
- **Season:** `2026`
- **Base URL:** `https://v3.football.api-sports.io`
- **Auth:** `x-apisports-key` header
- **Plan:** Free (100 req/day)
- **2026 fixture availability:** Pending (`fixtures.events: false` as of 2026-06-10); expected to populate closer to tournament start.

## Goals

1. Automatically update match scores/status from API-FOOTBALL when matches finish
2. Insert new matches discovered from the API (knockout rounds not yet seeded)
3. Respect `manual_override` flag to protect admin-edited results
4. Admin can enable/disable the cron and trigger manual sync
5. Handle rate limits gracefully (48 req/day at 30-min cron, leaving room for manual triggers)

## Non-Goals

- Knockout bracket cross-referencing (will be a follow-up feature)
- Migrating existing SofaScore scraper
- UI for per-match sync status or error logs

---

## 1. Data Model Changes

### 1.1 New table: `app_settings`

Key-value store for app-level configuration flags.

```sql
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

**Seed rows:**
- `('cron_results_enabled', 'true')`
- `('results_last_synced_at', '')`

Admin RLS: public can read, only admin can write (enforced via edge function).

### 1.2 New column on `teams`

```sql
alter table public.teams
  add column api_football_id integer;

create unique index ux_teams_api_football_id_active
  on public.teams(api_football_id)
  where deleted_at is null and api_football_id is not null;
```

**Population:** One-time lookup via `GET /teams?league=1&season=2026` at migration time, matching API team names to our `teams.name`. Teams without matches get `null`. Includes a helper function `populate_api_football_ids()`.

### 1.3 Migration file

`supabase/migrations/YYYYMMDDNNNNNN_api_football_integration.sql` containing:
- `create table app_settings` + seed inserts
- `alter table teams add api_football_id` + index
- `create function populate_api_football_ids()` (runs once, idempotent)

---

## 2. Edge Function: `sync-results`

### 2.1 File Structure

```
supabase/functions/sync-results/
  index.ts         -- HTTP entrypoint, auth, dispatch, delete after done
  deno.json        -- Deno imports

supabase/functions/_shared/quiniela/actions/
  sync-results.ts  -- business logic: fetch, map teams, upsert matches
```

### 2.2 Flow

```
1. Check app_settings.cron_results_enabled
   → if "false", return { skipped: true, reason: "cron_disabled" }

2. GET https://v3.football.api-sports.io/fixtures?league=1&season=2026
   Header: x-apisports-key: <API_FOOTBALL_KEY>

3. For each fixture where fixture.status.short is one of:
   "FT", "AET", "PEN" (finished matches):

   a. Map teams:
      Look up teams.api_football_id = fixture.teams.home.id → get 3-letter code
      Look up teams.api_football_id = fixture.teams.away.id → get 3-letter code
      Skip fixture if either team unmapped (log warning, continue)

   b. Determine qualified_team_id (knockout only):
      From fixture.teams.home.winner / fixture.teams.away.winner
      If winner=true → that team's 3-letter code is the qualified team

   c. Find existing match:
      For group stage: match by phase='groups' + home_team_id + away_team_id
      For knockout: match by phase matching the round + same teams
      Dedup by: same teams + kickoff date (±1 day tolerance)

   d. If existing:
      - If manual_override=true → skip
      - Else → UPDATE: status='final', home_goals, away_goals, qualified_team_id,
               external_match_ref=<fixture.id>, source='api-football'

   e. If NOT existing:
      - INSERT new match with all fields populated
      - Generate id: knockout round → 'ro16-{n}', 'qf-{n}', 'sf-{n}', 'final'
      - source='api-football', manual_override=false

4. Update app_settings.results_last_synced_at = now()

5. Return: { syncedAt, totalProcessed, updated, inserted, skippedManualOverride, skippedNoTeamMap, errors[] }
```

### 2.3 Phase Mapping

API-FOOTBALL round strings → our phase keys:

| API Round | Phase |
|-----------|-------|
| "Group Stage - X" | `groups` |
| "Round of 16" | `roundOf16` |
| "Quarter-finals" | `roundOf8` |
| "Semi-finals" | `roundOf4` |
| "3rd Place Final" | `semifinals` |
| "Final" | `final` |

Knockout round names may vary; map with a lookup table and fallback to manual admin review.

### 2.4 Match ID Generation (for new inserts)

- Groups: API-FOOTBALL fixture IDs don't map to our `ga-1`, `ga-2`, etc. For existing group matches, we only UPDATE, never INSERT.
- Knockout: generate IDs like `ro16-1`, `ro16-2`, ..., `qf-1`, ..., `sf-1`, `final`

### 2.5 Auth

Two invocation paths:

1. **Cron (Supabase scheduled function):** Internal invocation. The function checks for a `x-cron-secret` header matching `APP_JWT_SECRET`.
2. **Admin manual trigger:** Invoked via the admin panel (client-side `supabase.functions.invoke()`). Authenticated via Supabase anon key + the edge function's internal auth.

### 2.6 Env Vars

- `SUPABASE_URL` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (existing)
- `APP_JWT_SECRET` (existing)
- `API_FOOTBALL_KEY` -- the `x-apisports-key` value

### 2.7 Cron Configuration

Configured via `supabase/config.toml` or Supabase dashboard:

```toml
[edge_functions.sync-results]
schedule = "*/30 * * * *"
```

The function's first action is checking `cron_results_enabled`, so the cron can be "paused" without changing the schedule config.

---

## 3. Admin Panel Changes

### 3.1 New Admin Action: `toggle_results_cron`

Added to the existing `quinielas` edge function dispatch:

- **Action:** `toggle_results_cron`
- **Tier:** Admin
- **Payload:** `{ enabled: boolean }`
- **Effect:** Updates `app_settings.cron_results_enabled` to `'true'` or `'false'`

No new DB actions file needed -- handled inline in `quinielas/index.ts` (it's a single-row upsert).

### 3.2 New Client API Methods

In `src/lib/quinielas-api.ts`:

```typescript
toggleResultsCron(enabled: boolean): Promise<void>
invokeSyncResults(): Promise<SyncResult>
getCronSettings(): Promise<{ enabled: boolean; lastSyncedAt: string | null }>
```

### 3.3 New Component: `CronControls`

In `src/components/admin/CronControls.tsx`:

- Toggle switch: "Resultados automaticos"
  - Calls `toggleResultsCron()`
  - Shows toast on success/failure
- "Sincronizar ahora" button
  - Calls `invokeSyncResults()`
  - Shows toast with counts: "X actualizados, Y nuevos, Z omitidos"
- Last sync display: "Ultima sincronizacion: hace X minutos"
  - Polls `getCronSettings()` on mount
  - Updates after manual sync

Wired into the existing `/admin` route page.

---

## 4. Team ID Mapping Population

### One-time migration helper

A script or edge function that populates `teams.api_football_id`:

1. Call `GET https://v3.football.api-sports.io/teams?league=1&season=2026`
2. For each returned team, match `team.name` to `teams.name` (case-insensitive, with a few manual overrides for naming differences like "United States" vs "USA")
3. Update `teams.api_football_id` where matched
4. Report unmatched teams for manual review

This runs once during deployment. Unmatched teams get `null` and are skipped during sync (logged as warnings).

### Manual overrides list

A small lookup in the population script for known naming differences:

| API Name | Our Name |
|----------|----------|
| United States | USA |
| Korea Republic | South Korea |
| Bosnia | Bosnia & Herzegovina |
| Ivory Coast | Cote d'Ivoire (check API) |
| ... | ... |

---

## 5. Rate Limit Strategy

- Free plan: 100 requests/day
- Cron runs every 30 min = 48 requests/day max
- Manual sync = 1 request per click
- Status endpoint (free) can be used to check remaining quota before heavy sync
- The fixtures endpoint accepts `?last=N` to limit results, but during tournaments we'll want all matches

If the fixtures response is paginated with many results, one request covers all. If not, and >100 fixtures are returned, the function makes multiple calls. We'll monitor and adjust.

---

## 6. Files Changed / Created

### New Files
- `supabase/migrations/YYYYMMDD_api_football_integration.sql`
- `supabase/functions/sync-results/index.ts`
- `supabase/functions/sync-results/deno.json`
- `supabase/functions/_shared/quiniela/actions/sync-results.ts`
- `src/lib/api-football.ts` (client utilities: invoke sync, toggle cron)
- `src/components/admin/CronControls.tsx`

### Modified Files
- `supabase/functions/quinielas/index.ts` (add `toggle_results_cron` action + `get_cron_settings` public action)
- `src/routes/admin.tsx` (add CronControls component)
- `src/lib/quinielas-api.ts` (add new methods)

---

## 7. Testing

- **Unit:** `sync-results.ts` fixture mapping logic (team mapping, phase mapping, match dedup, qualified team detection)
- **Integration:** Manual trigger from admin panel → verify matches are updated in DB
- **Cron:** Deploy to Supabase, enable cron, verify it runs on schedule (check `results_last_synced_at`)
- **Edge cases:**
  - API returns 499/500 → graceful error, no partial updates
  - All matches have `manual_override=true` → 0 updated, reported
  - API team name doesn't match our DB → logged, not inserted
  - API returns empty response (no 2026 data yet) → no-op, `results_last_synced_at` still updated
