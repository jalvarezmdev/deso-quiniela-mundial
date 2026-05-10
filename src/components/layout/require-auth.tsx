import { Navigate } from '@tanstack/react-router'
import { useApp } from '#/context/app-context'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useApp()

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-600">Cargando...</div>
  }

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useApp()

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-600">Cargando...</div>
  }

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  if (!currentUser.isAdmin) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
