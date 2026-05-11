export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[20px] bg-[var(--accent)] px-4 py-6">
        <img
          src="/FIFA-26-Game-Logo-PNG.png"
          alt="Cargando"
          className="h-28 w-auto animate-pulse"
        />
      </div>
    </div>
  )
}
