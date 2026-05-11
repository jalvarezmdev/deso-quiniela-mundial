import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RequireAuth } from "#/components/layout/require-auth";
import { PageShell } from "#/components/layout/page-shell";
import { QuinielaProgress } from "#/components/layout/quiniela-progress";
import { QuinielaTestPreviewControls } from "#/components/layout/quiniela-test-preview-controls";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useApp } from "#/context/app-context";
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  Clock3Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getGroupMatchRoundMap,
  groupMatchesByGroupName,
  type GroupRound,
} from "#/lib/group-rounds";
import { getTeam } from "#/lib/teams";
import { toVenDateTimeLabel } from "#/lib/time";
import { PHASES, type Match, type PhaseKey } from "#/lib/types";
import { resolveDisplayedPhase } from "#/lib/quiniela-phase-preview";
import {
  buildKnockoutMatchViews,
  type QuinielaMatchView,
} from "#/lib/elimination-preview";
import { useScreenSize } from "#/hooks/use-screen-size";

export const Route = createFileRoute("/quiniela")({
  validateSearch: (search: Record<string, unknown>) => ({
    phasePreview:
      typeof search.phasePreview === "string" ? search.phasePreview : undefined,
  }),
  component: QuinielaPage,
});

function phaseLabel(phase: PhaseKey): string {
  return PHASES.find((item) => item.key === phase)?.label ?? phase;
}

function isKnockout(phase: PhaseKey): boolean {
  return phase !== "groups";
}

function teamCode(teamId: string): string {
  return teamId.toUpperCase();
}

function teamDisplayWithAbv(teamId: string): string {
  const team = getTeam(teamId);
  return `${team.name} (${teamCode(teamId)})`;
}

type GroupAccentStyles = {
  badgeClassName: string;
};

