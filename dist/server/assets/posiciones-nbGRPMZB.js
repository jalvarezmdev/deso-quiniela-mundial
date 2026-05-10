import { o as getTeam, r as useApp } from "./cn-qhQ23CiK.js";
import { r as RequireAuth, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/posiciones.tsx?tsr-split=component
function PosicionesPage() {
	const { leaderboard } = useApp();
	return /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(PageShell, {
		title: "Posiciones de la quiniela",
		subtitle: "Desempate: exactos, luego quien confirmo antes.",
		children: /* @__PURE__ */ jsx(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ jsxs("table", {
				className: "w-full border-collapse text-sm",
				children: [/* @__PURE__ */ jsx("thead", {
					className: "bg-zinc-100 text-left text-zinc-600",
					children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", {
							className: "px-4 py-3",
							children: "#"
						}),
						/* @__PURE__ */ jsx("th", {
							className: "px-4 py-3",
							children: "Jugador"
						}),
						/* @__PURE__ */ jsx("th", {
							className: "px-4 py-3",
							children: "Puntos"
						}),
						/* @__PURE__ */ jsx("th", {
							className: "px-4 py-3",
							children: "Exactos"
						})
					] })
				}), /* @__PURE__ */ jsxs("tbody", { children: [leaderboard.map((row, index) => {
					const team = getTeam(row.teamId);
					const isLast = index === leaderboard.length - 1 && leaderboard.length > 1;
					return /* @__PURE__ */ jsxs("tr", {
						className: "border-t border-zinc-200",
						children: [
							/* @__PURE__ */ jsx("td", {
								className: "px-4 py-3 font-semibold",
								children: index + 1
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "px-4 py-3",
								children: [
									/* @__PURE__ */ jsxs("span", {
										className: "font-semibold text-[var(--primary)]",
										children: [
											team.flag,
											" ",
											row.nickname
										]
									}),
									" ",
									isLast ? /* @__PURE__ */ jsx("span", {
										title: "Ultimo lugar",
										children: "💩"
									}) : null
								]
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-4 py-3 font-black text-[var(--primary)]",
								children: row.points
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-4 py-3",
								children: row.exactHits
							})
						]
					}, row.userId);
				}), leaderboard.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
					colSpan: 4,
					className: "px-4 py-8 text-center text-zinc-500",
					children: "Aun no hay usuarios registrados."
				}) }) : null] })]
			})
		})
	}) });
}
//#endregion
export { PosicionesPage as component };
