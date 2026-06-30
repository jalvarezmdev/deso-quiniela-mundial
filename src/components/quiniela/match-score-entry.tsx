import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CircleCheck, Loader2Icon, Lock } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { getTeam } from "#/lib/teams";
import { isMatchLocked } from "#/lib/match-lock";
import type { Match, Prediction } from "#/lib/types";

export type MatchScoreEntrySubmitInput = {
  homeGoals: number;
  awayGoals: number;
  predictedQualifiedTeamId: string | null;
};

type MatchScoreEntryProps = {
  match: Match;
  prediction: Prediction | null;
  isSaving: boolean;
  now?: Date;
  cancelLabel?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (input: MatchScoreEntrySubmitInput) => void;
};

function isKnockout(phase: Match["phase"]): boolean {
  return phase !== "groups";
}

function teamCode(teamId: string): string {
  return teamId.toUpperCase();
}

function getScoreWinnerTeamId({
  homeGoals,
  awayGoals,
  homeTeamId,
  awayTeamId,
}: {
  homeGoals: string;
  awayGoals: string;
  homeTeamId: string;
  awayTeamId: string;
}): string | null {
  const home = Number(homeGoals);
  const away = Number(awayGoals);

  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home > away) return homeTeamId;
  if (away > home) return awayTeamId;
  return null;
}

export function MatchScoreEntry({
  match,
  prediction,
  isSaving,
  now,
  cancelLabel = "Cancelar",
  submitLabel = "Guardar",
  onCancel,
  onSubmit,
}: MatchScoreEntryProps) {
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");
  const [qualifiedTeamId, setQualifiedTeamId] = useState("");
  const homeGoalsInputRef = useRef<HTMLInputElement>(null);
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const requiresQualifiedTeam = isKnockout(match.phase);
  const locked = isMatchLocked(match, now);
  const formDisabled = isSaving || locked;
  const scoreWinnerTeamId = requiresQualifiedTeam
    ? getScoreWinnerTeamId({
      homeGoals,
      awayGoals,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
    })
    : null;
  const selectedQualifiedTeamId = scoreWinnerTeamId ?? qualifiedTeamId;

  useEffect(() => {
    setHomeGoals(String(prediction?.homeGoals ?? 0));
    setAwayGoals(String(prediction?.awayGoals ?? 0));
    setQualifiedTeamId(prediction?.predictedQualifiedTeamId ?? "");
  }, [match.id, prediction]);

  useEffect(() => {
    if (!locked) {
      homeGoalsInputRef.current?.focus();
    }
  }, [locked, match.id]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;

    onSubmit({
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
      predictedQualifiedTeamId: requiresQualifiedTeam
        ? selectedQualifiedTeamId || null
        : null,
    });
  }

  return (
    <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
      {locked ? (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-800/50 px-4 py-3 text-zinc-400">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">Bloqueado - partido en curso</span>
        </div>
      ) : null}

      {match.phase === "groups" ? (
        <div className="text-center text-xs  font-medium uppercase tracking-wide">
          <h3 className="text-zinc-500">{match.groupName}</h3>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <div>
          <Label
            htmlFor={`homeGoals-${match.id}`}
            className="mb-3 block max-w-full truncate text-center text-4xl font-black leading-none text-[var(--accent)] md:text-5xl"
            title={home.name}
          >
            <span className="mr-2 text-3xl md:text-4xl">{home.flag}</span>
            {teamCode(match.homeTeamId)}
          </Label>
          <Input
            ref={homeGoalsInputRef}
            id={`homeGoals-${match.id}`}
            type="number"
            min={0}
            value={homeGoals}
            onChange={(event) => setHomeGoals(event.target.value)}
            className="h-28 rounded-xl border-2 text-center text-6xl font-black tabular-nums tracking-normal text-[var(--accent)] md:h-32 md:text-7xl"
            disabled={formDisabled}
            required
          />
        </div>
        <div>
          <Label
            htmlFor={`awayGoals-${match.id}`}
            className="mb-3 block max-w-full truncate text-center text-4xl font-black leading-none text-[var(--accent)] md:text-5xl"
            title={away.name}
          >
            <span className="mr-2 text-3xl md:text-4xl">{away.flag}</span>
            {teamCode(match.awayTeamId)}
          </Label>
          <Input
            id={`awayGoals-${match.id}`}
            type="number"
            min={0}
            value={awayGoals}
            onChange={(event) => setAwayGoals(event.target.value)}
            className="h-28 rounded-xl border-2 text-center text-6xl font-black tabular-nums tracking-normal text-[var(--accent)] md:h-32 md:text-7xl"
            disabled={formDisabled}
            required
          />
        </div>
      </div>

      {requiresQualifiedTeam ? (
        <div>
          <Label htmlFor={`qualified-${match.id}`}>Clasificado final</Label>
          <select
            id={`qualified-${match.id}`}
            value={selectedQualifiedTeamId}
            onChange={(event) => setQualifiedTeamId(event.target.value)}
            className="h-10 w-full rounded-md border border-[--line] bg-[var(--secondary)] px-3 text-sm"
            disabled={formDisabled || Boolean(scoreWinnerTeamId)}
            required
          >
            <option value="">Selecciona clasificado</option>
            <option value={match.homeTeamId}>
              {home.flag} {home.name}
            </option>
            <option value={match.awayTeamId}>
              {away.flag} {away.name}
            </option>
          </select>
        </div>
      ) : null}

      <div className="flex justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={formDisabled}>
          {isSaving ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4" /> {submitLabel}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}
