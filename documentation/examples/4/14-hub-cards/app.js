import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "nav", mode: "Граф" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-14-hub-cards"
});
const nav = bindNavInteractions(root, state);
const preview = root.querySelector("[data-preview]");
      preview.innerHTML = `<div class="hub-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:8px">
        ${["nav","memory","attachments","settings","auto"].map(id => {
          const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
          const names = { nav:"Навигация", memory:"Память", attachments:"Вложения", settings:"Настройки", auto:"Авто" };
          return `<button type="button" data-domain="${id}" style="border:1px solid var(--border);border-radius:12px;padding:20px 12px;background:var(--panel);cursor:pointer;font-size:13px"><div style="font-size:28px">${L[id]}</div>${names[id]}</button>`;
        }).join("")}
      </div>`;
bindDemoActions();
