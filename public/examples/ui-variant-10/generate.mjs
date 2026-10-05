#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildReplacements } from "./shared-mock.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const VARIANTS = [
  {
    id: "01-production-flow",
    num: "01",
    title: "Production flow",
    desc: "Как в CMS: сетка подразделов + единый документ с разделителями между памятью, TOC, таблицей и медиа.",
    body: `{{hubDefault}}`,
    css: ""
  },
  {
    id: "02-wide-reading",
    num: "02",
    title: "Wide reading",
    desc: "Широкая колонка документа (960px) — удобно для длинного markdown и таблиц.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--wide">{{subsections}}{{document}}</div>`,
    css: `.nav-hub--wide { max-width: 960px; }`
  },
  {
    id: "03-narrow-serif",
    num: "03",
    title: "Narrow serif",
    desc: "Узкая колонка (~620px) и serif-типографика — magazine-стиль чтения.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--narrow">{{subsections}}<article class="nav-document nav-document--serif">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-hub--narrow { max-width: 620px; }
.nav-document--serif { font-family: Georgia, "Times New Roman", serif; font-size: 15px; line-height: 1.7; }`
  },
  {
    id: "04-subsection-chips",
    num: "04",
    title: "Subsection chips",
    desc: "Подразделы — горизонтальные chips вместо gallery-карточек, документ ниже без изменений.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsectionsChips}}{{document}}</div>`,
    css: ""
  },
  {
    id: "05-subsection-rows",
    num: "05",
    title: "Subsection rows",
    desc: "Подразделы списком строк с chevron — компактнее, больше места документу.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsectionsRows}}{{document}}</div>`,
    css: ""
  },
  {
    id: "06-split-panel",
    num: "06",
    title: "Split panel",
    desc: "Подразделы сверху, документ в отдельной «плите» с рамкой и тенью.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--panel">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-document--panel {
  padding: 20px 22px 24px; border: 1px solid var(--border); border-radius: 14px;
  background: var(--panel); box-shadow: var(--shadow);
}
.nav-document--panel .nav-doc-part + .nav-doc-part { border-top-color: #eef2f7; }`
  },
  {
    id: "07-labeled-dividers",
    num: "07",
    title: "Labeled dividers",
    desc: "Между частями документа — подписи «Память · Архив · Таблица · Медиа».",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--labeled">
  <div class="nav-doc-part"><span class="nav-part-label">📝 Память</span>{{internal}}</div>
  <div class="nav-doc-part"><span class="nav-part-label">📁 Архив</span>{{external}}</div>
  <div class="nav-doc-part"><span class="nav-part-label">📊 Таблица</span>{{tabular}}</div>
  <div class="nav-doc-part"><span class="nav-part-label">🎬 Медиа</span>{{media}}</div>
</article></div>`,
    css: `.nav-document--labeled .nav-doc-part { position: relative; padding-top: 1.5em; }
.nav-document--labeled .nav-doc-part:first-child { padding-top: 0; border-top: 0; margin-top: 0; }
.nav-part-label {
  display: block; margin-bottom: 10px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
}
.nav-document--labeled .nav-doc-part > .nav-doc-part { border: 0; margin: 0; padding: 0; }`
  },
  {
    id: "08-numbered-flow",
    num: "08",
    title: "Numbered flow",
    desc: "Нумерация блоков документа — визуальный порядок «1 → 2 → 3 → 4».",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--numbered">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-document--numbered { counter-reset: navpart; }
.nav-document--numbered > .nav-doc-part { position: relative; padding-left: 36px; }
.nav-document--numbered > .nav-doc-part::before {
  counter-increment: navpart; content: counter(navpart);
  position: absolute; left: 0; top: 1.35em; width: 24px; height: 24px;
  border-radius: 50%; background: var(--nav-soft); color: var(--nav-prefix);
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.nav-document--numbered > .nav-doc-part:first-child::before { top: 0; }`
  },
  {
    id: "09-two-column-doc",
    num: "09",
    title: "Two column doc",
    desc: "Markdown слева, TOC и таблица справа — dashboard-раскладка.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<div class="nav-doc-columns">
  <div class="nav-doc-col nav-doc-col--main">{{internal}}</div>
  <div class="nav-doc-col nav-doc-col--side">{{external}}{{tabular}}{{media}}</div>
</div></div>`,
    css: `.nav-doc-columns { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; align-items: start; }
.nav-doc-col--side .nav-doc-part + .nav-doc-part { margin-top: 1em; padding-top: 1em; border-top: 1px solid #e8edf2; }
@media (max-width: 720px) { .nav-doc-columns { grid-template-columns: 1fr; } }`
  },
  {
    id: "10-sidebar-toc",
    num: "10",
    title: "Sidebar TOC",
    desc: "Фиксированная боковая колонка с оглавлением архива, основной текст справа.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<div class="nav-layout-sidebar">
  <aside class="nav-sidebar-toc">{{external}}</aside>
  <main class="nav-main-col">{{internal}}{{tabular}}{{media}}</main>
</div></div>`,
    css: `.nav-layout-sidebar { display: grid; grid-template-columns: 200px 1fr; gap: 28px; align-items: start; }
.nav-sidebar-toc { position: sticky; top: 12px; padding: 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel-soft); font-size: 12px; }
.nav-sidebar-toc .nav-ext-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.nav-sidebar-toc .nav-doc-part { border: 0; margin: 0; padding: 0; }
@media (max-width: 720px) { .nav-layout-sidebar { grid-template-columns: 1fr; } .nav-sidebar-toc { position: static; } }`
  },
  {
    id: "11-accordion-parts",
    num: "11",
    title: "Accordion parts",
    desc: "Части документа в accordion — память открыта, остальное свёрнуто.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<div class="nav-acc-stack">
  <details class="nav-acc" open><summary>📝 Краткая память</summary><div class="nav-acc-body">{{internal}}</div></details>
  <details class="nav-acc"><summary>📁 Многофайловая память · 8 файлов</summary><div class="nav-acc-body">{{external}}</div></details>
  <details class="nav-acc"><summary>📊 Табличная память · 4 строки</summary><div class="nav-acc-body">{{tabular}}</div></details>
  <details class="nav-acc"><summary>🎬 Медиа · 5 файлов</summary><div class="nav-acc-body">{{media}}</div></details>
</div></div>`,
    css: `.nav-acc-stack { display: flex; flex-direction: column; gap: 8px; }
.nav-acc { border: 1px solid var(--border); border-radius: 10px; background: var(--panel); overflow: hidden; }
.nav-acc summary { padding: 12px 14px; font-weight: 600; font-size: 13px; cursor: pointer; list-style: none; }
.nav-acc summary::-webkit-details-marker { display: none; }
.nav-acc-body { padding: 0 14px 14px; }
.nav-acc-body .nav-doc-part { border: 0; margin: 0; padding: 0; }`
  },
  {
    id: "12-external-cards",
    num: "12",
    title: "External cards",
    desc: "Архив — сетка карточек вместо списка ссылок; остальной поток как в production.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document">{{internal}}{{externalCards}}{{tabular}}{{media}}</article></div>`,
    css: ""
  },
  {
    id: "13-table-card",
    num: "13",
    title: "Table in card",
    desc: "Таблица в отдельной карточке с заголовком; markdown и TOC — plain flow.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document">{{internal}}{{external}}
  <div class="nav-doc-part nav-table-card"><h4 class="nav-table-card-title">📊 Команда</h4>{{tabular}}</div>{{media}}</article></div>`,
    css: `.nav-table-card { padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel-soft); }
.nav-table-card-title { margin: 0 0 12px; font-size: 13px; font-weight: 700; }
.nav-table-card .nav-tabular-wrap { margin: 0; }
.nav-table-card .nav-doc-part { border: 0; margin: 0; padding: 0; }`
  },
  {
    id: "14-media-thumbs",
    num: "14",
    title: "Media thumbnails",
    desc: "Медиа — сетка превью с иконками типов файлов.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document">{{internal}}{{external}}{{tabular}}{{mediaThumbs}}</article></div>`,
    css: ""
  },
  {
    id: "15-gradient-hub",
    num: "15",
    title: "Gradient hub",
    desc: "Мягкий градиент фона hub и цветные полосы у подразделов.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--gradient">{{subsections}}{{document}}</div>`,
    css: `.nav-hub--gradient {
  background: linear-gradient(180deg, #f0fdf4 0%, transparent 120px);
  border-radius: 16px; padding-top: 24px;
}
.nav-hub--gradient .nav-sub-card { border-width: 0; box-shadow: 0 2px 8px rgba(15,23,42,0.06); }`
  },
  {
    id: "16-compact-dense",
    num: "16",
    title: "Compact dense",
    desc: "Плотная вёрстка: меньше gap, компактные подразделы, мелкий текст документа.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--dense">{{subsectionsCompact}}<article class="nav-document">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-hub--dense { gap: 16px; }
.nav-hub--dense .nav-block-title { margin-bottom: 8px; font-size: 11px; }
.nav-hub--dense .nav-document { font-size: 13px; line-height: 1.5; }
.nav-hub--dense .nav-doc-part + .nav-doc-part { margin-top: 1em; padding-top: 1em; }`
  },
  {
    id: "17-hero-subs",
    num: "17",
    title: "Hero subsections",
    desc: "Подразделы — широкие hero-плитки в одну строку с крупным emoji.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsectionsHero}}{{document}}</div>`,
    css: `.nav-hero-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.nav-hero-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  min-height: 100px; padding: 16px; border: 1px solid var(--border); border-radius: 14px;
  background: linear-gradient(160deg, var(--sub-color), color-mix(in srgb, var(--sub-color) 30%, #fff));
  cursor: pointer; font: inherit; color: var(--sub-text); text-align: center;
}
.nav-hero-emoji { font-size: 32px; }
.nav-hero-title { font-size: 13px; font-weight: 700; }
@media (max-width: 640px) { .nav-hero-grid { grid-template-columns: repeat(2, 1fr); } }`,
    extraRepl: {
      "{{subsectionsHero}}": `<section class="nav-block nav-block--subs">
    <h3 class="nav-block-title">🗂️ Подразделы</h3>
    <div class="nav-hero-grid">
      <button type="button" class="nav-hero-card" data-action="open" data-label="Задачи" style="--sub-color:#dbeafe;--sub-text:#1e40af"><span class="nav-hero-emoji">📋</span><span class="nav-hero-title">Задачи</span></button>
      <button type="button" class="nav-hero-card" data-action="open" data-label="Документы" style="--sub-color:#fef3c7;--sub-text:#92400e"><span class="nav-hero-emoji">📄</span><span class="nav-hero-title">Документы</span></button>
      <button type="button" class="nav-hero-card" data-action="open" data-label="Архив" style="--sub-color:#dcfce7;--sub-text:#166534"><span class="nav-hero-emoji">🗄️</span><span class="nav-hero-title">Архив</span></button>
      <button type="button" class="nav-hero-card" data-action="open" data-label="Команда" style="--sub-color:#ede9fe;--sub-text:#5b21b6"><span class="nav-hero-emoji">👥</span><span class="nav-hero-title">Команда</span></button>
    </div>
  </section>`
    }
  },
  {
    id: "18-bento-mix",
    num: "18",
    title: "Bento mix",
    desc: "Bento-сетка: подразделы + превью памяти + мини-таблица в одной композиции.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--bento"><div class="nav-bento">
  <div class="nav-bento-subs">{{subsections}}</div>
  <div class="nav-bento-preview">{{internal}}</div>
  <div class="nav-bento-table">{{tabular}}</div>
  <div class="nav-bento-ext">{{external}}</div>
  <div class="nav-bento-media">{{mediaThumbs}}</div>
</div></div>`,
    css: `.nav-hub--bento { max-width: 920px; }
.nav-bento { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.nav-bento-subs { grid-column: span 6; }
.nav-bento-subs .nav-block-title { display: none; }
.nav-bento-preview { grid-column: span 4; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); }
.nav-bento-table { grid-column: span 2; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel-soft); font-size: 12px; }
.nav-bento-ext { grid-column: span 3; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); }
.nav-bento-media { grid-column: span 3; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); }
.nav-bento .nav-doc-part, .nav-bento .nav-block { border: 0; margin: 0; padding: 0; }
.nav-bento .nav-doc-part + .nav-doc-part { border: 0; margin: 0; padding: 0; }
@media (max-width: 720px) {
  .nav-bento { grid-template-columns: 1fr; }
  .nav-bento-preview, .nav-bento-table, .nav-bento-ext, .nav-bento-media { grid-column: span 1; }
}`
  },
  {
    id: "19-notion-blocks",
    num: "19",
    title: "Notion blocks",
    desc: "Notion-подобные блоки: hover-фон, без жёстких разделителей между частями.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--notion">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-document--notion > .nav-doc-part {
  margin: 0; padding: 12px 10px; border: 0; border-radius: 6px;
  transition: background 0.12s;
}
.nav-document--notion > .nav-doc-part:hover { background: rgba(15, 23, 42, 0.03); }
.nav-document--notion > .nav-doc-part + .nav-doc-part { margin-top: 2px; padding-top: 12px; }`
  },
  {
    id: "20-timeline-flow",
    num: "20",
    title: "Timeline flow",
    desc: "Вертикальная линия времени слева от блоков документа.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--timeline">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-document--timeline {
  border-left: 2px solid var(--border); margin-left: 8px; padding-left: 20px;
  display: flex; flex-direction: column; gap: 20px;
}
.nav-document--timeline > .nav-doc-part {
  position: relative; border: 0; margin: 0; padding: 0;
}
.nav-document--timeline > .nav-doc-part::before {
  content: ""; position: absolute; left: -27px; top: 6px;
  width: 10px; height: 10px; border-radius: 50%; background: var(--nav-prefix);
  box-shadow: 0 0 0 3px var(--nav-soft);
}
.nav-document--timeline > .nav-doc-part + .nav-doc-part { border: 0; margin: 0; padding: 0; }`
  },
  {
    id: "21-minimal-bare",
    num: "21",
    title: "Minimal bare",
    desc: "Ultra-minimal: без заголовка «Подразделы», тонкие разделители, без карточных теней.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--bare">
  <div class="nav-sub-grid nav-sub-grid--bare">{{subsectionsBare}}</div>
  <article class="nav-document nav-document--bare">{{internal}}{{external}}{{tabular}}{{media}}</article>
</div>`,
    css: `.nav-sub-grid--bare { margin-bottom: 8px; }
.nav-sub-grid--bare .nav-sub-card { border-radius: 8px; box-shadow: none; }
.nav-sub-grid--bare .nav-sub-cover { height: 72px; font-size: 28px; }
.nav-document--bare > .nav-doc-part + .nav-doc-part { border-top-color: #f1f5f9; margin-top: 1em; padding-top: 1em; }`,
    extraRepl: {
      "{{subsectionsBare}}": `<article class="nav-sub-card" data-action="open" data-label="Задачи" style="--sub-color:#dbeafe;--sub-text:#1e40af"><div class="nav-sub-cover">📋</div><div class="nav-sub-foot"><strong>Задачи</strong></div></article>
<article class="nav-sub-card" data-action="open" data-label="Документы" style="--sub-color:#fef3c7;--sub-text:#92400e"><div class="nav-sub-cover">📄</div><div class="nav-sub-foot"><strong>Документы</strong></div></article>
<article class="nav-sub-card" data-action="open" data-label="Архив" style="--sub-color:#dcfce7;--sub-text:#166534"><div class="nav-sub-cover">🗄️</div><div class="nav-sub-foot"><strong>Архив</strong></div></article>
<article class="nav-sub-card" data-action="open" data-label="Команда" style="--sub-color:#ede9fe;--sub-text:#5b21b6"><div class="nav-sub-cover">👥</div><div class="nav-sub-foot"><strong>Команда</strong></div></article>`
    }
  },
  {
    id: "22-glass-document",
    num: "22",
    title: "Glass document",
    desc: "Стеклянные панели document-parts с blur и полупрозрачным фоном.",
    body: `{{pathHeader}}<div class="nav-hub nav-hub--glass">{{subsections}}<article class="nav-document nav-document--glass">{{internal}}{{external}}{{tabular}}{{media}}</article></div>`,
    css: `.nav-hub--glass { background: linear-gradient(135deg, #ecfdf5, #eff6ff); border-radius: 16px; }
.nav-document--glass > .nav-doc-part {
  padding: 16px 18px; border: 1px solid rgba(255,255,255,0.6); border-radius: 12px;
  background: rgba(255,255,255,0.72); backdrop-filter: blur(8px);
  margin-top: 0; box-shadow: 0 4px 16px rgba(15,23,42,0.04);
}
.nav-document--glass > .nav-doc-part + .nav-doc-part { margin-top: 12px; padding-top: 16px; border-top: 0; }`
  },
  {
    id: "23-sticky-path",
    num: "23",
    title: "Sticky path",
    desc: "Шапка с select и крошками липкая при скролле; контент hub прокручивается под ней.",
    body: `<div class="nav-stage nav-stage--sticky">{{pathHeader}}<div class="nav-hub nav-hub--scroll">{{subsections}}{{document}}<div class="nav-spacer"></div></div></div>`,
    css: `.nav-path-header { position: sticky; top: 0; z-index: 20; box-shadow: 0 1px 0 var(--border); }
.nav-hub--scroll { min-height: 140vh; }
.nav-spacer { height: 40vh; }`
  },
  {
    id: "24-inline-toc",
    num: "24",
    title: "Inline TOC",
    desc: "Оглавление архива — горизонтальные pill-ссылки по группам, не вертикальный список.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document">{{internal}}
  <div class="nav-doc-part nav-doc-part--inline-toc">{{externalInline}}</div>{{tabular}}{{media}}</article></div>`,
    css: `.nav-ext-inline { display: flex; flex-direction: column; gap: 12px; }
.nav-ext-inline-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.nav-ext-inline-label { font-size: 11px; font-weight: 700; color: var(--muted); min-width: 72px; }
.nav-ext-inline-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.nav-ext-pill {
  padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--panel-soft); font-size: 12px; color: var(--accent); text-decoration: none;
}
.nav-ext-pill:hover { background: var(--accent-soft); }`,
    extraRepl: {
      "{{externalInline}}": `<div class="nav-ext-inline">
  <div class="nav-ext-inline-group"><span class="nav-ext-inline-label">Корень</span><div class="nav-ext-inline-pills">
    <a href="#" class="nav-ext-pill" data-action="open" data-label="README">README</a>
    <a href="#" class="nav-ext-pill" data-action="open" data-label="Roadmap">Roadmap</a>
    <a href="#" class="nav-ext-pill" data-action="open" data-label="Changelog">Changelog</a>
  </div></div>
  <div class="nav-ext-inline-group"><span class="nav-ext-inline-label">docs</span><div class="nav-ext-inline-pills">
    <a href="#" class="nav-ext-pill" data-action="open" data-label="API">API</a>
    <a href="#" class="nav-ext-pill" data-action="open" data-label="Onboarding">Onboarding</a>
    <a href="#" class="nav-ext-pill" data-action="open" data-label="FAQ">FAQ</a>
  </div></div>
  <div class="nav-ext-inline-group"><span class="nav-ext-inline-label">marketing</span><div class="nav-ext-inline-pills">
    <a href="#" class="nav-ext-pill" data-action="open" data-label="Landing copy">Landing copy</a>
    <a href="#" class="nav-ext-pill" data-action="open" data-label="Email templates">Email templates</a>
  </div></div>
