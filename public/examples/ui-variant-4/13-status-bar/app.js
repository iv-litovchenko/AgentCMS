import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-13-status-bar"
});
const nav = bindNavInteractions(root, state);
const bar = document.createElement("footer");
      bar.className = "status-domains";
      bar.innerHTML = ["nav","memory","attachments","settings","auto"].map((id,i) => {
        const L = { nav:"🧭 Nav", memory:"🧠 Memory", attachments:"📎 Files", settings:"⚙️ Settings", auto:"⚡ Auto" };
        return `<button type="button" class="status-pill${id==="memory"?" active":""}" data-domain="${id}">${L[id]}</button>`;
      }).join("");
      root.querySelector("[data-shell-body]").appendChild(bar);
bindDemoActions();
