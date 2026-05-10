import {
  parseBoolean,
  parseId,
  parseIsoDateString,
  parsePhaseKey,
  type PhaseKey,
  ValidationError,
} from "./quinielas-helpers.ts";

export function parsePhaseSubmissionLookup(payload: Record<string, unknown>): {
  phase: PhaseKey;
  userId: string | null;
} {
  const phase = parsePhaseKey(payload.phase);
  const userId = payload.userId === undefined
    ? null
    : parseId(payload.userId, "userId");
  return { phase, userId };
}

export function parsePhaseSubmissionUpdate(payload: Record<string, unknown>): {
  userId: string;
  phase: PhaseKey;
  patch: {
    confirmedAt?: string;
    autoConfirmed?: boolean;
  };
} {
  const userId = parseId(payload.userId, "userId");
  const phase = parsePhaseKey(payload.phase);
  const patch: {
    confirmedAt?: string;
    autoConfirmed?: boolean;
  } = {};

  if (payload.confirmedAt !== undefined) {
    patch.confirmedAt = parseIsoDateString(payload.confirmedAt);
  }

  if (payload.autoConfirmed !== undefined) {
    patch.autoConfirmed = parseBoolean(payload.autoConfirmed, false);
  }

  if (Object.keys(patch).length === 0) {
    throw new ValidationError(
      "Debes enviar al menos un campo para actualizar.",
    );
  }

  return { userId, phase, patch };
}
