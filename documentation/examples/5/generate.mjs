#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const VARIANTS = [
  {
    id: "01-sticky-actions-bar",
    num: "01",
    title: "Sticky actions bar",
    desc: "Липкая шапка: крошки слева, Свойства / Сохранить / Удалить справа. Ниже — заголовок (AGENTS 🔒 или input ноды), редактор.",
    body: `
      <header class="sticky-bar">
        {{bothCrumbs}}
        {{actions}}
      </header>
      <div class="doc-body">
        <div class="title-row">{{bothTitles}}</div>
        {{viewToggle}}
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
        <details open><summary class="slab-label">YAML-свойства</summary><textarea class="yaml-textarea">{{agentsYaml}}</textarea></details>
      </div>`,
    css: `.sticky-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); flex-wrap: wrap; }`
  },
  {
    id: "02-title-row-actions",
    num: "02",
    title: "Title row actions",
    desc: "Одна строка: фиксированный AGENTS.md или редактируемое имя ноды + все кнопки справа.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}{{actions}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "03-split-editor-props",
    num: "03",
    title: "Editor | Properties split",
    desc: "Содержимое слева (на всю высоту). Справа колонка свойств + Сохранить внизу колонки.",
    body: `
      <div class="doc-body split-03">
        <div class="title-row">{{bothCrumbs}}</div>
        <div class="title-row">{{bothTitles}}<button class="btn btn-danger" data-action="delete">Удалить</button></div>
        <div class="split-main">
          <div class="split-editor">
            <div class="slab-label">Содержимое</div>
            <textarea class="editor-textarea">{{agentsContent}}</textarea>
          </div>
          <aside class="split-props">
            <div class="slab-label">Свойства</div>
            <textarea class="yaml-textarea">{{agentsYaml}}</textarea>
            <button class="btn btn-primary full" data-action="save">Сохранить</button>
          </aside>
        </div>
      </div>`,
    css: `.split-03 .split-main { display: grid; grid-template-columns: 1fr 260px; gap: 12px; flex: 1; min-height: 0; } .split-props { display: flex; flex-direction: column; gap: 8px; border-left: 1px solid var(--border); padding-left: 12px; } .btn.full { width: 100%; }`
  },
  {
    id: "04-footer-command-bar",
    num: "04",
    title: "Footer command bar",
    desc: "Редактор на максимум высоты. Все действия в нижней панели: Свойства · Сохранить · Удалить.",
    body: `
      <div class="doc-body footer-layout">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}</div>
        <textarea class="editor-textarea flex-grow">{{agentsContent}}</textarea>
        <footer class="footer-bar">{{actions}}</footer>
      </div>`,
    css: `.footer-layout { padding-bottom: 0; } .flex-grow { flex: 1; min-height: 320px; } .footer-bar { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 0; border-top: 1px solid var(--border); margin-top: auto; }`
  },
  {
    id: "05-path-row-actions",
    num: "05",
    title: "Path + actions row",
    desc: "Компактно: одна строка «путь + кнопки», под ней заголовок и текст.",
    body: `
      <div class="doc-body">
        <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span>{{actions}}</div>
        <div class="title-row">{{bothTitles}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.path-actions-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }`
  },
  {
    id: "06-two-row-header",
    num: "06",
    title: "Two-row header",
    desc: "Ряд 1: крошки. Ряд 2: заголовок + Сохранить. YAML-свойства — сворачиваемый блок.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}{{actions}}</div>
        <details><summary class="slab-label">Свойства md-файла</summary><textarea class="yaml-textarea">{{agentsYaml}}</textarea></details>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "07-content-props-tabs",
    num: "07",
    title: "Content | Properties tabs",
    desc: "Вкладки «Содержимое / Свойства / Просмотр». Сохранить в полосе вкладок.",
    body: `
      <div class="doc-body">
        <div class="title-row">{{bothTitles}}</div>
        <div class="tab-bar">
          <button type="button" class="tab active">Содержимое</button>
          <button type="button" class="tab">Свойства</button>
          <button type="button" class="tab">Просмотр</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" data-action="save">Сохранить</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
        </div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.tab-bar { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border); padding-bottom: 8px; } .tab { border: none; background: none; padding: 6px 10px; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; border-radius: 6px; } .tab.active { background: var(--accent-soft); color: #1e40af; }`
  },
  {
    id: "08-floating-save",
    num: "08",
    title: "Floating save",
    desc: "Сохранить — плавающая кнопка при правках. Свойства и Удалить в верхней строке.",
    body: `
      <div class="doc-body">
        <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span>
          <button class="btn" data-action="props">Свойства</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
        </div>
        <div class="title-row">{{bothTitles}}</div>
        <textarea class="editor-textarea" id="fab-editor">{{agentsContent}}</textarea>
        <button type="button" class="fab-save" data-action="save">Сохранить</button>
      </div>`,
    css: ``
  },
  {
    id: "09-segmented-preview",
    num: "09",
    title: "Segmented editor | preview",
    desc: "Сегмент «Источник | Просмотр» над текстом. Действия справа от сегмента.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}</div>
        <div class="toolbar-row">{{viewToggle}}<span class="spacer"></span>{{actions}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.toolbar-row { display: flex; align-items: center; gap: 10px; }`
  },
  {
    id: "10-notion-hero-menu",
    num: "10",
    title: "Notion hero + menu",
    desc: "Крупный заголовок (badge или input). Действия в меню ⋯: Сохранить, Свойства, Удалить.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="hero-row">
          <div class="hero-title">{{bothTitles}}</div>
          <div class="menu-dropdown">
            <details><summary class="btn btn-icon">⋯</summary>
              <div class="menu-panel">
                <button type="button" data-action="save">Сохранить</button>
                <button type="button" data-action="props">Свойства</button>
                <button type="button" data-action="delete">Удалить ноду</button>
              </div>
            </details>
          </div>
        </div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.hero-row { display: flex; align-items: flex-start; gap: 12px; } .hero-title { flex: 1; font-size: 22px; } .hero-title .title-fixed { font-size: 22px; } .hero-title .doc-title-input { font-size: 22px; max-width: none; }`
  },
  {
    id: "11-yaml-above-editor",
    num: "11",
    title: "YAML above editor",
    desc: "Свойства первым блоком (как frontmatter). Сохранить в правом верхнем углу.",
    body: `
      <div class="doc-body">
        <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span><button class="btn btn-primary" data-action="save">Сохранить</button></div>
        <div class="title-row">{{bothTitles}}</div>
        <div class="slab-label">Свойства</div>
        <textarea class="yaml-textarea">{{agentsYaml}}</textarea>
        <div class="slab-label">Содержимое</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
        <button class="btn btn-danger" data-action="delete">Удалить ноду</button>
      </div>`,
    css: ``
  },
  {
    id: "12-icon-actions",
    num: "12",
    title: "Icon actions",
    desc: "Минимум текста на кнопках: 💾 ⚙ 🗑 рядом с заголовком.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}{{actionsIcons}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "13-duplicate-save",
    num: "13",
    title: "Duplicate save (anti)",
    desc: "Сохранить и в шапке, и над редактором — намеренный антипаттерн для сравнения.",
    body: `
      <div class="doc-body">
        <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span>{{actions}}</div>
        <div class="title-row">{{bothTitles}}</div>
        <div class="warn-dup">Дублирование «Сохранить» — только для сравнения</div>
        <div class="toolbar-row"><button class="btn btn-primary" data-action="save">Сохранить</button>{{viewToggle}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.warn-dup { font-size: 11px; color: #b45309; background: var(--warn-soft); padding: 6px 10px; border-radius: 6px; } .toolbar-row { display: flex; gap: 8px; align-items: center; }`
  },
  {
    id: "14-overflow-menu-only",
    num: "14",
    title: "Overflow menu only",
    desc: "В шапке только ⋯ — все действия в выпадающем списке. Чистая зона текста.",
    body: `
      <div class="doc-body">
        <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span>
          <details class="menu-dropdown"><summary class="btn">Действия ▾</summary>
            <div class="menu-panel" style="position:relative;box-shadow:none;border:none;padding:0;">
              <button data-action="save">Сохранить</button>
              <button data-action="props">Свойства</button>
              <button data-action="delete">Удалить</button>
            </div>
          </details>
        </div>
        <div class="title-row">{{bothTitles}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "15-preview-first",
    num: "15",
    title: "Preview first",
    desc: "По умолчанию просмотр markdown. «Редактировать» открывает источник + Сохранить.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}
          <button class="btn" type="button">Редактировать</button>
          <button class="btn btn-primary hidden" data-action="save">Сохранить</button>
        </div>
        <div class="preview-pane"><h1>Main Agent</h1><p>Роль: координатор воркспейса.</p></div>
        <textarea class="editor-textarea hidden">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "16-agents-system-banner",
    num: "16",
    title: "AGENTS system banner",
    desc: "Для AGENTS.md — жёлтый баннер «системный файл». Для ноды баннер скрыт.",
    body: `
      <div class="sys-banner" data-agents-only>🔒 Системный файл AGENTS.md — имя нельзя переименовать</div>
      <div class="doc-body">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}{{actions}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: ``
  },
  {
    id: "17-node-hero-title",
    num: "17",
    title: "Node hero title",
    desc: "Нода: крупный input. AGENTS: компактная строка badge под крошками.",
    body: `
      <div class="doc-body">
        {{bothCrumbs}}
        <div data-title-zone="agents" class="title-zone agents-compact"><div class="title-fixed"><span>AGENTS.md</span><span class="lock">🔒</span></div></div>
        <div data-title-zone="node" class="title-zone hidden node-hero">
          <input class="doc-title-input hero-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span>
        </div>
        <div class="title-row"><span class="spacer"></span>{{actions}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.node-hero .hero-input { font-size: 26px; max-width: none; width: 100%; border: none; padding: 0; } .node-hero .hero-input:focus { outline: none; box-shadow: inset 0 -2px 0 var(--accent); } .agents-compact { margin-bottom: 4px; }`
  },
  {
    id: "18-meta-sidebar",
    num: "18",
    title: "Meta sidebar",
    desc: "Узкая колонка слева: тип файла, стек кнопок. Справа — содержимое.",
    body: `
      <div class="doc-body meta-layout">
        <aside class="meta-col">
          <div class="slab-label">Документ</div>
          <p data-agents-only class="meta-type">AGENTS.md</p>
          <p data-node-only class="meta-type hidden">_.node.md</p>
          <button class="btn btn-primary full" data-action="save">Сохранить</button>
          <button class="btn full" data-action="props">Свойства</button>
          <button class="btn btn-danger full" data-action="delete">Удалить</button>
        </aside>
        <div class="meta-main">
          {{bothCrumbs}}
          <div class="title-row">{{bothTitles}}</div>
          <textarea class="editor-textarea">{{agentsContent}}</textarea>
        </div>
      </div>`,
    css: `.meta-layout { flex-direction: row !important; padding: 0 !important; } .meta-col { width: 140px; flex-shrink: 0; padding: 14px 12px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; } .meta-main { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; } .meta-type { margin: 0; font-size: 13px; font-weight: 700; }`
  },
  {
    id: "19-props-inspector",
    num: "19",
    title: "Properties inspector",
    desc: "Контент на всю ширину. «Свойства» открывает правую панель-drawer с YAML.",
    body: `
      <div class="doc-body inspector-layout">
        <div class="inspector-main">
          <div class="path-actions-row">{{bothCrumbs}}<span class="spacer"></span>
            <button class="btn" data-action="props">Свойства ▸</button>
            <button class="btn btn-primary" data-action="save">Сохранить</button>
            <button class="btn btn-danger" data-action="delete">Удалить</button>
          </div>
          <div class="title-row">{{bothTitles}}</div>
          <textarea class="editor-textarea">{{agentsContent}}</textarea>
        </div>
        <aside class="inspector-drawer">
          <div class="slab-label">Свойства</div>
          <textarea class="yaml-textarea">{{agentsYaml}}</textarea>
        </aside>
      </div>`,
    css: `.inspector-layout { flex-direction: row !important; gap: 0; padding: 0 !important; } .inspector-main { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; } .inspector-drawer { width: 280px; border-left: 1px solid var(--border); padding: 14px; background: var(--panel-soft); display: flex; flex-direction: column; gap: 8px; }`
  },
  {
    id: "20-status-bar",
    num: "20",
    title: "Status bar",
    desc: "VS Code: путь и dirty слева внизу; Save / Props / Delete справа в status bar.",
    body: `
      <div class="doc-body status-layout">
        {{bothCrumbs}}
        <div class="title-row">{{bothTitles}}</div>
        <textarea class="editor-textarea flex-grow">{{agentsContent}}</textarea>
        <div class="status-bar">
          <span>AGENTS.md · изменён</span>
          <span class="spacer"></span>
          <button class="btn btn-ghost" data-action="props">Свойства</button>
          <button class="btn btn-primary" data-action="save">Сохранить</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
        </div>
      </div>`,
    css: `.status-layout { padding-bottom: 0; }`
  },
  {
    id: "21-crumb-embedded-actions",
    num: "21",
    title: "Actions in crumbs",
    desc: "Сохранить и Удалить как «крошки» в конце пути (компактно, спорно).",
    body: `
      <div class="doc-body">
        <nav class="breadcrumbs crumb-zone" data-crumb-zone="agents">{{agentsCrumbsInner}}
          <span class="breadcrumb-sep">·</span>
          <button class="btn btn-primary crumb-action" data-action="save">Сохранить</button>
          <button class="btn btn-danger crumb-action" data-action="delete">Удалить</button>
        </nav>
        <nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node">{{nodeCrumbsInner}}
          <span class="breadcrumb-sep">·</span>
          <button class="btn btn-primary crumb-action" data-action="save">Сохранить</button>
          <button class="btn btn-danger crumb-action" data-action="delete">Удалить</button>
        </nav>
        <div class="title-row">{{bothTitles}}<button class="btn" data-action="props">Свойства</button></div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.crumb-action { font-size: 11px; padding: 4px 8px; margin-left: 4px; }`
  },
  {
    id: "22-card-document",
    num: "22",
    title: "Card document",
    desc: "Весь документ в карточке: шапка карточки = заголовок + действия.",
    body: `
      <div class="doc-body">
        <article class="doc-card">
          <header class="doc-card-head">
            <div>{{bothTitles}}</div>
            {{actions}}
          </header>
          {{bothCrumbs}}
          <textarea class="editor-textarea">{{agentsContent}}</textarea>
        </article>
      </div>`,
    css: `.doc-card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow); } .doc-card-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 10px; }`
  },
  {
    id: "23-mobile-stacked",
    num: "23",
    title: "Mobile stacked",
    desc: "Вертикальный стек: крошки → заголовок → полная ширина кнопок → редактор.",
    body: `
      <div class="doc-body mobile-stack">
        {{bothCrumbs}}
        <div class="title-row stack-title">{{bothTitles}}</div>
        <div class="action-stack">{{actions}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </div>`,
    css: `.action-stack { display: flex; flex-direction: column; gap: 6px; } .action-stack .btn { width: 100%; } .stack-title { flex-direction: column; align-items: stretch; }`
  },
  {
    id: "24-production-blend",
    num: "24",
    title: "Production blend",
    desc: "Близко к Agent CMS: плита пути, плита названия+действий, плита свойств, плита содержимого.",
    body: `
      <section class="slab path-slab">{{bothCrumbs}}</section>
      <section class="slab title-slab">
        <div class="slab-label">Название</div>
        <div class="title-row">{{bothTitles}}{{actions}}</div>
      </section>
      <section class="slab props-slab">
        <div class="slab-label">Свойства md-файла</div>
        <textarea class="yaml-textarea">{{agentsYaml}}</textarea>
      </section>
      <section class="slab content-slab">
        <div class="path-actions-row"><span class="slab-label" style="margin:0">Содержимое</span>{{viewToggle}}</div>
        <textarea class="editor-textarea">{{agentsContent}}</textarea>
      </section>`,
    css: `.workspace { gap: 0; } .slab { padding: 10px 16px; border-bottom: 1px solid var(--border); } .content-slab { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: auto; } .content-slab .editor-textarea { flex: 1; }`
  },
  {
    id: "25-compare-split",
    num: "25",
    title: "AGENTS vs Node split",
    desc: "Два столбца: слева AGENTS.md (фикс. имя), справа нода — одна раскладка, разный заголовок.",
    body: `
      <div class="doc-body compare-split">
        <div class="compare-col">
          <h3>AGENTS.md</h3>
          <div class="title-fixed"><span>AGENTS.md</span><span class="lock">🔒</span></div>
          <div class="doc-actions"><button class="btn" data-action="props">Свойства</button><button class="btn btn-primary" data-action="save">Сохранить</button></div>
          <textarea class="editor-textarea">{{agentsContent}}</textarea>
        </div>
        <div class="compare-col">
          <h3>_.node.md</h3>
          <div class="title-row"><input class="doc-title-input" value="Дальнобойщики-2" /><span class="doc-ext">.node.md</span></div>
          <div class="doc-actions"><button class="btn" data-action="props">Свойства</button><button class="btn btn-primary" data-action="save">Сохранить</button><button class="btn btn-danger" data-action="delete">Удалить</button></div>
          <textarea class="editor-textarea">{{nodeContent}}</textarea>
        </div>
      </div>`,
    css: `.workspace .doc-type-switch { display: none; }`,
    noDocToggle: true
  }
];

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function crumbsInner(parts) {
  return parts
    .map((part, i) => {
      const sep = i > 0 ? '<span class="breadcrumb-sep">/</span>' : "";
      const isLast = i === parts.length - 1;
      const inner = isLast
        ? `<span class="breadcrumb current">${part}</span>`
        : `<button type="button" class="breadcrumb">${part}</button>`;
      return sep + inner;
    })
    .join("");
}

