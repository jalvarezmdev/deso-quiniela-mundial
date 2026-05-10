import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { useApp } from '#/context/app-context'
import { TEAMS } from '#/lib/teams'

export const Route = createFileRoute('/ingreso')({
  component: IngresoPage,
})

function IngresoPage() {
  const { currentUser, register, login } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPin, setLoginPin] = useState('')

  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [teamId, setTeamId] = useState(TEAMS[0]?.id ?? 'arg')
  const [secretPhrase, setSecretPhrase] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const teams = useMemo(() => TEAMS, [])

  if (currentUser) {
    return <Navigate to={currentUser.onboardingCompleted ? '/' : '/onboarding'} />
  }

  async function onRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await register({
      email,
      nickname,
      teamId,
      pin,
      secretPhrase,
    })

    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate({ to: '/onboarding' })
  }

  async function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await login({
      email: loginEmail,
      pin: loginPin,
    })

    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate({ to: '/' })
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-136px)] w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-2">
      <section>
        <img alt="logo" src="/desocupaos-white.png" className="w-48 mb-6" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]/60">
          Quiniela Mundial 2026
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[var(--primary)]">
          Organiza tus rondas, confirma tu quiniela y compite por puntos.
        </h1>
        <p className="mt-4 text-sm text-zinc-300">
          Flujo cerrado por fases que inicia en grupos y sigue por 16vos, 8vos, 4tos, semis y final.
          Cada fase se bloquea al iniciar su primer partido.
        </p>
      </section>

      <Card className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-800 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            disabled={submitting}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              mode === 'login' ? 'bg-[var(--secondary)] text-[var(--primary)] shadow-sm' : 'text-zinc-300'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            disabled={submitting}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              mode === 'register' ? 'bg-[var(--secondary)] text-[var(--primary)] shadow-sm' : 'text-zinc-300'
            }`}
          >
            Registrarse
          </button>
        </div>

        {error ? <p className="mb-3 rounded-md bg-red-950/40 p-2 text-sm text-red-300">{error}</p> : null}

        {mode === 'login' ? (
          <form className="space-y-3" onSubmit={onLoginSubmit}>
            <div>
              <Label htmlFor="loginEmail">Correo</Label>
              <Input
                id="loginEmail"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="loginPin">PIN numerico (6 digitos)</Label>
              <Input
                id="loginPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={loginPin}
                onChange={(event) => setLoginPin(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={onRegisterSubmit}>
            <div>
              <Label htmlFor="registerEmail">Correo</Label>
              <Input
                id="registerEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="registerNickname">Nombre o apodo</Label>
              <Input
                id="registerNickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="registerTeam">Avatar de seleccion</Label>
              <select
                id="registerTeam"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.flag} {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="registerSecret">Palabra secreta</Label>
              <Input
                id="registerSecret"
                value={secretPhrase}
                onChange={(event) => setSecretPhrase(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="registerPin">Contrasena numerica (6 digitos)</Label>
              <Input
                id="registerPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  )
}
