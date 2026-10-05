import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-06-yaml-bottom-drawer");
workspace.innerHTML = `
      <header class="top-strip"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>
        <div class="actions"><button type="button" class="btn" data-action="back">Назад</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>
      </header>
      <div class="center-editor">
        <div class="title-row"><input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        <textarea class="editor-textarea stretch"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
      </div>
      <button type="button" class="drawer-toggle" data-yaml-toggle="#yaml-drawer">▲ YAML-свойства</button>
      <div id="yaml-drawer" class="yaml-drawer">
        <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
        <button type="button" class="btn" data-action="close">Закрыть документ</button>
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
