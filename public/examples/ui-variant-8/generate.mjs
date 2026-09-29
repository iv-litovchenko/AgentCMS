#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildReplacements } from "./shared-mock.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const SHORTLIST_NUMS = ["24", "03", "04", "05", "06", "10", "13", "14", "15", "16", "17", "18"];

const VARIANTS = [
  {
    id: "01-classic-cards",
    num: "01",
    title: "Classic cards",
    desc: "Как в CMS сейчас: три карточки в grid, кнопка «Открыть» внизу каждой.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai · обзор ноды · блок памяти</p>{{gridClassic}}</div>`,
    css: ""
  },
  {
    id: "02-horizontal-row",
    num: "02",
    title: "Horizontal row",
    desc: "Три равные колонки в одну строку, фиксированная высота.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid row-3">{{allCards}}</div></div>`,
    css: `.row-3 { grid-template-columns: repeat(3, 1fr); } .row-3 .mem-card { min-height: 200px; }`
  },
  {
    id: "03-compact-list",
    num: "03",
    title: "Compact list",
    desc: "Строки вместо карточек — меньше воздуха, chevron справа.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-list">{{allRows}}</div></div>`,
    css: ``
  },
  {
    id: "04-stacked-panels",
    num: "04",
    title: "Stacked panels",
    desc: "Full-width панели друг под другом с цветной полосой слева.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="stack">{{cardInternal}}{{cardExternal}}{{cardTabular}}</div></div>`,
    css: `.stack { display: flex; flex-direction: column; gap: 10px; }
.stack .mem-card { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px 16px; }
.stack .mem-card-head { flex: 1; min-width: 180px; }
.stack .mem-card--internal { border-left: 4px solid #3b82f6; }
.stack .mem-card--external { border-left: 4px solid #f59e0b; }
.stack .mem-card--tabular { border-left: 4px solid #22c55e; }
.stack .mem-open { margin-top: 0; }`
  },
  {
    id: "05-icon-tiles",
    num: "05",
    title: "Icon tiles",
    desc: "Крупные иконки, минимум текста — быстрый scan.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-tile-grid">
        <button type="button" class="mem-tile" data-action="open" data-label="Краткая"><span class="mem-tile-icon">📝</span><strong>Краткая</strong><span class="mem-stat">842</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Архив"><span class="mem-tile-icon">📁</span><strong>Архив</strong><span class="mem-stat">12</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Таблица"><span class="mem-tile-icon">📊</span><strong>Таблица</strong><span class="mem-stat">4×3</span></button>
      </div></div>`,
    css: `.mem-tile { border: none; font: inherit; color: inherit; background: var(--panel-soft); border: 1px solid var(--border); }`
  },
  {
    id: "06-stats-kpi",
    num: "06",
    title: "Stats KPI",
    desc: "Числа крупно — dashboard-стиль, подпись мелко.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-kpi-grid">
        <button type="button" class="mem-kpi" data-action="open" data-label="Краткая"><span class="mem-kpi-val">842</span><span class="mem-kpi-label">📝 символов</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Архив"><span class="mem-kpi-val">12</span><span class="mem-kpi-label">📁 записей</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Таблица"><span class="mem-kpi-val">4</span><span class="mem-kpi-label">📊 строк CSV</span></button>
      </div></div>`,
    css: `.mem-kpi { background: var(--panel); font: inherit; color: inherit; }`
  },
  {
    id: "07-tabs-drivers",
    num: "07",
    title: "Tabs drivers",
    desc: "Один драйвер на вкладку — меньше шума на экране.",
    body: `<div class="mem-stage mem-host"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-tabs" data-mem-tabs>
        <button type="button" class="active" data-driver="internal">📝 Краткая</button>
        <button type="button" data-driver="external">📁 Архив</button>
        <button type="button" data-driver="tabular">📊 Таблица</button>
      </div>
      <div data-mem-panel="internal">{{cardInternal}}</div>
      <div class="hidden" data-mem-panel="external">{{cardExternal}}</div>
      <div class="hidden" data-mem-panel="tabular">{{cardTabular}}</div>
    </div>`,
    css: `.mem-host [data-mem-panel] .mem-card { max-width: 420px; }`,
    bindAll: true
  },
  {
    id: "08-accordion",
    num: "08",
    title: "Accordion",
    desc: "Свёрнуто по умолчанию — раскрываешь только нужный драйвер.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <details class="mem-acc" open><summary>📝 Краткая память · 842 симв.</summary><div class="mem-acc-body"><p>_.node.content.md</p><p>Краткие заметки о тоне и стиле…</p><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></div></details>
      <details class="mem-acc"><summary>📁 Архив · 12 записей</summary><div class="mem-acc-body"><p>_Content/</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></div></details>
      <details class="mem-acc"><summary>📊 Таблица · 4 строки</summary><div class="mem-acc-body"><p>_.node.content.csv</p><p>name · role · status</p><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></div></details>
    </div>`,
    css: ``
  },
  {
    id: "09-summary-table",
    num: "09",
    title: "Summary table",
    desc: "Одна таблица — три строки, клик по строке.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <table class="mem-table"><thead><tr><th>Драйвер</th><th>Путь</th><th>Статус</th></tr></thead><tbody>
        <tr data-action="open" data-label="Краткая"><td>📝 Краткая</td><td>_.node.content.md</td><td>842 симв.</td></tr>
        <tr data-action="open" data-label="Архив"><td>📁 Архив</td><td>_Content/</td><td>12 записей</td></tr>
        <tr data-action="open" data-label="Таблица"><td>📊 Таблица</td><td>_.node.content.csv</td><td>4×3</td></tr>
      </tbody></table></div>`,
    css: ``
  },
  {
    id: "10-minimal-badges",
    num: "10",
    title: "Minimal badges",
    desc: "Только ссылки с badge-stat — ultra minimal.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-minimal">
        <a href="#" class="mem-min-link" data-action="open" data-label="Краткая">📝 Краткая память <span class="mem-chip-badge">842</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Таблица">📊 Таблица <span class="mem-chip-badge">4×3</span></a>
      </div></div>`,
    css: `.mem-minimal { display: flex; flex-direction: column; gap: 10px; }
.mem-min-link { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--text); font-size: 14px; font-weight: 500; }
.mem-min-link:hover { background: var(--accent-soft); }`
  },
  {
    id: "11-column-dividers",
    num: "11",
    title: "Column dividers",
    desc: "Три колонки с вертикальными разделителями.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-cols">{{cardInternal}}{{cardExternal}}{{cardTabular}}</div></div>`,
    css: `.mem-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
.mem-cols .mem-card { border-radius: 0; border: 0; border-right: 1px solid var(--border); background: transparent; box-shadow: none; }
.mem-cols .mem-card:last-child { border-right: 0; }`
  },
  {
    id: "12-preview-snippet",
    num: "12",
    title: "Preview snippet",
    desc: "Мини-превью содержимого в monospace-блоке.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid">{{cardInternalPreview}}{{cardExternal}}{{cardTabular}}</div></div>`,
    css: `.mem-snippet { font-family: ui-monospace, monospace; font-size: 11px; background: #1e293b; color: #e2e8f0; padding: 8px 10px; border-radius: 6px; margin: 0; line-height: 1.4; }`,
    extraRepl: {
      "{{cardInternalPreview}}": `<article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 симв.</p><pre class="mem-snippet">Тон: тёплый, без воды.\nСтиль: компетентный…</pre><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></article>`
    }
  },
  {
    id: "13-chip-bar",
    num: "13",
    title: "Chip bar",
    desc: "Горизонтальные chips — компактно в одну линию.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-chip-bar">
        <button type="button" class="mem-chip" data-action="open" data-label="Краткая">📝 Краткая <span class="mem-chip-badge">842</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Таблица">📊 CSV <span class="mem-chip-badge">4×3</span></button>
      </div></div>`,
    css: `.mem-chip { border: none; font: inherit; color: inherit; }`
  },
  {
    id: "14-notion-rows",
    num: "14",
    title: "Notion rows",
    desc: "Database row — свойство слева, значение справа.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-notion">
        <button type="button" class="mem-nrow" data-action="open" data-label="Краткая"><span class="mem-nprop">📝 Краткая</span><span class="mem-nval">842 симв. · excerpt</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Архив"><span class="mem-nprop">📁 Архив</span><span class="mem-nval">12 · Профиль.md, FAQ…</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Таблица"><span class="mem-nprop">📊 Таблица</span><span class="mem-nval">name · role · status</span><span class="mem-chevron">›</span></button>
      </div></div>`,
    css: `.mem-notion { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.mem-nrow { display: grid; grid-template-columns: 140px 1fr 24px; gap: 12px; width: 100%; padding: 12px 14px; border: 0; border-bottom: 1px solid var(--border); background: var(--panel); text-align: left; font: inherit; cursor: pointer; align-items: center; }
.mem-nrow:last-child { border-bottom: 0; }
.mem-nrow:hover { background: var(--accent-soft); }
.mem-nprop { font-weight: 600; font-size: 13px; }
.mem-nval { font-size: 12px; color: var(--muted); }`
  },
  {
    id: "15-sidebar-labels",
    num: "15",
    title: "Sidebar labels",
    desc: "Фиксированные labels слева, контент и stat справа.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-side-rows">
        <div class="mem-siderow"><span class="mem-sidelabel">Internal</span><div><strong>Краткая память</strong><p class="mem-excerpt">Краткие заметки…</p></div><button class="mem-open" data-action="open" data-label="Краткая">842 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">External</span><div><strong>Архив</strong><p class="mem-excerpt">Профиль.md · FAQ.md</p></div><button class="mem-open" data-action="open" data-label="Архив">12 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">Tabular</span><div><strong>Таблица</strong><p class="mem-excerpt">name · role · status</p></div><button class="mem-open" data-action="open" data-label="Таблица">4×3 →</button></div>
      </div></div>`,
    css: `.mem-siderow { display: grid; grid-template-columns: 72px 1fr auto; gap: 14px; align-items: start; padding: 12px 0; border-bottom: 1px solid var(--border); }
.mem-sidelabel { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); padding-top: 4px; }`
  },
  {
    id: "16-gradient-cards",
    num: "16",
    title: "Gradient cards",
    desc: "Мягкий градиент по типу драйвера.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid grad-grid">{{cardInternal}}{{cardExternal}}{{cardTabular}}</div></div>`,
    css: `.grad-grid .mem-card--internal { background: linear-gradient(135deg, #eff6ff, #dbeafe); border-color: #93c5fd; }
.grad-grid .mem-card--external { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-color: #fcd34d; }
.grad-grid .mem-card--tabular { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #86efac; }`
  },
  {
    id: "17-clickable-card",
    num: "17",
    title: "Clickable card",
    desc: "Вся карточка кликабельна — без отдельной кнопки.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid">{{clickInternal}}{{clickExternal}}{{clickTabular}}</div></div>`,
    css: `.mem-click { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; border: none; font: inherit; text-align: left; width: 100%; color: inherit; }
.mem-click:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.mem-click .mem-open { display: none; }`,
    extraRepl: {
      "{{clickInternal}}": `<button type="button" class="mem-card mem-click" data-action="open" data-label="Краткая"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p></button>`,
      "{{clickExternal}}": `<button type="button" class="mem-card mem-click" data-action="open" data-label="Архив"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul></button>`,
      "{{clickTabular}}": `<button type="button" class="mem-card mem-click" data-action="open" data-label="Таблица"><div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div><p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p></button>`
    }
  },
  {
    id: "18-chevron-only",
    num: "18",
    title: "Chevron only",
    desc: "Строки с chevron — без кнопки «Открыть».",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-list">{{allRows}}</div></div>`,
    css: `.mem-row .mem-open { display: none; }`
  },
  {
    id: "19-progress-fill",
    num: "19",
    title: "Progress fill",
    desc: "Визуальная «заполненность» каждого драйвера.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid">
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 / 2000 симв.</p><div class="mem-progress"><span style="width:42%"></span></div><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></article>
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><div class="mem-progress"><span style="width:65%"></span></div><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></article>
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div><p class="mem-stat">4 строки</p><div class="mem-progress"><span style="width:20%"></span></div><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></article>
    </div></div>`,
    css: ``
  },
  {
    id: "20-timeline",
    num: "20",
    title: "Timeline",
    desc: "Вертикальный timeline — три точки памяти.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-timeline">
        <div class="mem-tl-item"><strong>📝 Краткая</strong><p class="mem-excerpt">842 симв. — тон и стиль</p><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></div>
        <div class="mem-tl-item"><strong>📁 Архив</strong><p class="mem-excerpt">12 записей в _Content/</p><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></div>
        <div class="mem-tl-item"><strong>📊 Таблица</strong><p class="mem-excerpt">CSV · name, role, status</p><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></div>
      </div></div>`,
    css: ``
  },
  {
    id: "21-segment-one",
    num: "21",
    title: "Segment one",
    desc: "Segment control — на экране только один драйвер.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}
      <div class="mem-segment" data-mem-segment>
        <button type="button" class="active" data-seg="internal">📝</button>
        <button type="button" data-seg="external">📁</button>
        <button type="button" data-seg="tabular">📊</button>
      </div>
      <div data-seg-panel="internal">{{cardInternal}}</div>
      <div class="hidden" data-seg-panel="external">{{cardExternal}}</div>
      <div class="hidden" data-seg-panel="tabular">{{cardTabular}}</div>
    </div>`,
    css: ``,
    bindAll: true
  },
  {
    id: "22-masonry",
    num: "22",
    title: "Masonry",
    desc: "Разная высота карточек — архив выше (recent list).",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-masonry">{{cardInternal}}{{cardExternalTall}}{{cardTabular}}</div></div>`,
    css: `.mem-masonry { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-items: start; }
.mem-masonry .mem-card--tall { grid-row: span 1; min-height: 240px; }`,
    extraRepl: {
      "{{cardExternalTall}}": `<article class="mem-card mem-card--external mem-card--tall"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li><li>Onboarding.md</li><li>Changelog.md</li></ul><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></article>`
    }
  },
  {
    id: "23-mini-tree",
    num: "23",
    title: "Mini tree",
    desc: "External как мини-дерево папки _Content/.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p>{{memTitle}}<div class="mem-grid">
      {{cardInternal}}
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
        <div class="mem-tree">📁 _Content/<ul><li>📄 Профиль.md</li><li>📄 FAQ.md</li><li>📄 Onboarding.md</li></ul></div>
        <button class="mem-open" data-action="open" data-label="Архив">Открыть архив</button></article>
      {{cardTabular}}
    </div></div>`,
    css: ``
  },
  {
    id: "24-production-compact",
    num: "24",
    title: "Production compact",
    desc: "Рекомендуемый: компактные строки, stat справа, без тяжёлых карточек.",
    body: `<div class="mem-stage"><p class="mem-context">Assistant.Ai · NODE/INDEX · AWN-MEMORY: hybrid</p>{{memTitle}}<div class="mem-list mem-list--compact">{{allRows}}</div></div>`,
    css: `.mem-list--compact .mem-row { padding: 10px 12px; border-radius: 8px; }
.mem-list--compact .mem-excerpt, .mem-list--compact .mem-recent-inline { display: none; }
.mem-list--compact .mem-row:hover .mem-excerpt { display: block; font-size: 11px; margin-top: 4px; }`
  },
  {
    id: "25-compare-columns",
    num: "25",
    title: "Compare columns",
    desc: "Три колонки рядом — детальное сравнение драйверов.",
    body: `<div class="mem-stage mem-compare-stage"><p class="mem-context">Сравнение драйверов памяти</p>
      <div class="mem-compare">{{cardInternal}}{{cardExternal}}{{cardTabular}}</div></div>`,
    css: `.mem-compare-stage { max-width: 960px; }
.mem-compare { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.mem-compare .mem-card { min-height: 260px; }`
  }
];

function applyTemplate(str, reps) {
  let out = str;
  for (const [k, v] of Object.entries(reps)) out = out.split(k).join(v);
  return out;
}

function scopeCss(css, scopeClass) {
  if (!css?.trim()) return "";
  return css.replace(/(^|\})\s*([^{]+)\{/g, (_match, brace, selectors) => {
    const scoped = selectors
      .split(",")
      .map((sel) => {
        const s = sel.trim();
        if (!s) return s;
        return `${scopeClass} ${s}`;
      })
      .join(", ");
    return `${brace} ${scoped} {`;
  });
}

function escapeTemplate(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$"  );
}

const mockReps = buildReplacements();
const variantByNum = new Map(VARIANTS.map((v) => [v.num, v]));

function generateShortlistPage() {
  const dir = path.join(ROOT, "00-shortlist-all");
  fs.mkdirSync(dir, { recursive: true });

  const sections = [];
  const cssParts = [
    `.shortlist-page { max-width: 720px; margin: 0 auto; padding: 24px 20px 64px; }
.shortlist-intro { margin: 0 0 28px; color: var(--muted); font-size: 14px; line-height: 1.55; }
.shortlist-item { margin-bottom: 36px; padding-bottom: 32px; border-bottom: 2px solid var(--border); }
.shortlist-item:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.shortlist-item-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.shortlist-item-head h2 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.shortlist-num { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #fce7f3; color: #9d174d; }
.shortlist-num--pick { background: #fce7f3; color: #9d174d; box-shadow: 0 0 0 2px rgba(236,72,153,0.25); }
.shortlist-desc { margin: 4px 0 0; font-size: 13px; color: var(--muted); font-weight: 400; width: 100%; }
.shortlist-link { font-size: 12px; color: var(--accent); text-decoration: none; white-space: nowrap; padding-top: 2px; }
.shortlist-link:hover { text-decoration: underline; }
.shortlist-item-body .mem-stage { margin: 0; }`
  ];

  for (const num of SHORTLIST_NUMS) {
    const v = variantByNum.get(num);
    if (!v) continue;

    const reps = { ...mockReps, ...(v.extraRepl || {}) };
    const body = applyTemplate(v.body, reps);
    const scopeClass = `.shortlist-v${num}`;
    const scopedCss = scopeCss(v.css, scopeClass);
    if (scopedCss) cssParts.push(scopedCss);

    const pickBadge = num === "24" ? ` <span class="shortlist-num shortlist-num--pick">★ рекомендация</span>` : "";
    sections.push(`<section class="shortlist-item" id="v${num}">
      <div class="shortlist-item-head">
        <h2><span class="shortlist-num">${num}</span> ${v.title}${pickBadge}<span class="shortlist-desc">${v.desc}</span></h2>
        <a class="shortlist-link" href="../${v.id}/index.html">Отдельно →</a>
      </div>
      <div class="shortlist-item-body shortlist-v${num}">${body}</div>
    </section>`);
  }

  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>00 — Шортлист памяти</title>
    <link rel="stylesheet" href="../shared-base.css" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <span class="demo-badge">00 · Шортлист</span>
    <a class="demo-back" href="../index.html">← Все варианты</a>
    <div id="toast" class="toast"></div>
    <div id="app"></div>
    <script type="module" src="app.js"></script>
  </body>
</html>`
  );

  fs.writeFileSync(path.join(dir, "style.css"), cssParts.join("\n\n"));

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "shortlist-all");
workspace.innerHTML = \`<div class="shortlist-page">
  <p class="shortlist-intro">Все варианты из шортлиста на одной странице — прокрути и сравни. Порядок: #24 (рекомендация), затем #03–#18.</p>
  ${escapeTemplate(sections.join("\n  "))}
</div>\`;

bindDemoActions(document.body);
`
  );
}

for (const v of VARIANTS) {
  const dir = path.join(ROOT, v.id);
  fs.mkdirSync(dir, { recursive: true });

  const reps = { ...mockReps, ...(v.extraRepl || {}) };
  const body = applyTemplate(v.body, reps);

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
    `/* ${v.id} */\n${v.css || ""}`
  );

  const bindLine = v.bindAll ? "bindAll(workspace);" : "";

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions${v.bindAll ? ", bindAll" : ""} } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${escapeTemplate(body)}\`;

${bindLine}
bindDemoActions(document.body);
`
  );
}

