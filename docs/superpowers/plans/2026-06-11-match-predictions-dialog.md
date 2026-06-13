# Match Predictions Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Ver Resultados" button to finished match cards in the /resultados route that opens a dialog showing all user predictions for that match.

**Architecture:** New authenticated backend action `list_predictions_for_match` joins predictions with users to return nicknames and scores. Frontend adds a button to `ResultadosMatchCard` that triggers a glassmorphism modal dialog (`MatchPredictionsDialog`) fetching and displaying predictions.

**Tech Stack:** Supabase Edge Functions (Deno), React, TanStack Router, Tailwind CSS, framer-motion

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/functions/_shared/quiniela/actions/list-predictions-for-match.ts` | Backend action: fetch predictions + nicknames for a match |
| `supabase/functions/quinielas/index.ts` | Register new action in dispatch map |
| `src/lib/quinielas-api.ts` | Add new action type, DTO, and invoke helper |
| `src/components/match-predictions-dialog.tsx` | Modal dialog component |
| `src/components/resultados-match-card.tsx` | Add button and dialog trigger logic |
| `src/components/resultados-match-card.test.tsx` | Tests for button visibility |
| `src/components/match-predictions-dialog.test.tsx` | Tests for dialog component |

---

## Task 1: Backend Action `list_predictions_for_match`

**Files:**
- Create: `supabase/functions/_shared/quiniela/actions/list-predictions-for-match.ts`

- [ ] **Step 1: Create the action file**

```typescript
import type { AuthenticatedActionContext } from "../helpers/action-types.ts";
import {
  handleDbError,
  isValidationError,
  jsonError,
  jsonOk,
  parseId,
  type PredictionsRow,
} from "../helpers/quinielas-helpers.ts";

type PredictionWithNickname = {
  nickname: string;
  homeGoals: number;
  awayGoals: number;
};

export async function handleListPredictionsForMatch(
  ctx: AuthenticatedActionContext,
): Promise<Response> {
  try {
    const matchId = parseId(ctx.payload.matchId, "matchId");

    const { data, error } = await ctx.supabase
      .from("predictions")
      .select("home_goals, away_goals, users(nickname)")
      .eq("match_id", matchId)
      .order("home_goals", { ascending: true });

    if (error) return handleDbError(error);

    const predictions: PredictionWithNickname[] = (data as Array<{
      home_goals: number;
      away_goals: number;
      users: { nickname: string } | null;
    }>).map((row) => ({
      nickname: row.users?.nickname ?? "Sin nombre",
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
    }));

    return jsonOk({ predictions });
  } catch (error) {
    if (isValidationError(error)) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }

    return jsonError("UNKNOWN_ERROR", "Error interno del servidor.", 500);
  }
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd supabase && deno check functions/_shared/quiniela/actions/list-predictions-for-match.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/quiniela/actions/list-predictions-for-match.ts
git commit -m "feat(backend): add list_predictions_for_match action"
```

---

## Task 2: Register Action in Dispatch Map

**Files:**
- Modify: `supabase/functions/quinielas/index.ts`

- [ ] **Step 1: Read the current index.ts to understand the dispatch pattern**

Read: `supabase/functions/quinielas/index.ts`
Identify the authenticated actions dispatch map and the import section.

- [ ] **Step 2: Add import for the new action**

Add to the import section:
```typescript
import { handleListPredictionsForMatch } from "../_shared/quiniela/actions/list-predictions-for-match.ts";
```

- [ ] **Step 3: Register in authenticated actions dispatch map**

Add to the authenticated actions object:
```typescript
list_predictions_for_match: handleListPredictionsForMatch,
```

- [ ] **Step 4: Verify file compiles**

Run: `cd supabase && deno check functions/quinielas/index.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/quinielas/index.ts
git commit -m "feat(backend): register list_predictions_for_match in dispatch"
```

---

## Task 3: Frontend API Client

**Files:**
- Modify: `src/lib/quinielas-api.ts`

- [ ] **Step 1: Add action type to AuthenticatedQuinielasAction union**

Find the `AuthenticatedQuinielasAction` type and add:
```typescript
| 'list_predictions_for_match'
```

- [ ] **Step 2: Add DTO type**

Add after existing DTO types:
```typescript
export type PredictionForMatchDTO = {
  nickname: string
  homeGoals: number
  awayGoals: number
}

