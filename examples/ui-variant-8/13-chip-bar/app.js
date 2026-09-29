import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-13-chip-bar");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-chip-bar">
        <button type="button" class="mem-chip" data-action="open" data-label="Краткая">📝 Краткая <span class="mem-chip-badge">842</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Архив">📁 Архив <span class="mem-chip-badge">12</span></button>
        <button type="button" class="mem-chip" data-action="open" data-label="Таблица">📊 CSV <span class="mem-chip-badge">4×3</span></button>
      </div></div>`;


bindDemoActions(document.body);
