import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "nav", mode: "Индекс" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-24-zoned-labels"
});
const nav = bindNavInteractions(root, state);
bindDemoActions();
