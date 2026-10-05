import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const variants = [
  {
    dir: "01-production-grid",
    badge: "01 · Production grid",
    title: "01 — сетка 4×2 (как сейчас)",
    desc: "Baseline: карточки в grid 4 колонки, иконка + число + stacked label.",
    catalog: "Production grid",
    catalogDesc: "Как в проде: 4 колонки, карточка, «Разрешенные типы» подписью."
  },
  {
    dir: "02-compact-rows",
    badge: "02 · Compact rows",
    title: "02 — компактные строки",
    desc: "Одна колонка: иконка, название, типы — счётчик справа.",
    catalog: "Compact rows",
    catalogDesc: "Строки вместо плиток — меньше высоты блока."
  },
  {
    dir: "03-pill-strip",
    badge: "03 · Pill strip",
    title: "03 — горизонтальные чипы",
    desc: "Scroll-x: emoji + label + badge-count.",
    catalog: "Pill strip",
    catalogDesc: "Лента чипов с горизонтальным скроллом."
  },
  {
    dir: "04-bento",
    badge: "04 · Bento",
    title: "04 — bento-плитки",
    desc: "Память и входящие крупнее, нули — узкие.",
    catalog: "Bento mosaic",
    catalogDesc: "Разный размер плитки по «весу» слота."
  },
  {
    dir: "05-icon-rail",
    badge: "05 · Icon rail",
    title: "05 — вертикальный rail",
    desc: "Узкая колонка иконок + список справа.",
    catalog: "Icon rail",
    catalogDesc: "Слева emoji-rail, справа детали и счётчики."
  },
  {
    dir: "06-kpi",
    badge: "06 · KPI",
    title: "06 — KPI dashboard",
    desc: "Крупные цифры, подпись мелко, без рамок.",
    catalog: "KPI stats",
    catalogDesc: "Dashboard: число доминирует, типы — tooltip."
  },
  {
    dir: "07-segment",
    badge: "07 · Segment",
    title: "07 — сегмент + панель",
    desc: "Вкладки слотов сверху, одна активная панель.",
    catalog: "Segment tabs",
    catalogDesc: "Один активный слот, остальные — табы с count."
  },
  {
    dir: "08-table",
    badge: "08 · Table",
    title: "08 — плотная таблица",
    desc: "Строки как spreadsheet: слот | count | типы.",
    catalog: "Dense table",
    catalogDesc: "Табличный scan для power users."
  },
  {
    dir: "09-color-bands",
    badge: "09 · Color bands",
    title: "09 — цветные группы",
    desc: "Полоса по tabGroup: memory / workspace / files.",
    catalog: "Color bands",
    catalogDesc: "Группировка память · папки · файлы цветом."
  },
  {
    dir: "10-minimal",
    badge: "10 · Minimal",
    title: "10 — минимальные ссылки",
    desc: "Только текст, точки-лидеры и число.",
    catalog: "Minimal links",
    catalogDesc: "Ultra-light: без карточек и рамок."
  }
];

function variantHtml(v) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${v.title}</title>
    <link rel="stylesheet" href="../shared-base.css" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <span class="demo-badge">${v.badge}</span>
    <a class="demo-back" href="../index.html">← Все варианты</a>
    <div id="toast" class="toast"></div>
    <div id="app"></div>
    <script type="module" src="app.js"></script>
  </body>
</html>
`;
}

function variantApp(dir) {
  const id = dir.split("-")[0];
  return `import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "${id}");

${renderFns[id]}

