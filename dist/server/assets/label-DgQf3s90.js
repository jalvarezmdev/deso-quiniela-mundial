import { t as cn } from "./cn-qhQ23CiK.js";
import "react";
import { jsx } from "react/jsx-runtime";
//#region src/components/ui/input.tsx
function Input({ className, ...props }) {
	return /* @__PURE__ */ jsx("input", {
		className: cn("h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20", className),
		...props
	});
}
//#endregion
//#region src/components/ui/label.tsx
function Label({ className, ...props }) {
	return /* @__PURE__ */ jsx("label", {
		className: cn("mb-1 block text-sm font-medium text-[var(--primary)]", className),
		...props
	});
}
//#endregion
export { Input as n, Label as t };
