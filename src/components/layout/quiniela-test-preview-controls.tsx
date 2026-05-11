import { FlaskConicalIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/cn";

type QuinielaTestPreviewControlsProps<TPhase extends string> = {
  phases: readonly TPhase[];
  showPreviewControls: boolean;
  previewByPhase: Record<TPhase, boolean>;
  className?: string;
  phaseLabel: (phase: TPhase) => string;
  onToggleControls: () => void;
  onTogglePhase: (phase: TPhase) => void;
};

export function QuinielaTestPreviewControls<TPhase extends string>({
  phases,
  showPreviewControls,
  previewByPhase,
  className,
  phaseLabel,
  onToggleControls,
  onTogglePhase,
}: QuinielaTestPreviewControlsProps<TPhase>) {
  return (
    <div className={cn("md:fixed right-4 bottom-24 z-50", className)}>
      <div className="flex flex-col items-start gap-2 mb-2">
        {showPreviewControls ? (
          <Card className="w-64 border-[var(--line)] bg-[var(--surface-1)]/95 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
              Preview temporal
            </p>
            <div className="grid gap-2">
              {phases.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-left text-xs text-zinc-200"
                  onClick={() => onTogglePhase(phase)}
                >
                  <span>{phaseLabel(phase)}</span>
                  <Badge
                    className={
                      previewByPhase[phase]
                        ? "bg-[var(--accent)] text-[#0b1119]"
                        : "bg-zinc-800 text-zinc-300"
                    }
                  >
                    {previewByPhase[phase] ? "ON" : "OFF"}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        ) : null}
        <Button type="button" onClick={onToggleControls}>
          <FlaskConicalIcon className="mr-2 h-4 w-4" />
          Test preview
        </Button>
      </div>
    </div>
  );
}
