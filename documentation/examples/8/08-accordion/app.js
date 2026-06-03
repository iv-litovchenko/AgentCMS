import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-08-accordion");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <details class="mem-acc" open><summary>📝 Краткая память · 842 симв.</summary><div class="mem-acc-body"><p>_.node.content.md</p><p>Краткие заметки о тоне и стиле…</p><button class="mem-open" data-action="open" data-label="Краткая">Открыть</button></div></details>
      <details class="mem-acc"><summary>📁 Архив · 12 записей</summary><div class="mem-acc-body"><p>_Content/</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul><button class="mem-open" data-action="open" data-label="Архив">Открыть</button></div></details>
      <details class="mem-acc"><summary>📊 Таблица · 4 строки</summary><div class="mem-acc-body"><p>_.node.content.csv</p><p>name · role · status</p><button class="mem-open" data-action="open" data-label="Таблица">Открыть</button></div></details>
    </div>`;


bindDemoActions(document.body);
