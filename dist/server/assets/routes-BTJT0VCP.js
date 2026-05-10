import { r as useApp } from "./cn-qhQ23CiK.js";
import { r as RequireAuth, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { Link, Navigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/index.tsx?tsr-split=component
function HomePage() {
	const { currentUser } = useApp();
	if (!currentUser) return /* @__PURE__ */ jsx(Navigate, { to: "/ingreso" });
	if (!currentUser.onboardingCompleted) return /* @__PURE__ */ jsx(Navigate, { to: "/onboarding" });
	return /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(PageShell, {
		title: "Panel principal",
		subtitle: "Sigue resultados del dia, revisa posiciones y monta tu quiniela por fases",
		children: /* @__PURE__ */ jsxs("section", {
			className: "grid gap-4 md:grid-cols-3",
			children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/resultados",
					className: "no-underline",
					children: /* @__PURE__ */ jsxs(Card, {
						className: "h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-bold text-[var(--primary)]",
							children: "Resultados del dia"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-zinc-600",
							children: "Partidos en vivo, finalizados y horario en Venezuela."
						})]
					})
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/posiciones",
					className: "no-underline",
					children: /* @__PURE__ */ jsxs(Card, {
						className: "h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-bold text-[var(--primary)]",
							children: "Posiciones"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-zinc-600",
							children: "Ranking por puntos, exactos y desempates."
						})]
					})
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/quiniela",
					className: "no-underline",
					children: /* @__PURE__ */ jsxs(Card, {
						className: "h-full border-l-4 border-l-[var(--accent)] hover:bg-zinc-50",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-bold text-[var(--primary)]",
							children: "Montar quiniela"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-zinc-600",
							children: "Completa y confirma solo la fase habilitada."
						})]
					})
				})
			]
		})
	}) });
}
//#endregion
export { HomePage as component };
