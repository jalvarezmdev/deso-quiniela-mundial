import { Button } from "#/components/ui/button";

type QuinielaProgressProps = {
  savedMatchesCount: number;
  totalMatchesCount: number;
  missingCount: number;
  savedProgress: number;
  editable: boolean;
  canConfirmPhase: boolean;
  onConfirmPhase: () => void;
};

export function QuinielaProgress({
  savedMatchesCount,
  totalMatchesCount,
  missingCount,
  savedProgress,
  editable,
  canConfirmPhase,
  onConfirmPhase,
}: QuinielaProgressProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center">
      <div className="w-full md:flex-1">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
          <span>Progreso quiniela</span>
          <span>
            {savedMatchesCount} / {totalMatchesCount} cargados
          </span>
        </div>
        {missingCount > 0 ? (
          <p className="mb-1 text-[11px] text-zinc-400">
            {missingCount} cruces por definir para habilitar confirmacion.
          </p>
        ) : null}
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${savedProgress}%` }}
          />
        </div>
      </div>
      <div className="flex md:justify-end gap-2 justify-center">
        <Button variant="outline" disabled={!editable}>
          Guardar borrador
        </Button>
        <Button onClick={onConfirmPhase} disabled={!canConfirmPhase}>
          Enviar quiniela final
        </Button>
      </div>
    </div>
  );
}
