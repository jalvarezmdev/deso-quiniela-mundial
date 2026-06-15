export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface-1)]/95 pb-[env(safe-area-inset-bottom,0.5rem)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-zinc-300">
        <img src="/desocupaos-white.png" alt="Deso Cupaos" className="h-8 w-auto" />
        <span>Zona horaria oficial: America/Caracas</span>
      </div>
    </footer>
  )
}
