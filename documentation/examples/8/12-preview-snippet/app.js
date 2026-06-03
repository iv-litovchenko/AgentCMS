import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-12-preview-snippet");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid"><article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 симв.</p><pre class="mem-snippet">Тон: тёплый, без воды.
Стиль: компетентный…</pre><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></article><article class="mem-card mem-card--external">
  <div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
  <p class="mem-stat">12 записей</p>
  <ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li><li>Onboarding.md</li></ul>
  <button type="button" class="mem-open" data-action="open" data-driver="external" data-label="Архив">Открыть</button>
</article><article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div>
  <p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="Таблица">Открыть</button>
</article></div></div>`;


bindDemoActions(document.body);
