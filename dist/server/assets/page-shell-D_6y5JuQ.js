import { r as useApp } from "./cn-qhQ23CiK.js";
import { Navigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/layout/require-auth.tsx
function RequireAuth({ children }) {
	const { ready, currentUser } = useApp();
	if (!ready) return /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-600",
		children: "Cargando..."
	});
	if (!currentUser) return /* @__PURE__ */ jsx(Navigate, { to: "/ingreso" });
	return /* @__PURE__ */ jsx(Fragment, { children });
}
function RequireAdmin({ children }) {
	const { ready, currentUser } = useApp();
	if (!ready) return /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-600",
		children: "Cargando..."
	});
	if (!currentUser) return /* @__PURE__ */ jsx(Navigate, { to: "/ingreso" });
	if (!currentUser.isAdmin) return /* @__PURE__ */ jsx(Navigate, { to: "/" });
	return /* @__PURE__ */ jsx(Fragment, { children });
}
//#endregion
//#region src/components/layout/page-shell.tsx
function PageShell({ title, subtitle, children }) {
	return /* @__PURE__ */ jsxs("main", {
		className: "mx-auto w-full max-w-6xl px-4 py-8",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-6",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "text-3xl font-black tracking-tight text-[var(--primary)]",
				children: title
			}), subtitle ? /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-sm text-zinc-600",
				children: subtitle
			}) : null]
		}), children]
	});
}
//#endregion
export { RequireAdmin as n, RequireAuth as r, PageShell as t };
