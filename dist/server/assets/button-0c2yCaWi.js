import { t as cn } from "./cn-qhQ23CiK.js";
import "react";
import { jsx } from "react/jsx-runtime";
//#region src/components/ui/button.tsx
function Button({ className, variant = "default", ...props }) {
	return /* @__PURE__ */ jsx("button", {
		className: cn("inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", variant === "default" && "bg-[var(--accent)] text-[var(--secondary)] hover:brightness-110", variant === "outline" && "border border-[var(--line)] bg-[var(--secondary)] text-[var(--primary)] hover:bg-zinc-100", variant === "ghost" && "text-[var(--primary)] hover:bg-zinc-100", variant === "danger" && "bg-red-600 text-white hover:bg-red-500", className),
		...props
	});
}
//#endregion
export { Button as t };
