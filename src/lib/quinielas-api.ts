import { supabase } from '#/lib/supabase'
import type { Match, MatchStatus, PhaseKey } from '#/lib/types'

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

type PublicQuinielasAction =
  | 'get_match'
  | 'list_matches'
  | 'get_phase_window_override'
  | 'list_phase_window_overrides'

type AdminQuinielasAction = 'update_match'

export type MatchDTO = Match & {
  updatedAt?: string
}

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

export async function invokeQuinielasAction<TPayload, TResult>(
  action: PublicQuinielasAction,
  payload: TPayload,
): Promise<QuinielasResponse<TResult>> {
  return invokeQuinielasRaw<TResult>({
    action,
    payload,
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
    const { data, error } = await supabase.functions.invoke('quinielas', {
      body: {
        action,
        payload,
      },
    })

    if (error) {
      return {
        ok: false,
        error: {
          code: 'FUNCTION_INVOKE_ERROR',
          message: error.message,
        },
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
