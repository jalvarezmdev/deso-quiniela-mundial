import { supabase } from '#/lib/supabase'

export type UsersError = {
  code: string
  message: string
}

type UsersOk<T> = {
  ok: true
  data: T
}

type UsersFail = {
  ok: false
  error: UsersError
}

export type UsersResponse<T> = UsersOk<T> | UsersFail

export type SessionUserDTO = {
  id: string
  email: string
  nickname: string
  teamId: string
  isAdmin: boolean
  onboardingCompleted: boolean
  createdAt: string
  lastLoginAt: string | null
}

export type BasicUserDTO = {
  id: string
  nickname: string
  teamId: string
  onboardingCompleted: boolean
  createdAt: string
}

export type AdminUserDTO = {
  id: string
  email: string
  nickname: string
  teamId: string
  isAdmin: boolean
  onboardingCompleted: boolean
  createdAt: string
  lastLoginAt: string | null
}

export type RegisterResultDTO = {
  sessionToken: string
  user: SessionUserDTO
}

export type LoginResultDTO = {
  sessionToken: string
  user: SessionUserDTO
}

export type MeResultDTO = {
  user: SessionUserDTO
}

export type UpdateMeResultDTO = {
  user: SessionUserDTO
}

export type ListBasicResultDTO = {
  users: BasicUserDTO[]
}

export type ListAdminResultDTO = {
  users: AdminUserDTO[]
}

export type AdminMutationResultDTO = {
  userId: string
}

type UsersAction =
  | 'register'
  | 'login'
  | 'me'
  | 'update_me'
  | 'list_basic'
  | 'list_admin'
  | 'admin_reset_pin'
  | 'admin_soft_delete'

function asUsersError(err: unknown): UsersError {
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

export async function invokeUsersAction<TPayload, TResult>(
  action: UsersAction,
  payload: TPayload,
): Promise<UsersResponse<TResult>> {
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
    const { data, error } = await supabase.functions.invoke('users', {
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
          message: 'Respuesta invalida desde users.',
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
      error: asUsersError((data as { error?: unknown }).error),
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'No se pudo conectar con users.',
      },
    }
  }
}
