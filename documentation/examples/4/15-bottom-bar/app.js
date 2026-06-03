import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "attachments", mode: "Превью" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-15-bottom-bar"
});
const nav = bindNavInteractions(root, state);
const bar = document.createElement("nav");
      bar.className = "bottom-nav";
      bar.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return `<button type="button" class="bottom-nav-btn${id==="attachments"?" active":""}" data-domain="${id}">${L[id]}</button>`;
      }).join("");
      document.body.appendChild(bar);
bindDemoActions();
