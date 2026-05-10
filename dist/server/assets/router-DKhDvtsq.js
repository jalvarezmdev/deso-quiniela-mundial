import { i as PHASES, n as AppProvider, r as useApp } from "./cn-qhQ23CiK.js";
import { t as Button } from "./button-0c2yCaWi.js";
import { HeadContent, Link, Scripts, createFileRoute, createRootRoute, createRouter, lazyRouteComponent, useLocation, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/layout/footer.tsx
function Footer() {
	return /* @__PURE__ */ jsx("footer", {
		className: "border-t border-[var(--line)] bg-[var(--secondary)]",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-600",
			children: [/* @__PURE__ */ jsx("span", { children: "Quiniela Mundial 2026" }), /* @__PURE__ */ jsx("span", { children: "Zona horaria oficial: America/Caracas" })]
		})
	});
}
//#endregion
//#region src/components/layout/header.tsx
function Header() {
	const { currentUser, logout, activePhase } = useApp();
	const location = useLocation();
	const navigate = useNavigate();
	const phaseLabel = PHASES.find((phase) => phase.key === activePhase)?.label ?? activePhase;
	return /* @__PURE__ */ jsx("header", {
		className: "sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--secondary)]/95 backdrop-blur",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3",
			children: [/* @__PURE__ */ jsx(Link, {
				to: "/",
				className: "text-base font-black tracking-tight text-[var(--primary)] no-underline",
				children: "Quiniela 2026"
			}), currentUser ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("nav", {
				className: "ml-4 hidden items-center gap-2 md:flex",
				children: [[
					["/", "Inicio"],
					["/resultados", "Resultados"],
					["/posiciones", "Posiciones"],
					["/quiniela", "Montar quiniela"]
				].map(([href, label]) => /* @__PURE__ */ jsx(Link, {
					to: href,
					className: `rounded-md px-3 py-2 text-sm font-medium no-underline transition ${location.pathname === href ? "bg-[var(--accent)] text-white" : "text-[var(--primary)] hover:bg-zinc-100"}`,
					children: label
				}, href)), currentUser.isAdmin ? /* @__PURE__ */ jsx(Link, {
					to: "/admin",
					className: `rounded-md px-3 py-2 text-sm font-medium no-underline transition ${location.pathname === "/admin" ? "bg-[var(--accent)] text-white" : "text-[var(--primary)] hover:bg-zinc-100"}`,
					children: "Admin"
				}) : null]
			}), /* @__PURE__ */ jsxs("div", {
				className: "ml-auto flex items-center gap-2",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "hidden text-xs text-zinc-600 sm:inline",
						children: ["Fase activa: ", /* @__PURE__ */ jsx("strong", { children: phaseLabel })]
					}),
					/* @__PURE__ */ jsx("span", {
						className: "rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700",
						children: currentUser.nickname
					}),
					/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => {
							logout();
							navigate({ to: "/ingreso" });
						},
						children: "Salir"
					})
				]
			})] }) : /* @__PURE__ */ jsx("div", {
				className: "ml-auto",
				children: /* @__PURE__ */ jsx(Link, {
					to: "/ingreso",
					className: "rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white no-underline",
					children: "Ingresar"
				})
			})]
		})
	});
}
//#endregion
//#region src/styles.css?url
var styles_default = "/assets/styles-BVOm07Ej.css";
//#endregion
//#region src/routes/__root.tsx
var Route$7 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Quiniela Mundial 2026" },
			{
				name: "description",
				content: "App para montar quinielas por fases con resultados en vivo y ranking."
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootDocument
});
function RootDocument({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "es",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", {
			suppressHydrationWarning: true,
			children: [/* @__PURE__ */ jsxs(AppProvider, { children: [
				/* @__PURE__ */ jsx(Header, {}),
				children,
				/* @__PURE__ */ jsx(Footer, {})
			] }), /* @__PURE__ */ jsx(Scripts, {})]
		})]
	});
}
//#endregion
//#region src/routes/resultados.tsx
var $$splitComponentImporter$6 = () => import("./resultados-CN7XnU_c.js");
var Route$6 = createFileRoute("/resultados")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
//#endregion
//#region src/routes/quiniela.tsx
var $$splitComponentImporter$5 = () => import("./quiniela-YhXmXm7I.js");
var Route$5 = createFileRoute("/quiniela")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region src/routes/posiciones.tsx
var $$splitComponentImporter$4 = () => import("./posiciones-nbGRPMZB.js");
var Route$4 = createFileRoute("/posiciones")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region src/routes/onboarding.tsx
var $$splitComponentImporter$3 = () => import("./onboarding-0V8rUmMN.js");
var Route$3 = createFileRoute("/onboarding")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
//#endregion
//#region src/routes/ingreso.tsx
var $$splitComponentImporter$2 = () => import("./ingreso-DwnXvV54.js");
var Route$2 = createFileRoute("/ingreso")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
//#endregion
//#region src/routes/admin.tsx
var $$splitComponentImporter$1 = () => import("./admin-DsCp7Gqg.js");
var Route$1 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter = () => import("./routes-BTJT0VCP.js");
var Route = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
//#endregion
//#region src/routeTree.gen.ts
var ResultadosRoute = Route$6.update({
	id: "/resultados",
	path: "/resultados",
	getParentRoute: () => Route$7
});
var QuinielaRoute = Route$5.update({
	id: "/quiniela",
	path: "/quiniela",
	getParentRoute: () => Route$7
});
var PosicionesRoute = Route$4.update({
	id: "/posiciones",
	path: "/posiciones",
	getParentRoute: () => Route$7
});
var OnboardingRoute = Route$3.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => Route$7
});
var IngresoRoute = Route$2.update({
	id: "/ingreso",
	path: "/ingreso",
	getParentRoute: () => Route$7
});
var AdminRoute = Route$1.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$7
});
var rootRouteChildren = {
	IndexRoute: Route.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$7
	}),
	AdminRoute,
	IngresoRoute,
	OnboardingRoute,
	PosicionesRoute,
	QuinielaRoute,
	ResultadosRoute
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0
	});
}
//#endregion
export { getRouter };
