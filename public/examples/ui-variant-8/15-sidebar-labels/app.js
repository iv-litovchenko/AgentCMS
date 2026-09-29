import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-15-sidebar-labels");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-side-rows">
        <div class="mem-siderow"><span class="mem-sidelabel">Internal</span><div><strong>Краткая память</strong><p class="mem-excerpt">Краткие заметки…</p></div><button class="mem-open" data-action="open" data-label="Краткая">842 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">External</span><div><strong>Архив</strong><p class="mem-excerpt">Профиль.md · FAQ.md</p></div><button class="mem-open" data-action="open" data-label="Архив">12 →</button></div>
        <div class="mem-siderow"><span class="mem-sidelabel">Tabular</span><div><strong>Таблица</strong><p class="mem-excerpt">name · role · status</p></div><button class="mem-open" data-action="open" data-label="Таблица">4×3 →</button></div>
      </div></div>`;


bindDemoActions(document.body);
