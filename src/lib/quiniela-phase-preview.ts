import { PHASES, type PhaseKey } from "#/lib/types";

function isPhaseKey(value: string): value is PhaseKey {
  return PHASES.some((phase) => phase.key === value);
}

export function resolveDisplayedPhase(
  activePhase: PhaseKey,
  isAdmin: boolean,
  previewPhase: string | undefined,
): PhaseKey {
  if (!isAdmin || !previewPhase || !isPhaseKey(previewPhase)) {
    return activePhase;
  }

  return previewPhase;
}
