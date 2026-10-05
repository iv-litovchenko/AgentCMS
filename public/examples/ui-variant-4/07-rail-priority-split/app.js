import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "attachments", mode: "Превью" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-07-rail-priority-split"
});
const nav = bindNavInteractions(root, state);
const rail = root.querySelector("[data-nav-rail]");
      const order = ["memory","attachments","nav","settings","auto"];
      rail.innerHTML = order.map(id => rail.querySelector(`[data-domain="${id}"]`)?.outerHTML || "").join("");
      const sp = document.createElement("div");
      sp.style.flex = "1";
      rail.insertBefore(sp, rail.children[2]);
bindDemoActions();
