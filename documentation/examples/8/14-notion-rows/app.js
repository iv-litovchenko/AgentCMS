import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-14-notion-rows");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-notion">
        <button type="button" class="mem-nrow" data-action="open" data-label="Краткая"><span class="mem-nprop">📝 Краткая</span><span class="mem-nval">842 симв. · excerpt</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Архив"><span class="mem-nprop">📁 Архив</span><span class="mem-nval">12 · Профиль.md, FAQ…</span><span class="mem-chevron">›</span></button>
        <button type="button" class="mem-nrow" data-action="open" data-label="Таблица"><span class="mem-nprop">📊 Таблица</span><span class="mem-nval">name · role · status</span><span class="mem-chevron">›</span></button>
      </div></div>`;


bindDemoActions(document.body);
