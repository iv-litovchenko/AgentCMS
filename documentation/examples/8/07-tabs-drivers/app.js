import { mountShell, bindDemoActions, bindAll } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-07-tabs-drivers");
workspace.innerHTML = `<div class="mem-stage mem-host"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-tabs" data-mem-tabs>
        <button type="button" class="active" data-driver="internal">📝 Краткая</button>
        <button type="button" data-driver="external">📁 Архив</button>
        <button type="button" data-driver="tabular">📊 Таблица</button>
      </div>
      <div data-mem-panel="internal"><article class="mem-card mem-card--internal">
  <div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div>
  <p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p>
  <button type="button" class="mem-open" data-action="open" data-driver="internal" data-label="Краткая память">Открыть</button>
</article></div>
      <div class="hidden" data-mem-panel="external"><article class="mem-card mem-card--external">
  <div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div>
  <p class="mem-stat">12 записей</p>
  <ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li><li>Onboarding.md</li></ul>
  <button type="button" class="mem-open" data-action="open" data-driver="external" data-label="Архив">Открыть</button>
</article></div>
      <div class="hidden" data-mem-panel="tabular"><article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div>
  <p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="Таблица">Открыть</button>
</article></div>
    </div>`;

bindAll(workspace);
bindDemoActions(document.body);
