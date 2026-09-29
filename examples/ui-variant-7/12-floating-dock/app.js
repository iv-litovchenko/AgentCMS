import { mountShell, bindDemoActions, bindAll } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-12-floating-dock");
workspace.innerHTML = `
  <div class="node-type-switch" role="tablist" aria-label="Тип ноды">
    <button type="button" data-node-type="container" class="active">Контейнер</button>
    <button type="button" data-node-type="solo">Solo-нода</button>
  </div><div class="ov-panel dock-layout"><div data-node-zone="container" style="padding-bottom:60px">
      <nav class="ov-crumbs"><button type="button" class="ov-crumb">Обзор ноды</button><span class="ov-crumb-sep">/</span><button type="button" class="ov-crumb">Assistant.Ai</button><span class="ov-crumb-sep">/</span><span class="ov-crumb current">_.node.md</span></nav>
      <div class="ov-hero">
    <div class="ov-thumb" aria-hidden="true"><span class="ov-thumb-ph">🧩</span></div>
    <div class="ov-head">
      <h2 class="ov-title">Assistant.Ai</h2>
      <span class="ov-type">NODE/INDEX</span>
      <p class="ov-desc">Кластер идентичности ассистента: правила, профиль, пользователи.</p>
    </div>
  </div>
      <div class="ov-meta"><div class="ov-meta-item"><span class="ov-meta-key">AWN-STATUS</span><span class="ov-meta-val">active</span></div><div class="ov-meta-item"><span class="ov-meta-key">AWN-MEMORY</span><span class="ov-meta-val">hybrid</span></div><div class="ov-meta-item"><span class="ov-meta-key">AWN-PRIORITY</span><span class="ov-meta-val">30</span></div><div class="ov-meta-item"><span class="ov-meta-key">AWN-CATEGORY</span><span class="ov-meta-val">system</span></div><div class="ov-meta-item"><span class="ov-meta-key">AWN-VERSION</span><span class="ov-meta-val">1.0.0</span></div><div class="ov-meta-item"><span class="ov-meta-key">AWN-UPDATED</span><span class="ov-meta-val">2026-05-06</span></div></div>
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
      <div class="ov-dock">
        <button type="button" class="active">Обзор</button>
        <button type="button" data-action="open-mode" data-label="Описание">Описание</button>
        <button type="button" data-action="open-mode" data-label="Память">Память</button>
        <button type="button" data-action="open-mode" data-label="Медиа">Медиа</button>
        <button type="button" data-action="open-mode" data-label="Граф">Граф</button>
      </div>
    </div></div>`;

bindAll(workspace);
bindDemoActions(document.body);
