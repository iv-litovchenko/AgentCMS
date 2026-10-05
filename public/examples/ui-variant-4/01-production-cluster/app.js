import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-01-production-cluster"
});
const nav = bindNavInteractions(root, state);
const rail = root.querySelector("[data-nav-rail]");
      const top = document.createElement("div");
      top.className = "rail-cluster-top";
      top.innerHTML = ["nav","memory","attachments"].map(id => rail.querySelector(`[data-domain="${id}"]`)).filter(Boolean).map(b => b.outerHTML).join("");
      const div = document.createElement("div");
      div.className = "rail-divider";
      const bottom = document.createElement("div");
      bottom.className = "rail-cluster-bottom";
      bottom.innerHTML = ["settings","auto"].map(id => rail.querySelector(`[data-domain="${id}"]`)).filter(Boolean).map(b => b.outerHTML).join("");
      rail.innerHTML = "";
      rail.append(top, div, bottom);
bindDemoActions();
