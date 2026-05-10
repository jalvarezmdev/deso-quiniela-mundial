import { i as PHASES, l as toVenDateTimeLabel, o as getTeam, r as useApp } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { r as RequireAuth, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Badge } from "./badge-BGZGzS_P.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { n as Input, t as Label } from "./label-DgQf3s90.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/quiniela.tsx?tsr-split=component
function phaseLabel(phase) {
	return PHASES.find((item) => item.key === phase)?.label ?? phase;
}
function isKnockout(phase) {
	return phase !== "groups";
}
function QuinielaPage() {
	const { state, currentUser, activePhase, savePrediction, confirmPhase, canEditPhase, isPhaseConfirmed, isPhaseLockedAtNow, getPhaseWindowAtNow } = useApp();
	const [selectedMatch, setSelectedMatch] = useState(null);
	const [homeGoals, setHomeGoals] = useState("0");
	const [awayGoals, setAwayGoals] = useState("0");
	const [qualifiedTeamId, setQualifiedTeamId] = useState("");
	const [notice, setNotice] = useState(null);
	const matches = useMemo(() => state.matches.filter((match) => match.phase === activePhase).sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()), [activePhase, state.matches]);
	if (!currentUser) return null;
	function openModal(match) {
		const existing = state.predictions.find((prediction) => prediction.userId === currentUser.id && prediction.phase === activePhase && prediction.matchId === match.id);
		setSelectedMatch(match);
		setHomeGoals(String(existing?.homeGoals ?? 0));
		setAwayGoals(String(existing?.awayGoals ?? 0));
		setQualifiedTeamId(existing?.predictedQualifiedTeamId ?? "");
		setNotice(null);
	}
	function onSaveMatch(event) {
		event.preventDefault();
		if (!selectedMatch) return;
		const result = savePrediction({
			phase: selectedMatch.phase,
			matchId: selectedMatch.id,
			homeGoals: Number(homeGoals),
			awayGoals: Number(awayGoals),
			predictedQualifiedTeamId: isKnockout(selectedMatch.phase) ? qualifiedTeamId || null : null
		});
		if (!result.ok) {
			setNotice(result.message);
			return;
		}
		setNotice("Pronostico guardado.");
		setTimeout(() => setSelectedMatch(null), 400);
	}
	function onConfirmPhase() {
		const result = confirmPhase(activePhase);
		if (!result.ok) {
			setNotice(result.message);
			return;
		}
		setNotice("Fase confirmada. Ya no podras editarla.");
	}
	const editable = canEditPhase(activePhase);
	const phaseWindow = getPhaseWindowAtNow(activePhase);
	return /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsxs(PageShell, {
		title: "Montar quiniela",
		subtitle: "Haz click en cada cruce para cargar goles. Guarda y confirma la fase activa.",
		children: [
			/* @__PURE__ */ jsxs(Card, {
				className: "mb-4",
				children: [/* @__PURE__ */ jsxs("p", {
					className: "text-sm text-zinc-600",
					children: [
						"Ventana fase activa ",
						/* @__PURE__ */ jsx("strong", { children: phaseLabel(activePhase) }),
						":",
						" ",
						toVenDateTimeLabel(phaseWindow.opensAt.toISOString()),
						" -",
						" ",
						toVenDateTimeLabel(phaseWindow.closesAt.toISOString())
					]
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-1 text-sm text-zinc-600",
					children: [
						"Estado:",
						" ",
						isPhaseConfirmed(activePhase) ? "confirmada" : isPhaseLockedAtNow(activePhase) ? "cerrada" : "abierta"
					]
				})]
			}),
			/* @__PURE__ */ jsx("section", {
				className: "mb-4 flex flex-wrap gap-2",
				children: PHASES.map((phase) => /* @__PURE__ */ jsx(Badge, {
					className: phase.key === activePhase ? "bg-[var(--accent)] text-white" : "bg-zinc-200 text-zinc-700",
					children: phase.label
				}, phase.key))
			}),
			/* @__PURE__ */ jsx("section", {
				className: "grid gap-3",
				children: matches.map((match) => {
					const home = getTeam(match.homeTeamId);
					const away = getTeam(match.awayTeamId);
					const prediction = state.predictions.find((item) => item.userId === currentUser.id && item.phase === activePhase && item.matchId === match.id);
					return /* @__PURE__ */ jsxs(Card, {
						className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
								className: "text-xs font-semibold uppercase tracking-wide text-zinc-500",
								children: match.groupName ?? phaseLabel(match.phase)
							}), /* @__PURE__ */ jsx("p", {
								className: "text-sm text-zinc-600",
								children: toVenDateTimeLabel(match.kickoffAt)
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "text-lg font-black text-[var(--primary)]",
								children: [
									home.flag,
									" ",
									home.name,
									" vs ",
									away.flag,
									" ",
									away.name
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [prediction ? /* @__PURE__ */ jsxs(Badge, {
									className: "bg-emerald-100 text-emerald-700",
									children: [
										"Guardado: ",
										prediction.homeGoals,
										"-",
										prediction.awayGoals
									]
								}) : /* @__PURE__ */ jsx(Badge, { children: "Sin guardar" }), /* @__PURE__ */ jsx(Button, {
									onClick: () => openModal(match),
									disabled: !editable,
									children: "Cargar"
								})]
							})
						]
					}, match.id);
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-6 flex items-center justify-end gap-2",
				children: [notice ? /* @__PURE__ */ jsx("p", {
					className: "mr-auto text-sm text-zinc-700",
					children: notice
				}) : null, /* @__PURE__ */ jsxs(Button, {
					onClick: onConfirmPhase,
					disabled: !editable,
					children: ["Confirmar ", phaseLabel(activePhase)]
				})]
			}),
			selectedMatch ? /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
				children: /* @__PURE__ */ jsxs(Card, {
					className: "w-full max-w-md p-6",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "text-xl font-black text-[var(--primary)]",
							children: "Cargar cruce"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-1 text-sm text-zinc-600",
							children: [
								getTeam(selectedMatch.homeTeamId).name,
								" vs ",
								getTeam(selectedMatch.awayTeamId).name
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							className: "mt-4 space-y-3",
							onSubmit: onSaveMatch,
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "homeGoals",
										children: "Goles local"
									}), /* @__PURE__ */ jsx(Input, {
										id: "homeGoals",
										type: "number",
										min: 0,
										value: homeGoals,
										onChange: (event) => setHomeGoals(event.target.value),
										required: true
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "awayGoals",
										children: "Goles visitante"
									}), /* @__PURE__ */ jsx(Input, {
										id: "awayGoals",
										type: "number",
										min: 0,
										value: awayGoals,
										onChange: (event) => setAwayGoals(event.target.value),
										required: true
									})] })]
								}),
								isKnockout(selectedMatch.phase) ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "qualified",
									children: "Clasificado final"
								}), /* @__PURE__ */ jsxs("select", {
									id: "qualified",
									value: qualifiedTeamId,
									onChange: (event) => setQualifiedTeamId(event.target.value),
									className: "h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm",
									required: true,
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "",
											children: "Selecciona clasificado"
										}),
										/* @__PURE__ */ jsxs("option", {
											value: selectedMatch.homeTeamId,
											children: [
												getTeam(selectedMatch.homeTeamId).flag,
												" ",
												getTeam(selectedMatch.homeTeamId).name
											]
										}),
										/* @__PURE__ */ jsxs("option", {
											value: selectedMatch.awayTeamId,
											children: [
												getTeam(selectedMatch.awayTeamId).flag,
												" ",
												getTeam(selectedMatch.awayTeamId).name
											]
										})
									]
								})] }) : null,
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-end gap-2",
									children: [/* @__PURE__ */ jsx(Button, {
										type: "button",
										variant: "outline",
										onClick: () => setSelectedMatch(null),
										children: "Cancelar"
									}), /* @__PURE__ */ jsx(Button, {
										type: "submit",
										children: "Guardar"
									})]
								})
							]
						})
					]
				})
			}) : null
		]
	}) });
}
//#endregion
export { QuinielaPage as component };
