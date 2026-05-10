import { c as toVenDateTimeInputValue, i as PHASES, l as toVenDateTimeLabel, o as getTeam, r as useApp, s as fromVenDateTimeInput } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { n as RequireAdmin, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Badge } from "./badge-BGZGzS_P.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { n as Input, t as Label } from "./label-DgQf3s90.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/admin.tsx?tsr-split=component
function isKnockout(phase) {
	return phase !== "groups";
}
function AdminPage() {
	const { state, setMatchResult, setPhaseOverride, getPhaseWindowAtNow, resetUserPin } = useApp();
	const [notice, setNotice] = useState(null);
	const knockoutMatches = useMemo(() => state.matches.filter((match) => isKnockout(match.phase)), [state.matches]);
	function onSaveResult(event, matchId) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const homeGoals = Number(form.get("homeGoals"));
		const awayGoals = Number(form.get("awayGoals"));
		const qualifiedTeamId = String(form.get("qualifiedTeamId") ?? "");
		const status = String(form.get("status") ?? "final");
		const response = setMatchResult({
			matchId,
			homeGoals,
			awayGoals,
			qualifiedTeamId: qualifiedTeamId || null,
			status
		});
		if (!response.ok) {
			setNotice(response.message);
			return;
		}
		setNotice("Resultado actualizado por admin.");
	}
	function onSaveWindow(event, phase) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const opensAt = String(form.get("opensAt") ?? "");
		const closesAt = String(form.get("closesAt") ?? "");
		if (!opensAt || !closesAt) {
			setNotice("Debes completar apertura y cierre.");
			return;
		}
		setPhaseOverride(phase, fromVenDateTimeInput(opensAt), fromVenDateTimeInput(closesAt));
		setNotice("Ventana de fase actualizada.");
	}
	function onResetPin(event, userId) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const response = resetUserPin(userId, String(form.get("newPin") ?? ""));
		if (!response.ok) {
			setNotice(response.message);
			return;
		}
		setNotice("PIN reseteado correctamente.");
		event.currentTarget.reset();
	}
	return /* @__PURE__ */ jsx(RequireAdmin, { children: /* @__PURE__ */ jsxs(PageShell, {
		title: "Panel de administrador",
		subtitle: "Gestion de cruces directos, resultados, ventanas y soporte de PIN.",
		children: [notice ? /* @__PURE__ */ jsx("p", {
			className: "mb-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700",
			children: notice
		}) : null, /* @__PURE__ */ jsxs("section", {
			className: "grid gap-4",
			children: [
				/* @__PURE__ */ jsxs(Card, { children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-lg font-black text-[var(--primary)]",
						children: "Cruces directos y resultados"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm text-zinc-600",
						children: "Edicion manual con prioridad sobre scraping."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-4 grid gap-4",
						children: knockoutMatches.map((match) => {
							const home = getTeam(match.homeTeamId);
							const away = getTeam(match.awayTeamId);
							return /* @__PURE__ */ jsxs("form", {
								onSubmit: (event) => onSaveResult(event, match.id),
								className: "rounded-lg border border-zinc-200 p-4",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "mb-2 flex items-center justify-between",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "font-semibold text-[var(--primary)]",
											children: [
												home.flag,
												" ",
												home.name,
												" vs ",
												away.flag,
												" ",
												away.name
											]
										}), /* @__PURE__ */ jsx(Badge, { children: toVenDateTimeLabel(match.kickoffAt) })]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid gap-3 md:grid-cols-4",
										children: [
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Goles local" }), /* @__PURE__ */ jsx(Input, {
												name: "homeGoals",
												type: "number",
												defaultValue: String(match.homeGoals ?? 0),
												min: 0,
												required: true
											})] }),
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Goles visita" }), /* @__PURE__ */ jsx(Input, {
												name: "awayGoals",
												type: "number",
												defaultValue: String(match.awayGoals ?? 0),
												min: 0,
												required: true
											})] }),
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Clasificado" }), /* @__PURE__ */ jsxs("select", {
												name: "qualifiedTeamId",
												defaultValue: match.qualifiedTeamId ?? "",
												className: "h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm",
												required: true,
												children: [/* @__PURE__ */ jsxs("option", {
													value: home.id,
													children: [
														home.flag,
														" ",
														home.name
													]
												}), /* @__PURE__ */ jsxs("option", {
													value: away.id,
													children: [
														away.flag,
														" ",
														away.name
													]
												})]
											})] }),
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Estatus" }), /* @__PURE__ */ jsxs("select", {
												name: "status",
												defaultValue: match.status === "live" ? "live" : "final",
												className: "h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm",
												children: [/* @__PURE__ */ jsx("option", {
													value: "live",
													children: "LIVE"
												}), /* @__PURE__ */ jsx("option", {
													value: "final",
													children: "FINAL"
												})]
											})] })
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "mt-3 flex justify-end",
										children: /* @__PURE__ */ jsx(Button, {
											type: "submit",
											children: "Guardar resultado"
										})
									})
								]
							}, match.id);
						})
					})
				] }),
				/* @__PURE__ */ jsxs(Card, { children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-lg font-black text-[var(--primary)]",
						children: "Ventanas de habilitacion por fase"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm text-zinc-600",
						children: "Override manual sobre reglas automaticas de apertura/cierre."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-4 grid gap-4",
						children: PHASES.map((phase) => {
							const currentWindow = getPhaseWindowAtNow(phase.key);
							return /* @__PURE__ */ jsxs("form", {
								onSubmit: (event) => onSaveWindow(event, phase.key),
								className: "rounded-lg border border-zinc-200 p-4",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "font-semibold text-[var(--primary)]",
										children: phase.label
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "mt-3 grid gap-3 md:grid-cols-2",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Apertura (VE)" }), /* @__PURE__ */ jsx(Input, {
											name: "opensAt",
											type: "datetime-local",
											defaultValue: toVenDateTimeInputValue(currentWindow.opensAt.toISOString()),
											required: true
										})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Cierre (VE)" }), /* @__PURE__ */ jsx(Input, {
											name: "closesAt",
											type: "datetime-local",
											defaultValue: toVenDateTimeInputValue(currentWindow.closesAt.toISOString()),
											required: true
										})] })]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "mt-3 flex justify-end",
										children: /* @__PURE__ */ jsx(Button, {
											type: "submit",
											variant: "outline",
											children: "Guardar ventana"
										})
									})
								]
							}, phase.key);
						})
					})
				] }),
				/* @__PURE__ */ jsxs(Card, { children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-lg font-black text-[var(--primary)]",
						children: "Recuperacion de PIN"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm text-zinc-600",
						children: "Reset manual por admin, PIN de 6 digitos."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-4 grid gap-3",
						children: state.users.map((user) => /* @__PURE__ */ jsxs("form", {
							onSubmit: (event) => onResetPin(event, user.id),
							className: "flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "min-w-48 flex-1",
									children: [/* @__PURE__ */ jsx("p", {
										className: "text-sm font-semibold text-[var(--primary)]",
										children: user.nickname
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-zinc-500",
										children: user.email
									})]
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Nuevo PIN" }), /* @__PURE__ */ jsx(Input, {
									name: "newPin",
									inputMode: "numeric",
									pattern: "[0-9]{6}",
									maxLength: 6,
									required: true
								})] }),
								/* @__PURE__ */ jsx(Button, {
									type: "submit",
									variant: "outline",
									children: "Resetear"
								})
							]
						}, user.id))
					})
				] })
			]
		})]
	}) });
}
//#endregion
export { AdminPage as component };