generateShortlistPage();

const DISLIKE_IDS = new Set(["01-classic-cards", "02-horizontal-row", "07-tabs-drivers", "08-accordion", "09-summary-table", "11-column-dividers", "12-preview-snippet", "19-progress-fill", "20-timeline", "21-segment-one", "22-masonry", "23-mini-tree", "25-compare-columns"]);

const INDEX_VARIANTS = [...VARIANTS].sort((a, b) => {
  const aDisliked = DISLIKE_IDS.has(a.id) ? 1 : 0;
  const bDisliked = DISLIKE_IDS.has(b.id) ? 1 : 0;
  if (aDisliked !== bDisliked) return aDisliked - bDisliked;
  if (a.id === "24-production-compact") return -1;
  if (b.id === "24-production-compact") return 1;
  return Number(a.num) - Number(b.num);
});

const card00 = `
      <article class="card focus-card">
        <span class="tag">00 · шортлист</span>
        <h2>Все варианты шортлиста</h2>
        <p>12 понравившихся вариантов (#24, #03–#06, #10, #13–#18) на одной странице для быстрого сравнения.</p>
        <a class="demo" href="./00-shortlist-all/index.html">Открыть</a>
      </article>`;

const cards = card00 + INDEX_VARIANTS.map(
  (v) => `
      <article class="card${v.id === "24-production-compact" ? " focus-card" : ""}${DISLIKE_IDS.has(v.id) ? " dislike-card" : ""}">
        <span class="tag${DISLIKE_IDS.has(v.id) ? " tag-dislike" : ""}">${v.num}${DISLIKE_IDS.has(v.id) ? " · не нравится" : ""}</span>
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
    <title>Example8 — блок памяти</title>
    <style>
      :root { --bg: #f0f4f8; --panel: #fff; --border: #dbe3ef; --text: #1e293b; --muted: #64748b; --accent: #2563eb; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 820px; line-height: 1.55; margin: 0 0 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #fce7f3; color: #9d174d; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      .focus-card { border-color: #f9a8d4; box-shadow: 0 0 0 3px rgba(236,72,153,0.12); }
      .dislike-card { border-color: #fca5a5; background: #fef2f2; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
      .dislike-card h2 { color: #b91c1c; }
      .tag-dislike { background: #fee2e2; color: #b91c1c; }
    </style>
  </head>
  <body>
    <h1>Example8 — блок «🧠 Память»</h1>
    <p class="lead">
      25 прототипов оформления блока памяти на overview: краткая / архив / таблица.
      Сравни плотность, кнопки, preview, цвет. Baseline — <strong>#01</strong>, рекомендация — <strong>#24</strong>.
    </p>
    <p class="lead" style="font-size:13px;margin-top:-8px;">
      Запуск: <code>cd examples/ui-variant-8 && python3 -m http.server 8769</code> →
      <a href="http://localhost:8769">http://localhost:8769</a>
      · <a href="./VISION.md">VISION.md</a>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants + shortlist page in examples/ui-variant-8/`);
