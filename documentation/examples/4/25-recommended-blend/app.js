import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-25-recommended-blend"
});
const nav = bindNavInteractions(root, state);
const rail = root.querySelector("[data-nav-rail]");
      const top = ["nav","memory","attachments"].map(id => rail.querySelector(`[data-domain="${id}"]`)).filter(Boolean);
      const bottom = ["settings","auto"].map(id => rail.querySelector(`[data-domain="${id}"]`)).filter(Boolean);
      rail.innerHTML = "";
      const g1 = document.createElement("div");
      g1.className = "rail-cluster-top";
      top.forEach(b => g1.appendChild(b));
      const div = document.createElement("div");
      div.className = "rail-divider";
      const g2 = document.createElement("div");
      g2.className = "rail-cluster-bottom";
      bottom.forEach(b => g2.appendChild(b));
      rail.append(g1, div, g2);
bindDemoActions();
