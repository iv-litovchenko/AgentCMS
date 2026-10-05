import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "auto", mode: "Расписание" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-21-accordion-flyout"
});
const nav = bindNavInteractions(root, state);
const fly = root.querySelector("[data-nav-flyout]");
      fly.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const open = id === "auto";
        const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Автоматизация" };
        const modes = { nav:["Граф","MOC"], memory:["Входящие","Внешняя"], attachments:["Медиа","Превью"], settings:["Описание",".env"], auto:["Расписание","Heartbeat"] };
        return `<details${open?" open":""} style="border-bottom:1px solid var(--border)"><summary style="padding:8px 12px;cursor:pointer;font-weight:600">${labels[id]}</summary>
          ${modes[id].map(m=>`<button type="button" class="mode-switch${open&&m==="Расписание"?" active":""}" data-domain="${id}" data-mode="${m}">${m}</button>`).join("")}
        </details>`;
      }).join("");
bindDemoActions();
