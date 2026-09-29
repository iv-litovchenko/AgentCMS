import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-17-clickable-card");
workspace.innerHTML = `<div class="mem-stage"><p class="mem-context">Assistant.Ai</p><h2 class="mem-block-title">🧠 Память</h2><div class="mem-grid"><button type="button" class="mem-card mem-click" data-action="open" data-label="Краткая"><div class="mem-card-head"><span class="mem-icon">📝</span><div><strong>Краткая память</strong><span class="mem-path">_.node.content.md</span></div></div><p class="mem-stat">842 симв.</p><p class="mem-excerpt">Краткие заметки о тоне и стиле…</p></button><button type="button" class="mem-card mem-click" data-action="open" data-label="Архив"><div class="mem-card-head"><span class="mem-icon">📁</span><div><strong>Архив</strong><span class="mem-path">_Content/</span></div></div><p class="mem-stat">12 записей</p><ul class="mem-recent"><li>Профиль.md</li><li>FAQ.md</li></ul></button><button type="button" class="mem-card mem-click" data-action="open" data-label="Таблица"><div class="mem-card-head"><span class="mem-icon">📊</span><div><strong>Таблица</strong><span class="mem-path">_.node.content.csv</span></div></div><p class="mem-stat">4 строки · 3 кол.</p><p class="mem-excerpt">name · role · status</p></button></div></div>`;


bindDemoActions(document.body);
