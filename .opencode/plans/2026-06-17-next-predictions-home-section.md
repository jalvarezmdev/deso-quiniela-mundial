# Next Predictions Home Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tus proximas predicciones" section to the home page showing the next 3 upcoming matches with the user's predicted scores.

**Architecture:** New `useNextMatches` hook filters scheduled matches and joins with user predictions. New `PredictionsMatchCard` component mirrors `ResultadosMatchCard` layout but displays predicted scores instead of actual results. Home route renders the section between hero and last-played-matches.

**Tech Stack:** React, TypeScript, TanStack Router, TailwindCSS, Lucide React icons

---

### Task 1: Create `useNextMatches` hook

**Files:**
- Create: `src/hooks/use-next-matches.ts`

- [ ] **Step 1: Create the hook file**

```ts
import { useMemo } from 'react'
import { getTeam } from '#/lib/teams'
import { PHASES, type Match, type PhaseKey, type Prediction } from '#/lib/types'

export type NextMatchWithPrediction = {
  match: Match
  home: ReturnType<typeof getTeam>
  away: ReturnType<typeof getTeam>
  phaseLabel: string
  prediction: Prediction | null
}

export function useNextMatches(
  matches: Match[],
  predictions: Prediction[],
  userId: string,
): NextMatchWithPrediction[] {
  return useMemo(() => {
    const now = Date.now()
    const upcoming = matches
      .filter((m) => m.status === 'scheduled' && new Date(m.kickoffAt).getTime() >= now)
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .slice(0, 3)

    return upcoming.map((match) => {
      const home = getTeam(match.homeTeamId)
      const away = getTeam(match.awayTeamId)
      const phaseLabel = PHASES.find((p) => p.key === match.phase)?.label ?? match.phase
      const prediction =
        predictions.find(
          (p) => p.matchId === match.id && p.userId === userId,
        ) ?? null

      return { match, home, away, phaseLabel, prediction }
    })
  }, [matches, predictions, userId])
}
```

- [ ] **Step 2: Verify hook compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors related to `use-next-matches.ts`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-next-matches.ts
git commit -m "feat: add useNextMatches hook for next 3 upcoming matches with predictions"
```

---

### Task 2: Create `PredictionsMatchCard` component

**Files:**
- Create: `src/components/predictions-match-card.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { Link } from '@tanstack/react-router'
import { Card } from '#/components/ui/card'
import type { Match, Prediction, Team } from '#/lib/types'
import { toVenShortDateLabel, toVenShortTimeLabel } from '#/lib/time'

type PredictionsMatchCardProps = {
  match: Match
  home: Team
  away: Team
  phaseLabel: string
  prediction: Prediction | null
}

export function PredictionsMatchCard({
  match,
  home,
  away,
  phaseLabel,
  prediction,
}: PredictionsMatchCardProps) {
  return (
    <Card className="rounded-lg p-3 md:p-4">
      <p className="text-xs text-zinc-500">
        {(match.groupName ?? 'Eliminatoria').toUpperCase()} · {phaseLabel}
      </p>

      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xl font-extrabold text-[var(--primary)]">
              {home.flag} {home.name}
            </p>
            <span className="text-2xl font-black text-zinc-200">
              {prediction ? prediction.homeGoals : '\u2014'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xl font-extrabold text-[var(--primary)]">
              {away.flag} {away.name}
            </p>
            <span className="text-2xl font-black text-zinc-200">
              {prediction ? prediction.awayGoals : '\u2014'}
            </span>
          </div>
        </div>

        <div className="h-px bg-zinc-800 md:hidden" />

        <div className="flex items-center justify-between gap-3 md:min-w-28 md:flex-col md:items-end md:justify-center">
          <p className="text-xs text-zinc-400">{toVenShortDateLabel(match.kickoffAt)}</p>
          <p className="text-xs text-zinc-500">{toVenShortTimeLabel(match.kickoffAt)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {prediction ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/5 px-3 py-1">
            <span className="text-xs font-bold uppercase text-[var(--accent)]">
              Tu prediccion
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500">Sin prediccion</span>
        )}
        <Link
          to="/quiniela"
          className="rounded-lg border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-bold text-[var(--accent)] no-underline transition hover:bg-[var(--accent)]/20"
        >
          {prediction ? 'Ver prediccion' : 'Predecir'}
        </Link>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors related to `predictions-match-card.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/predictions-match-card.tsx
git commit -m "feat: add PredictionsMatchCard component for upcoming match predictions"
```

---

### Task 3: Integrate into home page

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Add imports to `index.tsx`**

At the top of `src/routes/index.tsx`, add these two imports after the existing imports:

```ts
import { useNextMatches } from '#/hooks/use-next-matches'
import { PredictionsMatchCard } from '#/components/predictions-match-card'
```

- [ ] **Step 2: Add hook call inside `HomePage`**

Inside the `HomePage` function, after the `matchPoints` useMemo (around line 88), add:

```ts
const nextMatches = useNextMatches(state.matches, state.predictions, currentUser.id)
```

- [ ] **Step 3: Add the predictions section in JSX**

In the JSX, between the hero section closing `</section>` (line 131) and the `{lastPlayedMatches.length > 0 && (` block (line 133), insert:

```tsx
{nextMatches.length > 0 && (
  <div className="mt-6">
    <div className="mb-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Tus proximas predicciones
      </h3>
      <div className="mt-2 grid gap-3">
        {nextMatches.map((item) => (
          <PredictionsMatchCard
            key={item.match.id}
            match={item.match}
            home={item.home}
            away={item.away}
            phaseLabel={item.phaseLabel}
            prediction={item.prediction}
          />
        ))}
      </div>
      <hr className="mt-4 border-t border-zinc-800" />
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify the page compiles and renders**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: add next predictions section to home page below hero"
```

---

### Task 4: Visual verification

- [ ] **Step 1: Start dev server and visually verify**

Run: `npm run dev`
Expected: Home page shows "Tus proximas predicciones" section below hero, above last-played-matches. Cards show team flags/names, predicted scores (or em dash if no prediction), kickoff date/time, and "Tu prediccion" badge or "Sin prediccion" with CTA link.

- [ ] **Step 2: Run build to check production**

Run: `npm run build`
Expected: Build succeeds with no errors