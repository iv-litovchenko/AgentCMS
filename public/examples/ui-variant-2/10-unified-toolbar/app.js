import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-10-unified-toolbar");
workspace.innerHTML = `
      <div class="unified-bar">
        <button type="button" class="btn btn-ghost" data-action="back">←</button>
        <div class="crumbs-inline"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav></div>
        <div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div>
        <button type="button" class="btn" data-yaml-toggle="#y">YAML</button>
        <button type="button" class="btn btn-primary" data-action="save">Save</button>
      </div>
      <div class="unified-body">
        <input class="doc-title-input" value="Заметка о маршруте.md" />
        <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <div id="y" class="yaml-inline hidden"><textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea></div>
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
