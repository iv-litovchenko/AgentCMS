#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const VARIANTS = [
  {
    id: "01-production-row",
    num: "01",
    title: "Production single row",
    desc: "Как сейчас в CMS: select · префикс+крошки · доп.кнопки · просмотр · Сохранить/Удалить — всё в одной строке.",
    layout: "01-production-row",
    css: ""
  },
  {
    id: "02-select-then-crumbs",
    num: "02",
    title: "Select → path",
    desc: "Сначала select подрежима, затем путь без текстового префикса — домен читается из выпадающего списка.",
    layout: "02-select-then-crumbs",
    css: ""
  },
  {
    id: "03-crumbs-then-select",
    num: "03",
    title: "Path → select",
    desc: "Префикс и путь слева, select подрежима сразу после крошек — удобно, если путь важнее режима.",
    layout: "03-crumbs-then-select",
    css: ""
  },
  {
    id: "04-mode-segments",
    num: "04",
    title: "Segment chips",
    desc: "Вместо select — горизонтальные chips подрежимов (TODO, .env, Скрипты…) прямо в строке крошек.",
    layout: "04-mode-segments",
    css: `.mode-rail--inline { display: inline-flex; flex-wrap: nowrap; gap: 4px; padding: 0; border: 0; background: transparent; margin-left: 8px; }
.mode-rail--inline button { padding: 2px 8px; font-size: 10px; }`
  },
  {
    id: "05-two-row-anti",
    num: "05",
    title: "Two rows (anti)",
    desc: "Две строки: домен+select сверху, крошки+кнопки снизу. Антипаттерн — для сравнения с однострочным вариантом.",
    layout: "05-two-row-anti",
    css: `.path-header--stack { flex-direction: column; align-items: stretch; gap: 6px; }
.path-header-row { display: flex; align-items: center; gap: 10px; min-width: 0; }`
  },
  {
    id: "06-chip-prefix",
    num: "06",
    title: "Chip prefix",
    desc: "Доменный префix — цветной pill-chip, путь без дублирующего текста «Настройки ноды» в крошках.",
    layout: "06-chip-prefix",
    css: ""
  },
  {
    id: "07-zoned-toolbar",
    num: "07",
    title: "Three zones",
    desc: "Три зоны с вертикальными разделителями: select | крошки | действия — чёткая структура toolbar.",
    layout: "07-zoned-toolbar",
    css: `.path-header--zones { gap: 0; padding: 0; }
.path-header--zones .zone { display: flex; align-items: center; gap: 8px; padding: 9px 12px; min-width: 0; }
.path-header--zones .zone-crumbs { flex: 1; overflow: hidden; }
.path-header--zones .zone-crumbs .breadcrumbs { flex: 1; }`
  },
  {
    id: "08-actions-first",
    num: "08",
    title: "Actions first",
    desc: "Кнопки слеva — спорный, но удобен для частого Save на широких мониторах.",
    layout: "08-actions-first",
    css: `.path-header .path-actions { margin-left: 0; margin-right: 8px; }`
  },
  {
    id: "09-overflow-menu",
    num: "09",
    title: "Overflow ⋯",
    desc: "Крошки на всю ширину, Save/Delete спрятаны в меню ⋯ — минимум шума в шапке.",
    layout: "09-overflow-menu",
    css: ""
  },
  {
    id: "10-icons-only",
    num: "10",
    title: "Icon actions",
    desc: "Служебные кнопки — только иконки 💾⚙🗑, текст в tooltip.",
    layout: "10-icons-only",
    css: ""
  },
  {
    id: "11-service-minimal",
    num: "11",
    title: "Service file minimal",
    desc: "Служебный файл: только путь + 🔒 + Сохранить, без select и Удалить.",
    layout: "11-service-minimal",
    css: "",
    initial: "service"
  },
  {
    id: "12-memory-extended",
    num: "12",
    title: "Memory extended",
    desc: "Память: select · крошки · «Создать воспоминание» · «Создать раздел» · вид · действия.",
    layout: "12-memory-extended",
    css: `.path-actions--extra { margin-left: 0; margin-right: 0; }`,
    initial: "memory"
  },
  {
    id: "13-view-center",
    num: "13",
    title: "View toggle center",
    desc: "Переключатель Просмотр/Редактировать/Источник — между крошками и кнопками Save.",
    layout: "13-view-center",
    css: `.path-header .view-toggle { margin-left: auto; }
.path-header .path-actions { margin-left: 8px; }`
  },
  {
    id: "14-divider-groups",
    num: "14",
    title: "Divider groups",
    desc: "Select | крошки | действия — группы отделены вертикальными линиями.",
    layout: "14-divider-groups",
    css: ""
  },
  {
    id: "15-glass-sticky",
    num: "15",
    title: "Glass sticky",
    desc: "Липкая полупрозрачная шапка с blur — крошки остаются видимы при скролле контента.",
    layout: "15-glass-sticky",
    css: `.path-header--glass { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px); background: rgba(255,255,255,0.82) !important; }
.preview-body { min-height: 120vh; }`
  },
  {
    id: "16-compact-dense",
    num: "16",
    title: "Compact 24px",
    desc: "Плотная шапка: меньше padding и шрифт — больше места редактору.",
    layout: "16-compact-dense",
    css: `.path-header--compact { padding: 5px 12px; gap: 6px; }
.path-header--compact .breadcrumbs { font-size: 10px; }
.path-header--compact .btn, .path-header--compact .view-toggle button { height: 24px; font-size: 10px; }
.path-header--compact .domain-select { padding: 3px 24px 3px 8px; font-size: 10px; }`
  },
  {
    id: "17-truncate-path",
    num: "17",
    title: "Truncate path",
    desc: "Длинный путь обрезается ellipsis посередине — select и кнопки всегда видны.",
    layout: "17-truncate-path",
    css: `.breadcrumbs--truncate { mask-image: linear-gradient(90deg, #000 85%, transparent); }`
  },
  {
    id: "18-select-as-crumb",
    num: "18",
    title: "Select inside crumbs",
    desc: "Select подрежима встроен в nav крошек как сегмент пути — визуально единая цепочка.",
    layout: "18-select-as-crumb",
    css: `.domain-select--inline { max-width: 180px; padding: 1px 22px 1px 4px; border: 0; background: transparent; font-size: inherit; font-weight: inherit; height: auto; }`
  },
  {
    id: "19-service-title-below",
    num: "19",
    title: "Service + title row",
    desc: "Служебный файл: строка 1 — крошки+Save; строка 2 — крупное имя файла (как docker-compose.yml).",
    layout: "19-service-title-below",
    css: `.path-header-row--title { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 18px; font-weight: 700; padding-top: 2px; }`,
    initial: "service"
  },
  {
    id: "20-crumb-actions",
    num: "20",
    title: "Actions as crumbs",
    desc: "Сохранить и Удалить оформлены как последние «крошки» — максимально компактно.",
    layout: "20-crumb-actions",
    css: `.breadcrumbs--actions { flex: 0; }
.breadcrumb-action { color: var(--accent) !important; cursor: pointer; font-weight: 600; }
.breadcrumb-action--danger { color: var(--danger) !important; }`
  },
  {
    id: "21-wrap-responsive",
    num: "21",
    title: "Wrap on narrow",
    desc: "flex-wrap: элементы переносятся на вторую строку на узком экране вместо overflow.",
    layout: "21-wrap-responsive",
    css: `.path-header--wrap { flex-wrap: wrap; }
.path-header--wrap .breadcrumbs { flex: 1 1 200px; flex-wrap: wrap; }
.path-header--wrap .path-actions { margin-left: auto; }`
  },
  {
    id: "22-overview-quiet",
    num: "22",
    title: "Overview quiet",
    desc: "Обзор ноды: только префix+путь без Save/Delete в шапке — действия в hero-блоке.",
    layout: "22-overview-quiet",
    css: "",
    initial: "overview"
  },
  {
    id: "23-mode-rail-below",
    num: "23",
    title: "Mode rail below",
    desc: "Строка 1 — крошки+Save; строка 2 — chips подрежимов настроек (только для settings).",
    layout: "23-mode-rail-below",
    css: ""
  },
  {
    id: "24-slab-stack",
    num: "24",
    title: "Slab stack",
    desc: "Шапка как отдельная «плита» doc-slab-path — визуально отделена от контента, как в production.",
    layout: "24-slab-stack",
    css: `.path-slab { margin: 0; border-bottom: 1px solid var(--border); background: var(--panel); }
.path-slab-row { display: flex; align-items: center; gap: 10px; padding: 9px 16px; min-width: 0; }
.path-slab.ctx-settings { background: var(--settings-soft); }
.path-slab.ctx-memory { background: var(--memory-soft); }
.path-slab.ctx-overview { background: var(--overview-soft); }
.path-slab.ctx-service { background: var(--service-soft); }`
  },
  {
    id: "25-recommended-blend",
    num: "25",
    title: "Recommended blend",
    desc: "Рекомендуемый: одна строка, select слева, префикс inline в крошках, memory-кнопки по контексту.",
    layout: "25-recommended-blend",
    css: ""
  }
];

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

  fs.writeFileSync(
    path.join(dir, "style.css"),
    `/* ${v.id} */\n.workspace { display: flex; flex-direction: column; min-height: 0; flex: 1; }\n${v.css || ""}`
  );

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { initVariant } from "../shared-mock.js";