const DEFAULT_GROUP_ACCENT: GroupAccentStyles = {
  badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

const GROUP_ACCENT_BY_LETTER: Record<string, GroupAccentStyles> = {
  a: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  b: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
  c: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  d: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
  e: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  f: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
  g: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  h: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
  i: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  j: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
  k: {
    badgeClassName: "bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  l: {
    badgeClassName:
      "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]",
  },
};

function groupAccentClass(groupName: string): GroupAccentStyles {
  const key = groupName.trim().toLowerCase();
  const letter = key.at(-1);
  if (!letter) return DEFAULT_GROUP_ACCENT;
  return GROUP_ACCENT_BY_LETTER[letter] ?? DEFAULT_GROUP_ACCENT;
}

const GROUP_ROUNDS: GroupRound[] = [1, 2, 3];
type RoundFilter = "all" | GroupRound;
type KnockoutPhase = Exclude<PhaseKey, "groups">;
const KNOCKOUT_PHASES: KnockoutPhase[] = [
  "roundOf16",
  "roundOf8",
  "roundOf4",
  "semifinals",
  "final",
];

function isKnockoutPhase(phase: PhaseKey): phase is KnockoutPhase {
  return phase !== "groups";
}

function QuinielaPage() {
  const {
    state,
    currentUser,
    activePhase,
    savePrediction,
    confirmPhase,
    canEditPhase,
    isPhaseEditableAtNow,
    isPhaseConfirmed,
    isPhaseLockedAtNow,
    getPhaseWindowAtNow,
  } = useApp();
  const { phasePreview } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { isMobile, isTablet, isDesktop } = useScreenSize();

  const displayedPhase = useMemo(
    () =>
      resolveDisplayedPhase(
        activePhase,
        Boolean(currentUser?.isAdmin),
        phasePreview,
      ),
    [activePhase, currentUser?.isAdmin, phasePreview],
  );

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");
  const [qualifiedTeamId, setQualifiedTeamId] = useState<string>("");
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [roundFilter, setRoundFilter] = useState<RoundFilter>("all");
  const [showPreviewControls, setShowPreviewControls] = useState(false);
  const [previewByPhase, setPreviewByPhase] = useState<
    Record<KnockoutPhase, boolean>
  >({
    roundOf16: false,
    roundOf8: false,
    roundOf4: false,
    semifinals: false,
    final: false,
  });

  const matches = useMemo(
    () =>
      state.matches
        .filter((match) => match.phase === displayedPhase)
        .sort(
          (a, b) =>
            new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
        ),
    [displayedPhase, state.matches],
  );
  const knockoutViews = useMemo(
    () =>
      buildKnockoutMatchViews(
        displayedPhase,
        matches,
        isKnockoutPhase(displayedPhase)
          ? previewByPhase[displayedPhase]
          : false,
      ),
    [displayedPhase, matches, previewByPhase],
  );

  const groupRoundMap = useMemo(
    () => getGroupMatchRoundMap(matches),
    [matches],
  );

  const visibleRounds = useMemo(
    () => (roundFilter === "all" ? GROUP_ROUNDS : [roundFilter]),
    [roundFilter],
  );

  const currentUserPhasePredictions = useMemo(
    () =>
      state.predictions.filter(
        (prediction) =>
          prediction.userId === currentUser?.id &&
          prediction.phase === displayedPhase,
      ),
    [displayedPhase, currentUser?.id, state.predictions],
  );

  const savedMatchesCount = currentUserPhasePredictions.length;
  const totalMatchesCount = matches.length;
  const savedProgress =
    totalMatchesCount === 0
      ? 0
      : Math.round((savedMatchesCount / totalMatchesCount) * 100);
  const editable = canEditPhase(displayedPhase);
  const canConfirmPhase = editable && knockoutViews.missingCount === 0;
  const phaseEditableAtNow = isPhaseEditableAtNow(displayedPhase);
  const phaseWindow = getPhaseWindowAtNow(displayedPhase);

  useEffect(() => {
    setRoundFilter("all");
  }, [displayedPhase]);

  if (!currentUser) {
    return null;
  }

  function openModal(match: Match) {
    const existing = state.predictions.find(
      (prediction) =>
        prediction.userId === currentUser?.id &&
        prediction.phase === displayedPhase &&
        prediction.matchId === match.id,
    );

    setSelectedMatch(match);
    setHomeGoals(String(existing?.homeGoals ?? 0));
    setAwayGoals(String(existing?.awayGoals ?? 0));
    setQualifiedTeamId(existing?.predictedQualifiedTeamId ?? "");
  }

  async function onSaveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMatch || isSavingMatch) return;

    setIsSavingMatch(true);

    try {
      const result = await savePrediction({
        phase: selectedMatch.phase,
        matchId: selectedMatch.id,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        predictedQualifiedTeamId: isKnockout(selectedMatch.phase)
          ? qualifiedTeamId || null
          : null,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Pronostico guardado.");
      setTimeout(() => {
        setSelectedMatch(null);
      }, 400);
    } finally {
      setIsSavingMatch(false);
    }
  }

  async function onConfirmPhase() {
    const result = await confirmPhase(displayedPhase);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Fase confirmada. Ya no podras editarla.");
  }

  function renderGroupedMatchRow(match: Match) {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const prediction = state.predictions.find(
      (item) =>
        item.userId === currentUser?.id &&
        item.phase === displayedPhase &&
        item.matchId === match.id,
    );

    return (
      <div className="flex flex-col gap-2">
        <div
          key={match.id}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/95 px-3 py-3 md:px-4"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-base font-bold text-[var(--neutral)] md:text-lg">
              {home.flag} {teamDisplayWithAbv(match.homeTeamId)}{" "}
              <span className="mx-2 text-zinc-500">vs</span> {away.flag}{" "}
              {teamDisplayWithAbv(match.awayTeamId)}
            </div>
            <div className="flex items-center gap-2">
              {prediction ? (
                <Badge className="gap-1 bg-[var(--accent)]/15 text-[var(--accent)]">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                  <span>
                    {prediction.homeGoals}-{prediction.awayGoals}
                  </span>
                </Badge>
              ) : (
                <Badge className="gap-1 bg-zinc-800 text-zinc-300">
                  <Clock3Icon className="h-3.5 w-3.5" />
                  Pendiente
                </Badge>
              )}
              <Button onClick={() => openModal(match)} disabled={!editable}>
                {prediction ? "Actualizar" : "Cargar"}
              </Button>
            </div>
          </div>
        </div>
        <div className="px-1">
          <p className="text-end text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <CalendarClockIcon className="inline h-4 w-4" />{" "}
            {toVenDateTimeLabel(match.kickoffAt)}
          </p>
        </div>
      </div>
    );
  }

  function renderMatchCardStandalone(match: Match) {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const prediction = state.predictions.find(
      (item) =>
        item.userId === currentUser?.id &&
        item.phase === displayedPhase &&
        item.matchId === match.id,
    );

    return (
      <Card
        key={match.id}
        className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/95 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {match.groupName ?? phaseLabel(match.phase)}
          </p>
          <p className="text-sm text-zinc-400">
            {toVenDateTimeLabel(match.kickoffAt)}
          </p>
        </div>
        <div className="text-lg font-black text-[var(--neutral)]">
          {home.flag} {teamDisplayWithAbv(match.homeTeamId)} vs {away.flag}{" "}
          {teamDisplayWithAbv(match.awayTeamId)}
        </div>
        <div className="flex items-center gap-2">
          {prediction ? (
            <Badge className="gap-1 bg-[var(--accent)]/15 text-[var(--accent)]">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              <span>
                {prediction.homeGoals}-{prediction.awayGoals}
              </span>
            </Badge>
          ) : (
            <Badge className="gap-1 bg-zinc-800 text-zinc-300">
              <Clock3Icon className="h-3.5 w-3.5" />
              Pendiente
            </Badge>
          )}

          <Button onClick={() => openModal(match)} disabled={!editable}>
            {prediction ? "Actualizar" : "Cargar"}
          </Button>
        </div>
      </Card>
    );
  }

  function renderKnockoutViewCard(view: QuinielaMatchView) {
    if (view.kind === "real") {
      return renderMatchCardStandalone(view.match);
    }
    if (view.kind === "previewAvailable") {
      return (
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/95 px-3 py-3 md:px-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-base font-bold text-[var(--neutral)] md:text-lg">
                {view.slot.team1Slot}{" "}
                <span className="mx-2 text-zinc-500">vs</span>{" "}
                {view.slot.team2Slot}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="gap-1 bg-[var(--accent)]/15 text-[var(--accent)]">
                  <FlaskConicalIcon className="h-3.5 w-3.5" />
                  Preview
                </Badge>
                <Button disabled>Actualizar</Button>
              </div>
            </div>
          </div>
          <div className="px-1">
            <p className="text-end text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <CalendarClockIcon className="inline h-4 w-4" />{" "}
              {toVenDateTimeLabel(view.slot.kickoffAt)}
            </p>
          </div>
        </div>
      );
    }

    return (
      <Card
        key={`${view.slot.phase}-${view.slot.kickoffAt}-${view.slot.team1Slot}-${view.slot.team2Slot}`}
        className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-600 bg-[var(--surface-1)]/80 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Eliminatoria
          </p>
          <p className="text-sm text-zinc-400">
            {toVenDateTimeLabel(view.slot.kickoffAt)}
          </p>
        </div>
        <div className="text-lg font-black text-zinc-200">
          {view.slot.team1Slot} <span className="mx-2 text-zinc-500">vs</span>{" "}
          {view.slot.team2Slot}
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-zinc-800 text-zinc-300">Por definir</Badge>
          <Button disabled variant="outline">
            No disponible
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <RequireAuth>
      <PageShell
        title="Montar quiniela"
        subtitle="Haz click en cada cruce para cargar goles. Guarda y confirma la fase activa."
      >
        {currentUser.isAdmin ? (
          <QuinielaTestPreviewControls
            phases={KNOCKOUT_PHASES}
            showPreviewControls={showPreviewControls}
            previewByPhase={previewByPhase}
            phaseLabel={phaseLabel}
            onToggleControls={() => setShowPreviewControls((prev) => !prev)}
            onTogglePhase={(phase) =>
              setPreviewByPhase((prev) => ({
                ...prev,
                [phase]: !prev[phase],
              }))
            }
          />
        ) : null}
        <div className="">
          <Card className="mb-4 border-[var(--accent)]/50 bg-[var(--surface-1)] shadow-[0_0_0_1px_rgba(204,255,0,0.16),0_0_26px_rgba(204,255,0,0.14)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-300">
                  Ventana fase {currentUser.isAdmin ? "seleccionada" : "activa"}{" "}
                  <strong>{phaseLabel(displayedPhase)}</strong>:{" "}
                  {toVenDateTimeLabel(phaseWindow.opensAt.toISOString())} -{" "}
                  {toVenDateTimeLabel(phaseWindow.closesAt.toISOString())}
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  Estado:{" "}
                  {isPhaseConfirmed(displayedPhase)
                    ? "confirmada"
                    : isPhaseLockedAtNow(displayedPhase)
                      ? "cerrada"
                      : phaseEditableAtNow
                        ? "abierta"
                        : "pendiente"}
                </p>
              </div>
              <span className="phase-active-badge self-start md:self-auto">
                <span className="phase-active-badge-dot" aria-hidden="true" />
                {currentUser.isAdmin ? "Vista admin" : "Fase activa"}
              </span>
            </div>
          </Card>

          <section className="mb-4 flex flex-wrap gap-2">
            {PHASES.map((phase) => (
              <button
                key={phase.key}
                type="button"
                onClick={() =>
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      phasePreview: currentUser.isAdmin ? phase.key : undefined,
                    }),
                  })
                }
                disabled={!currentUser.isAdmin}
              >
                <Badge
                  className={
                    phase.key === displayedPhase
                      ? "bg-[var(--accent)] text-[#0b1119]"
                      : "bg-zinc-800 text-zinc-300"
                  }
                >
                  {phase.label}
                </Badge>
              </button>
            ))}
          </section>

          {displayedPhase === "groups" ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Filtrar por jornada
              </h3>
              <section className="mb-4 flex flex-wrap gap-2">
                <Button
                  variant={roundFilter === "all" ? "default" : "outline"}
                  onClick={() => setRoundFilter("all")}
                >
                  Todas
                </Button>
                {GROUP_ROUNDS.map((round) => (
                  <Button
                    key={round}
                    variant={roundFilter === round ? "default" : "outline"}
                    onClick={() => setRoundFilter(round)}
                  >
                    Jornada {round}
                  </Button>
                ))}
              </section>

              <section className="grid gap-4">
                {visibleRounds.map((round) => {
                  const roundMatches = matches.filter(
                    (match) => groupRoundMap.get(match.id) === round,
                  );
                  if (roundMatches.length === 0) {
                    return null;
                  }

                  const groupedMatches = groupMatchesByGroupName(roundMatches);

                  return (
                    <div
                      key={round}
                      className="border-t border-[var(--line)] pt-6 first:border-t-0 first:pt-0"
                    >
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-zinc-300">
                        Jornada {round}
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {groupedMatches.map((group) => {
                          const accent = groupAccentClass(group.groupName);
                          return (
                            <Card
                              key={`${round}-${group.groupName}`}
                              className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-0"
                            >
                              <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
                                <Badge className={accent.badgeClassName}>
                                  {group.groupName}
                                </Badge>
                              </div>
                              <div className="grid gap-2 p-3">
                                {group.matches.map((match) =>
                                  renderGroupedMatchRow(match),
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          ) : (
            <section className="grid gap-3">
              {knockoutViews.views.map((view) => renderKnockoutViewCard(view))}
            </section>
          )}

          {displayedPhase !== "groups" ? (
            <div className="mt-6 mb-28 flex items-center justify-end gap-2">
              <Button
                onClick={() => void onConfirmPhase()}
                disabled={!canConfirmPhase}
              >
                Confirmar {phaseLabel(displayedPhase)}
              </Button>
            </div>
          ) : (
            <div className="mb-28" />
          )}

          {selectedMatch ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="w-full max-w-md p-6">
                <h2 className="text-xl font-black text-[--primary]">
                  Cargar cruce
                </h2>

                <form className="mt-4 space-y-3" onSubmit={onSaveMatch}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="homeGoals"
                        className="mb-2 block max-w-full truncate text-center text-2xl font-extrabold leading-tight md:text-3xl"
                        title={getTeam(selectedMatch.homeTeamId).name}
                      >
                        {getTeam(selectedMatch.homeTeamId).flag}{" "}
                        {teamCode(selectedMatch.homeTeamId)}
                      </Label>
                      <Input
                        id="homeGoals"
                        type="number"
                        min={0}
                        value={homeGoals}
                        onChange={(event) => setHomeGoals(event.target.value)}
                        className="h-16 text-center text-4xl font-black tabular-nums tracking-tight"
                        disabled={isSavingMatch}
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="awayGoals"
                        className="mb-2 block max-w-full truncate text-center text-2xl font-extrabold leading-tight md:text-3xl"
                        title={getTeam(selectedMatch.awayTeamId).name}
                      >
                        {getTeam(selectedMatch.awayTeamId).flag}{" "}
                        {teamCode(selectedMatch.awayTeamId)}
                      </Label>
                      <Input
                        id="awayGoals"
                        type="number"
                        min={0}
                        value={awayGoals}
                        onChange={(event) => setAwayGoals(event.target.value)}
                        className="h-16 text-center text-4xl font-black tabular-nums tracking-tight"
                        disabled={isSavingMatch}
                        required
                      />
                    </div>
                  </div>

                  {isKnockout(selectedMatch.phase) ? (
                    <div>
                      <Label htmlFor="qualified">Clasificado final</Label>
                      <select
                        id="qualified"
                        value={qualifiedTeamId}
                        onChange={(event) =>
                          setQualifiedTeamId(event.target.value)
                        }
                        className="h-10 w-full rounded-md border border-[--line] bg-[var(--secondary)] px-3 text-sm"
                        disabled={isSavingMatch}
                        required
                      >
                        <option value="">Selecciona clasificado</option>
                        <option value={selectedMatch.homeTeamId}>
                          {getTeam(selectedMatch.homeTeamId).flag}{" "}
                          {getTeam(selectedMatch.homeTeamId).name}
                        </option>
                        <option value={selectedMatch.awayTeamId}>
                          {getTeam(selectedMatch.awayTeamId).flag}{" "}
                          {getTeam(selectedMatch.awayTeamId).name}
                        </option>
                      </select>
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedMatch(null)}
                      disabled={isSavingMatch}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSavingMatch}>
                      {isSavingMatch ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface-0)]/95 px-4 py-3 backdrop-blur mb-16 md:mb-0">
            <QuinielaProgress
              savedMatchesCount={savedMatchesCount}
              totalMatchesCount={totalMatchesCount}
              missingCount={knockoutViews.missingCount}
              savedProgress={savedProgress}
              editable={editable}
              canConfirmPhase={canConfirmPhase}
              onConfirmPhase={() => void onConfirmPhase()}
            />
          </div>

          {currentUser.isAdmin ? (
            <QuinielaTestPreviewControls
              className="hidden md:fixed"
              phases={KNOCKOUT_PHASES}
              showPreviewControls={showPreviewControls}
              previewByPhase={previewByPhase}
              phaseLabel={phaseLabel}
              onToggleControls={() => setShowPreviewControls((prev) => !prev)}
              onTogglePhase={(phase) =>
                setPreviewByPhase((prev) => ({
                  ...prev,
                  [phase]: !prev[phase],
                }))
              }
            />
          ) : null}
        </div>
      </PageShell>
    </RequireAuth>
  );
}
