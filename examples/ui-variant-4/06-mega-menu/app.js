import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "nav", mode: "Граф" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-06-mega-menu"
});
const nav = bindNavInteractions(root, state);
const rail = root.querySelector("[data-nav-rail]");
      rail.innerHTML = '<button type="button" class="rail-btn active" title="Все домены">☰</button>';
      const mega = document.createElement("div");
      mega.className = "mega-nav";
      mega.innerHTML = [
        { id:"nav", t:"🧭", m:["Граф","MOC","Индекс"] },
        { id:"memory", t:"🧠", m:["Входящие","Внешняя","TODO"] },
        { id:"attachments", t:"📎", m:["Медиа","Превью"] },
        { id:"settings", t:"⚙️", m:["Описание","Конфиги",".env"] },
        { id:"auto", t:"⚡", m:["Расписание","Heartbeat"] }
      ].map(g => `<div class="mega-nav-col" data-mega-col="${g.id}"><h4>${g.t}</h4>${g.m.map((x,i)=>`<button type="button" data-domain="${g.id}" data-mode="${x}" class="${g.id==="nav"&&i===0?"active":""}">${x}</button>`).join("")}</div>`).join("");
      document.body.appendChild(mega);
bindDemoActions();
