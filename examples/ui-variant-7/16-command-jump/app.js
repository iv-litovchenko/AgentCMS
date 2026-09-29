import { mountShell, bindDemoActions, bindAll } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-16-command-jump");
workspace.innerHTML = `
  <div class="node-type-switch" role="tablist" aria-label="Тип ноды">
    <button type="button" data-node-type="container" class="active">Контейнер</button>
    <button type="button" data-node-type="solo">Solo-нода</button>
  </div><div class="ov-panel"><div data-node-zone="container">
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
      <div class="ov-command"><input type="text" placeholder="Перейти к режиму или подразделу…" readonly /></div>
      <div class="ov-command-list">
        <button type="button" data-action="command" data-label="Описание">⚙️ Описание, инструкции</button>
        <button type="button" data-action="command" data-label="Внешняя память">🧠 Внешняя память</button>
        <button type="button" data-action="command" data-label="Assistant">🧩 Assistant (solo)</button>
        <button type="button" data-action="command" data-label="Граф">🧭 Граф ноды</button>
        <button type="button" data-action="command" data-label="Превью">🖼 Превью</button>
      </div>
    </div></div>`;

bindAll(workspace);
bindDemoActions(document.body);
