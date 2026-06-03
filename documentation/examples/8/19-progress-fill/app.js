import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-19-progress-fill");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid">
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 / 2000 симв.</p><div class="mem-progress"><span style="width:42%"></span></div><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></article>
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><div class="mem-progress"><span style="width:65%"></span></div><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></article>
      <article class="mem-card"><div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div><p class="mem-stat">4 строки</p><div class="mem-progress"><span style="width:20%"></span></div><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></article>
    </div></div>`;


bindDemoActions(document.body);
