#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname);

const VARIANTS = [
  {
    id: "01-sticky-doc-bar",
    num: "01",
    title: "Sticky doc bar",
    desc: "Липкая шапка документа: крошки слева, «Назад / Сохранить / Закрыть» справа. Редактор на всю ширину.",
    body: `
      <header class="doc-bar sticky">
        ${"{{breadcrumbs}}"}
        <div class="doc-actions">
          <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          <button type="button" class="btn" data-action="close">Закрыть</button>
        </div>
      </header>
      <div class="doc-main">
        <div class="title-block">
          <label class="yaml-label">Название файла</label>
          <div class="title-row"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
        </div>
        <div class="editor-block">
          <div class="editor-toolbar"><span>Содержимое</span>${"{{viewToggle}}"}</div>
          <textarea class="editor-textarea">{{content}}</textarea>
        </div>
        <aside class="yaml-block">
          <div class="yaml-label">YAML-свойства</div>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </aside>
      </div>`,
    css: `
      .doc-bar.sticky { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .doc-actions { display: flex; gap: 8px; flex-shrink: 0; }
      .doc-main { display: grid; grid-template-columns: 1fr 280px; grid-template-rows: auto 1fr; gap: 12px; padding: 14px 16px; min-height: 0; flex: 1; overflow: auto; }
      .title-block { grid-column: 1 / -1; }
      .title-row { display: flex; align-items: center; gap: 6px; }
      .editor-block { display: flex; flex-direction: column; gap: 8px; min-height: 320px; }
      .editor-toolbar { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; }
      .yaml-block { border-left: 1px solid var(--border); padding-left: 12px; }`
  },
  {
    id: "02-compact-chips-path",
    num: "02",
    title: "Path chips",
    desc: "Крошки как компактные чипы с иконкой папки. YAML под редактором в свёрнутой секции.",
    body: `
      <div class="doc-wrap">
        <div class="chip-path">${"{{chipCrumbs}}"}</div>
        <div class="hero-title"><input class="doc-title-input hero" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
        <div class="toolbar-row">
          <button type="button" class="btn btn-ghost" data-action="back">← К списку</button>
          ${"{{viewToggle}}"}
          <div class="spacer"></div>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
        <textarea class="editor-textarea tall">{{content}}</textarea>
        <details class="yaml-details" open>
          <summary>YAML-свойства</summary>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </details>
      </div>`,
    css: `
      .doc-wrap { padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow: auto; flex: 1; }
      .chip-path { display: flex; flex-wrap: wrap; gap: 6px; }
      .path-chip { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: var(--panel); border: 1px solid var(--border); color: var(--muted); }
      .path-chip:last-child { color: var(--text); font-weight: 600; border-color: #93c5fd; background: var(--accent-soft); }
      .hero-title { display: flex; align-items: center; gap: 8px; }
      .doc-title-input.hero { font-size: 22px; border: none; background: transparent; padding: 0; }
      .doc-title-input.hero:focus { outline: none; box-shadow: inset 0 -2px 0 var(--accent); }
      .toolbar-row { display: flex; align-items: center; gap: 10px; }
      .spacer { flex: 1; }
      .editor-textarea.tall { min-height: 280px; }
      .yaml-details summary { cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 8px; }`
  },
  {
    id: "03-floating-actions",
    num: "03",
    title: "Floating actions",
    desc: "Минимальный верх — только путь текстом. Кнопки «Сохранить» и «Закрыть» плавают внизу справа.",
    body: `
      <div class="doc-minimal">
        <p class="path-line">{{pathLine}}</p>
        <input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext inline">{{ext}}</span>
        <textarea class="editor-textarea full">{{content}}</textarea>
        <div class="yaml-rail">
          <button type="button" class="btn" data-yaml-toggle="#yaml-panel">⚙ YAML</button>
          <div id="yaml-panel" class="yaml-pop hidden">
            <textarea class="yaml-textarea">{{yaml}}</textarea>
          </div>
        </div>
        <div class="fab-group">
          <button type="button" class="fab secondary" data-action="back" title="Назад">←</button>
          <button type="button" class="fab primary" data-action="save">Сохранить</button>
          <button type="button" class="fab" data-action="close">✕</button>
        </div>
      </div>`,
    css: `
      .doc-minimal { padding: 20px; position: relative; flex: 1; display: flex; flex-direction: column; gap: 10px; overflow: auto; }
      .path-line { margin: 0; font-size: 12px; color: var(--muted); }
      .doc-ext.inline { margin-left: 6px; color: var(--muted); font-weight: 600; }
      .editor-textarea.full { flex: 1; min-height: 300px; border: none; box-shadow: inset 0 0 0 1px var(--border); }
      .yaml-rail { position: relative; }
      .yaml-pop { position: absolute; bottom: 100%; left: 0; width: 320px; margin-bottom: 8px; padding: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow); }
      .fab-group { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 8px; z-index: 50; }
      .fab { border: none; border-radius: 999px; padding: 12px 18px; font-weight: 700; cursor: pointer; box-shadow: var(--shadow); background: var(--panel); }
      .fab.primary { background: var(--accent); color: #fff; }
      .fab.secondary { padding: 12px 14px; }`
  },
  {
    id: "04-two-row-header",
    num: "04",
    title: "Two-row header",
    desc: "Два ряда: крошки + закрыть; название + сохранить. YAML справа в колонке.",
    body: `
      <header class="header-a">${"{{breadcrumbs}}"}<button type="button" class="btn btn-ghost" data-action="close">Закрыть ✕</button></header>
      <header class="header-b">
        <div class="title-row"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </header>
      <div class="split-body">
        <div class="editor-col">
          <div class="subhead">Содержимое ${"{{viewToggle}}"}</div>
          <textarea class="editor-textarea">{{content}}</textarea>
        </div>
        <aside class="yaml-col">
          <div class="yaml-label">YAML</div>
          <textarea class="yaml-textarea tall">{{yaml}}</textarea>
          <button type="button" class="btn btn-ghost full" data-action="back">← К списку _Content</button>
        </aside>
      </div>`,
    css: `
      .header-a, .header-b { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .header-b .title-row { flex: 1; display: flex; gap: 6px; align-items: center; }
      .split-body { display: grid; grid-template-columns: 1fr 240px; flex: 1; min-height: 0; }
      .editor-col, .yaml-col { padding: 14px 16px; overflow: auto; }
      .yaml-col { border-left: 1px solid var(--border); background: var(--panel-soft); display: flex; flex-direction: column; gap: 8px; }
      .yaml-textarea.tall { flex: 1; min-height: 200px; }
      .subhead { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
      .btn.full { width: 100%; margin-top: auto; }`
  },
  {
    id: "05-notion-header",
    num: "05",
    title: "Notion-style",
    desc: "Крупный заголовок как в Notion, путь — мелкий подзаголовок. Свойства — таблица полей.",
    body: `
      <div class="notion-doc">
        <button type="button" class="btn btn-ghost back-top" data-action="back">← Внешняя память</button>
        <p class="notion-path">{{pathLine}}</p>
        <div class="notion-title-row"><span class="emoji">📄</span><input class="notion-title" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
        <div class="props-table">
          <div class="prop-row"><span>tags</span><input value="логистика, маршрут" /></div>
          <div class="prop-row"><span>status</span><select><option>draft</option><option>published</option></select></div>
          <div class="prop-row"><span>created</span><input value="2026-04-19" /></div>
        </div>
        <details class="yaml-raw"><summary>Raw YAML</summary><textarea class="yaml-textarea">{{yaml}}</textarea></details>
        <textarea class="editor-textarea borderless">{{content}}</textarea>
        <div class="notion-footer"><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>
      </div>`,
    css: `
      .notion-doc { padding: 24px 32px; max-width: 820px; margin: 0 auto; overflow: auto; flex: 1; }
      .back-top { margin-bottom: 8px; }
      .notion-path { font-size: 12px; color: var(--muted); margin: 0 0 12px; }
      .notion-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
      .emoji { font-size: 28px; }
      .notion-title { flex: 1; border: none; font-size: 32px; font-weight: 700; padding: 4px 0; background: transparent; }
      .notion-title:focus { outline: none; }
      .props-table { display: grid; gap: 8px; margin-bottom: 16px; padding: 12px; background: var(--panel-soft); border-radius: 10px; }
      .prop-row { display: grid; grid-template-columns: 100px 1fr; gap: 10px; align-items: center; font-size: 13px; }
      .prop-row input, .prop-row select { border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; }
      .yaml-raw { margin-bottom: 12px; }
      .editor-textarea.borderless { border: none; min-height: 240px; padding: 0; background: transparent; }
      .notion-footer { position: sticky; bottom: 0; padding-top: 12px; background: linear-gradient(transparent, var(--bg) 30%); }`
  },
  {
    id: "06-yaml-bottom-drawer",
    num: "06",
    title: "YAML bottom drawer",
    desc: "YAML выезжает снизу по кнопке. Центр — только редактор и крошки.",
    body: `
      <header class="top-strip">${"{{breadcrumbs}}"}
        <div class="actions"><button type="button" class="btn" data-action="back">Назад</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>
      </header>
      <div class="center-editor">
        <div class="title-row"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
        <textarea class="editor-textarea stretch">{{content}}</textarea>
      </div>
      <button type="button" class="drawer-toggle" data-yaml-toggle="#yaml-drawer">▲ YAML-свойства</button>
      <div id="yaml-drawer" class="yaml-drawer">
        <textarea class="yaml-textarea">{{yaml}}</textarea>
        <button type="button" class="btn" data-action="close">Закрыть документ</button>
      </div>`,
    css: `
      .top-strip { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
      .actions { display: flex; gap: 8px; }
      .center-editor { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
      .editor-textarea.stretch { flex: 1; min-height: 260px; }
      .drawer-toggle { width: 100%; border: none; border-top: 1px solid var(--border); background: var(--panel-soft); padding: 10px; cursor: pointer; font-weight: 600; }
      .yaml-drawer { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--panel); display: flex; flex-direction: column; gap: 8px; }
      .yaml-drawer.hidden { display: none; }`
  },
  {
    id: "07-center-tabs",
    num: "07",
    title: "Editor | YAML tabs",
    desc: "Вкладки «Содержимое» и «YAML» в центре — без правой панели.",
    body: `
      ${"{{breadcrumbsBar}}"}
      <div class="tab-bar">
        <button type="button" class="tab active" data-tab="content">Содержимое</button>
        <button type="button" class="tab" data-tab="yaml">YAML-свойства</button>
        <div class="tab-spacer"></div>
        <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </div>
      <div class="tab-panels">
        <div class="tab-panel" data-panel="content">
          <div class="title-row"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
          <textarea class="editor-textarea">{{content}}</textarea>
        </div>
        <div class="tab-panel hidden" data-panel="yaml">
          <textarea class="yaml-textarea big">{{yaml}}</textarea>
        </div>
      </div>`,
    css: `
      .crumb-bar { padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
      .tab-bar { display: flex; align-items: center; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--panel-soft); }
      .tab { border: none; background: transparent; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; color: var(--muted); }
      .tab.active { background: var(--panel); color: var(--accent); box-shadow: inset 0 0 0 1px var(--border); }
      .tab-spacer { flex: 1; }
      .tab-panels { flex: 1; padding: 14px 16px; overflow: auto; }
      .tab-panel { display: flex; flex-direction: column; gap: 10px; min-height: 300px; }
      .yaml-textarea.big { flex: 1; min-height: 320px; }`,
    extraJs: `
      root.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          root.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const id = tab.dataset.tab;
          root.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== id));
        });
      });`
  },
  {
    id: "08-yaml-accordion",
    num: "08",
    title: "YAML accordion top",
    desc: "YAML-аккордеон над редактором. Крошки в одной строке с кнопками.",
    body: `
      <div class="doc-pad">
        <div class="row-between">${"{{breadcrumbs}}"}<div class="btns"><button type="button" class="btn" data-action="back">←</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div></div>
        <input class="doc-title-input" value="{{fileBase}}" />
        <details class="yaml-acc" open><summary>YAML · frontmatter</summary><textarea class="yaml-textarea">{{yaml}}</textarea></details>
        <textarea class="editor-textarea">{{content}}</textarea>
      </div>`,
    css: `
      .doc-pad { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: auto; }
      .row-between { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .btns { display: flex; gap: 6px; flex-shrink: 0; }
      .yaml-acc { border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; background: #fbfdff; }
      .yaml-acc summary { font-weight: 600; cursor: pointer; margin-bottom: 8px; }`
  },
  {
    id: "09-path-dropdown",
    num: "09",
    title: "Compact path dropdown",
    desc: "Длинный путь сворачивается в dropdown «…/_Content/файл».",
    body: `
      <header class="compact-head">
        <button type="button" class="path-dd" id="path-dd">📁 … / _Content / {{fileBase}}{{ext}}</button>
        <div class="head-actions">
          <button type="button" class="btn btn-ghost" data-action="back">Назад</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
      </header>
      <div class="dd-menu hidden" id="dd-menu">${"{{fullPathList}}"}</div>
      <div class="body-pad">
        <textarea class="editor-textarea">{{content}}</textarea>
        <aside class="yaml-side"><div class="yaml-label">props.yaml</div><textarea class="yaml-textarea">{{yaml}}</textarea></aside>
      </div>`,
    css: `
      .compact-head { display: flex; justify-content: space-between; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); position: relative; }
      .path-dd { border: 1px solid var(--border); background: var(--panel-soft); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
      .head-actions { display: flex; gap: 8px; }
      .dd-menu { position: absolute; top: 100%; left: 16px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px; box-shadow: var(--shadow); z-index: 20; min-width: 280px; }
      .dd-menu div { padding: 6px 8px; font-size: 13px; border-radius: 6px; }
      .dd-menu div:hover { background: var(--panel-soft); }
      .body-pad { display: grid; grid-template-columns: 1fr 220px; gap: 12px; padding: 14px 16px; flex: 1; overflow: auto; }
      .yaml-side { border-left: 1px solid var(--border); padding-left: 12px; }`,
    extraJs: `
      const dd = root.querySelector('#path-dd');
      const menu = root.querySelector('#dd-menu');
      dd?.addEventListener('click', () => menu?.classList.toggle('hidden'));`
  },
  {
    id: "10-unified-toolbar",
    num: "10",
    title: "Unified toolbar",
    desc: "Одна панель: ← | крошки | Edit/Preview | YAML | Save.",
    body: `
      <div class="unified-bar">
        <button type="button" class="btn btn-ghost" data-action="back">←</button>
        <div class="crumbs-inline">${"{{breadcrumbs}}"}</div>
        ${"{{viewToggle}}"}
        <button type="button" class="btn" data-yaml-toggle="#y">YAML</button>
        <button type="button" class="btn btn-primary" data-action="save">Save</button>
      </div>
      <div class="unified-body">
        <input class="doc-title-input" value="{{fileBase}}{{ext}}" />
        <textarea class="editor-textarea">{{content}}</textarea>
        <div id="y" class="yaml-inline hidden"><textarea class="yaml-textarea">{{yaml}}</textarea></div>
      </div>`,
    css: `
      .unified-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #1e293b; color: #e2e8f0; flex-wrap: wrap; }
      .unified-bar .btn { border-color: #334155; background: #334155; color: #f8fafc; }
      .unified-bar .btn-primary { background: var(--accent); border-color: var(--accent); }
      .unified-bar .breadcrumbs { color: #94a3b8; }
      .unified-bar .breadcrumb.current { color: #f8fafc; }
      .crumbs-inline { flex: 1; min-width: 120px; }
      .unified-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: auto; }
      .yaml-inline { border-top: 1px dashed var(--border); padding-top: 10px; }`
  },
  {
    id: "11-card-document",
    num: "11",
    title: "Card document",
    desc: "Документ в «карточке» с тенью. Крошки снаружи карточки.",
    body: `
      <div class="outer">${"{{breadcrumbs}}"}</div>
      <article class="doc-card">
        <header class="card-head">
          <input class="doc-title-input flat" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span>
          <div class="card-actions">
            <button type="button" class="btn btn-ghost" data-action="back">Назад</button>
            <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          </div>
        </header>
        <div class="card-grid">
          <textarea class="editor-textarea">{{content}}</textarea>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </div>
      </article>`,
    css: `
      .outer { padding: 12px 20px 0; }
      .doc-card { margin: 12px 20px 20px; background: var(--panel); border-radius: 14px; box-shadow: var(--shadow); border: 1px solid var(--border); overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
      .card-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
      .doc-title-input.flat { border: none; flex: 1; padding: 0; font-size: 18px; }
      .card-actions { display: flex; gap: 8px; }
      .card-grid { display: grid; grid-template-columns: 1fr 240px; flex: 1; min-height: 280px; }
      .card-grid textarea { border: none; border-radius: 0; min-height: 100%; }
      .card-grid .yaml-textarea { border-left: 1px solid var(--border); background: var(--panel-soft); }`
  },
  {
    id: "12-focus-mode",
    num: "12",
    title: "Focus mode",
    desc: "Chrome появляется при наведении. Максимум места редактору.",
    body: `
      <div class="focus-wrap">
        <div class="focus-chrome">
          ${"{{breadcrumbs}}"}
          <button type="button" class="btn btn-primary sm" data-action="save">Сохранить</button>
          <button type="button" class="btn sm" data-action="back">←</button>
        </div>
        <h2 class="focus-title">{{fileBase}}<span class="doc-ext">{{ext}}</span></h2>
        <textarea class="editor-textarea focus">{{content}}</textarea>
        <div class="focus-yaml"><span>yaml</span><textarea class="yaml-textarea mini">{{yaml}}</textarea></div>
      </div>`,
    css: `
      .focus-wrap { flex: 1; padding: 32px 48px; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: auto; }
      .focus-chrome { position: absolute; top: 8px; left: 16px; right: 16px; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; background: var(--panel); border: 1px solid var(--border); opacity: 0; transform: translateY(-6px); transition: 0.2s; box-shadow: var(--shadow); z-index: 5; }
      .focus-wrap:hover .focus-chrome { opacity: 1; transform: translateY(0); }
      .btn.sm { padding: 5px 10px; font-size: 12px; }
      .focus-chrome .breadcrumbs { flex: 1; }
      .focus-title { margin: 40px 0 0; font-size: 28px; font-weight: 700; }
      .editor-textarea.focus { border: none; background: transparent; min-height: 320px; font-size: 15px; line-height: 1.7; flex: 1; }
      .focus-yaml { display: flex; gap: 10px; align-items: flex-start; opacity: 0.5; transition: 0.2s; }
      .focus-wrap:hover .focus-yaml { opacity: 1; }
      .focus-yaml span { font-size: 11px; font-weight: 700; color: var(--muted); padding-top: 8px; }
      .yaml-textarea.mini { min-height: 80px; flex: 1; }`
  },
  {
    id: "13-three-zone",
    num: "13",
    title: "Three zones",
    desc: "YAML слева узкой колонкой, редактор центр, actions sticky справа.",
    body: `
      <div class="three-zone">
        <aside class="zone-yaml">
          <div class="yaml-label">YAML</div>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </aside>
        <main class="zone-editor">
          ${"{{breadcrumbs}}"}
          <input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span>
          <textarea class="editor-textarea">{{content}}</textarea>
        </main>
        <aside class="zone-actions">
          <button type="button" class="btn full" data-action="back">← Назад</button>
          <button type="button" class="btn btn-primary full" data-action="save">Сохранить</button>
          <button type="button" class="btn full" data-action="close">Закрыть</button>
          ${"{{viewToggle}}"}
        </aside>
      </div>`,
    css: `
      .three-zone { display: grid; grid-template-columns: 200px 1fr 140px; flex: 1; min-height: 0; }
      .zone-yaml { padding: 12px; border-right: 1px solid var(--border); background: #fbfdff; overflow: auto; }
      .zone-editor { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; overflow: auto; }
      .zone-actions { padding: 12px; border-left: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; background: var(--panel-soft); }
      .btn.full { width: 100%; }
      .zone-actions .view-toggle { flex-direction: column; }`
  },
  {
    id: "14-frontmatter-block",
    num: "14",
    title: "Frontmatter block",
    desc: "YAML как первый блок в потоке редактора (как в Obsidian).",
    body: `
      <header class="fm-head">${"{{breadcrumbs}}"}<button type="button" class="btn btn-primary" data-action="save">Сохранить</button></header>
      <div class="fm-doc">
        <button type="button" class="btn btn-ghost" data-action="back">← К списку файлов</button>
        <input class="doc-title-input" value="{{fileBase}}{{ext}}" />
        <div class="frontmatter">
          <div class="fm-label">--- frontmatter ---</div>
          <textarea class="yaml-textarea fm">{{yaml}}</textarea>
          <div class="fm-label">---</div>
        </div>
        <textarea class="editor-textarea no-border">{{content}}</textarea>
      </div>`,
    css: `
      .fm-head { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
      .fm-doc { padding: 16px; flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 10px; max-width: 780px; }
      .frontmatter { background: #f1f5f9; border-radius: 10px; padding: 10px 12px; border: 1px dashed #cbd5e1; }
      .fm-label { font-family: monospace; font-size: 11px; color: var(--muted); }
      .yaml-textarea.fm { border: none; background: transparent; min-height: 100px; }
      .editor-textarea.no-border { border: none; min-height: 240px; background: transparent; }`
  },
  {
    id: "15-form-properties",
    num: "15",
    title: "Form properties",
    desc: "YAML заменён формой полей + кнопка «Показать код».",
    body: `
      ${"{{breadcrumbsBar}}"}
      <div class="form-doc">
        <div class="form-top">
          <input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span>
          <div class="form-btns"><button type="button" class="btn" data-action="back">Назад</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>
        </div>
        <section class="form-props">
          <h3>Свойства md-файла</h3>
          <label>title <input value="{{fileBase}}" /></label>
          <label>tags <input value="логистика, маршрут" /></label>
          <label>status <select><option>draft</option></select></label>
          <button type="button" class="btn btn-ghost" data-yaml-toggle="#raw-yaml">Показать YAML</button>
          <textarea id="raw-yaml" class="yaml-textarea hidden">{{yaml}}</textarea>
        </section>
        <textarea class="editor-textarea">{{content}}</textarea>
      </div>`,
    css: `
      .form-doc { padding: 16px; flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
      .form-top { display: flex; align-items: center; gap: 10px; }
      .form-top .doc-title-input { flex: 1; }
      .form-btns { display: flex; gap: 8px; }
      .form-props { display: grid; gap: 10px; padding: 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; }
      .form-props h3 { margin: 0; font-size: 14px; }
      .form-props label { display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: center; font-size: 13px; color: var(--muted); }
      .form-props input, .form-props select { padding: 7px 9px; border: 1px solid var(--border); border-radius: 8px; }`
  },
  {
    id: "16-glass-header",
    num: "16",
    title: "Glass header",
    desc: "Полупрозрачная шапка поверх редактора. Крошки + actions в glass bar.",
    body: `
      <div class="glass-scene">
        <div class="glass-bar">
          ${"{{breadcrumbs}}"}
          <button type="button" class="btn glass" data-action="back">←</button>
          <button type="button" class="btn glass primary" data-action="save">Сохранить</button>
        </div>
        <textarea class="editor-textarea bleed">{{content}}</textarea>
        <div class="glass-yaml">
          <div class="yaml-label">{{fileBase}}{{ext}}</div>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </div>
      </div>`,
    css: `
      .glass-scene { flex: 1; position: relative; display: flex; flex-direction: column; min-height: 0; }
      .glass-bar { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.72); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: var(--shadow); }
      .glass-bar .breadcrumbs { flex: 1; }
      .btn.glass { background: rgba(255,255,255,0.6); }
      .btn.glass.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
      .editor-textarea.bleed { flex: 1; border: none; border-radius: 0; padding: 72px 20px 20px; min-height: 300px; background: var(--panel); }
      .glass-yaml { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--panel-soft); }`
  },
  {
    id: "17-segmented-actions",
    num: "17",
    title: "Segmented actions",
    desc: "Кнопки «Назад | Сохранить | Закрыть» — сегментированная группа.",
    body: `
      <div class="seg-doc">
        <div class="seg-row">
          ${"{{breadcrumbs}}"}
          <div class="segmented">
            <button type="button" data-action="back">← Назад</button>
            <button type="button" class="primary" data-action="save">Сохранить</button>
            <button type="button" data-action="close">Закрыть</button>
          </div>
        </div>
        <input class="doc-title-input" value="{{fileBase}}{{ext}}" />
        <div class="split">
          <textarea class="editor-textarea">{{content}}</textarea>
          <div class="yaml-pane"><div class="yaml-label">YAML</div><textarea class="yaml-textarea">{{yaml}}</textarea></div>
        </div>
      </div>`,
    css: `
      .seg-doc { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
      .seg-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
      .segmented { display: inline-flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
      .segmented button { border: none; border-right: 1px solid var(--border); background: var(--panel); padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .segmented button:last-child { border-right: none; }
      .segmented button.primary { background: var(--accent-soft); color: var(--accent); }
      .split { display: grid; grid-template-columns: 1fr 250px; gap: 12px; flex: 1; min-height: 280px; }
      .yaml-pane { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--panel-soft); display: flex; flex-direction: column; gap: 6px; }`
  },
  {
    id: "18-editable-crumbs",
    num: "18",
    title: "Editable crumbs",
    desc: "Последний сегмент пути = редактируемое имя файла (без расширения).",
    body: `
      <nav class="edit-crumbs">${"{{editableCrumbs}}"}</nav>
      <div class="ec-actions">
        <button type="button" class="btn" data-action="back">← К списку</button>
        ${"{{viewToggle}}"}
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </div>
      <textarea class="editor-textarea">{{content}}</textarea>
      <details open><summary class="yaml-label">YAML-свойства (_Content)</summary><textarea class="yaml-textarea">{{yaml}}</textarea></details>`,
    css: `
      .edit-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 12px 16px; background: var(--panel); border-bottom: 1px solid var(--border); font-size: 13px; }
      .edit-crumbs input { border: 1px solid var(--accent); border-radius: 6px; padding: 4px 8px; font-weight: 600; width: 180px; }
      .ec-actions { display: flex; align-items: center; gap: 10px; padding: 10px 16px; }
      .ec-actions .view-toggle { margin-right: auto; }
      .workspace { padding-bottom: 16px; overflow: auto; }
      .workspace .editor-textarea { margin: 0 16px; width: calc(100% - 32px); }
      .workspace details { margin: 12px 16px 0; }`
  },
  {
    id: "19-fullbleed-overlay",
    num: "19",
    title: "Fullbleed overlay",
    desc: "Редактор edge-to-edge, controls — полупрозрачный overlay сверху.",
    body: `
      <div class="fullbleed">
        <div class="overlay-top">
          <button type="button" class="icon-btn" data-action="back" title="Назад">←</button>
          <span class="overlay-path">{{folder}} / {{node}} / _Content / <strong>{{fileBase}}{{ext}}</strong></span>
          <button type="button" class="icon-btn save" data-action="save" title="Сохранить">💾</button>
          <button type="button" class="icon-btn" data-action="close" title="Закрыть">✕</button>
        </div>
        <textarea class="editor-textarea fullbleed-editor">{{content}}</textarea>
        <button type="button" class="yaml-fab" data-yaml-toggle="#yaml-ov">YAML</button>
        <div id="yaml-ov" class="yaml-overlay hidden"><textarea class="yaml-textarea">{{yaml}}</textarea></div>
      </div>`,
    css: `
      .fullbleed { flex: 1; position: relative; display: flex; flex-direction: column; min-height: 0; }
      .overlay-top { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(15,23,42,0.85); color: #e2e8f0; font-size: 12px; }
      .overlay-path { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .icon-btn { border: none; background: rgba(255,255,255,0.1); color: inherit; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; }
      .icon-btn.save { width: auto; padding: 0 12px; font-weight: 700; background: var(--accent); }
      .editor-textarea.fullbleed-editor { flex: 1; border: none; border-radius: 0; min-height: 300px; }
      .yaml-fab { position: absolute; bottom: 16px; left: 16px; border: none; background: var(--panel); border-radius: 999px; padding: 8px 14px; box-shadow: var(--shadow); cursor: pointer; font-weight: 600; }
      .yaml-overlay { position: absolute; bottom: 56px; left: 16px; width: 320px; padding: 10px; background: var(--panel); border-radius: 12px; box-shadow: var(--shadow); border: 1px solid var(--border); }`
  },
  {
    id: "20-dirty-save",
    num: "20",
    title: "Dirty indicator",
    desc: "Кнопка «Сохранить» показывает несохранённые изменения (●).",
    body: `
      ${"{{breadcrumbsBar}}"}
      <div class="dirty-doc">
        <div class="title-actions">
          <input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span>
          <button type="button" class="btn" data-action="back">Назад</button>
          <button type="button" class="btn btn-primary dirty-btn" data-action="save"><span class="dot">●</span> Сохранить</button>
        </div>
        <textarea class="editor-textarea" id="dirty-editor">{{content}}</textarea>
        <textarea class="yaml-textarea">{{yaml}}</textarea>
      </div>`,
    css: `
      .dirty-doc { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: auto; }
      .title-actions { display: flex; align-items: center; gap: 10px; }
      .title-actions .doc-title-input { flex: 1; }
      .dirty-btn .dot { color: var(--warn); margin-right: 4px; }
      .dirty-btn.saved .dot { color: var(--success); }`,
    extraJs: `
      const ed = root.querySelector('#dirty-editor');
      const btn = root.querySelector('.dirty-btn');
      ed?.addEventListener('input', () => btn?.classList.remove('saved'));
      btn?.addEventListener('click', () => btn?.classList.add('saved'));`
  },
  {
    id: "21-back-as-crumb",
    num: "21",
    title: "Back as first crumb",
    desc: "Первый элемент крошек — «← Назад к списку».",
    body: `
      ${"{{breadcrumbsBack}}"}
      <div class="pad">
        <div class="head-line">
          <input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
        <textarea class="editor-textarea">{{content}}</textarea>
        <div class="yaml-label">YAML · .props или frontmatter</div>
        <textarea class="yaml-textarea">{{yaml}}</textarea>
      </div>`,
    css: `
      .workspace .breadcrumbs { padding: 12px 16px; background: var(--panel); border-bottom: 1px solid var(--border); }
      .back-crumb { color: var(--accent) !important; font-weight: 600; }
      .pad { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: auto; }
      .head-line { display: flex; align-items: center; gap: 8px; }`
  },
  {
    id: "22-resizable-yaml",
    num: "22",
    title: "Resizable YAML",
    desc: "YAML-панель справа с перетаскиваемым разделителем.",
    body: `
      <header class="rz-head">${"{{breadcrumbs}}"}<button type="button" class="btn btn-primary" data-action="save">Сохранить</button></header>
      <div class="rz-split" id="rz-split">
        <div class="rz-editor">
          <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
          <input class="doc-title-input" value="{{fileBase}}{{ext}}" />
          <textarea class="editor-textarea">{{content}}</textarea>
        </div>
        <div class="rz-handle" id="rz-handle" title="Потяните"></div>
        <aside class="rz-yaml"><div class="yaml-label">YAML</div><textarea class="yaml-textarea">{{yaml}}</textarea></aside>
      </div>`,
    css: `
      .rz-head { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
      .rz-split { display: flex; flex: 1; min-height: 0; }
      .rz-editor { flex: 1; min-width: 200px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; overflow: auto; }
      .rz-handle { width: 6px; cursor: col-resize; background: var(--border); flex-shrink: 0; }
      .rz-handle:hover { background: var(--accent); }
      .rz-yaml { width: 260px; flex-shrink: 0; padding: 12px; border-left: 1px solid var(--border); background: var(--panel-soft); display: flex; flex-direction: column; gap: 6px; overflow: auto; }
      .rz-yaml .yaml-textarea { flex: 1; min-height: 200px; }`,
    extraJs: `
      const split = root.querySelector('#rz-split');
      const handle = root.querySelector('#rz-handle');
      const yaml = root.querySelector('.rz-yaml');
      let dragging = false;
      handle?.addEventListener('mousedown', () => { dragging = true; });
      window.addEventListener('mouseup', () => { dragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!dragging || !split || !yaml) return;
        const rect = split.getBoundingClientRect();
        const w = rect.right - e.clientX;
        if (w > 160 && w < 480) yaml.style.width = w + 'px';
      });`
  },
  {
    id: "23-vscode-bar",
    num: "23",
    title: "VS Code bar",
    desc: "Командная строка в стиле VS Code: путь файла + статус сохранения.",
    body: `
      <div class="vscode">
        <div class="vscode-tab">${"{{fileBase}}{{ext}}"} ✕</div>
        <div class="vscode-bar">
          <span class="vscode-path">{{folder}} › {{node}} › _Content › {{fileBase}}{{ext}}</span>
          <span class="vscode-status" id="vs-status">Изменён</span>
          <button type="button" class="btn btn-primary sm" data-action="save">Save</button>
        </div>
        <div class="vscode-body">
          <textarea class="editor-textarea code">{{content}}</textarea>
          <div class="vscode-sidebar">
            <div class="yaml-label">YAML</div>
            <textarea class="yaml-textarea">{{yaml}}</textarea>
            <button type="button" class="btn full" data-action="back">← Explorer</button>
          </div>
        </div>
      </div>`,
    css: `
      .vscode { flex: 1; display: flex; flex-direction: column; min-height: 0; background: #1e1e1e; color: #d4d4d4; }
      .vscode-tab { padding: 8px 14px; background: #2d2d2d; font-size: 12px; border-bottom: 1px solid #3c3c3c; width: fit-content; }
      .vscode-bar { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: #252526; font-size: 11px; border-bottom: 1px solid #3c3c3c; }
      .vscode-path { flex: 1; color: #9cdcfe; }
      .vscode-status { color: #dcdcaa; }
      .vscode-body { display: grid; grid-template-columns: 1fr 220px; flex: 1; min-height: 0; }
      .editor-textarea.code { border: none; border-radius: 0; background: #1e1e1e; color: #d4d4d4; min-height: 280px; }
      .vscode-sidebar { background: #252526; padding: 10px; border-left: 1px solid #3c3c3c; display: flex; flex-direction: column; gap: 8px; }
      .vscode-sidebar .yaml-textarea { background: #1e1e1e; color: #9cdcfe; border-color: #3c3c3c; flex: 1; }
      .vscode .btn-primary { background: #0e639c; border-color: #0e639c; }`,
    extraJs: `
      root.querySelector('[data-action="save"]')?.addEventListener('click', () => {
        const st = root.querySelector('#vs-status');
        if (st) st.textContent = 'Сохранено';
      });`
  },
  {
    id: "24-stacked-mobile",
    num: "24",
    title: "Stacked layout",
    desc: "Вертикальный stack: крошки → actions → yaml → editor (удобно на узких экранах).",
    body: `
      <div class="stack-doc">
        ${"{{breadcrumbs}}"}
        <div class="stack-actions">
          <button type="button" class="btn" data-action="back">← Назад</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          <button type="button" class="btn" data-action="close">Закрыть</button>
        </div>
        <input class="doc-title-input" value="{{fileBase}}{{ext}}" />
        <section class="stack-yaml">
          <div class="yaml-label">YAML-свойства</div>
          <textarea class="yaml-textarea">{{yaml}}</textarea>
        </section>
        <section class="stack-editor">
          <div class="yaml-label">Markdown</div>
          <textarea class="editor-textarea">{{content}}</textarea>
        </section>
      </div>`,
    css: `
      .stack-doc { padding: 12px; display: flex; flex-direction: column; gap: 12px; flex: 1; overflow: auto; max-width: 640px; margin: 0 auto; width: 100%; }
      .stack-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .stack-yaml, .stack-editor { border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: var(--panel); }
      .stack-editor { flex: 1; display: flex; flex-direction: column; }
      .stack-editor .editor-textarea { flex: 1; min-height: 200px; border: none; padding: 0; }`
  },
  {
    id: "25-improved-current",
    num: "25",
    title: "Improved current",
    desc: "Эволюция текущего макета: path-area убран, всё в одной шапке документа + YAML справа.",
    body: `
      <div class="current-v2">
        <header class="cv2-header">
          <div class="cv2-left">
            ${"{{breadcrumbs}}"}
            <div class="cv2-title"><input class="doc-title-input" value="{{fileBase}}" /><span class="doc-ext">{{ext}}</span></div>
          </div>
          <div class="cv2-right">
            <button type="button" class="btn btn-ghost" data-action="back">← К списку</button>
            ${"{{viewToggle}}"}
            <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          </div>
        </header>
        <div class="cv2-body">
          <div class="cv2-editor">
            <textarea class="editor-textarea">{{content}}</textarea>
          </div>
          <aside class="cv2-yaml">
            <div class="yaml-label">YAML · props</div>
            <textarea class="yaml-textarea">{{yaml}}</textarea>
            <button type="button" class="btn btn-success full">Открыть в Obsidian</button>
          </aside>
        </div>
      </div>`,
    css: `
      .current-v2 { flex: 1; display: flex; flex-direction: column; min-height: 0; }
      .cv2-header { display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px; background: var(--panel); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
      .cv2-left { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
      .cv2-title { display: flex; align-items: center; gap: 6px; }
      .cv2-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .cv2-body { display: grid; grid-template-columns: 1fr 260px; flex: 1; min-height: 0; }
      .cv2-editor { padding: 14px 16px; overflow: auto; display: flex; flex-direction: column; }
      .cv2-editor .editor-textarea { flex: 1; min-height: 300px; }
      .cv2-yaml { border-left: 1px solid var(--border); padding: 14px 12px; background: var(--panel-soft); display: flex; flex-direction: column; gap: 8px; overflow: auto; }
      .cv2-yaml .yaml-textarea { flex: 1; min-height: 180px; }
      .btn.full { width: 100%; margin-top: auto; }`
  }
];

