# Match Prediction Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display each user's earned match points in the results modal, including zero points.

**Architecture:** The existing `list_predictions_for_match` action computes points with the shared server scoring helper and returns them with each prediction. The React modal only renders the typed value.

**Tech Stack:** Supabase Edge Functions, TypeScript, React 19, Vitest, Testing Library

---

### Task 1: Return Points From The Match Predictions Action

**Files:**
- Create: `supabase/functions/_shared/quiniela/actions/list-predictions-for-match.test.ts`
- Modify: `supabase/functions/_shared/quiniela/actions/list-predictions-for-match.ts`

- [ ] **Step 1: Write a failing action test**

Test a final group match with predictions worth zero and three points and assert the JSON response includes `points` for both users.

- [ ] **Step 2: Verify the test fails**

Run: `deno test supabase/functions/_shared/quiniela/actions/list-predictions-for-match.test.ts`

Expected: FAIL because the action does not return `points`.

- [ ] **Step 3: Implement the minimal endpoint change**

Load the match result, compute each row with `computeMatchPoints`, and include `points` in `PredictionWithNickname`.

- [ ] **Step 4: Verify the action test passes**

Run: `deno test supabase/functions/_shared/quiniela/actions/list-predictions-for-match.test.ts`

Expected: PASS.

### Task 2: Render Points In The Modal

**Files:**
- Modify: `src/lib/quinielas-api.ts`
- Modify: `src/components/match-predictions-dialog.tsx`
- Modify: `src/components/match-predictions-dialog.test.tsx`

- [ ] **Step 1: Write a failing component test**

Mock rows with `points: 0` and `points: 3`, then assert `+0 PTS` and `+3 PTS` are visible.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/components/match-predictions-dialog.test.tsx`

Expected: FAIL because the modal does not render points.

- [ ] **Step 3: Implement the minimal UI change**

Add `points: number` to `PredictionForMatchDTO` and render it beside each predicted score.

- [ ] **Step 4: Run focused and full verification**

Run: `npm test -- src/components/match-predictions-dialog.test.tsx`

Run: `npm test`

Run: `npm run build`

Expected: all commands pass.
