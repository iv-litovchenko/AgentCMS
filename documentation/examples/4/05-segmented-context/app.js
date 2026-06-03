import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "TODO.md" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-05-segmented-context"
});
const nav = bindNavInteractions(root, state);
const ws = root.querySelector("[data-workspace]");
      const chips = document.createElement("nav");
      chips.className = "domain-chips";
      chips.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return `<button type="button" class="domain-chip${id==="memory"?" active":""}" data-domain-chip="${id}">${L[id]}</button>`;
      }).join("");
      ws.querySelector(".ws-header").after(chips);
      root.querySelector(".ws-context").classList.add("hidden");
bindDemoActions();
