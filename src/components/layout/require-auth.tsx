import { Navigate } from '@tanstack/react-router'
import { useApp } from '#/context/app-context'
import { LoadingScreen } from '#/components/layout/loading-screen'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authResolved, ready, currentUser } = useApp()

  if (!authResolved) {
    return <LoadingScreen />
  }

  if (!ready) {
    return <LoadingScreen />
  }

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { authResolved, ready, currentUser } = useApp()

  if (!authResolved) {
    return <LoadingScreen />
  }

  if (!ready) {
    return <LoadingScreen />
  }

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  if (!currentUser.isAdmin) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
