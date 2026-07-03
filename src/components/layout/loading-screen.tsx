const LOADING_IMG = '/trionda.png'
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[20px] px-4 py-6">
        <img
          src={LOADING_IMG}
          alt="Cargando"
          className="h-28 w-auto animate-bounce"
        />
      </div>
    </div>
  )
}
