import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-17-inline-header"
});
const nav = bindNavInteractions(root, state);
root.querySelector(".ws-context").innerHTML = `
        <span class="ctx-domain">🧠 Память</span><span class="ctx-sep">›</span><span class="ctx-mode">Внешняя память</span>
        <div style="margin-left:auto;display:flex;gap:4px" data-inline-modes>
          ${["Входящие","Внешняя память","Внутренняя","TODO.md"].map(m=>`<button type="button" class="submode-btn${m==="Внешняя память"?" active":""}" data-mode="${m}">${m}</button>`).join("")}
        </div>`;
bindDemoActions();
