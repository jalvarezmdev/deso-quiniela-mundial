import { l as toVenDateTimeLabel, o as getTeam, r as useApp } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { r as RequireAuth, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Badge } from "./badge-BGZGzS_P.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { useEffect } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/resultados.tsx?tsr-split=component
function ResultadosPage() {
	const { state, refreshLive } = useApp();
	useEffect(() => {
		refreshLive();
		const timer = window.setInterval(() => {
			refreshLive();
		}, 6e4);
		return () => window.clearInterval(timer);
	}, [refreshLive]);
	const sortedMatches = [...state.matches].sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
	return /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsxs(PageShell, {
		title: "Resultados del dia",
		subtitle: "Fuente LIVE: scraping SofaScore (fallback manual admin). Horario oficial America/Caracas.",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-4 flex items-center justify-between",
			children: [/* @__PURE__ */ jsxs("p", {
				className: "text-xs text-zinc-500",
				children: [
					"Ultima sincronizacion:",
					" ",
					state.lastLiveSyncAt ? toVenDateTimeLabel(state.lastLiveSyncAt) : "sin sincronizar"
				]
			}), /* @__PURE__ */ jsx(Button, {
				variant: "outline",
				onClick: refreshLive,
				children: "Refrescar"
			})]
		}), /* @__PURE__ */ jsx("section", {
			className: "grid gap-3",
			children: sortedMatches.map((match) => {
				const home = getTeam(match.homeTeamId);
				const away = getTeam(match.awayTeamId);
				return /* @__PURE__ */ jsxs(Card, {
					className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "text-xs font-semibold uppercase tracking-wide text-zinc-500",
							children: match.groupName ?? "Eliminatoria"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-zinc-600",
							children: toVenDateTimeLabel(match.kickoffAt)
						})] }),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3 text-lg font-black text-[var(--primary)]",
							children: [
								/* @__PURE__ */ jsxs("span", { children: [
									home.flag,
									" ",
									home.name
								] }),
								/* @__PURE__ */ jsxs("span", {
									className: "rounded-md bg-zinc-100 px-3 py-1 text-base",
									children: [
										match.homeGoals ?? "-",
										" : ",
										match.awayGoals ?? "-"
									]
								}),
								/* @__PURE__ */ jsxs("span", { children: [
									away.flag,
									" ",
									away.name
								] })
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Badge, {
								className: match.status === "live" ? "bg-red-100 text-red-700" : match.status === "final" ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-700",
								children: match.status === "live" ? "LIVE" : match.status === "final" ? "FINAL" : "PROGRAMADO"
							}), match.manualOverride ? /* @__PURE__ */ jsx(Badge, {
								className: "bg-amber-100 text-amber-700",
								children: "Manual"
							}) : null]
						})
					]
				}, match.id);
			})
		})]
	}) });
}
//#endregion
export { ResultadosPage as component };
