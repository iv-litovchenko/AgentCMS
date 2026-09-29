import { mountShell, bindDemoActions, bindAll } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-18-wiki-infobox");
workspace.innerHTML = `
  <div class="node-type-switch" role="tablist" aria-label="Тип ноды">
    <button type="button" data-node-type="container" class="active">Контейнер</button>
    <button type="button" data-node-type="solo">Solo-нода</button>
  </div><div class="ov-panel wiki-18"><div data-node-zone="container">
      <nav class="ov-crumbs"><button type="button" class="ov-crumb">Обзор ноды</button><span class="ov-crumb-sep">/</span><button type="button" class="ov-crumb">Assistant.Ai</button><span class="ov-crumb-sep">/</span><span class="ov-crumb current">_.node.md</span></nav>
      <div class="wiki-grid">
        <div class="wiki-main">
          <h2 class="ov-title">Assistant.Ai</h2>
          <p class="ov-desc">Кластер идентичности ассистента: правила, профиль, пользователи. Содержит solo-ноды Assistant, Rules, User и контейнер Users.</p>
          <section class="ov-memory"><h3 class="ov-section-title">🧠 Память</h3><div class="ov-mem-grid"><article class="ov-mem-card">
        <div class="ov-mem-head"><span>📝</span><div><strong>Краткая память</strong><span class="ov-mem-sub">_.node.content.md</span></div></div>
        <p class="ov-mem-meta">842 симв.</p><p class="ov-mem-excerpt">Краткие заметки о тоне и стиле…</p>
        <button type="button" class="ov-btn ov-btn-ghost" data-action="open-memory" data-label="Краткая память">Открыть</button>
      </article><article class="ov-mem-card">
        <div class="ov-mem-head"><span>📁</span><div><strong>Архив</strong><span class="ov-mem-sub">_Content/</span></div></div>
        <p class="ov-mem-meta">12 записей</p><ul class="ov-mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul>
        <button type="button" class="ov-btn ov-btn-ghost" data-action="open-memory" data-label="Архив">Открыть</button>
      </article><article class="ov-mem-card">
        <div class="ov-mem-head"><span>📊</span><div><strong>Таблица</strong><span class="ov-mem-sub">_.node.content.csv</span></div></div>
        <p class="ov-mem-meta">4 строки · 3 кол.</p><p class="ov-mem-excerpt">name · role · status</p>
        <button type="button" class="ov-btn ov-btn-ghost" data-action="open-memory" data-label="Таблица">Открыть</button>
      </article></div></section><section class="ov-children">
    <h3 class="ov-section-title">Подразделы</h3>
    <div class="ov-children-grid"><button type="button" class="ov-child-card" data-action="open-child" data-label="Assistant">
            <span class="ov-child-icon">🧩</span>
            <span class="ov-child-title">Assistant</span>
            <span class="ov-child-type">NODE/SOLO</span>
          </button><button type="button" class="ov-child-card" data-action="open-child" data-label="Rules">
            <span class="ov-child-icon">🧩</span>
            <span class="ov-child-title">Rules</span>
            <span class="ov-child-type">NODE/SOLO</span>
          </button><button type="button" class="ov-child-card" data-action="open-child" data-label="User">
            <span class="ov-child-icon">🧩</span>
            <span class="ov-child-title">User</span>
            <span class="ov-child-type">NODE/SOLO</span>
          </button><button type="button" class="ov-child-card is-folder" data-action="open-child" data-label="Users">
            <span class="ov-child-icon">📁</span>
            <span class="ov-child-title">Users</span>
            <span class="ov-child-type">NODE/INDEX</span>
          </button></div></section>
        </div>
        <aside class="ov-infobox">
          <h4>Assistant.Ai</h4>
          <dl>
            <dt>Тип</dt><dd>NODE/INDEX</dd>
            <dt>AWN-MEMORY</dt><dd>hybrid</dd>
            <dt>AWN-STATUS</dt><dd>active</dd>
            <dt>Детей</dt><dd>4</dd>
          </dl>
          <div style="margin-top:10px">
  <div class="ov-preview-pane" data-surface-panel="preview">
    <div class="ov-preview-large"><span aria-hidden="true">🖼</span><p>Assistant.node.preview.png</p></div>
  </div></div>
        </aside>
      </div>
      <div class="ov-mode-links compact"><section class="ov-mode-group"><h3 class="ov-section-title">⚙️ Настройки</h3><div class="ov-mode-btns"><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Описание"><span aria-hidden="true">⚙️</span>Описание</button><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Конфигурации"><span aria-hidden="true">⚙️</span>Конфигурации</button><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Скрипты"><span aria-hidden="true">⚙️</span>Скрипты</button><button type="button" class="ov-mode-btn" data-action="open-mode" data-label=".env"><span aria-hidden="true">⚙️</span>.env</button><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="TODO"><span aria-hidden="true">⚙️</span>TODO</button><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Превью"><span aria-hidden="true">⚙️</span>Превью</button></div></section><section class="ov-mode-group"><h3 class="ov-section-title">📎 Файлы</h3><div class="ov-mode-btns"><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Медиа и документы"><span aria-hidden="true">📎</span>Медиа и документы</button></div></section><section class="ov-mode-group"><h3 class="ov-section-title">🧭 Навигация</h3><div class="ov-mode-btns"><button type="button" class="ov-mode-btn" data-action="open-mode" data-label="Граф"><span aria-hidden="true">🧭</span>Граф</button></div></section></div>
    </div></div>`;

bindAll(workspace);
bindDemoActions(document.body);
