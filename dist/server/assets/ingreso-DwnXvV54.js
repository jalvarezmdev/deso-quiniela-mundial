import { a as TEAMS, r as useApp } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { t as Card } from "./card-Cu3IK6Mb.js";
import { n as Input, t as Label } from "./label-DgQf3s90.js";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/ingreso.tsx?tsr-split=component
function IngresoPage() {
	const { currentUser, register, login } = useApp();
	const navigate = useNavigate();
	const [mode, setMode] = useState("login");
	const [error, setError] = useState(null);
	const [loginEmail, setLoginEmail] = useState("");
	const [loginPin, setLoginPin] = useState("");
	const [email, setEmail] = useState("");
	const [nickname, setNickname] = useState("");
	const [teamId, setTeamId] = useState(TEAMS[0]?.id ?? "arg");
	const [secretPhrase, setSecretPhrase] = useState("");
	const [pin, setPin] = useState("");
	const teams = useMemo(() => TEAMS, []);
	if (currentUser) return /* @__PURE__ */ jsx(Navigate, { to: currentUser.onboardingCompleted ? "/" : "/onboarding" });
	function onRegisterSubmit(event) {
		event.preventDefault();
		setError(null);
		const result = register({
			email,
			nickname,
			teamId,
			pin,
			secretPhrase
		});
		if (!result.ok) {
			setError(result.message);
			return;
		}
		navigate({ to: "/onboarding" });
	}
	function onLoginSubmit(event) {
		event.preventDefault();
		setError(null);
		const result = login({
			email: loginEmail,
			pin: loginPin
		});
		if (!result.ok) {
			setError(result.message);
			return;
		}
		navigate({ to: "/" });
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "mx-auto grid min-h-[calc(100vh-136px)] w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-2",
		children: [/* @__PURE__ */ jsxs("section", { children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]",
				children: "Quiniela Mundial 2026"
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "mt-2 text-4xl font-black tracking-tight text-[var(--primary)]",
				children: "Organiza tus rondas, confirma tu quiniela y compite por puntos."
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 text-sm text-zinc-600",
				children: "Flujo cerrado por fases: grupos, 16vos, 8vos, 4tos, semis y final. Cada fase se bloquea al iniciar su primer partido."
			})
		] }), /* @__PURE__ */ jsxs(Card, {
			className: "p-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setMode("login"),
						className: `rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-[var(--primary)] shadow-sm" : "text-zinc-600"}`,
						children: "Ingresar"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setMode("register"),
						className: `rounded-md px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-[var(--primary)] shadow-sm" : "text-zinc-600"}`,
						children: "Registrarse"
					})]
				}),
				error ? /* @__PURE__ */ jsx("p", {
					className: "mb-3 rounded-md bg-red-100 p-2 text-sm text-red-700",
					children: error
				}) : null,
				mode === "login" ? /* @__PURE__ */ jsxs("form", {
					className: "space-y-3",
					onSubmit: onLoginSubmit,
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "loginEmail",
							children: "Correo"
						}), /* @__PURE__ */ jsx(Input, {
							id: "loginEmail",
							type: "email",
							value: loginEmail,
							onChange: (event) => setLoginEmail(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "loginPin",
							children: "PIN numerico (6 digitos)"
						}), /* @__PURE__ */ jsx(Input, {
							id: "loginPin",
							type: "password",
							inputMode: "numeric",
							pattern: "[0-9]{6}",
							value: loginPin,
							onChange: (event) => setLoginPin(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							className: "w-full",
							children: "Ingresar"
						})
					]
				}) : /* @__PURE__ */ jsxs("form", {
					className: "space-y-3",
					onSubmit: onRegisterSubmit,
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "registerEmail",
							children: "Correo"
						}), /* @__PURE__ */ jsx(Input, {
							id: "registerEmail",
							type: "email",
							value: email,
							onChange: (event) => setEmail(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "registerNickname",
							children: "Nombre o apodo"
						}), /* @__PURE__ */ jsx(Input, {
							id: "registerNickname",
							value: nickname,
							onChange: (event) => setNickname(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "registerTeam",
							children: "Avatar de seleccion"
						}), /* @__PURE__ */ jsx("select", {
							id: "registerTeam",
							value: teamId,
							onChange: (event) => setTeamId(event.target.value),
							className: "h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm",
							children: teams.map((team) => /* @__PURE__ */ jsxs("option", {
								value: team.id,
								children: [
									team.flag,
									" ",
									team.name
								]
							}, team.id))
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "registerSecret",
							children: "Palabra secreta"
						}), /* @__PURE__ */ jsx(Input, {
							id: "registerSecret",
							value: secretPhrase,
							onChange: (event) => setSecretPhrase(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "registerPin",
							children: "Contrasena numerica (6 digitos)"
						}), /* @__PURE__ */ jsx(Input, {
							id: "registerPin",
							type: "password",
							inputMode: "numeric",
							pattern: "[0-9]{6}",
							value: pin,
							onChange: (event) => setPin(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							className: "w-full",
							children: "Crear cuenta"
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { IngresoPage as component };
