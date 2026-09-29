#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const VARIANTS = [
  {
    id: "01-classic-overview",
    num: "01",
    title: "Classic overview",
    desc: "Как в CMS сейчас: hero, meta, память, подразделы, ссылки на режимы.",
    body: `<div class="ov-panel">{{bothZones}}</div>`,
    css: ""
  },
  {
    id: "02-hero-banner",
    num: "02",
    title: "Hero banner",
    desc: "Широкий градиентный баннер с названием; мета и навигация ниже.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="ov-banner"><div><h2 class="ov-title">${CONTAINER.title}</h2><span class="ov-type">${CONTAINER.type}</span><p class="ov-desc">${CONTAINER.desc}</p></div></div>
      <div class="ov-meta">{{metaContainer}}</div>{{memorySection}}{{childrenContainer}}{{modeLinks}}
    </div><div class="ov-zone hidden" data-node-zone="solo">{{zoneSolo}}</div></div>`,
    css: `.ov-banner { margin-top: 0; }`
  },
  {
    id: "03-split-preview",
    num: "03",
    title: "Split preview",
    desc: "Слева крупное превью, справа meta + память + pills навигации.",
    body: `<div class="ov-panel split-03"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="split-row">
        <div class="split-left">{{previewPane}}</div>
        <div class="split-right">
          {{heroContainer}}
          <div class="ov-meta">{{metaContainer}}</div>
          {{modePills}}
          {{memorySection}}
        </div>
      </div>
      {{childrenContainer}}
    </div>{{soloSplit}}</div>`,
    css: `.split-03 .split-row { display: grid; grid-template-columns: 280px 1fr; gap: 16px; } .split-left .ov-preview-large { min-height: 280px; } .split-03 .ov-hero { margin-bottom: 12px; } .split-03 .ov-thumb { display: none; }`,
    extraRepl: { "{{soloSplit}}": `<div class="ov-zone hidden" data-node-zone="solo">{{zoneSolo}}</div>` }
  },
  {
    id: "04-surface-tabs",
    num: "04",
    title: "Surface tabs",
    desc: "Вкладки Обзор / Описание / Память / Превью — одна центральная зона.",
    body: `<div class="ov-panel ov-surface-host">
      {{surfaceTabs}}
      <div data-surface-panel="overview">{{bothZones}}</div>
      {{descriptionPane}}
      <div class="hidden" data-surface-panel="memory"><div style="padding:16px">{{memorySection}}</div></div>
      <div class="hidden" data-surface-panel="preview">{{previewPaneInner}}</div>
    </div>`,
    extraRepl: {
      "{{previewPaneInner}}": `<div class="ov-preview-pane"><div class="ov-preview-large"><span>🖼</span><p>Assistant.node.preview.png</p></div></div>`
    },
    css: `.ov-surface-host .ov-zone { padding-top: 8px; max-width: none; }`
  },
  {
    id: "05-mode-pills",
    num: "05",
    title: "Mode pills",
    desc: "Горизонтальные pills режимов под крошками — быстрый переход.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{modePills}}
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{memorySection}}{{childrenContainer}}
    </div><div class="ov-zone hidden" data-node-zone="solo">{{zoneSolo}}</div></div>`,
    css: ``
  },
  {
    id: "06-sticky-meta-sidebar",
    num: "06",
    title: "Sticky meta sidebar",
    desc: "Meta-колонка слева (sticky), справа hero + дети + память.",
    body: `<div class="ov-panel layout-06"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="meta-layout">
        <aside class="meta-side"><h3 class="ov-section-title">Свойства</h3><div class="ov-meta flat">{{metaContainer}}</div>{{modeLinksCompact}}</aside>
        <div class="meta-main">{{heroContainer}}{{memorySection}}{{childrenContainer}}</div>
      </div>
    </div><div class="ov-zone hidden" data-node-zone="solo">{{zoneSolo}}</div></div>`,
    css: `.layout-06 .meta-layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start; } .layout-06 .meta-side { position: sticky; top: 8px; } .layout-06 .ov-meta.flat { grid-template-columns: 1fr; margin-bottom: 12px; }`
  },
  {
    id: "07-bento-dashboard",
    num: "07",
    title: "Bento dashboard",
    desc: "Плиточный dashboard: превью, meta, память, дети — bento grid.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="ov-bento">
        <div class="tile tile-preview">{{previewPane}}</div>
        <div class="tile tile-meta"><h3 class="ov-section-title">Assistant.Ai</h3><p class="ov-desc">Кластер идентичности.</p><div class="ov-meta" style="margin:0;border:0;padding:0;background:transparent">{{metaContainer}}</div></div>
        <div class="tile tile-mem">{{memorySection}}</div>
        <div class="tile tile-children">{{childrenContainer}}</div>
      </div>
      {{modeLinksCompact}}
    </div></div>`,
    css: `.ov-bento .ov-preview-large { min-height: 120px; } .ov-bento .ov-memory { margin: 0; } .ov-bento .ov-children { margin: 0; }`
  },
  {
    id: "08-minimal-accordion",
    num: "08",
    title: "Minimal accordion",
    desc: "Крупный заголовок; meta, память, дети — в accordion.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <h2 class="ov-title" style="font-size:32px;margin-bottom:4px">Assistant.Ai</h2>
      <span class="ov-type">NODE/INDEX</span>
      <p class="ov-desc" style="margin:12px 0 16px">Кластер идентичности ассистента.</p>
      <details class="ov-acc" open><summary>📋 Свойства</summary><div class="ov-acc-body"><div class="ov-meta" style="margin:0">{{metaContainer}}</div></div></details>
      <details class="ov-acc" open><summary>🧠 Память</summary><div class="ov-acc-body">{{memorySection}}</div></details>
      <details class="ov-acc"><summary>📁 Подразделы</summary><div class="ov-acc-body">{{childrenContainer}}</div></details>
      <details class="ov-acc"><summary>⚙️ Режимы</summary><div class="ov-acc-body">{{modeLinksCompact}}</div></details>
    </div></div>`,
    css: `.ov-acc .ov-memory { margin-bottom: 0; } .ov-acc .ov-children { margin-bottom: 0; }`
  },
  {
    id: "09-vertical-stepper",
    num: "09",
    title: "Vertical stepper",
    desc: "Stepper слева: Обзор → Meta → Память → Дети; контент справа.",
    body: `<div class="ov-panel layout-09"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="step-layout">
        <div class="ov-stepper">
          <div class="ov-step active">1. Hero</div>
          <div class="ov-step">2. Meta</div>
          <div class="ov-step">3. Память</div>
          <div class="ov-step">4. Подразделы</div>
          <div class="ov-step">5. Режимы</div>
        </div>
        <div>{{heroContainer}}<div class="ov-meta">{{metaContainer}}</div>{{memorySection}}{{childrenContainer}}{{modeLinksCompact}}</div>
      </div>
    </div></div>`,
    css: `.layout-09 .step-layout { display: grid; grid-template-columns: 140px 1fr; gap: 20px; }`
  },
  {
    id: "10-magazine-layout",
    num: "10",
    title: "Magazine layout",
    desc: "Крупное превью слева (magazine), текст и meta справа.",
    body: `<div class="ov-panel mag-10"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="mag-grid">
        <div class="mag-preview">{{previewPane}}</div>
        <div class="mag-text">
          <h2 class="ov-title">Assistant.Ai</h2>
          <span class="ov-type">NODE/INDEX</span>
          <p class="ov-desc">Кластер идентичности ассистента: правила, профиль, пользователи.</p>
          <div class="ov-meta">{{metaContainer}}</div>
        </div>
      </div>
      {{memorySection}}{{childrenContainer}}{{modeLinks}}
    </div></div>`,
    css: `.mag-10 .mag-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; margin-bottom: 16px; } .mag-10 .ov-preview-large { min-height: 220px; }`
  },
  {
    id: "11-dense-table-meta",
    num: "11",
    title: "Dense table meta",
    desc: "Meta в виде таблицы — плотно, для power users.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <table class="ov-table-meta"><tbody>
        <tr><th>AWN-STATUS</th><td>active</td></tr>
        <tr><th>AWN-MEMORY</th><td>hybrid</td></tr>
        <tr><th>AWN-PRIORITY</th><td>30</td></tr>
        <tr><th>AWN-CATEGORY</th><td>system</td></tr>
        <tr><th>AWN-VERSION</th><td>1.0.0</td></tr>
      </tbody></table>
      {{memorySection}}{{childrenContainer}}{{modeLinksCompact}}
    </div></div>`,
    css: ``
  },
  {
    id: "12-floating-dock",
    num: "12",
    title: "Floating dock",
    desc: "Контент по центру; dock снизу для переключения режимов.",
    body: `<div class="ov-panel dock-layout"><div data-node-zone="container" style="padding-bottom:60px">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{memorySection}}{{childrenContainer}}
      <div class="ov-dock">
        <button type="button" class="active">Обзор</button>
        <button type="button" data-action="open-mode" data-label="Описание">Описание</button>
        <button type="button" data-action="open-mode" data-label="Память">Память</button>
        <button type="button" data-action="open-mode" data-label="Медиа">Медиа</button>
        <button type="button" data-action="open-mode" data-label="Граф">Граф</button>
      </div>
    </div></div>`,
    css: `.dock-layout { position: relative; display: flex; flex-direction: column; min-height: 420px; }`
  },
  {
    id: "13-segment-context",
    num: "13",
    title: "Segment context",
    desc: "Segment control: контекст контейнера vs solo — переключатель крупнее.",
    body: `<div class="ov-panel">
      <div class="node-type-switch" style="margin-bottom:12px; width:100%; max-width:360px">
        <button type="button" data-node-type="container" class="active" style="flex:1">📁 Контейнер</button>
        <button type="button" data-node-type="solo" style="flex:1">🧩 Solo</button>
      </div>
      {{bothZones}}
    </div>`,
    css: `.node-type-switch { display: flex; }`
  },
  {
    id: "14-preview-first",
    num: "14",
    title: "Preview first",
    desc: "Превью занимает верхнюю половину; детали — ниже fold.",
    body: `<div class="ov-panel prev-14"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="preview-hero">{{previewPane}}</div>
      <div class="preview-details">
        <h2 class="ov-title">Assistant.Ai</h2>
        <span class="ov-type">NODE/INDEX</span>
        <p class="ov-desc">Кластер идентичности ассистента.</p>
        <div class="ov-meta">{{metaContainer}}</div>
        {{memorySection}}{{childrenContainer}}{{modeLinks}}
      </div>
    </div></div>`,
    css: `.prev-14 .preview-hero .ov-preview-large { min-height: 200px; margin-bottom: 16px; } .prev-14 .ov-preview-pane { padding: 0; }`
  },
  {
    id: "15-horizontal-children",
    num: "15",
    title: "Horizontal children",
    desc: "Подразделы — горизонтальный скролл карточек.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{memorySection}}
      <section class="ov-children"><h3 class="ov-section-title">Подразделы</h3>
        <div class="ov-scroll-x">
          <button type="button" class="ov-child-card" data-action="open-child" data-label="Assistant"><span class="ov-child-icon">🧩</span><span class="ov-child-title">Assistant</span></button>
          <button type="button" class="ov-child-card" data-action="open-child" data-label="Rules"><span class="ov-child-icon">🧩</span><span class="ov-child-title">Rules</span></button>
          <button type="button" class="ov-child-card" data-action="open-child" data-label="User"><span class="ov-child-icon">🧩</span><span class="ov-child-title">User</span></button>
          <button type="button" class="ov-child-card is-folder" data-action="open-child" data-label="Users"><span class="ov-child-icon">📁</span><span class="ov-child-title">Users</span></button>
        </div>
      </section>
      {{modeLinks}}
    </div></div>`,
    css: ``
  },
  {
    id: "16-command-jump",
    num: "16",
    title: "Command jump",
    desc: "Минимальный hero + поле «Перейти к…» вместо длинных списков.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      <div class="ov-command"><input type="text" placeholder="Перейти к режиму или подразделу…" readonly /></div>
      <div class="ov-command-list">
        <button type="button" data-action="command" data-label="Описание">⚙️ Описание, инструкции</button>
        <button type="button" data-action="command" data-label="Внешняя память">🧠 Внешняя память</button>
        <button type="button" data-action="command" data-label="Assistant">🧩 Assistant (solo)</button>
        <button type="button" data-action="command" data-label="Граф">🧭 Граф ноды</button>
        <button type="button" data-action="command" data-label="Превью">🖼 Превью</button>
      </div>
    </div></div>`,
    css: ``
  },
  {
    id: "17-two-column-modes",
    num: "17",
    title: "Two column modes",
    desc: "Настройки слева, Память+Файлы справа — двухколоночная навигация.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{childrenContainer}}
      <div class="two-modes">
        <section><h3 class="ov-section-title">⚙️ Настройки</h3><div class="ov-mode-btns">
          <button class="ov-mode-btn" data-action="open-mode" data-label="Описание">Описание</button>
          <button class="ov-mode-btn" data-action="open-mode" data-label="Конфигурации">Конфигурации</button>
          <button class="ov-mode-btn" data-action="open-mode" data-label="Скрипты">Скрипты</button>
        </div></section>
        <section><h3 class="ov-section-title">🧠 Память и файлы</h3>{{memorySection}}
          <button class="ov-mode-btn" data-action="open-mode" data-label="Медиа" style="margin-top:8px;width:100%">📎 Медиа и документы</button>
        </section>
      </div>
    </div></div>`,
    css: `.two-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } .two-modes .ov-memory { margin-bottom: 8px; }`
  },
  {
    id: "18-wiki-infobox",
    num: "18",
    title: "Wiki infobox",
    desc: "Wikipedia-style: infobox справа, основной текст слева.",
    body: `<div class="ov-panel wiki-18"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="wiki-grid">
        <div class="wiki-main">
          <h2 class="ov-title">Assistant.Ai</h2>
          <p class="ov-desc">Кластер идентичности ассистента: правила, профиль, пользователи. Содержит solo-ноды Assistant, Rules, User и контейнер Users.</p>
          {{memorySection}}{{childrenContainer}}
        </div>
        <aside class="ov-infobox">
          <h4>Assistant.Ai</h4>
          <dl>
            <dt>Тип</dt><dd>NODE/INDEX</dd>
            <dt>AWN-MEMORY</dt><dd>hybrid</dd>
            <dt>AWN-STATUS</dt><dd>active</dd>
            <dt>Детей</dt><dd>4</dd>
          </dl>
          <div style="margin-top:10px">{{previewPane}}</div>
        </aside>
      </div>
      {{modeLinksCompact}}
    </div></div>`,
    css: `.wiki-18 .wiki-grid { display: grid; grid-template-columns: 1fr 240px; gap: 16px; align-items: start; } .wiki-18 .ov-infobox .ov-preview-large { min-height: 100px; } .wiki-18 .ov-preview-pane { padding: 0; }`
  },
  {
    id: "19-notion-gallery",
    num: "19",
    title: "Notion gallery",
    desc: "Подразделы как gallery cards с cover-превью.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{memorySection}}
      <section class="ov-children"><h3 class="ov-section-title">Подразделы</h3>
        <div class="ov-gallery">
          <button type="button" class="ov-gallery-card" data-action="open-child" data-label="Assistant"><div class="ov-gallery-cover">🧩</div><span>Assistant</span></button>
          <button type="button" class="ov-gallery-card" data-action="open-child" data-label="Rules"><div class="ov-gallery-cover">📜</div><span>Rules</span></button>
          <button type="button" class="ov-gallery-card" data-action="open-child" data-label="User"><div class="ov-gallery-cover">👤</div><span>User</span></button>
          <button type="button" class="ov-gallery-card" data-action="open-child" data-label="Users"><div class="ov-gallery-cover">📁</div><span>Users</span></button>
        </div>
      </section>
      {{modeLinks}}
    </div></div>`,
    css: ``
  },
  {
    id: "20-inner-mode-rail",
    num: "20",
    title: "Inner mode rail",
    desc: "Вертикальные иконки режимов внутри контента (не левый rail).",
    body: `<div class="ov-panel"><div class="ov-inner-rail"><nav aria-label="Режимы">
      <button type="button" class="active" title="Обзор">🧩</button>
      <button type="button" title="Описание" data-action="open-mode" data-label="Описание">📝</button>
      <button type="button" title="Память" data-action="open-mode" data-label="Память">🧠</button>
      <button type="button" title="Медиа" data-action="open-mode" data-label="Медиа">📎</button>
      <button type="button" title="Граф" data-action="open-mode" data-label="Граф">🧭</button>
    </nav><div class="ov-zone" style="flex:1" data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}<div class="ov-meta">{{metaContainer}}</div>{{memorySection}}{{childrenContainer}}
    </div></div></div>`,
    css: `.ov-inner-rail { border: none; } .ov-panel { padding: 0; } .ov-panel > .ov-inner-rail { min-height: 400px; }`
  },
  {
    id: "21-crumb-modes",
    num: "21",
    title: "Crumb modes",
    desc: "Режимы как сегменты в строке крошек.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs crumb-modes">{{crumbsContainer}}
        <span class="ov-crumb-sep">·</span>
        <button type="button" class="ov-crumb" data-action="open-mode" data-label="Описание">Описание</button>
        <button type="button" class="ov-crumb" data-action="open-mode" data-label="Память">Память</button>
        <button type="button" class="ov-crumb" data-action="open-mode" data-label="Граф">Граф</button>
      </nav>
      {{heroContainer}}<div class="ov-meta">{{metaContainer}}</div>{{memorySection}}{{childrenContainer}}
    </div></div>`,
    css: `.crumb-modes { align-items: center; }`
  },
  {
    id: "22-all-accordion",
    num: "22",
    title: "All accordion",
    desc: "Все секции сворачиваются — компактный обзор длинных нод.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <details class="ov-acc" open><summary>🧩 Hero</summary><div class="ov-acc-body">{{heroContainer}}</div></details>
      <details class="ov-acc"><summary>📋 Meta</summary><div class="ov-acc-body"><div class="ov-meta" style="margin:0">{{metaContainer}}</div></div></details>
      <details class="ov-acc"><summary>🧠 Память</summary><div class="ov-acc-body">{{memorySection}}</div></details>
      <details class="ov-acc"><summary>📁 Подразделы</summary><div class="ov-acc-body">{{childrenContainer}}</div></details>
      <details class="ov-acc"><summary>🔗 Режимы</summary><div class="ov-acc-body">{{modeLinksCompact}}</div></details>
    </div></div>`,
    css: `.ov-acc .ov-hero { margin-bottom: 0; }`
  },
  {
    id: "23-story-scroll",
    num: "23",
    title: "Story scroll",
    desc: "Scroll-snap секции — листать обзор как story.",
    body: `<div class="ov-panel"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      <div class="ov-story">
        <section>{{heroContainer}}</section>
        <section><h3 class="ov-section-title">Meta</h3><div class="ov-meta">{{metaContainer}}</div></section>
        <section>{{memorySection}}</section>
        <section>{{childrenContainer}}</section>
        <section>{{modeLinks}}</section>
      </div>
    </div></div>`,
    css: ``
  },
  {
    id: "24-production-blend",
    num: "24",
    title: "Production blend",
    desc: "Рекомендуемый: hero + meta + память (без дубля) + дети + только нужные ссылки.",
    body: `<div class="ov-panel prod-24"><div data-node-zone="container">
      <nav class="ov-crumbs">{{crumbsContainer}}</nav>
      {{heroContainer}}
      <div class="ov-meta">{{metaContainer}}</div>
      {{memorySection}}
      {{childrenContainer}}
      <div class="ov-mode-links">{{modeLinksPartial}}</div>
    </div><div class="ov-zone hidden" data-node-zone="solo">{{zoneSoloNoMem}}</div></div>`,
    css: `.prod-24 .ov-zone { max-width: 880px; margin: 0 auto; }`,
    extraRepl: {
      "{{modeLinksPartial}}": `<section class="ov-mode-group"><h3 class="ov-section-title">⚙️ Настройки</h3><div class="ov-mode-btns"><button class="ov-mode-btn" data-action="open-mode" data-label="Описание">Описание</button><button class="ov-mode-btn" data-action="open-mode" data-label="Превью">Превью</button></div></section><section class="ov-mode-group"><h3 class="ov-section-title">📎 Файлы</h3><div class="ov-mode-btns"><button class="ov-mode-btn" data-action="open-mode" data-label="Медиа">Медиа</button></div></section><section class="ov-mode-group"><h3 class="ov-section-title">🧭 Навигация</h3><div class="ov-mode-btns"><button class="ov-mode-btn" data-action="open-mode" data-label="Граф">Граф</button></div></section>`,
      "{{zoneSoloNoMem}}": `<nav class="ov-crumbs">${crumbsHtml(SOLO.crumbs)}</nav>${heroBlock(SOLO)}<div class="ov-meta">${metaCells(SOLO.meta)}</div><div class="ov-mode-links">{{modeLinksPartial}}</div>`,
    }
  },
  {
    id: "25-compare-split",
    num: "25",
    title: "Compare split",
    desc: "Два столбца: контейнер vs solo — сравнение обзора.",
    body: `<div class="ov-panel"><div class="ov-compare">
      <div class="ov-compare-col"><h3>Контейнер (_.node.md)</h3><div class="ov-zone" style="padding:12px">{{zoneContainer}}</div></div>
      <div class="ov-compare-col"><h3>Solo (Assistant.node.md)</h3><div class="ov-zone" style="padding:12px">{{zoneSolo}}</div></div>
    </div></div>`,
    css: `.workspace .node-type-switch { display: none; }`,
    noNodeToggle: true
  }
];

function applyTemplate(str, reps) {
  let out = str;
  for (const [k, v] of Object.entries(reps)) out = out.split(k).join(v);
  return out;
}

import {
  bothZonesHtml,
  buildReplacements,
  heroBlock,
  CONTAINER,
  SOLO,
  metaCells,
  memorySection,
  childCards,
  modeLinks,
  zoneInner
} from "./shared-mock.js";

function crumbsHtml(parts) {
  return parts
    .map((part, i) => {
      const sep = i > 0 ? '<span class="ov-crumb-sep">/</span>' : "";
      const isLast = i === parts.length - 1;
      return (
        sep +
        (isLast
          ? `<span class="ov-crumb current">${part}</span>`
          : `<button type="button" class="ov-crumb">${part}</button>`)
      );
    })
    .join("");
}

const mockReps = buildReplacements();
const allReps = { ...mockReps };

for (const v of VARIANTS) {
  const dir = path.join(ROOT, v.id);
  fs.mkdirSync(dir, { recursive: true });

  const reps = {
    ...allReps,
    ...(v.extraRepl || {}),
    "{{crumbsContainer}}": mockReps["{{crumbsContainer}}"] || "nav",
    "{{metaContainer}}": metaCells(CONTAINER.meta),
    "{{metaSolo}}": metaCells(SOLO.meta),
    "{{memorySection}}": memorySection(CONTAINER.memory),
    "{{childrenContainer}}": childCards(CONTAINER.children),
    "{{modeLinks}}": modeLinks(false),
    "{{modeLinksCompact}}": modeLinks(true),
    "{{heroContainer}}": heroBlock(CONTAINER),
    "{{heroSolo}}": heroBlock(SOLO),
    "{{zoneContainer}}": zoneInner(CONTAINER, {}),
    "{{zoneSolo}}": zoneInner(SOLO, { children: false, memory: false }),
    "{{bothZones}}": bothZonesHtml({})
  };

  let body = applyTemplate(v.body, reps);
  if (!v.noNodeToggle) {
    body = applyTemplate("{{nodeTypeSwitch}}", reps) + body;
  }

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

  const bindToggle = v.noNodeToggle ? "" : "bindAll(workspace);";

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions${v.noNodeToggle ? "" : ", bindAll"} } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;

${bindToggle}
bindDemoActions(document.body);
`
  );
}

const cards = VARIANTS.map(
  (v) => `
      <article class="card${v.id === "24-production-blend" ? " focus-card" : ""}">
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
    <title>Example7 — обзор ноды</title>
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
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #ecfdf5; color: #047857; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      .focus-card { border-color: #6ee7b7; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
    </style>
  </head>
  <body>
    <h1>Example7 — центральное содержимое (обзор ноды)</h1>
    <p class="lead">
      25 прототипов <strong>центральной области</strong> в режиме «Обзор ноды»: превью, meta, память, подразделы,
      навигация по режимам. Переключатель <strong>Контейнер / Solo</strong> в каждом варианте (кроме 25).
    </p>
    <p class="lead" style="font-size:13px;margin-top:-8px;">
      Запуск: <code>cd examples/ui-variant-7 && python3 -m http.server 8768</code> →
      <a href="http://localhost:8768">http://localhost:8768</a>
      · <a href="./VISION.md">VISION.md</a>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in examples/ui-variant-7/`);
