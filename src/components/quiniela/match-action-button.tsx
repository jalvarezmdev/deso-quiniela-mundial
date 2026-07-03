import { Button } from "#/components/ui/button";
import type { Match, Prediction } from "#/lib/types";

type MatchActionButtonProps = {
  match: Match;
  prediction: Prediction | null;
  canEdit: boolean;
  phaseConfirmed: boolean;
  onOpen: (match: Match) => void;
};

export function MatchActionButton({
  match,
  prediction,
  canEdit,
  phaseConfirmed,
  onOpen,
}: MatchActionButtonProps) {
  if (!canEdit) return null;
  if (prediction && phaseConfirmed) return null;
  return (
    <Button onClick={() => onOpen(match)}>
      {prediction ? "Actualizar" : "Cargar"}
    </Button>
  );
}
