import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "settings", mode: "Описание" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-04-sidebar-domains"
});
const nav = bindNavInteractions(root, state);
const sidebar = root.querySelector(".sidebar");
      const block = document.createElement("div");
      block.className = "sidebar-domain";
      block.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Автоматизация" };
        return `<button type="button" class="sidebar-domain-btn${id==="settings"?" active":""}" data-domain="${id}">${L[id]}</button>`;
      }).join("");
      sidebar.appendChild(block);
bindDemoActions();