export type ListPredictionsForMatchResultDTO = {
  predictions: PredictionForMatchDTO[]
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/quinielas-api.ts
git commit -m "feat(api): add list_predictions_for_match client types"
```

---

## Task 4: MatchPredictionsDialog Component

**Files:**
- Create: `src/components/match-predictions-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
import { useEffect, useState } from 'react'
import { invokeAuthenticatedQuinielasAction, type ListPredictionsForMatchResultDTO } from '#/lib/quinielas-api'
import { useApp } from '#/context/app-context'
import { getTeam } from '#/lib/teams'
import type { Match } from '#/lib/types'

type MatchPredictionsDialogProps = {
  match: Match
  open: boolean
  onClose: () => void
}

export function MatchPredictionsDialog({ match, open, onClose }: MatchPredictionsDialogProps) {
  const { sessionToken } = useApp()
  const [predictions, setPredictions] = useState<ListPredictionsForMatchResultDTO['predictions']>([])
  const [loading, setLoading] = useState(false)

  const home = getTeam(match.homeTeamId)
  const away = getTeam(match.awayTeamId)

  useEffect(() => {
    if (!open || !sessionToken) return

    setLoading(true)
    invokeAuthenticatedQuinielasAction<{ matchId: string }, ListPredictionsForMatchResultDTO>(
      'list_predictions_for_match',
      sessionToken,
      { matchId: match.id },
    ).then((response) => {
      if (response.ok) {
        setPredictions(response.data.predictions)
      }
      setLoading(false)
    })
  }, [open, sessionToken, match.id])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--primary)]">
            {home.flag} {home.name} vs {away.flag} {away.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            X
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-zinc-400">Cargando predicciones...</p>
          ) : predictions.length === 0 ? (
            <p className="text-sm text-zinc-400">No hay predicciones para este partido</p>
          ) : (
            <ul className="grid gap-2">
              {predictions.map((pred, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2">
                  <span className="text-sm font-medium text-zinc-200">{pred.nickname}</span>
                  <span className="text-sm font-bold text-[var(--primary)]">
                    {pred.homeGoals} - {pred.awayGoals}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/match-predictions-dialog.tsx
git commit -m "feat(ui): add MatchPredictionsDialog component"
```

---

## Task 5: Add Button to ResultadosMatchCard

**Files:**
- Modify: `src/components/resultados-match-card.tsx`

- [ ] **Step 1: Add state and import for dialog**

Add imports at top:
```tsx
import { useState } from 'react'
import { MatchPredictionsDialog } from '#/components/match-predictions-dialog'
```

- [ ] **Step 2: Add dialog state inside the component**

After the `cardClassName` variable, add:
```tsx
const [showPredictions, setShowPredictions] = useState(false)
```

- [ ] **Step 3: Add the button before the closing Card tag**

Before `</Card>`, add:
```tsx
{match.status === 'final' && (
  <>
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        onClick={() => setShowPredictions(true)}
        className="rounded-lg border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
      >
        Ver Resultados
      </button>
    </div>
    <MatchPredictionsDialog
      match={match}
      open={showPredictions}
      onClose={() => setShowPredictions(false)}
    />
  </>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/resultados-match-card.tsx
git commit -m "feat(ui): add Ver Resultados button to finished match cards"
```

---

## Task 6: Tests for Button Visibility

**Files:**
- Modify: `src/components/resultados-match-card.test.tsx`

- [ ] **Step 1: Add test for button visibility**

Add inside the `describe` block:
```tsx
it('shows Ver Resultados button only when match status is final', () => {
  const scheduled = createMatch({ status: 'scheduled' })
  const { rerender } = render(
    <ResultadosMatchCard match={scheduled} home={home} away={away} phaseLabel="Fase de Grupos" />,
  )
  expect(screen.queryByText('Ver Resultados')).toBeNull()

  const final = createMatch({ status: 'final' })
  rerender(<ResultadosMatchCard match={final} home={home} away={away} phaseLabel="Fase de Grupos" />)
  expect(screen.getByText('Ver Resultados')).toBeTruthy()
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/resultados-match-card.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/resultados-match-card.test.tsx
git commit -m "test(ui): add button visibility tests for ResultadosMatchCard"
```

---

## Task 7: Tests for MatchPredictionsDialog

**Files:**
- Create: `src/components/match-predictions-dialog.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchPredictionsDialog } from './match-predictions-dialog'
import type { Match } from '#/lib/types'

const match: Match = {
  id: 'm-1',
  phase: 'groups',
  groupName: 'Grupo A',
  homeTeamId: 'arg',
  awayTeamId: 'bra',
  kickoffAt: '2026-06-11T17:00:00.000Z',
  status: 'final',
  homeGoals: 2,
  awayGoals: 1,
  qualifiedTeamId: null,
  manualOverride: false,
}

vi.mock('#/context/app-context', () => ({
  useApp: () => ({
    sessionToken: 'test-token',
  }),
}))

vi.mock('#/lib/quinielas-api', () => ({
  invokeAuthenticatedQuinielasAction: vi.fn(),
}))

describe('MatchPredictionsDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not render when closed', () => {
    render(<MatchPredictionsDialog match={match} open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Argentina vs Brasil')).toBeNull()
  })

  it('renders match title when open', () => {
    render(<MatchPredictionsDialog match={match} open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Argentina vs Brasil')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/match-predictions-dialog.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/match-predictions-dialog.test.tsx
git commit -m "test(ui): add MatchPredictionsDialog tests"
```

---

## Task 8: Deploy Backend Functions

**Files:**
- None (deployment only)

- [ ] **Step 1: Deploy the quinielas function**

Run: `npx supabase functions deploy quinielas --project-ref gkzzioxyulibwvdvkjmy`
Expected: Deployment success

- [ ] **Step 2: Verify the action is accessible**

Test via Supabase dashboard or curl with a valid session token.

- [ ] **Step 3: Commit any deployment config changes**

```bash
git add -A
git commit -m "chore: deploy backend functions for predictions dialog"
```
