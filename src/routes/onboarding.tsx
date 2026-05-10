import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RequireAuth } from '#/components/layout/require-auth'
import { PageShell } from '#/components/layout/page-shell'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useApp } from '#/context/app-context'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const slides = [
  {
    title: 'Reglas por fases',
    text: 'La quiniela arranca en fase de grupos. Solo puedes editar la fase activa y el flujo avanza en orden por rondas. Cada fase se bloquea al iniciar su primer partido.',
  },
  {
    title: 'Puntaje',
    text: 'Acierto de ganador/empate: +1. Marcador exacto: +3 en total. En eliminatorias, el +1 de ganador se decide por clasificado final.',
  },
  {
    title: 'Confirmacion',
    text: 'Guarda tus cruces y luego confirma la fase. Si no confirmas y la fase cierra, se auto-confirma lo guardado y no podras editarlo.',
  },
]

function OnboardingPage() {
  const { currentUser, completeOnboarding } = useApp()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!currentUser) {
    return <Navigate to="/ingreso" />
  }

  if (currentUser.onboardingCompleted) {
    return <Navigate to="/" />
  }

  const slide = slides[index]!

  return (
    <RequireAuth>
      <PageShell title="Bienvenido" subtitle="Onboarding inicial">
        <Card className="mx-auto max-w-2xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Paso {index + 1} de {slides.length}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[var(--primary)]">{slide.title}</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-600">{slide.text}</p>

          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              disabled={index === 0}
            >
              Anterior
            </Button>
            {index < slides.length - 1 ? (
              <Button type="button" onClick={() => setIndex((current) => Math.min(current + 1, slides.length - 1))}>
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                onClick={async () => {
                  setNotice(null)
                  setSaving(true)
                  const result = await completeOnboarding()
                  setSaving(false)
                  if (!result.ok) {
                    setNotice(result.message)
                    return
                  }
                  navigate({ to: '/' })
                }}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Entendido'}
              </Button>
            )}
          </div>
          {notice ? <p className="mt-4 text-sm text-red-700">{notice}</p> : null}
        </Card>
      </PageShell>
    </RequireAuth>
  )
}
