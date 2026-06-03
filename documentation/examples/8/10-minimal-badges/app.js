import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-10-minimal-badges");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-minimal">
        <a href="#" class="mem-min-link" data-action="open" data-label="Краткая">📝 Краткая память <span class="mem-chip-badge">842</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></a>
        <a href="#" class="mem-min-link" data-action="open" data-label="Таблица">📊 Таблица <span class="mem-chip-badge">4×3</span></a>
      </div></div>`;


bindDemoActions(document.body);
