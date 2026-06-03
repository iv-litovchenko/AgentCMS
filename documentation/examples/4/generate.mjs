#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const VARIANTS = [
  {
    id: "01-production-cluster",
    num: "01",
    title: "Кластер как в CMS",
    desc: "🧭+🧠+📎 в верхней группе rail, ⚙️ и ⚡ ниже разделителя — близко к текущему Agent CMS.",
    domain: "memory",
    mode: "Внешняя память",
    shellCss: `
      .mode-rail { justify-content: flex-start; padding-top: 10px; }
      .rail-cluster-top { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .rail-cluster-bottom { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 6px; padding-bottom: 8px; }`,
    extraMount: `
      const rail = root.querySelector("[data-nav-rail]");
      const top = document.createElement("div");
      top.className = "rail-cluster-top";
      top.innerHTML = ["nav","memory","attachments"].map(id => rail.querySelector(\`[data-domain="\${id}"]\`)).filter(Boolean).map(b => b.outerHTML).join("");
      const div = document.createElement("div");
      div.className = "rail-divider";
      const bottom = document.createElement("div");
      bottom.className = "rail-cluster-bottom";
      bottom.innerHTML = ["settings","auto"].map(id => rail.querySelector(\`[data-domain="\${id}"]\`)).filter(Boolean).map(b => b.outerHTML).join("");
      rail.innerHTML = "";
      rail.append(top, div, bottom);`
  },
  {
    id: "02-five-equal-rail",
    num: "02",
    title: "Пять равных иконок",
    desc: "Все домены на одном уровне в rail — максимальная симметрия, без приоритета.",
    domain: "nav",
    mode: "Граф"
  },
  {
    id: "03-top-domain-tabs",
    num: "03",
    title: "Вкладки доменов сверху",
    desc: "Пять вкладок под шапкой приложения; flyout скрыт, подрежимы — второй ряд.",
    domain: "attachments",
    mode: "Медиа и документы",
    shellCss: `
      .shell { grid-template-rows: 48px auto auto 1fr; }
      .domain-tabs-bar { grid-column: 1 / -1; display: flex; gap: 4px; padding: 8px 12px; background: var(--panel); border-bottom: 1px solid var(--border); overflow-x: auto; }
      .shell-body { grid-row: 4; grid-template-columns: var(--sidebar-w) 1fr; height: auto; }
      .mode-rail, .mode-flyout { display: none; }
      .workspace { grid-column: 2; }`,
    extraMount: `
      const shell = root.querySelector("[data-shell]");
      const tabs = document.createElement("nav");
      tabs.className = "domain-tabs-bar";
      tabs.innerHTML = ["nav","memory","attachments","settings","auto"].map((id, i) => {
        const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Авто" };
        return \`<button type="button" class="domain-tab\${id==="${'attachments'}"?" active":""}" data-domain-tab="\${id}">\${labels[id]}</button>\`;
      }).join("");
      const sub = document.createElement("nav");
      sub.className = "submode-bar";
      sub.id = "submode-bar";
      shell.insertBefore(sub, root.querySelector("[data-shell-body]"));
      shell.insertBefore(tabs, sub);
      function renderSub(domainId) {
        const modes = { nav:["Граф","Карта (MOC)","Индекс"], memory:["Входящие","Внешняя память","Внутренняя","TODO.md"], attachments:["Медиа и документы","Превью"], settings:["Описание","Конфигурации","Скрипты",".env"], auto:["Расписание","Heartbeat"] };
        sub.innerHTML = (modes[domainId]||[]).map((m,i)=>\`<button type="button" class="submode-btn\${i===0?" active":""}" data-mode="\${m}">\${m}</button>\`).join("");
      }
      renderSub("attachments");
      const origApply = nav.apply;
      nav.apply = (domainId, modeLabel) => {
        origApply(domainId, modeLabel);
        renderSub(domainId);
        sub.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === nav.state.mode));
      };`
  },
  {
    id: "04-sidebar-domains",
    num: "04",
    title: "Домены в сайдбаре",
    desc: "Дерево нод + пять кнопок доменов в левой колонке; rail убран.",
    domain: "settings",
    mode: "Описание",
    shellCss: `
      .shell-body { grid-template-columns: 260px 1fr; }
      .mode-rail, .mode-flyout { display: none; }
      .workspace { grid-column: 2; }`,
    extraMount: `
      const sidebar = root.querySelector(".sidebar");
      const block = document.createElement("div");
      block.className = "sidebar-domain";
      block.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Автоматизация" };
        return \`<button type="button" class="sidebar-domain-btn\${id==="settings"?" active":""}" data-domain="\${id}">\${L[id]}</button>\`;
      }).join("");
      sidebar.appendChild(block);`
  },
  {
    id: "05-segmented-context",
    num: "05",
    title: "Сегменты под крошками",
    desc: "Пять сегментов домена inline в workspace; flyout появляется только для подрежимов справа.",
    domain: "memory",
    mode: "TODO.md",
    shellCss: `.mode-rail { display: none; } .mode-flyout { width: 180px; }`,
    extraMount: `
      const ws = root.querySelector("[data-workspace]");
      const chips = document.createElement("nav");
      chips.className = "domain-chips";
      chips.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return \`<button type="button" class="domain-chip\${id==="memory"?" active":""}" data-domain-chip="\${id}">\${L[id]}</button>\`;
      }).join("");
      ws.querySelector(".ws-header").after(chips);
      root.querySelector(".ws-context").classList.add("hidden");`
  },
  {
    id: "06-mega-menu",
    num: "06",
    title: "Mega-menu",
    desc: "Один rail-триггер; панель 5 колонок — все домены и подрежимы сразу.",
    domain: "nav",
    mode: "Граф",
    shellCss: `.mode-flyout { display: none; }`,
    extraMount: `
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
      ].map(g => \`<div class="mega-nav-col" data-mega-col="\${g.id}"><h4>\${g.t}</h4>\${g.m.map((x,i)=>\`<button type="button" data-domain="\${g.id}" data-mode="\${x}" class="\${g.id==="nav"&&i===0?"active":""}">\${x}</button>\`).join("")}</div>\`).join("");
      document.body.appendChild(mega);`
  },
  {
    id: "07-rail-priority-split",
    num: "07",
    title: "Частый / редкий",
    desc: "Память и Вложения сверху rail; Навигация, Настройки, Авто — компактно снизу.",
    domain: "attachments",
    mode: "Превью",
    shellCss: `.mode-rail { justify-content: space-between; padding: 12px 6px; }`,
    extraMount: `
      const rail = root.querySelector("[data-nav-rail]");
      const order = ["memory","attachments","nav","settings","auto"];
      rail.innerHTML = order.map(id => rail.querySelector(\`[data-domain="\${id}"]\`)?.outerHTML || "").join("");
      const sp = document.createElement("div");
      sp.style.flex = "1";
      rail.insertBefore(sp, rail.children[2]);`
  },
  {
    id: "08-workspace-header-chips",
    num: "08",
    title: "Чипы в шапке workspace",
    desc: "Домен и подрежим — chips в одной строке с крошками; rail только для быстрого jump.",
    domain: "auto",
    mode: "Heartbeat",
    extraMount: `
      const hdr = root.querySelector(".ws-header");
      hdr.style.display = "flex";
      hdr.style.flexWrap = "wrap";
      hdr.style.gap = "10px";
      const chips = document.createElement("div");
      chips.style.display = "flex";
      chips.style.gap = "4px";
      chips.innerHTML = '<button type="button" class="domain-chip active" data-domain-chip="auto">⚡</button><button type="button" class="domain-chip" data-domain-chip="memory">🧠</button><button type="button" class="domain-chip" data-domain-chip="attachments">📎</button>';
      hdr.appendChild(chips);`
  },
  {
    id: "09-wide-flyout-only",
    num: "09",
    title: "Широкий flyout",
    desc: "Узкий rail; flyout 280px со списком доменов и подрежимов (accordion-стиль).",
    domain: "memory",
    mode: "Входящие",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 40px 280px 1fr; }
      .mode-flyout .mode-switch { padding-left: 24px; }
      .flyout-domain-head { font-weight: 700; padding: 10px 12px 4px; font-size: 12px; border-top: 1px solid var(--border); }
      .flyout-domain-head:first-of-type { border-top: 0; }`,
    extraMount: `
      const fly = root.querySelector("[data-nav-flyout]");
      fly.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const D = { nav:["🧭 Навигация",["Граф","MOC"]], memory:["🧠 Память",["Входящие","Внешняя","TODO"]], attachments:["📎 Вложения",["Медиа","Превью"]], settings:["⚙️ Настройки",["Описание",".env"]], auto:["⚡ Авто",["Расписание","Heartbeat"]] };
        const [title, modes] = D[id];
        return \`<div class="flyout-domain-head">\${title}</div>\${modes.map(m=>\`<button type="button" class="mode-switch\${id==="memory"&&m==="Входящие"?" active":""}" data-domain="\${id}" data-mode="\${m}">\${m}</button>\`).join("")}\`;
      }).join("");`
  },
  {
    id: "10-classic-rail-flyout",
    num: "10",
    title: "Классика rail + flyout",
    desc: "Эталон: иконка домена → flyout подрежимов → превью содержимого.",
    domain: "memory",
    mode: "Внешняя память"
  },
  {
    id: "11-tree-storage-folders",
    num: "11",
    title: "Папки в дереве",
    desc: "Под нодой в дереве — папки _Storage: Навигация, Память, Вложения…",
    domain: "attachments",
    mode: "Медиа и документы",
    shellCss: `.mode-rail, .mode-flyout { display: none; }`,
    extraMount: `
      const sidebar = root.querySelector(".sidebar");
      sidebar.innerHTML += \`
        <div class="sidebar-item active" style="margin-left:8px">📁 _Storage</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="nav">🧭 _Graph</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="memory">🧠 _Content</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="attachments">📎 _Assets</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="settings">⚙️ Configuration</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="auto">⚡ _Scripts</div>\`;`
  },
  {
    id: "12-go-to-select",
    num: "12",
    title: "Перейти к…",
    desc: "Dropdown «Домен › режим» в шапке — компактно, без лишнего chrome.",
    domain: "settings",
    mode: "Конфигурации",
    shellCss: `.mode-rail, .mode-flyout { display: none; }`,
    extraMount: `
      const hdr = root.querySelector(".ws-header");
      const sel = document.createElement("select");
      sel.className = "go-select";
      sel.innerHTML = '<option>⚙️ Настройки › Конфигурации</option><option>🧠 Память › Внешняя</option><option>📎 Вложения › Медиа</option><option>🧭 Навигация › Граф</option><option>⚡ Авто › Heartbeat</option>';
      hdr.appendChild(sel);
      sel.addEventListener("change", () => {
        const toast = document.getElementById("toast");
        if (toast) { toast.textContent = sel.value; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1600); }
      });`
  },
  {
    id: "13-status-bar",
    num: "13",
    title: "Status bar",
    desc: "Пять доменов в нижней полосе (VS Code); rail скрыт.",
    domain: "memory",
    mode: "Внешняя память",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: 1fr 28px; }
      .mode-rail, .mode-flyout { display: none; }
      .workspace { grid-row: 1; }
      .status-domains { grid-column: 1 / -1; grid-row: 2; }`,
    extraMount: `
      const bar = document.createElement("footer");
      bar.className = "status-domains";
      bar.innerHTML = ["nav","memory","attachments","settings","auto"].map((id,i) => {
        const L = { nav:"🧭 Nav", memory:"🧠 Memory", attachments:"📎 Files", settings:"⚙️ Settings", auto:"⚡ Auto" };
        return \`<button type="button" class="status-pill\${id==="memory"?" active":""}" data-domain="\${id}">\${L[id]}</button>\`;
      }).join("");
      root.querySelector("[data-shell-body]").appendChild(bar);`
  },
  {
    id: "14-hub-cards",
    num: "14",
    title: "Карточки-хаб",
    desc: "При выборе «Навигация» — сетка карточек 5 доменов вместо графа (быстрый хаб).",
    domain: "nav",
    mode: "Граф",
    extraMount: `
      const preview = root.querySelector("[data-preview]");
      preview.innerHTML = \`<div class="hub-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:8px">
        \${["nav","memory","attachments","settings","auto"].map(id => {
          const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
          const names = { nav:"Навигация", memory:"Память", attachments:"Вложения", settings:"Настройки", auto:"Авто" };
          return \`<button type="button" data-domain="\${id}" style="border:1px solid var(--border);border-radius:12px;padding:20px 12px;background:var(--panel);cursor:pointer;font-size:13px"><div style="font-size:28px">\${L[id]}</div>\${names[id]}</button>\`;
        }).join("")}
      </div>\`;`
  },
  {
    id: "15-bottom-bar",
    num: "15",
    title: "Нижняя панель",
    desc: "Мобильный паттерн: 5 иконок внизу экрана.",
    domain: "attachments",
    mode: "Превью",
    shellCss: `
      @media (min-width: 1px) {
        .bottom-nav { display: flex; }
        .shell-body { padding-bottom: 52px; }
        .mode-rail { display: none; }
      }`,
    extraMount: `
      const bar = document.createElement("nav");
      bar.className = "bottom-nav";
      bar.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return \`<button type="button" class="bottom-nav-btn\${id==="attachments"?" active":""}" data-domain="\${id}">\${L[id]}</button>\`;
      }).join("");
      document.body.appendChild(bar);`
  },
  {
    id: "16-dual-column-nav",
    num: "16",
    title: "Две колонки навигации",
    desc: "Слева список доменов, справа — подрежимы (без icon-rail).",
    domain: "memory",
    mode: "Внутренняя",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 220px 1fr; }
      .mode-rail { display: none; }
      .mode-flyout { display: none; }
      .nav-dual { grid-column: 2; display: grid; grid-template-columns: 1fr 1fr; }`,
    extraMount: `
      const sb = root.querySelector("[data-shell-body]");
      const dual = document.createElement("aside");
      dual.className = "nav-dual";
      dual.innerHTML = \`<div class="nav-dual-domains" data-dual-domains></div><div class="nav-dual-modes" data-dual-modes></div>\`;
      sb.insertBefore(dual, root.querySelector("[data-workspace]"));
      const domCol = dual.querySelector("[data-dual-domains]");
      const modeCol = dual.querySelector("[data-dual-modes]");
      domCol.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return \`<button type="button" class="mode-switch\${id==="memory"?" active":""}" data-domain="\${id}">\${L[id]}</button>\`;
      }).join("");
      const modes = ["Входящие","Внешняя","Внутренняя","TODO.md"];
      modeCol.innerHTML = modes.map(m => \`<button type="button" class="mode-switch\${m==="Внутренняя"?" active":""}" data-mode="\${m}">\${m}</button>\`).join("");
      nav.apply = (domainId, modeLabel) => {
        nav.state.domain = domainId;
        nav.state.mode = modeLabel || findDomain(domainId).modes[0];
        domCol.querySelectorAll("[data-domain]").forEach(b => b.classList.toggle("active", b.dataset.domain === domainId));
        const d = findDomain(domainId);
        modeCol.innerHTML = d.modes.map(m => \`<button type="button" class="mode-switch\${m===nav.state.mode?" active":""}" data-mode="\${m}">\${m}</button>\`).join("");
        root.querySelector("[data-ctx-domain]").textContent = d.icon + " " + d.label;
        root.querySelector("[data-ctx-mode]").textContent = nav.state.mode;
        root.querySelector("[data-preview]").outerHTML = renderPreview(domainId, nav.state.mode);
      };
      import { findDomain, renderPreview } from "../shared-mock.js";`.replace(
      'import { findDomain, renderPreview } from "../shared-mock.js";',
      ''
    )
  },
  {
    id: "17-inline-header",
    num: "17",
    title: "Контекст в одной строке",
    desc: "Как 23 в Examples3: «Память › Внешняя» + переключатели подрежимов inline.",
    domain: "memory",
    mode: "Внешняя память",
    shellCss: `.mode-flyout { display: none; }`,
    extraMount: `
      root.querySelector(".ws-context").innerHTML = \`
        <span class="ctx-domain">🧠 Память</span><span class="ctx-sep">›</span><span class="ctx-mode">Внешняя память</span>
        <div style="margin-left:auto;display:flex;gap:4px" data-inline-modes>
          \${["Входящие","Внешняя память","Внутренняя","TODO.md"].map(m=>\`<button type="button" class="submode-btn\${m==="Внешняя память"?" active":""}" data-mode="\${m}">\${m}</button>\`).join("")}
        </div>\`;`
  },
  {
    id: "18-graph-default",
    num: "18",
    title: "Граф по умолчанию",
    desc: "Стартовый домен — Навигация › Граф; остальные домены с rail.",
    domain: "nav",
    mode: "Граф"
  },
  {
    id: "19-breadcrumb-domain",
    num: "19",
    title: "Домен в крошках",
    desc: "Путь: … / 🧠 Память / _Content / файл.md — домен виден в breadcrumb.",
    domain: "memory",
    mode: "Внешняя память",
    extraMount: `
      const bc = root.querySelector(".breadcrumbs");
      bc.innerHTML = \`<button type="button" class="breadcrumb">\${DEMO.folder}</button><span class="breadcrumb-sep">/</span>
        <button type="button" class="breadcrumb">\${DEMO.node}</button><span class="breadcrumb-sep">/</span>
        <button type="button" class="breadcrumb" data-domain="memory">🧠 Память</button><span class="breadcrumb-sep">/</span>
        <span class="breadcrumb current">_Content / файл.md</span>\`;
      import { DEMO } from "../shared-mock.js";`.replace('import { DEMO } from "../shared-mock.js";', '')
  },
  {
    id: "20-sticky-domain-tabs",
    num: "20",
    title: "Липкие вкладки",
    desc: "Вкладки доменов sticky в workspace; контент прокручивается под ними.",
    domain: "settings",
    mode: "Скрипты",
    shellCss: `.domain-tabs-sticky { position: sticky; top: 0; z-index: 4; background: var(--panel); }`,
    extraMount: `
      const ws = root.querySelector("[data-workspace]");
      const tabs = document.createElement("nav");
      tabs.className = "domain-tabs-bar domain-tabs-sticky";
      tabs.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭", memory:"🧠", attachments:"📎", settings:"⚙️", auto:"⚡" };
        return \`<button type="button" class="domain-tab\${id==="settings"?" active":""}" data-domain-tab="\${id}">\${L[id]}</button>\`;
      }).join("");
      ws.insertBefore(tabs, ws.querySelector(".ws-context"));`
  },
  {
    id: "21-accordion-flyout",
    num: "21",
    title: "Аккордеон в flyout",
    desc: "В flyout только активный домен развёрнут; остальные — заголовки.",
    domain: "auto",
    mode: "Расписание",
    extraMount: `
      const fly = root.querySelector("[data-nav-flyout]");
      fly.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const open = id === "auto";
        const labels = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Автоматизация" };
        const modes = { nav:["Граф","MOC"], memory:["Входящие","Внешняя"], attachments:["Медиа","Превью"], settings:["Описание",".env"], auto:["Расписание","Heartbeat"] };
        return \`<details\${open?" open":""} style="border-bottom:1px solid var(--border)"><summary style="padding:8px 12px;cursor:pointer;font-weight:600">\${labels[id]}</summary>
          \${modes[id].map(m=>\`<button type="button" class="mode-switch\${open&&m==="Расписание"?" active":""}" data-domain="\${id}" data-mode="\${m}">\${m}</button>\`).join("")}
        </details>\`;
      }).join("");`
  },
  {
    id: "22-work-frequency-order",
    num: "22",
    title: "По частоте работы",
    desc: "Порядок rail: Память → Вложения → Навигация → Настройки → Авто.",
    domain: "memory",
    mode: "Внешняя память",
    extraMount: `
      const rail = root.querySelector("[data-nav-rail]");
      const order = ["memory","attachments","nav","settings","auto"];
      rail.innerHTML = order.map(id => rail.querySelector(\`[data-domain="\${id}"]\`)?.outerHTML || "").filter(Boolean).join("");`
  },
  {
    id: "23-two-row-pills",
    num: "23",
    title: "Два ряда pills",
    desc: "Ряд 1: пять доменов. Ряд 2: подрежимы активного домена.",
    domain: "attachments",
    mode: "Медиа и документы",
    shellCss: `.mode-rail, .mode-flyout { display: none; }`,
    extraMount: `
      const ws = root.querySelector("[data-workspace]");
      const r1 = document.createElement("nav");
      r1.className = "domain-tabs-bar";
      r1.dataset.row = "domains";
      const r2 = document.createElement("nav");
      r2.className = "submode-bar";
      r2.dataset.row = "modes";
      r1.innerHTML = ["nav","memory","attachments","settings","auto"].map(id => {
        const L = { nav:"🧭 Навигация", memory:"🧠 Память", attachments:"📎 Вложения", settings:"⚙️ Настройки", auto:"⚡ Авто" };
        return \`<button type="button" class="domain-tab\${id==="attachments"?" active":""}" data-domain-tab="\${id}">\${L[id]}</button>\`;
      }).join("");
      r2.innerHTML = ["Медиа и документы","Превью"].map(m => \`<button type="button" class="submode-btn\${m==="Медиа и документы"?" active":""}" data-mode="\${m}">\${m}</button>\`).join("");
      ws.querySelector(".ws-header").after(r1, r2);
      root.querySelector(".ws-context").classList.add("hidden");
      const orig = nav.apply;
      nav.apply = (d, m) => {
        orig(d, m);
        const dom = findDomain(d);
        r2.innerHTML = dom.modes.map(x => \`<button type="button" class="submode-btn\${x===nav.state.mode?" active":""}" data-mode="\${x}">\${x}</button>\`).join("");
        r1.querySelectorAll("[data-domain-tab]").forEach(b => b.classList.toggle("active", b.dataset.domainTab === d));
      };
      import { findDomain } from "../shared-mock.js";`.replace('import { findDomain } from "../shared-mock.js";', '')
  },
  {
    id: "24-zoned-labels",
    num: "24",
    title: "Подписи зон",
    desc: "Явные метки: A дерево · B домены · C подрежимы · D содержимое.",
    domain: "nav",
    mode: "Индекс",
    shellCss: `
      .zone-tag { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); text-align: center; padding: 4px; }
      .sidebar::before { content: "A · Дерево"; display: block; font-size: 9px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
      .mode-rail::before { content: "B"; }
      .mode-flyout::before { content: "C · Подрежимы"; display: block; font-size: 9px; font-weight: 700; color: var(--muted); padding: 6px 10px; }`
  },
  {
    id: "25-recommended-blend",
    num: "25",
    title: "Рекомендуемый blend",
    desc: "Кластер 🧭🧠📎 + flyout + контекст в содержимом; настройки/авто отдельно.",
    domain: "memory",
    mode: "Внешняя память",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 52px 200px 1fr; }
      .ws-context { background: #f8fafc; }
      .preview-panel { border-top: 3px solid var(--accent); }`,
    extraMount: `
      const rail = root.querySelector("[data-nav-rail]");
      const top = ["nav","memory","attachments"].map(id => rail.querySelector(\`[data-domain="\${id}"]\`)).filter(Boolean);
      const bottom = ["settings","auto"].map(id => rail.querySelector(\`[data-domain="\${id}"]\`)).filter(Boolean);
      rail.innerHTML = "";
      const g1 = document.createElement("div");
      g1.className = "rail-cluster-top";
      top.forEach(b => g1.appendChild(b));
      const div = document.createElement("div");
      div.className = "rail-divider";
      const g2 = document.createElement("div");
      g2.className = "rail-cluster-bottom";
      bottom.forEach(b => g2.appendChild(b));
      rail.append(g1, div, g2);`
  }
];

// Fix variant 16 - broken extraMount with import - rewrite simpler
VARIANTS.find((v) => v.id === "16-dual-column-nav").extraMount = `
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
      };`;

VARIANTS.find((v) => v.id === "19-breadcrumb-domain").extraMount = `
      const bc = root.querySelector(".breadcrumbs");
      if (bc) bc.innerHTML = '<button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb" data-domain="memory">🧠 Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">_Content / файл.md</span>';`;

VARIANTS.find((v) => v.id === "23-two-row-pills").extraMount = `
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
      };`;

// Fix variant 03 - template string issue in extraMount
VARIANTS.find((v) => v.id === "03-top-domain-tabs").extraMount = `
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
      };`;

for (const v of VARIANTS) {
  const dir = path.join(ROOT, v.id);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${v.num} — ${v.title}</title>
    <link rel="stylesheet" href="../shared-base.css" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <span class="demo-badge">${v.num} · ${v.title}</span>
    <a class="demo-back" href="../index.html">← Все варианты</a>
    <div id="toast" class="toast"></div>
    <div id="app"></div>
    <script type="module" src="app.js"></script>
  </body>
</html>`
  );

  fs.writeFileSync(path.join(dir, "style.css"), `/* ${v.id} */\n${v.shellCss || ""}`);

  const extra = v.extraMount ? `\n${v.extraMount.trim()}` : "";

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "${v.domain}", mode: "${v.mode}" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-${v.id}"
});
const nav = bindNavInteractions(root, state);${extra}
bindDemoActions();
`
  );
}

