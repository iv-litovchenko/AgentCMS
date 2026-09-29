import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-23-mini-tree");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid">
      <article class="mem-card mem-card--internal">
  <div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div>
  <p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p>
  <button type="button" class="mem-open" data-action="open" data-driver="internal" data-label="Краткая память">Открыть</button>
</article>
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
        <div class="mem-tree">📁 _Content/<ul><li>📄 Профиль.md</li><li>📄 FAQ.md</li><li>📄 Onboarding.md</li></ul></div>
        <button class="mem-open" data-action="open" data-label="Архив">Открыть архив</button></article>
      <article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div>
  <p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="Таблица">Открыть</button>
</article>
    </div></div>`;


bindDemoActions(document.body);
