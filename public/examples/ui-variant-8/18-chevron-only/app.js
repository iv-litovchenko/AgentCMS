import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-18-chevron-only");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-list"><div class="mem-row" data-action="open" data-driver="internal" data-label="Краткая память" role="button" tabindex="0">
  <span class="mem-row-icon">📝</span>
  <div class="mem-row-body"><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span><span class="mem-excerpt">Краткие заметки о тоне и стиле…</span></div>
  <span class="mem-row-stat">842 симв.</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="external" data-label="Архив" role="button" tabindex="0">
  <span class="mem-row-icon">📁</span>
  <div class="mem-row-body"><strong>Архив</strong><span class="mem-path">_Content/</span><span class="mem-recent-inline">Профиль.md · FAQ.md</span></div>
  <span class="mem-row-stat">12 записей</span><span class="mem-chevron">›</span>
</div><div class="mem-row" data-action="open" data-driver="tabular" data-label="Таблица" role="button" tabindex="0">
  <span class="mem-row-icon">📊</span>
  <div class="mem-row-body"><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span><span class="mem-excerpt">name · role · status</span></div>
  <span class="mem-row-stat">4 строки · 3 кол.</span><span class="mem-chevron">›</span>
</div></div></div>`;


bindDemoActions(document.body);
