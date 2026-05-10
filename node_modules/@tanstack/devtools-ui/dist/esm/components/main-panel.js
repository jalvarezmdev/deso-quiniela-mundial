import { useStyles } from "../styles/use-styles.js";
import { className, effect, insert, template } from "solid-js/web";
import clsx from "clsx";
//#region src/components/main-panel.tsx
var _tmpl$ = /* @__PURE__ */ template(`<div>`);
var MainPanel = ({ className: className$1, children, class: classStyles, withPadding }) => {
	const styles = useStyles();
	return (() => {
		var _el$ = _tmpl$();
		insert(_el$, children);
		effect(() => className(_el$, clsx(styles().mainPanel.panel(Boolean(withPadding)), className$1, classStyles)));
		return _el$;
	})();
};
//#endregion
export { MainPanel };

//# sourceMappingURL=main-panel.js.map