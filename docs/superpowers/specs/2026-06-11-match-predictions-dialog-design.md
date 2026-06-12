# Match Predictions Dialog Design

## Summary

When a match is marked as "finished" (status === 'final'), display a "Ver Resultados" button on the match card in the `/resultados` route. Clicking this button opens a dialog showing all user predictions for that match.

## Requirements

- All authenticated users can see predictions for finished matches
- Dialog shows nickname + predicted score (simple view)
- Button always shows for finished matches, even if no predictions exist
- Empty state shows "No hay predicciones para este partido"
- Backdrop uses glassmorphism style (bg-black/80 backdrop-blur-md)

## Design

### Backend: New Action `list_predictions_for_match`

**Endpoint:** `list_predictions_for_match` (authenticated)

**Input:**
```ts
{ matchId: string }
```

**Output:**
```ts
{
  predictions: {
    nickname: string
    homeGoals: number
    awayGoals: number
  }[]
}
```

**Logic:**
1. Validate `matchId` is provided
2. Query `predictions` table filtered by `matchId`
3. Join with `users` table to get `nickname` for each prediction
4. Return the list ordered by `nickname` alphabetically

**Files to create/modify:**
- `supabase/functions/_shared/quiniela/actions/list-predictions-for-match.ts` (new)
- `supabase/functions/quinielas/index.ts` (register the new action)
- `src/lib/quinielas-api.ts` (add new action type + DTO)

### Frontend: `ResultadosMatchCard` Changes

**Button visibility:**
- Show "Ver Resultados" button only when `match.status === 'final'`

**Button behavior:**
- Clicking opens a modal dialog
- Button shows loading state while predictions are being fetched

**Files to modify:**
- `src/components/resultados-match-card.tsx` — add button, modal state, fetch logic

### Frontend: Modal Dialog

**Component:** `MatchPredictionsDialog` (new component)

**Backdrop:**
- Fixed overlay, `bg-black/80 backdrop-blur-md` (matching existing glassmorphism style)

**Card:**
- Header: Match title (e.g., "Argentina vs Brasil") + close button (X)
- Body: List of predictions, each showing `{nickname}: {homeGoals}-{awayGoals}`
- Empty state: "No hay predicciones para este partido"
- Loading state: skeleton or spinner while fetching

**Behavior:**
- Opens when triggered by the button on `ResultadosMatchCard`
- Fetches predictions on open via `list_predictions_for_match`
- Closes on backdrop click, close button, or Escape key

**Files to create:**
- `src/components/match-predictions-dialog.tsx`

## Testing

- Unit test for `list-predictions-for-match.ts` action
- Component test for `ResultadosMatchCard` showing button only when status is 'final'
- Component test for `MatchPredictionsDialog` with predictions and empty state
