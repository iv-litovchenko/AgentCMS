import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-22-work-frequency-order"
});
const nav = bindNavInteractions(root, state);
const rail = root.querySelector("[data-nav-rail]");
      const order = ["memory","attachments","nav","settings","auto"];
      rail.innerHTML = order.map(id => rail.querySelector(`[data-domain="${id}"]`)?.outerHTML || "").filter(Boolean).join("");
bindDemoActions();
