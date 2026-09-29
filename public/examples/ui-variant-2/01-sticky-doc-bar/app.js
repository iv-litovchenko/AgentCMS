import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-01-sticky-doc-bar");
workspace.innerHTML = `
      <header class="doc-bar sticky">
        <nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>
        <div class="doc-actions">
          <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          <button type="button" class="btn" data-action="close">Закрыть</button>
        </div>
      </header>
      <div class="doc-main">
        <div class="title-block">
          <label class="yaml-label">Название файла</label>
          <div class="title-row"><input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        </div>
        <div class="editor-block">
          <div class="editor-toolbar"><span>Содержимое</span><div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div></div>
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        </div>
        <aside class="yaml-block">
          <div class="yaml-label">YAML-свойства</div>
          <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
        </aside>
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
