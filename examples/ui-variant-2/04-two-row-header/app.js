import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-04-two-row-header");
workspace.innerHTML = `
      <header class="header-a"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav><button type="button" class="btn btn-ghost" data-action="close">Закрыть ✕</button></header>
      <header class="header-b">
        <div class="title-row"><input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </header>
      <div class="split-body">
        <div class="editor-col">
          <div class="subhead">Содержимое <div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div></div>
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        </div>
        <aside class="yaml-col">
          <div class="yaml-label">YAML</div>
          <textarea class="yaml-textarea tall">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
          <button type="button" class="btn btn-ghost full" data-action="back">← К списку _Content</button>
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
