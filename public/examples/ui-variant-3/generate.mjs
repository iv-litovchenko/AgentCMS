#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const CRUMBS = "{{CRUMBS}}";
const TITLE = `<div class="title-row"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>`;
const PROPS = `<section class="form-props">
  <h3>Свойства заметки</h3>
  <label>title <input value="{{fileBase}}" /></label>
  <label>tags <input value="логистика, маршрут" /></label>
  <label>status <select><option>draft</option><option selected>draft</option></select></label>
  <button type="button" class="btn btn-ghost" data-yaml-toggle="#raw-yaml">Показать YAML</button>
  <textarea id="raw-yaml" class="yaml-textarea hidden">{{yaml}}</textarea>
</section>`;
const EDITOR = `<div class="editor-block">
  <div class="editor-head"><span>Содержимое</span>{{viewToggle}}</div>
  <textarea class="editor-textarea">{{content}}</textarea>
</div>`;
const VIEW = `<div class="view-toggle" role="tablist"><button type="button" class="active">Редакт.</button><button type="button">Просмотр</button></div>`;
const ACTIONS = `<div class="inline-actions"><button type="button" class="btn btn-ghost" data-action="back">← Назад</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>`;

function buildReplacements() {
  return {
    CRUMBS: `<nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>`,
    fileBase: "Заметка о маршруте",
    ext: ".md",
    content: `# Маршрут Москва — Казань\n\n- Старт: 06:00\n- Остановка: Нижний Новгород\n- Прибытие: 18:30`,
    yaml: `title: Заметка о маршруте\ntags:\n  - логистика\n  - маршрут\nstatus: draft`,
    viewToggle: VIEW,
    TITLE,
    PROPS,
    EDITOR: EDITOR.replace("{{viewToggle}}", VIEW),
    ACTIONS
  };
}

function applyTemplate(tpl, reps) {
  let out = tpl;
  for (const [key, val] of Object.entries(reps)) {
    out = out.split(`{{${key}}}`).join(val);
  }
  return out;
}

