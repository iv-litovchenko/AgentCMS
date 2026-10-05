import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "attachments", mode: "Медиа и документы" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-03-top-domain-tabs"
});
const nav = bindNavInteractions(root, state);
const shell = root.querySelector("[data-shell]");
      const tabs = document.createElement("nav");
      tabs.className = "domain-tabs-bar";
      const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Авто" };
      tabs.innerHTML = Object.keys(labels).map(id => '<button type="button" class="domain-tab' + (id==="attachments"?" active":"") + '" data-domain-tab="' + id + '">' + labels[id] + '</button>').join("");
      const sub = document.createElement("nav");
      sub.className = "submode-bar";
      sub.id = "submode-bar";
      shell.insertBefore(sub, root.querySelector("[data-shell-body]"));
      shell.insertBefore(tabs, sub);
      const modeMap = { nav:["Граф","Карта (MOC)","Индекс"], memory:["Входящие","Внешняя память","Внутренняя","TODO.md"], attachments:["Медиа и документы","Превью"], settings:["Описание","Конфигурации","Скрипты",".env"], auto:["Расписание","Heartbeat"] };
      function renderSub(domainId) {
        sub.innerHTML = (modeMap[domainId]||[]).map((m,i) => '<button type="button" class="submode-btn' + (i===0?" active":"") + '" data-mode="' + m + '">' + m + '</button>').join("");
      }
      renderSub("attachments");
      const origApply = nav.apply;
      nav.apply = function(domainId, modeLabel) {
        origApply(domainId, modeLabel);
        renderSub(domainId);
        sub.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === nav.state.mode));
        tabs.querySelectorAll("[data-domain-tab]").forEach(b => b.classList.toggle("active", b.dataset.domainTab === domainId));
      };
bindDemoActions();
