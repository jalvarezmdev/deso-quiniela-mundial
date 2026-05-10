import { supabase } from '#/lib/supabase'
import type {
  LeaderboardRow,
  Match,
  MatchStatus,
  PhaseKey,
  PhaseSubmission,
  PhaseWindowOverride,
  Prediction,
} from '#/lib/types'

export type QuinielasError = {
  code: string
  message: string
}

type QuinielasOk<T> = {
  ok: true
  data: T
}

type QuinielasFail = {
  ok: false
  error: QuinielasError
}

export type QuinielasResponse<T> = QuinielasOk<T> | QuinielasFail

export type PublicQuinielasAction =
  | 'get_match'
  | 'list_matches'
  | 'get_phase_window_override'
  | 'list_phase_window_overrides'

export type AuthenticatedQuinielasAction =
  | 'create_prediction'
  | 'get_my_prediction'
  | 'list_my_predictions'
  | 'update_prediction'
  | 'delete_prediction'
  | 'create_phase_submission'
  | 'get_my_phase_submission'
  | 'list_my_phase_submissions'
  | 'delete_phase_submission'
  | 'list_leaderboard'

export type AdminQuinielasAction =
  | 'create_match'
  | 'update_match'
  | 'delete_match'
  | 'create_phase_window_override'
  | 'update_phase_window_override'
  | 'delete_phase_window_override'

export type MatchDTO = Match & {
  updatedAt?: string
}

export type PredictionDTO = Prediction
export type PhaseSubmissionDTO = PhaseSubmission
export type PhaseWindowOverrideDTO = PhaseWindowOverride
export type LeaderboardRowDTO = LeaderboardRow

export type ListMatchesInput = {
  phase?: PhaseKey
  status?: MatchStatus
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export type ListMatchesResultDTO = {
  matches: MatchDTO[]
}

export type ListMyPredictionsResultDTO = {
  predictions: PredictionDTO[]
}

export type ListMyPhaseSubmissionsResultDTO = {
  submissions: PhaseSubmissionDTO[]
}

export type ListPhaseWindowOverridesResultDTO = {
  windowOverrides: PhaseWindowOverrideDTO[]
}

export type ListLeaderboardResultDTO = {
  leaderboard: LeaderboardRowDTO[]
}

function asQuinielasError(err: unknown): QuinielasError {
  if (typeof err === 'object' && err !== null) {
    const maybeCode = 'code' in err ? String(err.code) : 'UNKNOWN_ERROR'
    const maybeMessage = 'message' in err ? String(err.message) : 'Error desconocido.'
    return {
      code: maybeCode,
      message: maybeMessage,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Error desconocido.',
  }
}

function isApiErrorEnvelope(
  value: unknown,
): value is { ok: false; error: { code?: unknown; message?: unknown } } {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false
  const okValue = (value as { ok?: unknown }).ok
  if (okValue !== false) return false

  const maybeError = (value as { error?: unknown }).error
  return typeof maybeError === 'object' && maybeError !== null
}

async function resolveInvokeError(
  response: Response | undefined,
  fallbackMessage: string,
): Promise<QuinielasError> {
  if (!response) {
    return {
      code: 'FUNCTION_INVOKE_ERROR',
      message: fallbackMessage,
    }
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return {
      code: 'FUNCTION_INVOKE_ERROR',
      message: fallbackMessage,
    }
  }

  try {
    const payload = await response.clone().json()
    if (isApiErrorEnvelope(payload)) {
      return asQuinielasError(payload.error)
    }
  } catch {
    // If parsing fails, fallback to invoke-level message.
  }

  return {
    code: 'FUNCTION_INVOKE_ERROR',
    message: fallbackMessage,
  }
}

export async function invokeQuinielasAction<TPayload, TResult>(
  action: PublicQuinielasAction,
  payload: TPayload,
): Promise<QuinielasResponse<TResult>> {
  return invokeQuinielasRaw<TResult>({
    action,
    payload,
  })
}

export async function invokeAuthenticatedQuinielasAction<TPayload, TResult>(
  action: AuthenticatedQuinielasAction,
  sessionToken: string,
  payload: TPayload,
): Promise<QuinielasResponse<TResult>> {
  return invokeQuinielasRaw<TResult>({
    action,
    payload: {
      ...((payload as object) ?? {}),
      sessionToken,
    },
  })
}

export async function invokeAdminQuinielasAction<TPayload, TResult>(
  action: AdminQuinielasAction,
  sessionToken: string,
  payload: TPayload,
): Promise<QuinielasResponse<TResult>> {
  return invokeQuinielasRaw<TResult>({
    action,
    payload: {
      ...((payload as object) ?? {}),
      sessionToken,
    },
  })
}

async function invokeQuinielasRaw<TResult>({
  action,
  payload,
}: {
  action: string
  payload: unknown
}): Promise<QuinielasResponse<TResult>> {
  if (!supabase) {
    return {
      ok: false,
      error: {
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase no esta configurado en este entorno.',
      },
    }
  }

  try {
    const { data, error, response } = await supabase.functions.invoke('quinielas', {
      body: {
        action,
        payload,
      },
    })

    if (error) {
      const parsedError = await resolveInvokeError(response, error.message)
      return {
        ok: false,
        error: parsedError,
      }
    }

    if (!data || typeof data !== 'object' || !('ok' in data)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_FUNCTION_RESPONSE',
          message: 'Respuesta invalida desde quinielas.',
        },
      }
    }

    if (data.ok === true) {
      return {
        ok: true,
        data: data.data as TResult,
      }
    }

    return {
      ok: false,
      error: asQuinielasError((data as { error?: unknown }).error),
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'No se pudo conectar con quinielas.',
      },
    }
  }
}
