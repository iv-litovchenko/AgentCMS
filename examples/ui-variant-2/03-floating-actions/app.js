import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-03-floating-actions");
workspace.innerHTML = `
      <div class="doc-minimal">
        <p class="path-line">05 Хобби / Дальнобойщики-2 / _Content / Заметка о маршруте.md</p>
        <input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext inline">.md</span>
        <textarea class="editor-textarea full"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <div class="yaml-rail">
          <button type="button" class="btn" data-yaml-toggle="#yaml-panel">⚙ YAML</button>
          <div id="yaml-panel" class="yaml-pop hidden">
            <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
          </div>
        </div>
        <div class="fab-group">
          <button type="button" class="fab secondary" data-action="back" title="Назад">←</button>
          <button type="button" class="fab primary" data-action="save">Сохранить</button>
          <button type="button" class="fab" data-action="close">✕</button>
        </div>
      </div>`;

bindDemoActions(document.body);
const toast = document.getElementById("toast");
document.body.querySelectorAll("[data-action='save'], [data-action='back'], [data-action='close']").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!toast) return;
    toast.textContent = btn.dataset.action === "save" ? "Сохранено" : "Возврат к списку";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  });
});
