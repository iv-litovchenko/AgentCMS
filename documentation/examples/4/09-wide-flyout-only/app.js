import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Входящие" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-09-wide-flyout-only"
});
const nav = bindNavInteractions(root, state);
const fly = root.querySelector("[data-nav-flyout]");
      fly.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const D = { nav:["🧭 Навигация",["Граф","MOC"]], memory:["🧠 Память",["Входящие","Внешняя","TODO"]], attachments:["📎 Вложения",["Медиа","Превью"]], settings:["⚙️ Настройки",["Описание",".env"]], auto:["⚡ Авто",["Расписание","Heartbeat"]] };
        const [title, modes] = D[id];
        return `<div class="flyout-domain-head">${title}</div>${modes.map(m=>`<button type="button" class="mode-switch${id==="memory"&&m==="Входящие"?" active":""}" data-domain="${id}" data-mode="${m}">${m}</button>`).join("")}`;
      }).join("");
bindDemoActions();
