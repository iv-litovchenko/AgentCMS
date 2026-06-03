import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-05-icon-tiles");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2>
      <div class="mem-tile-grid">
        <button type="button" class="mem-tile" data-action="open" data-label="Краткая"><span class="mem-tile-icon">📝</span><strong>Краткая</strong><span class="mem-stat">842</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Архив"><span class="mem-tile-icon">📁</span><strong>Архив</strong><span class="mem-stat">12</span></button>
        <button type="button" class="mem-tile" data-action="open" data-label="Таблица"><span class="mem-tile-icon">📊</span><strong>Таблица</strong><span class="mem-stat">4×3</span></button>
      </div></div>`;


bindDemoActions(document.body);
