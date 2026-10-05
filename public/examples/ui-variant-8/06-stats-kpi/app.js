import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-06-stats-kpi");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-kpi-grid">
        <button type="button" class="mem-kpi" data-action="open" data-label="Краткая"><span class="mem-kpi-val">842</span><span class="mem-kpi-label">📝 символов</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Архив"><span class="mem-kpi-val">12</span><span class="mem-kpi-label">📁 записей</span></button>
        <button type="button" class="mem-kpi" data-action="open" data-label="Таблица"><span class="mem-kpi-val">4</span><span class="mem-kpi-label">📊 строк CSV</span></button>
      </div></div>`;


bindDemoActions(document.body);