bindDemoActions(document.body);
`;
}

const renderFns = {
  "01": `host.innerHTML = \`
  <div class="v01-grid">
    \${SLOTS.map((s) => \`
      <article class="v01-card\${s.count === 0 ? " slot-empty" : ""}">
        <button type="button" class="v01-counter slot-btn" data-action="open" data-slot="\${s.id}" data-label="\${s.label}">
          <span class="v01-icon">\${s.icon}</span>
          <span class="v01-value">\${s.count}</span>
          \${labelStack(s)}
        </button>
      </article>
    \`).join("")}
  </div>\`;`,

  "02": `host.innerHTML = \`
  <ul class="v02-list">
    \${SLOTS.map((s) => \`
      <li class="v02-row\${s.count === 0 ? " slot-empty" : ""}">
        <button type="button" class="v02-main slot-btn" data-action="open" data-slot="\${s.id}" data-label="\${s.label}">
          <span class="v02-icon">\${s.icon}</span>
          <span class="v02-text">
            <span class="v02-title">\${s.label}\${s.hint ? \` <em>\${s.hint}</em>\` : ""}</span>
            \${typesTrigger(s)}
          </span>
        </button>
        <span class="v02-count">\${s.count}</span>
      </li>
    \`).join("")}
  </ul>\`;`,

  "03": `host.innerHTML = \`
  <div class="v03-scroll">
    \${SLOTS.map((s) => \`
      <button type="button" class="v03-pill slot-btn\${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="\${s.id}" data-label="\${s.label}">
        <span>\${s.icon} \${s.label}</span>
        <span class="v03-badge">\${s.count}</span>
      </button>
    \`).join("")}
  </div>
  <p class="v03-hint">Наведите на чип — типы в title. \${typesTrigger(SLOTS[0]).replace('types-trigger', 'types-trigger v03-types')}</p>\`;`,

  "04": `const weight = (s) => (s.id === "memory" ? "wide" : s.id === "inbox" ? "tall" : s.count === 0 ? "mini" : "normal");
host.innerHTML = \`
  <div class="v04-bento">
    \${SLOTS.map((s) => \`
      <button type="button" class="v04-tile v04-\${weight(s)} slot-btn\${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="\${s.id}">
        <span class="v04-icon">\${s.icon}</span>
        <span class="v04-count">\${s.count}</span>
        <span class="v04-label">\${s.label}</span>
        \${s.hint ? \`<span class="v04-hint">\${s.hint}</span>\` : ""}
        \${typesTrigger(s)}
      </button>
    \`).join("")}
  </div>\`;`,

  "05": `host.innerHTML = \`
  <div class="v05-split">
    <div class="v05-rail" role="tablist">
      \${SLOTS.map((s, i) => \`
        <button type="button" class="v05-rail-btn\${i === 0 ? " is-active" : ""}" data-rail="\${s.id}" aria-label="\${s.label}">
          <span>\${s.icon}</span>
          <span class="v05-rail-count">\${s.count}</span>
        </button>
      \`).join("")}
    </div>
    <div class="v05-detail" data-rail-detail></div>
  </div>\`;
const detail = host.querySelector("[data-rail-detail]");
const renderDetail = (id) => {
  const s = SLOTS.find((x) => x.id === id) || SLOTS[0];
  detail.innerHTML = \`
    <button type="button" class="v05-open slot-btn" data-action="open" data-slot="\${s.id}">
      <h3>\${s.icon} \${s.label}</h3>
      <p class="v05-stat"><strong>\${s.count}</strong> элементов в слоте</p>
      \${s.hint ? \`<p class="v05-meta">\${s.hint}</p>\` : ""}
      \${typesTrigger(s)}
    </button>\`;
};
host.querySelectorAll("[data-rail]").forEach((btn) => {
  btn.addEventListener("click", () => {
    host.querySelectorAll(".v05-rail-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderDetail(btn.dataset.rail);
  });
});
renderDetail("memory");`,

  "06": `host.innerHTML = \`
  <div class="v06-kpi">
    \${SLOTS.map((s) => \`
      <button type="button" class="v06-cell slot-btn\${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="\${s.id}" title="\${s.types}">
        <span class="v06-num">\${s.count}</span>
        <span class="v06-icon">\${s.icon}</span>
        <span class="v06-label">\${s.label}</span>
      </button>
    \`).join("")}
  </div>\`;`,

  "07": `let active = "memory";
const render = () => {
  host.innerHTML = \`
    <div class="v07-tabs" role="tablist">
      \${SLOTS.map((s) => \`
        <button type="button" role="tab" class="v07-tab\${s.id === active ? " is-active" : ""}" data-tab="\${s.id}">
          \${s.icon} \${s.label}
          <span class="v07-tab-count">\${s.count}</span>
        </button>
      \`).join("")}
    </div>
    <div class="v07-panel" role="tabpanel"></div>\`;
  const panel = host.querySelector(".v07-panel");
  const s = SLOTS.find((x) => x.id === active);
  panel.innerHTML = \`
    <button type="button" class="v07-panel-btn slot-btn" data-action="open" data-slot="\${s.id}">
      <span class="v07-panel-count">\${s.count}</span>
      <div>
        <strong>\${s.label}</strong>
        \${s.hint ? \`<div class="v07-sub">\${s.hint}</div>\` : ""}
        \${typesTrigger(s)}
      </div>
    </button>\`;
  host.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      active = btn.dataset.tab;
      render();
      bindDemoActions(document.body);
    });
  });
};
render();`,

  "08": `host.innerHTML = \`
  <table class="v08-table">
    <thead><tr><th>Слот</th><th>Кол-во</th><th>Типы</th></tr></thead>
    <tbody>
      \${SLOTS.map((s) => \`
        <tr class="\${s.count === 0 ? "slot-empty" : ""}">
          <td>
            <button type="button" class="v08-slot slot-btn" data-action="open" data-slot="\${s.id}">
              \${s.icon} \${s.label}\${s.hint ? \` · \${s.hint}\` : ""}
            </button>
          </td>
          <td class="v08-num">\${s.count}</td>
          <td class="v08-types">\${s.types}</td>
        </tr>
      \`).join("")}
    </tbody>
  </table>\`;`,

  "09": `const groupLabel = { memory: "Память", workspace: "Папки", files: "Файлы", todo: "Задачи" };
const groups = [...new Set(SLOTS.map((s) => s.group))];
host.innerHTML = groups.map((g) => \`
  <section class="v09-group v09-\${g}">
    <h3 class="v09-head">\${groupLabel[g] || g}</h3>
    <ul class="v09-list">
      \${SLOTS.filter((s) => s.group === g).map((s) => \`
        <li class="\${s.count === 0 ? "slot-empty" : ""}">
          <button type="button" class="v09-row slot-btn" data-action="open" data-slot="\${s.id}">
            <span class="v09-icon">\${s.icon}</span>
            <span class="v09-label">\${s.label}</span>
            <span class="v09-count">\${s.count}</span>
          </button>
          \${typesTrigger(s)}
        </li>
      \`).join("")}
    </ul>
  </section>
\`).join("");`,

  "10": `host.innerHTML = \`
  <nav class="v10-nav" aria-label="Слоты">
    \${SLOTS.map((s) => \`
      <button type="button" class="v10-link slot-btn\${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="\${s.id}">
        <span class="v10-left">\${s.icon} \${s.label}</span>
        <span class="v10-dots" aria-hidden="true"></span>
        <span class="v10-right">\${s.count}</span>
      </button>
    \`).join("")}
  </nav>
  <p class="v10-foot">Типы — по клику на слот в проде открывается schema; здесь — \${typesTrigger(SLOTS[1])}</p>\`;`
};

