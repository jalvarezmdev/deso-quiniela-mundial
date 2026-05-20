import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Match, PhaseKey, Prediction } from '#/lib/types'
import type { MatchScoreEntrySubmitInput } from './match-score-entry'

type ActionResult = { ok: true } | { ok: false; message: string }

export type SavePredictionInput = {
  phase: PhaseKey
  matchId: string
  homeGoals: number
  awayGoals: number
  predictedQualifiedTeamId: string | null
}

type QuinielaMatchFlowState = {
  isOpen: boolean
  selectedMatchId: string
}

type UseQuinielaMatchFlowControllerInput = {
  userId: string
  phase: PhaseKey
  roundFilter: string | number
  matches: Match[]
  predictions: Prediction[]
  savePrediction: (input: SavePredictionInput) => Promise<ActionResult>
  onComplete: () => void
  onSaveError: (message: string) => void
}

export type QuinielaMatchFlowContextValue = {
  matches: Match[]
  isOpen: boolean
  isSaving: boolean
  activeIndex: number
  selectedMatchId: string
  activeMatch: Match | null
  activePrediction: Prediction | null
  canOpen: boolean
  open: () => void
  close: () => void
  goToPreviousOrClose: () => void
  selectMatch: (matchId: string) => void
  saveActiveMatch: (input: MatchScoreEntrySubmitInput) => void
}

function initialFlowState(matches: Match[]): QuinielaMatchFlowState {
  return {
    isOpen: false,
    selectedMatchId: matches[0]?.id ?? '',
  }
}

function clampFlowState(
  state: QuinielaMatchFlowState,
  matches: Match[],
): QuinielaMatchFlowState {
  if (matches.length === 0) {
    return {
      isOpen: false,
      selectedMatchId: '',
    }
  }

  const selectedMatchExists = matches.some(
    (match) => match.id === state.selectedMatchId,
  )

  return {
    ...state,
    selectedMatchId: selectedMatchExists
      ? state.selectedMatchId
      : matches[0]?.id ?? '',
  }
}

export function useQuinielaMatchFlowController({
  userId,
  phase,
  roundFilter,
  matches,
  predictions,
  savePrediction,
  onComplete,
  onSaveError,
}: UseQuinielaMatchFlowControllerInput): QuinielaMatchFlowContextValue {
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => ['quiniela-match-flow', userId, phase, String(roundFilter)] as const,
    [phase, roundFilter, userId],
  )
  const fallbackState = useMemo(() => initialFlowState(matches), [matches])
  const { data: flowState = fallbackState } = useQuery({
    queryKey,
    queryFn: () =>
      queryClient.getQueryData<QuinielaMatchFlowState>(queryKey) ??
      fallbackState,
    enabled: false,
    initialData: fallbackState,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const setFlowState = useCallback(
    (
      updater: (
        current: QuinielaMatchFlowState,
      ) => QuinielaMatchFlowState,
    ) => {
      queryClient.setQueryData<QuinielaMatchFlowState>(queryKey, (current) =>
        updater(current ?? fallbackState),
      )
    },
    [fallbackState, queryClient, queryKey],
  )

  useEffect(() => {
    setFlowState((current) => clampFlowState(current, matches))
  }, [matches, setFlowState])

  const predictionByMatchId = useMemo(
    () =>
      new Map(
        predictions.map((prediction) => [prediction.matchId, prediction]),
      ),
    [predictions],
  )
  const selectedMatchIndex = matches.findIndex(
    (match) => match.id === flowState.selectedMatchId,
  )
  const activeIndex = selectedMatchIndex >= 0 ? selectedMatchIndex : 0
  const activeMatch = matches[activeIndex] ?? null
  const activePrediction = activeMatch
    ? predictionByMatchId.get(activeMatch.id) ?? null
    : null

  const close = useCallback(() => {
    setFlowState((current) => ({
      ...current,
      isOpen: false,
    }))
  }, [setFlowState])

  const goToPreviousOrClose = useCallback(() => {
    if (matches.length === 0 || activeIndex === 0) {
      close()
      return
    }

    const previousMatch = matches[activeIndex - 1]
    if (!previousMatch) {
      close()
      return
    }

    setFlowState((current) => ({
      ...current,
      selectedMatchId: previousMatch.id,
    }))
  }, [activeIndex, close, matches, setFlowState])

  const selectMatch = useCallback(
    (matchId: string) => {
      if (!matches.some((match) => match.id === matchId)) return

      setFlowState((current) => ({
        ...current,
        selectedMatchId: matchId,
      }))
    },
    [matches, setFlowState],
  )

  const open = useCallback(() => {
    setFlowState((current) => {
      const clamped = clampFlowState(current, matches)
      return { ...clamped, isOpen: matches.length > 0 }
    })
  }, [matches, setFlowState])

  const saveMutation = useMutation({
    mutationFn: (input: SavePredictionInput) => savePrediction(input),
    onSuccess: (result) => {
      if (!result.ok) {
        onSaveError(result.message)
        return
      }

      if (activeIndex < matches.length - 1) {
        const nextIndex = activeIndex + 1
        setFlowState((current) => ({
          ...current,
          selectedMatchId: matches[nextIndex]?.id ?? '',
        }))
        return
      }

      onComplete()
      close()
    },
  })

  const saveActiveMatch = useCallback(
    (input: MatchScoreEntrySubmitInput) => {
      if (!activeMatch || saveMutation.isPending) return

      saveMutation.mutate({
        phase: activeMatch.phase,
        matchId: activeMatch.id,
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
        predictedQualifiedTeamId: input.predictedQualifiedTeamId,
      })
    },
    [activeMatch, saveMutation],
  )

  return useMemo(
    () => ({
      matches,
      isOpen: flowState.isOpen,
      isSaving: saveMutation.isPending,
      activeIndex,
      selectedMatchId: flowState.selectedMatchId,
      activeMatch,
      activePrediction,
      canOpen: matches.length > 0,
      open,
      close,
      goToPreviousOrClose,
      selectMatch,
      saveActiveMatch,
    }),
    [
      activeMatch,
      activePrediction,
      activeIndex,
      close,
      flowState.isOpen,
      flowState.selectedMatchId,
      goToPreviousOrClose,
      matches,
      open,
      saveActiveMatch,
      saveMutation.isPending,
      selectMatch,
    ],
  )
}

const QuinielaMatchFlowContext =
  createContext<QuinielaMatchFlowContextValue | null>(null)

export function QuinielaMatchFlowProvider({
  value,
  children,
}: {
  value: QuinielaMatchFlowContextValue
  children: React.ReactNode
}) {
  return (
    <QuinielaMatchFlowContext.Provider value={value}>
      {children}
    </QuinielaMatchFlowContext.Provider>
  )
}

export function useQuinielaMatchFlowContext() {
  const context = useContext(QuinielaMatchFlowContext)
  if (!context) {
    throw new Error(
      'useQuinielaMatchFlowContext must be used within QuinielaMatchFlowProvider',
    )
  }
  return context
}