const VARIANTS = [
  {
    id: "01-classic-five-column",
    num: "01",
    title: "Классика 5 колонок",
    desc: "Дерево | rail | flyout | workspace | actions. Крошки и заголовок в workspace, свойства над редактором.",
    body: `
      <header class="ws-header">${CRUMBS}</header>
      <header class="ws-title">${TITLE}</header>
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .ws-title { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .ws-title .title-row { display: flex; gap: 8px; align-items: center; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 16px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; }`
  },
  {
    id: "02-fullwidth-doc-header",
    num: "02",
    title: "Шапка на всю ширину",
    desc: "Крошки и название span-ят rail+flyout+workspace — как в текущем Agent CMS.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr var(--right-w); grid-template-rows: auto auto 1fr; }
      .sidebar { grid-row: 1 / 4; }
      .doc-header-span { grid-column: 2; grid-row: 1; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .doc-title-span { grid-column: 2; grid-row: 2; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .shell-inner { grid-column: 2; grid-row: 3; display: grid; grid-template-columns: var(--rail-w) var(--flyout-w) 1fr; min-height: 0; }
      .mode-rail { grid-column: 1; border-right: 1px solid var(--border); }
      .mode-flyout { grid-column: 2; }
      .workspace { grid-column: 3; }
      .right-panel { grid-row: 1 / 4; grid-column: 3; }`,
    body: `
      <div class="doc-inner">
        ${PROPS}
        ${EDITOR.replace("{{viewToggle}}", VIEW)}
      </div>`,
    extraMount: `
      const shell = root.querySelector(".shell-body");
      const rail = shell.querySelector(".mode-rail");
      const flyout = shell.querySelector(".mode-flyout");
      const ws = shell.querySelector(".workspace");
      const headerA = document.createElement("header");
      headerA.className = "doc-header-span";
      headerA.innerHTML = \`${CRUMBS}\`;
      const headerB = document.createElement("header");
      headerB.className = "doc-title-span";
      headerB.innerHTML = \`${TITLE}\`;
      const inner = document.createElement("div");
      inner.className = "shell-inner";
      inner.append(rail, flyout, ws);
      shell.insertBefore(headerA, rail);
      shell.insertBefore(headerB, rail);
      shell.insertBefore(inner, shell.querySelector(".right-panel"));`,
    css: `
      .doc-inner { display: flex; flex-direction: column; gap: 12px; padding: 12px 16px; flex: 1; min-height: 0; overflow: auto; }
      .editor-block { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 200px; }
      .editor-head { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }`
  },
  {
    id: "03-rail-in-sidebar",
    num: "03",
    title: "Режимы в сайдбаре",
    desc: "6 групп режимов — вертикальные вкладки внутри левой колонки, flyout+workspace справа.",
    shellCss: `
      .shell-body { grid-template-columns: 280px 1fr var(--right-w); }
      .sidebar { display: flex; flex-direction: column; gap: 0; padding: 0; }
      .sidebar-tree { padding: 12px; border-bottom: 1px solid var(--border); }
      .sidebar-modes { padding: 8px; display: grid; gap: 4px; }
      .sidebar-mode { text-align: left; border: none; background: transparent; padding: 8px 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
      .sidebar-mode.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
      .mode-rail { display: none; }
      .mode-flyout { grid-column: 1; }
      .workspace { grid-column: 2; }`,
    body: `
      <header class="ws-header">${CRUMBS} ${ACTIONS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    extraMount: `
      const sidebar = root.querySelector(".sidebar");
      sidebar.innerHTML = \`
        <div class="sidebar-tree"><p class="sidebar-title">Дерево</p><div class="sidebar-item active">Дальнобойщики-2</div></div>
        <div class="sidebar-modes">
          <button class="sidebar-mode" type="button">🧩 Основное</button>
          <button class="sidebar-mode" type="button">🧭 Навигация</button>
          <button class="sidebar-mode active" type="button">🧠 Память</button>
          <button class="sidebar-mode" type="button">📎 Медиа</button>
          <button class="sidebar-mode" type="button">📦 Вложения</button>
          <button class="sidebar-mode" type="button">⚙️ Автоматизация</button>
        </div>\`;`,
    css: `
      .ws-header { display: flex; justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }
      .inline-actions { display: flex; gap: 8px; }`
  },
  {
    id: "04-top-mode-tabs",
    num: "04",
    title: "Режимы — вкладки сверху",
    desc: "6 групп как горизонтальные вкладки под шапкой приложения. Flyout скрыт — подрежимы вторым рядом.",
    shellCss: `
      .shell { grid-template-rows: 48px auto 1fr; }
      .mode-tabs-bar { grid-column: 1 / -1; display: flex; gap: 4px; padding: 8px 12px; background: var(--panel); border-bottom: 1px solid var(--border); overflow-x: auto; }
      .mode-tab { border: 1px solid var(--border); background: var(--panel-soft); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }
      .mode-tab.active { background: var(--accent-soft); border-color: #93c5fd; color: var(--accent); font-weight: 600; }
      .submode-bar { grid-column: 1 / -1; display: flex; gap: 6px; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid var(--border); }
      .submode-btn { border: none; background: transparent; padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; }
      .submode-btn.active { background: var(--panel); box-shadow: 0 1px 2px rgba(0,0,0,.06); font-weight: 600; }
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr var(--right-w); grid-row: 3; height: auto; }
      .mode-rail, .mode-flyout { display: none; }`,
    extraMount: `
      const shell = root.querySelector(".shell");
      const tabs = document.createElement("nav");
      tabs.className = "mode-tabs-bar";
      tabs.innerHTML = ["🧩 Основное","🧭 Навигация","🧠 Память","📎 Медиа","📦 Вложения","⚙️ Автоматизация"].map((t,i)=> \`<button type="button" class="mode-tab\${i===2?" active":""}">\${t}</button>\`).join("");
      const sub = document.createElement("nav");
      sub.className = "submode-bar";
      sub.innerHTML = ["Описание","Внутренняя","Внешняя","TODO"].map((t,i)=> \`<button type="button" class="submode-btn\${i===2?" active":""}">\${t}</button>\`).join("");
      shell.insertBefore(sub, root.querySelector(".shell-body"));
      shell.insertBefore(tabs, sub);`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }`
  },
  {
    id: "05-props-right-column",
    num: "05",
    title: "Свойства справа",
    desc: "Редактор в центре, форма свойств — узкая колонка между workspace и actions.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) var(--rail-w) var(--flyout-w) 1fr 220px var(--right-w); }
      .props-col { grid-column: 5; border-left: 1px solid var(--border); background: var(--panel-soft); padding: 12px; overflow: auto; }
      .right-panel { grid-column: 6; }
      .workspace .form-props { display: none; }`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    extraMount: `
      const col = document.createElement("aside");
      col.className = "props-col";
      col.innerHTML = \`${PROPS}\`;
      root.querySelector(".shell-body").insertBefore(col, root.querySelector(".right-panel"));`,
    css: `
      .ws-header { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .editor-block { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }
      .props-col .form-props { border: none; background: transparent; padding: 0; }`
  },
  {
    id: "06-props-above-editor",
    num: "06",
    title: "Свойства над редактором",
    desc: "Форма полей (макет 15) между заголовком и содержимым — основной рабочий поток.",
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; align-items: center; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; margin: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }`
  },
  {
    id: "07-split-props-editor",
    num: "07",
    title: "Split 35 / 65",
    desc: "Свойства слева, редактор справа — видно оба блока одновременно.",
    body: `
      <header class="ws-header">${CRUMBS} ${ACTIONS}</header>
      ${TITLE}
      <div class="split-main">
        ${PROPS}
        ${EDITOR.replace("{{viewToggle}}", VIEW)}
      </div>`,
    css: `
      .ws-header { display: flex; justify-content: space-between; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .split-main { flex: 1; display: grid; grid-template-columns: 34% 1fr; gap: 12px; padding: 12px 16px 16px; min-height: 0; }
      .form-props { margin: 0; align-self: start; }
      .editor-block { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }
      .inline-actions { display: flex; gap: 8px; }`
  },
  {
    id: "08-workspace-tabs",
    num: "08",
    title: "Вкладки workspace",
    desc: "Содержимое | Свойства | Превью — переключение вместо одновременного показа.",
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      <div class="tab-wrap" data-tab-wrap>
        <nav class="tab-bar">
          <button type="button" class="tab-btn active" data-tab="content">Содержимое</button>
          <button type="button" class="tab-btn" data-tab="props">Свойства</button>
          <button type="button" class="tab-btn" data-tab="preview">Превью</button>
        </nav>
        <div data-tab-panel="content">${EDITOR.replace("{{viewToggle}}", VIEW)}</div>
        <div class="hidden" data-tab-panel="props">${PROPS}</div>
        <div class="hidden preview-pane" data-tab-panel="preview"><p>Превью markdown…</p></div>
      </div>`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .tab-wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 0 16px 16px; }
      .tab-bar { display: flex; gap: 4px; padding: 10px 0; }
      .tab-btn { border: 1px solid var(--border); background: var(--panel); border-radius: 8px; padding: 7px 12px; font-size: 13px; cursor: pointer; }
      .tab-btn.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
      .editor-block { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 200px; }
      .preview-pane { padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; color: var(--muted); }`
  },
  {
    id: "09-props-accordion",
    num: "09",
    title: "Аккордеон свойств",
    desc: "Свойства свёрнуты по умолчанию — экономия места для длинных заметок.",
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      <details class="props-details">
        <summary>Свойства заметки (3 поля)</summary>
        ${PROPS.replace('<section class="form-props">', '<div class="form-props inner">').replace("</section>", "</div>")}
      </details>
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .props-details { margin: 12px 16px 0; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; }
      .props-details summary { cursor: pointer; font-weight: 600; font-size: 13px; }
      .form-props.inner { border: none; padding: 12px 0 0; background: transparent; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "10-props-bottom-drawer",
    num: "10",
    title: "Свойства снизу",
    desc: "Drawer с формой свойств выезжает снизу workspace по кнопке.",
    body: `
      <header class="ws-header">${CRUMBS} <button type="button" class="btn btn-ghost" data-yaml-toggle="#props-drawer">▲ Свойства</button></header>
      ${TITLE}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}
      <div id="props-drawer" class="props-drawer hidden">${PROPS}</div>`,
    css: `
      .ws-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .editor-block { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .props-drawer { border-top: 1px solid var(--border); background: var(--panel); padding: 12px 16px; max-height: 240px; overflow: auto; }
      .props-drawer .form-props { margin: 0; }`
  },
  {
    id: "11-flyout-overlay",
    num: "11",
    title: "Flyout-оверлей",
    desc: "Только icon-rail; flyout всплывает поверх workspace при наведении на группу.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) var(--rail-w) 1fr var(--right-w); }
      .mode-flyout { display: none; }
      .flyout-pop { position: absolute; left: calc(var(--sidebar-w) + var(--rail-w)); top: 48px; width: 200px; bottom: 0; background: var(--panel); border-right: 1px solid var(--border); box-shadow: var(--shadow); z-index: 20; padding-top: 8px; }`,
    extraMount: `
      const pop = document.createElement("aside");
      pop.className = "flyout-pop";
      pop.innerHTML = root.querySelector(".mode-flyout").innerHTML;
      document.body.appendChild(pop);`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "12-rail-with-labels",
    num: "12",
    title: "Rail с подписями",
    desc: "Icon-rail расширен: иконка + короткая подпись группы режима.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 92px var(--flyout-w) 1fr var(--right-w); }
      .mode-rail { align-items: stretch; padding: 8px 6px; }
      .rail-btn { width: auto; height: auto; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 16px; padding: 4px; }
      .rail-btn::after { content: attr(title); font-size: 9px; color: var(--muted); line-height: 1.1; max-width: 72px; text-align: center; }`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "13-mega-menu-modes",
    num: "13",
    title: "Mega-menu режимов",
    desc: "Клик по rail открывает большую панель со всеми 6 группами и подрежимами.",
    shellCss: `
      .mode-flyout { display: none; }
      .mega-panel { position: fixed; left: calc(var(--sidebar-w) + var(--rail-w) + 8px); top: 56px; width: 420px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 14px; z-index: 50; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .mega-group h4 { margin: 0 0 6px; font-size: 12px; color: var(--muted); }
      .mega-group button { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 6px 8px; border-radius: 6px; font-size: 12px; cursor: pointer; }
      .mega-group button.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }`,
    extraMount: `
      const mega = document.createElement("div");
      mega.className = "mega-panel";
      mega.innerHTML = \`
        <div class="mega-group"><h4>🧩 Основное</h4><button>Описание</button><button>Превью</button></div>
        <div class="mega-group"><h4>🧭 Навигация</h4><button>Оглавление</button><button>MOC</button></div>
        <div class="mega-group"><h4>🧠 Память</h4><button class="active">Внешняя</button><button>TODO</button></div>
        <div class="mega-group"><h4>📎 Медиа</h4><button>Файлы</button></div>
        <div class="mega-group"><h4>📦 Вложения</h4><button>Архивы</button></div>
        <div class="mega-group"><h4>⚙️ Автоматизация</h4><button>Скрипты</button></div>\`;
      document.body.appendChild(mega);`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "14-two-row-shell",
    num: "14",
    title: "Два ряда shell",
    desc: "Ряд 1: крошки на всю ширину контента. Ряд 2: rail+flyout+editor. Заголовок внутри editor.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr var(--right-w); grid-template-rows: auto 1fr; }
      .sidebar { grid-row: 1 / 3; }
      .crumb-span { grid-column: 2; grid-row: 1; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .main-span { grid-column: 2; grid-row: 2; display: grid; grid-template-columns: var(--rail-w) var(--flyout-w) 1fr; min-height: 0; }
      .right-panel { grid-row: 1 / 3; grid-column: 3; }
      .mode-rail, .mode-flyout, .workspace { position: relative; }`,
    extraMount: `
      const sb = root.querySelector(".shell-body");
      const rail = sb.querySelector(".mode-rail");
      const flyout = sb.querySelector(".mode-flyout");
      const ws = sb.querySelector(".workspace");
      const crumb = document.createElement("header");
      crumb.className = "crumb-span";
      crumb.innerHTML = \`${CRUMBS}\`;
      const main = document.createElement("div");
      main.className = "main-span";
      main.append(rail, flyout, ws);
      sb.insertBefore(crumb, rail);
      sb.insertBefore(main, sb.querySelector(".right-panel"));`,
    body: `
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "15-sticky-workspace-header",
    num: "15",
    title: "Липкая шапка workspace",
    desc: "Крошки + название + свойства sticky; прокручивается только редактор.",
    body: `
      <div class="sticky-zone">
        <header class="ws-header">${CRUMBS}</header>
        ${TITLE}
        ${PROPS}
      </div>
      <div class="scroll-editor">${EDITOR.replace("{{viewToggle}}", VIEW)}</div>`,
    css: `
      .sticky-zone { position: sticky; top: 0; z-index: 5; background: var(--bg); }
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 0; border-radius: 0; border-left: none; border-right: none; }
      .scroll-editor { flex: 1; overflow: auto; padding: 12px 16px 16px; min-height: 0; }
      .editor-block { min-height: 420px; display: flex; flex-direction: column; gap: 8px; }`
  },
  {
    id: "16-compact-path-bar",
    num: "16",
    title: "Компактный путь",
    desc: "Крошки сворачиваются в «05 Хобби / … / файл.md» + dropdown полного пути.",
    body: `
      <header class="ws-header">
        <nav class="breadcrumbs"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><span class="breadcrumb">…</span><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>
        <select class="path-select" aria-label="Полный путь"><option>05 Хобби / Дальнобойщики-2 / _Content / Заметка о маршруте.md</option></select>
      </header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header { display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .path-select { margin-left: auto; max-width: 280px; font-size: 12px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border); color: var(--muted); }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "17-notion-flow",
    num: "17",
    title: "Notion-поток",
    desc: "Крупный заголовок, свойства inline-полями, крошки мелко над заголовком, без правой панели.",
    shellCss: `.shell-body { grid-template-columns: var(--sidebar-w) var(--rail-w) var(--flyout-w) 1fr; } .right-panel { display: none; }`,
    body: `
      <p class="path-muted">${CRUMBS}</p>
      <input class="doc-title-input notion" value="Заметка о маршруте" />
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}
      <div class="bottom-actions">${ACTIONS}</div>`,
    css: `
      .path-muted { margin: 0; padding: 16px 20px 0; font-size: 12px; }
      .path-muted .breadcrumbs { font-size: 11px; }
      .doc-title-input.notion { margin: 8px 20px 0; font-size: 28px; border: none; background: transparent; padding: 0; }
      .doc-title-input.notion:focus { outline: none; box-shadow: inset 0 -2px 0 var(--accent); }
      .form-props { margin: 16px 20px 0; background: transparent; }
      .editor-block { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .bottom-actions { padding: 12px 20px 16px; display: flex; gap: 8px; }`
  },
  {
    id: "18-vscode-layout",
    num: "18",
    title: "VS Code layout",
    desc: "Дерево | editor | свойства+actions справа. Rail/flyout — status bar внизу.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr 280px; grid-template-rows: 1fr 28px; }
      .mode-rail, .mode-flyout { display: none; }
      .status-bar { grid-column: 1 / -1; grid-row: 2; display: flex; align-items: center; gap: 12px; padding: 0 12px; background: #1e293b; color: #94a3b8; font-size: 11px; }
      .status-pill { padding: 2px 8px; border-radius: 4px; background: #334155; cursor: pointer; }
      .status-pill.active { background: #2563eb; color: #fff; }
      .right-panel { grid-column: 3; grid-row: 1; border-left: 1px solid var(--border); }
      .workspace { grid-column: 2; grid-row: 1; }`,
    extraMount: `
      const bar = document.createElement("footer");
      bar.className = "status-bar";
      bar.innerHTML = ["🧩 Основное","🧭 Навигация","🧠 Память","📎 Медиа","📦 Вложения","⚙️ Auto"].map((t,i)=> \`<span class="status-pill\${i===2?" active":""}">\${t}</span>\`).join("");
      root.querySelector(".shell-body").appendChild(bar);
      root.querySelector(".right-panel").innerHTML = \`${PROPS}${ACTIONS}\`;`,
    body: `
      <header class="ws-header path-bar">${CRUMBS}</header>
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .path-bar { padding: 6px 12px; background: #f1f5f9; border-bottom: 1px solid var(--border); font-family: monospace; }
      .editor-block { flex: 1; display: flex; flex-direction: column; gap: 0; min-height: 0; }
      .editor-head { padding: 8px 12px; background: var(--panel); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 12px; }
      .editor-textarea { border: none; border-radius: 0; flex: 1; }
      .right-panel .form-props { flex: 1; }
      .inline-actions { display: flex; flex-direction: column; gap: 8px; }`
  },
  {
    id: "19-card-document",
    num: "19",
    title: "Карточка документа",
    desc: "Крошки снаружи; заметка + свойства в белой карточке по центру workspace.",
    body: `
      <header class="ws-header outside">${CRUMBS}</header>
      <article class="doc-card">
        ${TITLE}
        ${PROPS}
        ${EDITOR.replace("{{viewToggle}}", VIEW)}
      </article>`,
    css: `
      .ws-header.outside { padding: 14px 20px 0; background: transparent; border: none; }
      .doc-card { margin: 10px 20px 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
      .title-row { display: flex; gap: 8px; padding: 16px 18px 0; }
      .form-props { margin: 12px 18px 0; }
      .editor-block { flex: 1; padding: 12px 18px 18px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "20-focus-mode",
    num: "20",
    title: "Focus mode",
    desc: "Chrome появляется при hover: rail, крошки, свойства — минимум отвлечений.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr var(--right-w); transition: 0.2s; }
      .mode-rail, .mode-flyout { position: absolute; opacity: 0; pointer-events: none; transition: 0.2s; }
      .shell-body:hover { grid-template-columns: var(--sidebar-w) var(--rail-w) var(--flyout-w) 1fr var(--right-w); }
      .shell-body:hover .mode-rail { position: static; opacity: 1; pointer-events: auto; grid-column: 2; }
      .shell-body:hover .mode-flyout { position: static; opacity: 1; pointer-events: auto; grid-column: 3; }
      .shell-body:hover .workspace { grid-column: 4; }
      .shell-body:hover .right-panel { grid-column: 5; }
      .workspace { grid-column: 2; }`,
    body: `
      <div class="focus-doc">
        ${TITLE}
        ${EDITOR.replace("{{viewToggle}}", VIEW)}
        <button type="button" class="btn btn-ghost props-fab" data-yaml-toggle="#focus-props">⚙</button>
        <div id="focus-props" class="focus-props hidden">${PROPS}</div>
      </div>`,
    css: `
      .focus-doc { flex: 1; padding: 24px 32px; display: flex; flex-direction: column; gap: 12px; position: relative; min-height: 0; }
      .title-row { display: flex; gap: 8px; }
      .doc-title-input { font-size: 20px; border: none; background: transparent; }
      .editor-block { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-textarea { border: none; background: transparent; min-height: 300px; }
      .props-fab { position: absolute; top: 16px; right: 16px; }
      .focus-props { position: absolute; top: 52px; right: 16px; width: 300px; z-index: 10; box-shadow: var(--shadow); }`
  },
  {
    id: "21-stacked-vertical",
    num: "21",
    title: "Вертикальный stack",
    desc: "Все зоны друг под другом — удобно для узких экранов и планшетов.",
    shellCss: `
      .shell-body { display: flex; flex-direction: column; overflow: auto; height: auto; min-height: calc(100vh - 48px); }
      .sidebar, .mode-rail, .mode-flyout, .workspace, .right-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
      .mode-rail { flex-direction: row; justify-content: space-around; padding: 8px; }
      .mode-flyout { flex-direction: row; flex-wrap: wrap; gap: 6px; padding: 8px 12px; }
      .flyout-title { display: none; }
      .mode-switch { width: auto; border-left: none; border-radius: 999px; border: 1px solid var(--border); padding: 6px 12px; }
      .workspace { flex: 1; min-height: 360px; }`,
    body: `
      ${CRUMBS}
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .workspace { padding: 12px 16px; gap: 12px; }
      .title-row { display: flex; gap: 8px; margin-bottom: 8px; }
      .editor-block { display: flex; flex-direction: column; gap: 8px; min-height: 200px; }`
  },
  {
    id: "22-dual-panel-modes",
    num: "22",
    title: "Два боковых panel",
    desc: "Flyout всегда открыт слева от workspace; actions — sticky справа; центр — editor+props.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) var(--rail-w) 220px 1fr 200px; }
      .mode-flyout { grid-column: 3; background: var(--panel-soft); }
      .workspace { grid-column: 4; }
      .right-panel { grid-column: 5; position: sticky; top: 0; align-self: start; }`,
    body: `
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "23-context-header",
    num: "23",
    title: "Контекст в шапке",
    desc: "Группа «Память › Внешняя» + flyout-переключатели inline в одной строке с крошками.",
    shellCss: `.mode-flyout { display: none; }`,
    body: `
      <header class="ctx-header">
        <div class="ctx-left"><span class="ctx-badge">🧠 Память</span><span class="ctx-sep">›</span><span class="ctx-mode">Внешняя (_Content)</span></div>
        ${CRUMBS}
        <div class="ctx-switches">
          <button type="button" class="ctx-btn">Описание</button>
          <button type="button" class="ctx-btn">Внутренняя</button>
          <button type="button" class="ctx-btn active">Внешняя</button>
          <button type="button" class="ctx-btn">TODO</button>
        </div>
      </header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .ctx-header { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; }
      .ctx-left { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
      .ctx-badge { background: var(--accent-soft); color: var(--accent); padding: 4px 10px; border-radius: 999px; font-size: 12px; }
      .ctx-sep { color: var(--muted); }
      .ctx-mode { color: var(--text); }
      .ctx-switches { margin-left: auto; display: flex; gap: 4px; flex-wrap: wrap; }
      .ctx-btn { border: 1px solid var(--border); background: var(--panel-soft); border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
      .ctx-btn.active { background: var(--accent-soft); border-color: #93c5fd; color: var(--accent); font-weight: 600; }
      .title-row { display: flex; gap: 8px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "24-zoned-layout",
    num: "24",
    title: "4 зоны",
    desc: "Чёткое деление: Навигация | Режимы | Документ | Операции — с подписями зон.",
    shellCss: `
      .zone-label { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 6px 10px 0; }
      .sidebar::before { content: "Зона A · Дерево"; display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding-bottom: 8px; }
      .mode-rail::before { content: "B · Группы"; display: block; font-size: 9px; font-weight: 700; color: var(--muted); text-align: center; margin-bottom: 4px; }
      .mode-flyout::before { content: "C · Подрежимы"; display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 8px 10px 0; }
      .right-panel::before { content: "E · Операции"; display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }`,
    body: `
      <div class="zone-label">D · Документ</div>
      <header class="ws-header">${CRUMBS}</header>
      ${TITLE}
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .zone-label { padding: 10px 16px 0; background: var(--panel); border-bottom: 1px solid var(--border); }
      .ws-header, .title-row { padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .title-row { display: flex; gap: 8px; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }`
  },
  {
    id: "25-production-blend",
    num: "25",
    title: "Production blend",
    desc: "Сборка лучших решений: full-width крошки+title, form-props, rail+flyout, actions справа.",
    shellCss: `
      .shell-body { grid-template-columns: var(--sidebar-w) 1fr var(--right-w); grid-template-rows: auto auto 1fr; }
      .sidebar { grid-row: 1 / 4; }
      .doc-top { grid-column: 2; grid-row: 1; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .doc-title-row { grid-column: 2; grid-row: 2; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .doc-main { grid-column: 2; grid-row: 3; display: grid; grid-template-columns: var(--rail-w) var(--flyout-w) 1fr; min-height: 0; }
      .right-panel { grid-row: 1 / 4; grid-column: 3; }
      .mode-rail { grid-column: 1; }
      .mode-flyout { grid-column: 2; }
      .workspace { grid-column: 3; }`,
    extraMount: `
      const sb = root.querySelector(".shell-body");
      const rail = sb.querySelector(".mode-rail");
      const flyout = sb.querySelector(".mode-flyout");
      const ws = sb.querySelector(".workspace");
      const top = document.createElement("header");
      top.className = "doc-top";
      top.innerHTML = \`${CRUMBS}\`;
      const tit = document.createElement("header");
      tit.className = "doc-title-row";
      tit.innerHTML = \`${TITLE}\`;
      const main = document.createElement("div");
      main.className = "doc-main";
      main.append(rail, flyout, ws);
      sb.insertBefore(top, rail);
      sb.insertBefore(tit, rail);
      sb.insertBefore(main, sb.querySelector(".right-panel"));`,
    body: `
      ${PROPS}
      ${EDITOR.replace("{{viewToggle}}", VIEW)}`,
    css: `
      .doc-title-row .title-row { display: flex; gap: 8px; align-items: center; }
      .form-props { margin: 12px 16px 0; }
      .editor-block { flex: 1; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
      .editor-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }`
  }
];

for (const v of VARIANTS) {
  const dir = path.join(ROOT, v.id);
  fs.mkdirSync(dir, { recursive: true });

  const reps = buildReplacements();
  let body = applyTemplate(v.body, reps);
  body = body.replace(/\{\{viewToggle\}\}/g, VIEW);

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
    `/* ${v.id} */\n${v.shellCss || ""}\n${v.css || ""}`
  );

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;
${v.extraMount ? applyTemplate(v.extraMount, reps).trim() : ""}

bindDemoActions(document.body);
const toast = document.getElementById("toast");
document.body.querySelectorAll("[data-action='save'], [data-action='back'], [data-action='close']").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!toast) return;
    toast.textContent = btn.dataset.action === "save" ? "Сохранено" : "Возврат к списку";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  });
});
${v.extraJs || ""}`
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
    <title>Examples3 — полный layout Agent CMS</title>
    <style>
      :root { --bg: #f5f7fb; --panel: #fff; --border: #d7deeb; --text: #1f2937; --muted: #6b7280; --accent: #2563eb; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 820px; line-height: 1.55; margin: 0 0 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #eff6ff; color: #1e40af; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      a.demo:hover { background: #1d4ed8; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .pill { font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; }
    </style>
  </head>
  <body>
    <h1>Examples3 — полный layout Agent CMS</h1>
    <p class="lead">
      25 интерактивных прототипов раскладки всего интерфейса: дерево нод, 6 групп режимов
      (Основное · Навигация · Память · Медиа · Вложения · Автоматизация), flyout подрежимов,
      хлебные крошки, редактирование заметки и форма свойств.
    </p>
    <div class="pill-row">
      <span class="pill">🧩 Основное</span>
      <span class="pill">🧭 Навигация</span>
      <span class="pill">🧠 Память</span>
      <span class="pill">📎 Медиа</span>
      <span class="pill">📦 Вложения</span>
      <span class="pill">⚙️ Автоматизация</span>
    </div>
    <p class="lead" style="font-size:13px;margin-top:-8px;">
      Запуск: <code>cd Examples3 && python3 -m http.server 8767</code> →
      <a href="http://localhost:8767">http://localhost:8767</a>
      · Перегенерация: <code>node generate.mjs</code>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in Examples3/`);