initVariant(document.getElementById("app"), "${v.layout}", "variant-${v.id}", "${v.initial || "settings"}");
`
  );
}

const cards = VARIANTS.map(
  (v) => `
      <article class="card${v.id === "25-recommended-blend" ? " focus-card" : ""}">
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
    <title>Example9 — хлебные крошки + select + действия</title>
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
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #ecfdf5; color: #047857; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      .focus-card { border-color: #86efac; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .pill { font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
      .vision { max-width: 860px; margin-bottom: 28px; padding: 18px 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; line-height: 1.55; font-size: 14px; }
      .vision h2 { margin: 0 0 10px; font-size: 16px; }
      .vision ul { margin: 8px 0 0; padding-left: 20px; }
    </style>
  </head>
  <body>
    <h1>Example9 — хлебные крошки + select + действия</h1>
    <p class="lead">
      25 прототипов шапки workspace: как совместить <strong>select подрежима</strong>,
      <strong>хлебные крошки</strong> (служебные / обычные / доменные) и
      <strong>служебные кнопки</strong> (Сохранить, Удалить, Просмотр…).
      В каждом варианте переключатель контекста сверху.
    </p>
    <div class="pill-row">
      <span class="pill">Служебный файл</span>
      <span class="pill">Обычные крошки</span>
      <span class="pill">Настройки ноды</span>
      <span class="pill">Память ноды</span>
      <span class="pill">Обзор ноды</span>
    </div>
    <section class="vision">
      <h2>Три типа навигации</h2>
      <ul>
        <li><strong>Служебные файлы</strong> — docker-compose.yml, AGENTS.md: путь + 🔒 + Save, без select и Delete.</li>
        <li><strong>Обычные крошки</strong> — документ в дереве без доменного префixа.</li>
        <li><strong>Крошки документа и раздела</strong> — префix «Настройки/Память/Обзор» + select подрежима + путь.</li>
      </ul>
      <p>Рекомендация: вариант <strong>25</strong> или <strong>01</strong> — одна строка, как в текущем Agent CMS.</p>
    </section>
    <p class="lead" style="font-size:13px;">
      Запуск: <code>cd documentation/examples/9 && python3 -m http.server 8770</code> →
      <a href="http://localhost:8770">http://localhost:8770</a>
      · <code>node generate.mjs</code>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in documentation/examples/9/`);