</div>`
    }
  },
  {
    id: "25-recommended-blend",
    num: "25",
    title: "Recommended blend",
    desc: "Рекомендуемый: gallery подразделов + panel-документ + table-card + media thumbs.",
    body: `{{pathHeader}}<div class="nav-hub">{{subsections}}<article class="nav-document nav-document--panel nav-document--blend">{{internal}}{{external}}
  <div class="nav-doc-part nav-table-card"><h4 class="nav-table-card-title">📊 Команда</h4>{{tabular}}</div>{{mediaThumbs}}</article></div>`,
    css: `.nav-document--panel {
  padding: 20px 22px 24px; border: 1px solid var(--border); border-radius: 14px;
  background: var(--panel); box-shadow: var(--shadow);
}
.nav-document--blend .nav-doc-part + .nav-doc-part { border-top-color: #eef2f7; }
.nav-table-card { padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel-soft); margin-top: 1.25em; }
.nav-table-card-title { margin: 0 0 12px; font-size: 13px; font-weight: 700; }
.nav-table-card .nav-doc-part { border: 0; margin: 0; padding: 0; }`
  }
];

function applyTemplate(str, reps) {
  let out = str;
  for (const [k, v] of Object.entries(reps)) out = out.split(k).join(v);
  return out;
}

function escapeTemplate(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const mockReps = buildReplacements();

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

  fs.writeFileSync(path.join(dir, "style.css"), `/* ${v.id} */\n${v.css || ""}`);

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${escapeTemplate(body)}\`;

bindDemoActions(document.body);
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
    <title>Example10 — навигация ноды</title>
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
    <h1>Example10 — навигация ноды</h1>
    <p class="lead">
      25 прототипов домена <strong>«Навигация»</strong> (режим «Все доступные элементы»):
      сетка <strong>подразделов</strong> + единый поток документа
      (краткая память · оглавление архива · таблица · медиа).
    </p>
    <div class="pill-row">
      <span class="pill">🗂️ Подразделы</span>
      <span class="pill">📝 Markdown</span>
      <span class="pill">📁 External TOC</span>
      <span class="pill">📊 Tabular</span>
      <span class="pill">🎬 Media</span>
    </div>
    <section class="vision">
      <h2>Что моделируется</h2>
      <ul>
        <li><strong>Шапка</strong> — select «Все доступные элементы» + префикс «Навигация ноды» + крошки.</li>
        <li><strong>Подразделы</strong> — дочерние ноды (gallery, chips, rows, hero, bento…).</li>
        <li><strong>Документ</strong> — непрерывный поток без кнопок редактирования и путей хранения.</li>
      </ul>
      <p>Рекомендация: вариант <strong>25</strong> или <strong>01</strong> — близко к production с улучшенной таблицей и медиа.</p>
    </section>
    <p class="lead" style="font-size:13px;">
      Запуск: <code>cd public/examples/ui-variant-10 && python3 -m http.server 8771</code> →
      <a href="http://localhost:8771">http://localhost:8771</a>
      · <code>node generate.mjs</code>
    </p>
    <div class="grid">${cards}
    </div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in ${ROOT}`);