const VIEW_TOGGLE = `<div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div>`;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildReplacements() {
  const DEMO = {
    folder: "05 Хобби",
    node: "Дальнобойщики-2",
    mode: "_Content",
    file: "Заметка о маршруте",
    ext: ".md",
    content: `# Маршрут Москва — Казань\n\n- Старт: 06:00\n- Остановка: Нижний Новгород\n- Прибытие: 18:30\n\n> Внешняя память — отдельный md-файл в _Content.`,
    yaml: `title: Заметка о маршруте\ntags:\n  - логистика\n  - маршрут\nstatus: draft\ncreated: 2026-04-19`
  };
  const parts = [DEMO.folder, DEMO.node, DEMO.mode, `${DEMO.file}${DEMO.ext}`];
  const breadcrumbs = parts.map((p, i) => {
    const isLast = i === parts.length - 1;
    if (i > 0) return `${i > 0 ? '<span class="breadcrumb-sep">/</span>' : ""}${isLast ? `<span class="breadcrumb current">${p}</span>` : `<button type="button" class="breadcrumb">${p}</button>`}`;
    return `<button type="button" class="breadcrumb">${p}</button>`;
  }).join("");

  const breadcrumbsBack = `<nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb back-crumb" data-action="back">← Назад к списку</button><span class="breadcrumb-sep">/</span>${parts.map((p, i) => {
    if (i === 0) return "";
    return (i > 1 ? '<span class="breadcrumb-sep">/</span>' : "") + (i === parts.length - 1 ? `<span class="breadcrumb current">${p}</span>` : `<button type="button" class="breadcrumb">${p}</button>`);
  }).join("")}</nav>`;

  const chipCrumbs = parts.map((p, i) => `<span class="path-chip">${p}</span>`).join("");
  const pathLine = parts.join(" / ");
  const fullPathList = parts.map((p) => `<div>${p}</div>`).join("");

  const editableCrumbs = parts.slice(0, -1).map((p, i) =>
    `${i > 0 ? '<span class="breadcrumb-sep">/</span>' : ""}<button type="button" class="breadcrumb">${p}</button>`
  ).join("") + `<span class="breadcrumb-sep">/</span><input type="text" value="${DEMO.file}" /><span class="doc-ext">${DEMO.ext}</span>`;

  return {
    "{{breadcrumbs}}": `<nav class="breadcrumbs" aria-label="Путь">${breadcrumbs}</nav>`,
    "{{breadcrumbsBack}}": breadcrumbsBack,
    "{{breadcrumbsBar}}": `<div class="crumb-bar">${`<nav class="breadcrumbs" aria-label="Путь">${breadcrumbs}</nav>`}</div>`,
    "{{chipCrumbs}}": chipCrumbs,
    "{{pathLine}}": pathLine,
    "{{fullPathList}}": fullPathList,
    "{{editableCrumbs}}": editableCrumbs,
    "{{fileBase}}": DEMO.file,
    "{{ext}}": DEMO.ext,
    "{{folder}}": DEMO.folder,
    "{{node}}": DEMO.node,
    "{{content}}": escapeHtml(DEMO.content),
    "{{yaml}}": escapeHtml(DEMO.yaml),
    "{{viewToggle}}": VIEW_TOGGLE
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

  fs.writeFileSync(path.join(dir, "style.css"), `/* ${v.id} */\n.workspace { display: flex; flex-direction: column; }\n${v.css || ""}`);

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-${v.id}");
workspace.innerHTML = \`${body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;

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

// index.html catalog
const STALE_VARIANTS = new Set(["02", "03", "05", "06", "08", "09", "11", "12", "13", "16", "18", "21", "24", "25"]);

const sortedVariants = [...VARIANTS].sort((a, b) => {
  const aStale = STALE_VARIANTS.has(a.num);
  const bStale = STALE_VARIANTS.has(b.num);
  if (aStale !== bStale) return aStale ? 1 : -1;
  return Number(a.num) - Number(b.num);
});

const cards = sortedVariants.map(
  (v) => {
    const stale = STALE_VARIANTS.has(v.num);
    const cardClass = stale ? "card stale" : "card";
    const tags = stale
      ? `<div class="card-tags"><span class="tag">${v.num}</span><span class="tag-stale">не актуально</span></div>`
      : `<span class="tag">${v.num}</span>`;
    return `
      <article class="${cardClass}">
        ${tags}
        <h2>${v.title}</h2>
        <p>${v.desc}</p>
        <a class="demo" href="./${v.id}/index.html">Открыть</a>
      </article>`;
  }
).join("");

fs.writeFileSync(
  path.join(ROOT, "index.html"),
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Example2 — центральная часть редактора</title>
    <style>
      :root { --bg: #f5f7fb; --panel: #fff; --border: #d7deeb; --text: #1f2937; --muted: #6b7280; --accent: #2563eb; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 760px; line-height: 1.55; margin: 0 0 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #eff6ff; color: #1e40af; width: fit-content; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }
      a.demo:hover { background: #1d4ed8; }
      .focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
      .card.stale { border-color: #fecaca; background: #fffafa; opacity: 0.92; }
      .card.stale h2 { color: #991b1b; }
      .tag-stale {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 600;
        width: fit-content;
      }
      .card-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    </style>
  </head>
  <body>
    <h1>Example2 — центральная часть редактора</h1>
    <p class="lead">
      25 интерактивных прототипов: хлебные крошки, YAML-свойства md-файла, кнопки «Сохранить / Назад / Закрыть»,
      улучшения центральной зоны. Контекст — редактирование файла из _Content.
    </p>
    <p class="lead" style="font-size:13px;margin-top:-8px;">
      Запуск: <code>cd Example2 && python3 -m http.server 8766</code> →
      <a href="http://localhost:8766">http://localhost:8766</a>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${VARIANTS.length} variants in Example2/`);
