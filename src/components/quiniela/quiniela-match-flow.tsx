import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { Card } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { getTeam } from "#/lib/teams";
import type { Match } from "#/lib/types";
import { MatchDialogMotion } from "./match-dialog-motion";
import { MatchScoreEntry } from "./match-score-entry";
import { useQuinielaMatchFlowContext } from "./quiniela-match-flow-context";

export function QuinielaMatchFlow() {
  const {
    matches,
    isOpen,
    isSaving,
    activeIndex,
    selectedMatchId,
    activeMatch,
    activePrediction,
    close,
    goToPreviousOrClose,
    selectMatch,
    saveActiveMatch,
  } = useQuinielaMatchFlowContext();

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen]);

  if (!isOpen || !activeMatch) return null;

  function matchOptionLabel(match: Match): string {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    return `${home.flag} ${match.homeTeamId.toUpperCase()} vs ${away.flag} ${match.awayTeamId.toUpperCase()}`;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cargar Quiniela"
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 md:px-8">
        <div className="rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-4 py-2 text-sm font-black text-zinc-200">
          {activeIndex + 1} / {matches.length}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={close}
          aria-label="Cerrar cargar quiniela"
          className="h-11 w-11 rounded-full p-0"
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      <MatchDialogMotion key={activeMatch.id} testId="quiniela-flow-dialog-panel">
        <Card className="w-full max-w-3xl rounded-3xl border-slate-700 bg-[var(--surface-1)] p-5 shadow-2xl md:p-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Cargar Quiniela
              </p>
              <h2 className="mt-2 text-4xl font-black text-zinc-100 md:text-5xl">
                Cargar cruce
              </h2>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="quiniela-flow-match-search"
                className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500"
              >
                Buscar partido
              </label>
              <div className="flex flex-col gap-2">
                <select
                  id="quiniela-flow-match-search"
                  value={selectedMatchId}
                  onChange={(event) => {
                    selectMatch(event.target.value);
                  }}
                  className="h-11 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-zinc-100 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 text-center"
                  disabled={isSaving}
                >
                  {matches.map((match, index) => (
                    <option key={match.id} value={match.id}>
                      {index + 1}. {matchOptionLabel(match)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <MatchScoreEntry
            match={activeMatch}
            prediction={activePrediction}
            isSaving={isSaving}
            cancelLabel={activeIndex === 0 ? "Cerrar" : "Anterior"}
            submitLabel={activeIndex < matches.length - 1 ? "Siguiente" : "Finalizar"}
            onCancel={goToPreviousOrClose}
            onSubmit={saveActiveMatch}
          />
        </Card>
      </MatchDialogMotion>
    </div>
  );
}
