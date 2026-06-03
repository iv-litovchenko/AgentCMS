import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-02-compact-chips-path");
workspace.innerHTML = `
      <div class="doc-wrap">
        <div class="chip-path"><span class="path-chip">05 Хобби</span><span class="path-chip">Дальнобойщики-2</span><span class="path-chip">_Content</span><span class="path-chip">Заметка о маршруте.md</span></div>
        <div class="hero-title"><input class="doc-title-input hero" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        <div class="toolbar-row">
          <button type="button" class="btn btn-ghost" data-action="back">← К списку</button>
          <div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div>
          <div class="spacer"></div>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
        <textarea class="editor-textarea tall"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <details class="yaml-details" open>
          <summary>YAML-свойства</summary>
          <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
        </details>
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
