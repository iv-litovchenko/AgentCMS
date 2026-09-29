import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внутренняя" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-16-dual-column-nav"
});
const nav = bindNavInteractions(root, state);
const sb = root.querySelector("[data-shell-body]");
      const dual = document.createElement("aside");
      dual.className = "nav-dual";
      dual.innerHTML = '<div class="nav-dual-domains" data-dual-domains></div><div class="nav-dual-modes" data-dual-modes></div>';
      sb.insertBefore(dual, root.querySelector("[data-workspace]"));
      const domCol = dual.querySelector("[data-dual-domains]");
      const modeCol = dual.querySelector("[data-dual-modes]");
      const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Авто" };
      domCol.innerHTML = Object.keys(labels).map(id =>
        '<button type="button" class="mode-switch' + (id==="memory"?" active":"") + '" data-domain="' + id + '">' + labels[id] + '</button>'
      ).join("");
      modeCol.innerHTML = ["Входящие","Внешняя память","Внутренняя","TODO.md"].map(m =>
        '<button type="button" class="mode-switch' + (m==="Внутренняя"?" active":"") + '" data-mode="' + m + '">' + m + '</button>'
      ).join("");
      const origApply = nav.apply;
      nav.apply = function(domainId, modeLabel) {
        origApply(domainId, modeLabel);
        domCol.querySelectorAll("[data-domain]").forEach(b => b.classList.toggle("active", b.dataset.domain === domainId));
        const modes = { nav:["Граф","MOC","Индекс"], memory:["Входящие","Внешняя память","Внутренняя","TODO.md"], attachments:["Медиа и документы","Превью"], settings:["Описание","Конфигурации","Скрипты",".env"], auto:["Расписание","Heartbeat"] };
        const list = modes[domainId] || [];
        nav.state.mode = modeLabel || list[0];
        modeCol.innerHTML = list.map(m => '<button type="button" class="mode-switch' + (m===nav.state.mode?" active":"") + '" data-mode="' + m + '">' + m + '</button>').join("");
      };
bindDemoActions();
