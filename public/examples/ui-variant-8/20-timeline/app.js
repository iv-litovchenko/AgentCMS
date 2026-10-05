import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-20-timeline");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-timeline">
        <div class="mem-tl-item"><strong>📝 Краткая</strong><p class="mem-excerpt">842 симв. — тон и стиль</p><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></div>
        <div class="mem-tl-item"><strong>📁 Архив</strong><p class="mem-excerpt">12 записей в _Content/</p><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></div>
        <div class="mem-tl-item"><strong>📊 Таблица</strong><p class="mem-excerpt">CSV · name, role, status</p><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></div>
      </div></div>`;


bindDemoActions(document.body);
