import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "nav", mode: "Граф" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-02-five-equal-rail"
});
const nav = bindNavInteractions(root, state);
bindDemoActions();
