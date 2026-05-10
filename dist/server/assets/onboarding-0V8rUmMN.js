import { r as useApp } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { r as RequireAuth, t as PageShell } from "./page-shell-D_6y5JuQ.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/onboarding.tsx?tsr-split=component
var slides = [
	{
		title: "Reglas por fases",
		text: "Solo puedes editar la fase activa. Cada fase se abre segun calendario y se bloquea al iniciar el primer partido."
	},
	{
		title: "Puntaje",
		text: "Acierto de ganador/empate: +1. Marcador exacto: +3 en total. En eliminatorias, el +1 de ganador se decide por clasificado final."
	},
	{
		title: "Confirmacion",
		text: "Guarda tus cruces y luego confirma la fase. Si no confirmas y la fase cierra, se auto-confirma lo guardado y no podras editarlo."
	}
];
function OnboardingPage() {
	const { currentUser, completeOnboarding } = useApp();
	const navigate = useNavigate();
	const [index, setIndex] = useState(0);
	if (!currentUser) return /* @__PURE__ */ jsx(Navigate, { to: "/ingreso" });
	if (currentUser.onboardingCompleted) return /* @__PURE__ */ jsx(Navigate, { to: "/" });
	const slide = slides[index];
	return /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(PageShell, {
		title: "Bienvenido",
		subtitle: "Onboarding inicial",
		children: /* @__PURE__ */ jsxs(Card, {
			className: "mx-auto max-w-2xl p-8",
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]",
					children: [
						"Paso ",
						index + 1,
						" de ",
						slides.length
					]
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-2 text-2xl font-black text-[var(--primary)]",
					children: slide.title
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-4 text-sm leading-6 text-zinc-600",
					children: slide.text
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-8 flex items-center justify-between",
					children: [/* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						onClick: () => setIndex((current) => Math.max(current - 1, 0)),
						disabled: index === 0,
						children: "Anterior"
					}), index < slides.length - 1 ? /* @__PURE__ */ jsx(Button, {
						type: "button",
						onClick: () => setIndex((current) => Math.min(current + 1, slides.length - 1)),
						children: "Siguiente"
					}) : /* @__PURE__ */ jsx(Button, {
						type: "button",
						onClick: () => {
							completeOnboarding();
							navigate({ to: "/" });
						},
						children: "Entendido"
					})]
				})
			]
		})
	}) });
}
//#endregion
export { OnboardingPage as component };
