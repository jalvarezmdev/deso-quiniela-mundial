import { t as cn } from "./cn-qhQ23CiK.js";
import "react";
import { jsx } from "react/jsx-runtime";
//#region src/components/ui/badge.tsx
function Badge({ className, ...props }) {
	return /* @__PURE__ */ jsx("span", {
		className: cn("inline-flex items-center rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700", className),
		...props
	});
}
//#endregion
export { Badge as t };