function buildReplacements() {
  const AGENTS = {
    crumbs: ["Workspaces", "Main Agent", "AGENTS.md"],
    content: `# Main Agent\n\nРоль: координатор воркспейса.\n\n## Правила\n- Не переименовывать этот файл`,
    yaml: `agent_id: main\nname: Main Agent\nversion: 1`
  };
  const NODE = {
    crumbs: ["05 Хобби", "Дальнобойщики-2", "Память", "Заметка.md"],
    title: "Дальнобойщики-2",
    content: `# Маршрут Москва — Казань\n\n- Старт: 06:00\n- Прибытие: 18:30`,
    yaml: `title: Заметка\nstatus: draft`
  };

  const DOC_TYPE_SWITCH = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>`;

  const agentsCrumbs = `<nav class="breadcrumbs crumb-zone" data-crumb-zone="agents">${crumbsInner(AGENTS.crumbs)}</nav>`;
  const nodeCrumbs = `<nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node">${crumbsInner(NODE.crumbs)}</nav>`;
  const agentsTitle = `<div class="title-zone" data-title-zone="agents"><div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div></div>`;
  const nodeTitle = `<div class="title-zone hidden" data-title-zone="node"><input class="doc-title-input" value="${NODE.title}" /><span class="doc-ext">.node.md</span></div>`;

  const ACTIONS_STANDARD = `
  <div class="doc-actions">
    <button type="button" class="btn" data-action="props">Свойства</button>
    <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
    <button type="button" class="btn btn-danger" data-action="delete">Удалить</button>
  </div>`;

  const ACTIONS_ICONS = `
  <div class="doc-actions">
    <button type="button" class="btn btn-icon" data-action="props" title="Свойства">⚙</button>
    <button type="button" class="btn btn-icon btn-primary" data-action="save" title="Сохранить">💾</button>
    <button type="button" class="btn btn-icon btn-danger" data-action="delete" title="Удалить">🗑</button>
  </div>`;

  const VIEW_TOGGLE = `
  <div class="view-toggle" role="tablist">
    <button type="button" class="active">Источник</button>
    <button type="button">Просмотр</button>
  </div>`;

  return {
    "{{docTypeSwitch}}": DOC_TYPE_SWITCH,
    "{{bothCrumbs}}": agentsCrumbs + nodeCrumbs,
    "{{agentsCrumbsInner}}": crumbsInner(AGENTS.crumbs),
    "{{nodeCrumbsInner}}": crumbsInner(NODE.crumbs),
    "{{bothTitles}}": agentsTitle + nodeTitle,
    "{{actions}}": ACTIONS_STANDARD,
    "{{actionsIcons}}": ACTIONS_ICONS,
    "{{viewToggle}}": VIEW_TOGGLE,
    "{{agentsContent}}": escapeHtml(AGENTS.content),
    "{{nodeContent}}": escapeHtml(NODE.content),
    "{{agentsYaml}}": escapeHtml(AGENTS.yaml),
    "{{nodeYaml}}": escapeHtml(NODE.yaml)
  };
}

