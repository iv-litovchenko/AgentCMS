import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-09-summary-table");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <table class="mem-table"><thead><tr><th>Драйвер</th><th>Путь</th><th>Статус</th></tr></thead><tbody>
        <tr data-action="open" data-label="Краткая"><td>📝 Краткая</td><td>_.node.content.md</td><td>842 симв.</td></tr>
        <tr data-action="open" data-label="Архив"><td>📁 Архив</td><td>_Content/</td><td>12 записей</td></tr>
        <tr data-action="open" data-label="Таблица"><td>📊 Таблица</td><td>_.node.content.csv</td><td>4×3</td></tr>
      </tbody></table></div>`;


bindDemoActions(document.body);