const styles = {
  "01": `.v01-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.v01-card{border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;overflow:hidden}
.v01-counter{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;min-height:68px;padding:8px 6px}
.v01-icon{font-size:18px;line-height:1}
.v01-value{font-size:20px;font-weight:800;color:#0f172a;line-height:1}`,

  "02": `.v02-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.v02-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
.v02-main{display:flex;align-items:center;gap:10px;flex:1;min-width:0;text-align:left}
.v02-icon{font-size:18px}
.v02-title{font-size:13px;font-weight:700}
.v02-title em{font-style:normal;font-weight:500;color:#64748b;font-size:11px}
.v02-count{font-size:15px;font-weight:800;color:#1d4ed8;min-width:2ch;text-align:right}`,

  "03": `.v03-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.v03-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;white-space:nowrap;font-size:12px;font-weight:600}
.v03-badge{font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px;background:#eff6ff;color:#1d4ed8}
.v03-hint{margin:10px 0 0;font-size:11px;color:#64748b}
.v03-types{margin-left:4px}`,

  "04": `.v04-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:72px;gap:8px}
.v04-tile{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:2px;padding:10px;border-radius:12px;border:1px solid #e2e8f0;background:linear-gradient(145deg,#fff,#f1f5f9);text-align:left;min-width:0}
.v04-wide{grid-column:span 2;grid-row:span 2;background:linear-gradient(145deg,#eff6ff,#dbeafe)}
.v04-tall{grid-row:span 2}
.v04-mini{opacity:.7}
.v04-icon{font-size:20px}
.v04-count{font-size:22px;font-weight:900;line-height:1}
.v04-label{font-size:11px;font-weight:700}
.v04-hint{font-size:9px;color:#64748b}`,

  "05": `.v05-split{display:grid;grid-template-columns:56px 1fr;gap:12px;min-height:280px}
.v05-rail{display:flex;flex-direction:column;gap:6px}
.v05-rail-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:16px}
.v05-rail-btn.is-active{border-color:#93c5fd;background:#eff6ff;box-shadow:0 0 0 2px rgba(37,99,235,.15)}
.v05-rail-count{font-size:10px;font-weight:800;color:#1d4ed8}
.v05-detail{border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc}
.v05-open{width:100%;text-align:left}
.v05-open h3{margin:0 0 8px;font-size:16px}
.v05-stat{margin:0 0 6px;font-size:13px;color:#475569}
.v05-meta{margin:0 0 8px;font-size:12px;color:#64748b}`,

  "06": `.v06-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.v06-cell{display:flex;flex-direction:column;align-items:center;padding:12px 8px;border-radius:10px;background:transparent;border:0;position:relative}
.v06-cell:hover{background:#f1f5f9}
.v06-num{font-size:28px;font-weight:900;line-height:1;color:#0f172a}
.v06-icon{font-size:14px;margin-top:4px}
.v06-label{font-size:10px;font-weight:700;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.04em}`,

  "07": `.v07-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.v07-tab{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;cursor:pointer}
.v07-tab.is-active{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
.v07-tab-count{font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.08)}
.v07-tab.is-active .v07-tab-count{background:rgba(255,255,255,.25)}
.v07-panel{border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc}
.v07-panel-btn{display:flex;align-items:center;gap:14px;width:100%;text-align:left}
.v07-panel-count{font-size:32px;font-weight:900;color:#1d4ed8;min-width:48px}
.v07-sub{font-size:12px;color:#64748b;margin-top:2px}`,

  "08": `.v08-table{width:100%;border-collapse:collapse;font-size:12px}
.v08-table th,.v08-table td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:middle}
.v08-table th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;background:#f8fafc}
.v08-slot{font-weight:600}
.v08-num{font-weight:800;font-variant-numeric:tabular-nums;color:#1d4ed8;width:48px}
.v08-types{font-size:10px;color:#64748b;font-family:ui-monospace,Menlo,monospace}`,

  "09": `.v09-group{margin-bottom:14px}
.v09-head{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.v09-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.v09-row{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;text-align:left}
.v09-icon{font-size:16px}
.v09-label{flex:1;font-size:13px;font-weight:600}
.v09-count{font-weight:800;font-size:13px}
.v09-memory .v09-row{border-left:4px solid #3b82f6}
.v09-workspace .v09-row{border-left:4px solid #10b981}
.v09-files .v09-row{border-left:4px solid #f59e0b}
.v09-todo .v09-row{border-left:4px solid #8b5cf6}
.v09-list .types-trigger{margin-left:10px}`,

  "10": `.v10-nav{display:flex;flex-direction:column;gap:2px}
.v10-link{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;width:100%;padding:6px 4px;border:0;background:transparent;font-size:13px;font-weight:600;color:#334155}
.v10-link:hover{color:#1d4ed8}
.v10-dots{border-bottom:1px dotted #cbd5e1;margin:0 4px;min-width:24px;height:1px}
.v10-right{font-variant-numeric:tabular-nums;font-weight:800;color:#1d4ed8}
.v10-foot{margin:12px 0 0;font-size:11px;color:#64748b}`
};