function applyTemplate(str, reps) {
  let out = str;
  for (const [k, v] of Object.entries(reps)) out = out.split(k).join(v);
  return out;
}

for (const v of VARIANTS) {
  const dir = path.join(ROOT, v.id);
  fs.mkdirSync(dir, { recursive: true });
  const reps = buildReplacements();
  let body = applyTemplate(v.body, reps);
  if (!v.noDocToggle) {
    body = applyTemplate("{{docTypeSwitch}}", reps) + body;
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

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions } from "../shared-mock.js";
${v.noDocToggle ? "" : 'import { bindDocTypeToggle } from "../shared-mock.js";'}

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;

${v.noDocToggle ? "" : "bindDocTypeToggle(workspace);"}
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
    <title>Example5 — форма AGENTS.md и ноды</title>
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
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f5f3ff; color: #5b21b6; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      .focus-card { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
    </style>
  </head>
  <body>
    <h1>Example5 — форма редактирования</h1>
    <p class="lead">
      25 прототипов: где разместить <strong>Сохранить</strong>, <strong>Свойства</strong>, <strong>Удалить</strong>
      и зону просмотра/редактирования текста для <code>AGENTS.md</code> (имя фиксировано) и <code>_.node.md</code> (имя редактируется).
      В каждом варианте переключатель AGENTS / Нода.
    </p>
    <p class="lead" style="font-size:13px;margin-top:-8px;">
      Запуск: <code>cd documentation/examples/5 && python3 -m http.server 8767</code> →
      <a href="http://localhost:8767">http://localhost:8767</a>
      · См. также <a href="./VISION.md">VISION.md</a>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in documentation/examples/5/`);