import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "settings", mode: "Скрипты" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-20-sticky-domain-tabs"
});
const nav = bindNavInteractions(root, state);
const ws = root.querySelector("[data-workspace]");
      const tabs = document.createElement("nav");
      tabs.className = "domain-tabs-bar domain-tabs-sticky";
      tabs.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return `<button type="button" class="domain-tab${id==="settings"?" active":""}" data-domain-tab="${id}">${L[id]}</button>`;
      }).join("");
      ws.insertBefore(tabs, ws.querySelector(".ws-context"));
bindDemoActions();
