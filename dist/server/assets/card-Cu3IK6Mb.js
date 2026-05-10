import { t as cn } from "./cn-qhQ23CiK.js";
import "react";
import { jsx } from "react/jsx-runtime";
//#region src/components/ui/card.tsx
function Card({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("rounded-xl border border-[var(--line)] bg-[var(--secondary)] p-4 shadow-sm", className),
		...props
	});
}
//#endregion
export { Card as t };
