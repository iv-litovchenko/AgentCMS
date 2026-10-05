import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "attachments", mode: "Медиа и документы" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-23-two-row-pills"
});
const nav = bindNavInteractions(root, state);
const ws = root.querySelector("[data-workspace]");
      const r1 = document.createElement("nav");
      r1.className = "domain-tabs-bar";
      const r2 = document.createElement("nav");
      r2.className = "submode-bar";
      const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Авто" };
      r1.innerHTML = Object.keys(labels).map(id => '<button type="button" class="domain-tab' + (id==="attachments"?" active":"") + '" data-domain-tab="' + id + '">' + labels[id] + '</button>').join("");
      r2.innerHTML = ["Медиа и документы","Превью"].map(m => '<button type="button" class="submode-btn' + (m==="Медиа и документы"?" active":"") + '" data-mode="' + m + '">' + m + '</button>').join("");
      ws.querySelector(".ws-header").after(r1, r2);
      root.querySelector(".ws-context").classList.add("hidden");
      const orig = nav.apply;
      const modeMap = { nav:["Граф","Карта (MOC)","Индекс"], memory:["Входящие","Внешняя память","Внутренняя","TODO.md"], attachments:["Медиа и документы","Превью"], settings:["Описание","Конфигурации","Скрипты",".env"], auto:["Расписание","Heartbeat"] };
      nav.apply = function(d, m) {
        orig(d, m);
        const list = modeMap[d] || [];
        nav.state.mode = m || list[0];
        r2.innerHTML = list.map(x => '<button type="button" class="submode-btn' + (x===nav.state.mode?" active":"") + '" data-mode="' + x + '">' + x + '</button>').join("");
        r1.querySelectorAll("[data-domain-tab]").forEach(b => b.classList.toggle("active", b.dataset.domainTab === d));
      };
bindDemoActions();