const cards = VARIANTS.map(
  (v) => `
      <article class="card">
        <span class="tag">${v.num}</span>
        <h2>${v.title}</h2>
        <p>${v.desc}</p>
        <a class="demo" href="./${v.id}/index.html">Открыть</a>
      </article>`
).join("");

fs.writeFileSync(
  path.join(ROOT, "index.html"),
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Examples4 — навигация по доменам</title>
    <style>
      :root { --bg: #f5f7fb; --panel: #fff; --border: #d7deeb; --text: #1f2937; --muted: #6b7280; --accent: #2563eb; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 860px; line-height: 1.55; margin: 0 0 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #eff6ff; color: #1e40af; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .pill { font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; }
      .vision { max-width: 860px; margin-bottom: 28px; padding: 18px 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; line-height: 1.55; font-size: 14px; }
      .vision h2 { margin: 0 0 10px; font-size: 16px; }
      .vision ul { margin: 8px 0 0; padding-left: 20px; }
    </style>
  </head>
  <body>
    <h1>Examples4 — навигация по доменам</h1>
    <p class="lead">
      25 прототипов только навигации ноды: как показать пять доменов
      (Навигация · Память · Вложения · Настройки · Автоматизация) и переключать подрежимы.
      Содержимое — превью-панель, не полный редактор.
    </p>
    <div class="pill-row">
      <span class="pill">🧭 Навигация</span>
      <span class="pill">🧠 Память</span>
      <span class="pill">📎 Вложения</span>
      <span class="pill">⚙️ Настройки</span>
      <span class="pill">⚡ Автоматизация</span>
    </div>
    <section class="vision">
      <h2>Как я это вижу (кратко)</h2>
      <p><strong>Навигация</strong> — мета-слой: граф, MOC, индекс. Не хранит текст заметки, а показывает связи.</p>
      <p><strong>Память</strong> — основной рабочий домен (80% времени): inbox, _Content, internal, TODO.</p>
      <p><strong>Вложения</strong> — бинарники и превью (_Assets, _Preview), без «Содержимое»-редактора для списков.</p>
      <p><strong>Настройки</strong> — редкий домен: описание ноды, конфиги, скрипты, .env — ниже по rail.</p>
      <p><strong>Автоматизация</strong> — самый редкий: расписание, heartbeat — отдельно от настроек.</p>
      <p>Рекомендация: вариант <strong>25</strong> (кластер 🧭🧠📎 + flyout + контекст в содержимом). Подробнее: <a href="./VISION.md">VISION.md</a>.</p>
    </section>
    <p class="lead" style="font-size:13px;">
      Запуск: <code>cd documentation/examples/4 && python3 -m http.server 8768</code> →
      <a href="http://localhost:8768">http://localhost:8768</a>
      · <code>node generate.mjs</code>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in examples/4/`);