for (const v of variants) {
  const dir = path.join(root, v.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), variantHtml(v));
  const id = v.dir.slice(0, 2);
  fs.writeFileSync(path.join(dir, "app.js"), variantApp(v.dir));
  fs.writeFileSync(path.join(dir, "style.css"), styles[id] + "\n");
}

const catalogCards = variants
  .map(
    (v, i) => `
      <article class="card">
        <span class="tag">${String(i + 1).padStart(2, "0")}</span>
        <h2>${v.catalog}</h2>
        <p>${v.catalogDesc}</p>
        <a class="open" href="./${v.dir}/">Открыть</a>
      </article>`
  )
  .join("");

const indexHtml = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Example15 — слоты workspace counter</title>
    <style>
      :root { --bg: #f5f7fb; --panel: #fff; --border: #d7deeb; --text: #1f2937; --muted: #6b7280; --accent: #0d9488; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 820px; line-height: 1.55; margin: 0 0 18px; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
      .pill { font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; }
      a.ghost { background: #fff; color: #0f766e; border: 1px solid #99f6e4; }
      .vision { max-width: 820px; margin-bottom: 24px; padding: 16px 18px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; font-size: 14px; line-height: 1.55; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #ccfbf1; color: #0f766e; width: fit-content; }
      a.open { display: inline-flex; padding: 7px 12px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 12px; font-weight: 700; width: fit-content; }
      code { font-size: 12px; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <p><a href="../index.html" style="color:#0d9488;font-size:13px">← Все примеры</a></p>
    <h1>Example15 — слоты workspace counter</h1>
    <p class="lead">
      Блок <code>node-navigation-workspace-counter-list</code> на обзоре ноды: 🧠 Память, 📥 Входящие, 📒 Заметки…
      Сейчас — сетка карточек 4×N с подписью «Разрешенные типы». Здесь 10 альтернатив без смены данных.
    </p>
    <div class="pill-row">
      <span class="pill">overview hub</span>
      <span class="pill">slot counters</span>
      <span class="pill">618px frame</span>
    </div>
    <div class="actions">
      <a class="demo" href="./compare.html">Сетка сравнения</a>
      <a class="demo ghost" href="./01-production-grid/">Baseline #01</a>
    </div>
    <section class="vision">
      <strong>Контекст:</strong> ui-variant-13 — куда положить слоты в layout; ui-variant-15 — как их <em>нарисовать</em> внутри hub-main.
      Рекомендация для старта: сравнить #01 (прод), #02 (компакт), #09 (группы по schema).
    </section>
    <p class="lead" style="font-size:13px">
      Запуск: <code>cd public/examples/ui-variant-15 && python3 -m http.server 8775</code>
    </p>
    <div class="grid">${catalogCards}
    </div>
  </body>
</html>
`;

fs.writeFileSync(path.join(root, "index.html"), indexHtml);

const compareIframes = variants
  .map(
    (v, i) => `
      <figure><figcaption>${String(i + 1).padStart(2, "0")} ${v.catalog} <a href="./${v.dir}/">открыть</a></figcaption><iframe src="./${v.dir}/index.html" title="${v.catalog}"></iframe></figure>`
  )
  .join("");

fs.writeFileSync(
  path.join(root, "compare.html"),
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Compare — workspace slot counters</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #eef2f7; color: #1f2937; padding: 20px 16px 32px; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      .lead { margin: 0 0 16px; color: #64748b; font-size: 13px; }
      a { color: #0d9488; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
      figure { margin: 0; background: #fff; border: 1px solid #d7deeb; border-radius: 12px; overflow: hidden; }
      figcaption { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; font-size: 12px; font-weight: 700; border-bottom: 1px solid #eef2f7; }
      iframe { display: block; width: 100%; height: 380px; border: 0; background: #eef2f7; }
    </style>
  </head>
  <body>
    <p><a href="./index.html">← Каталог</a></p>
    <h1>Сетка сравнения — слоты</h1>
    <p class="lead">Одинаковые mock-данные (35 / 6 / 0 / 3 / …) во всех кадрах.</p>
    <div class="grid">${compareIframes}
    </div>
  </body>
</html>
`
);

fs.writeFileSync(
  path.join(root, "VISION.md"),
  `# Examples15 — workspace slot counters

## Задача

10 прототипов блока **счётчиков слотов** на обзоре ноды (\`ul.node-navigation-workspace-counter-list\`):
иконка, число элементов, название слота, подсказка «многофайловая», ссылка **Разрешенные типы**.

Examples13 отвечает на вопрос «куда в layout положить слоты».  
Examples15 — «как их оформить», не меняя семантику клика.

## Индекс

| # | Фокус |
|---|--------|
| 01 | Production grid — baseline как в CMS |
| 02 | Compact rows — одна колонка |
| 03 | Pill strip — горизонтальные чипы |
| 04 | Bento — разный размер плиток |
| 05 | Icon rail — навигация слева |
| 06 | KPI — крупные цифры |
| 07 | Segment — табы + одна панель |
| 08 | Dense table |
| 09 | Color bands по tabGroup schema |
| 10 | Minimal dot leaders |

Запуск: \`cd public/examples/ui-variant-15 && python3 -m http.server 8775\`
`
);

console.log("Generated", variants.length, "variants in", root);
