import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-12-focus-mode");
workspace.innerHTML = `
      <div class="focus-wrap">
        <div class="focus-chrome">
          <nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>
          <button type="button" class="btn btn-primary sm" data-action="save">Сохранить</button>
          <button type="button" class="btn sm" data-action="back">←</button>
        </div>
        <h2 class="focus-title">Заметка о маршруте<span class="doc-ext">.md</span></h2>
        <textarea class="editor-textarea focus"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <div class="focus-yaml"><span>yaml</span><textarea class="yaml-textarea mini">title: Заметка о маршруте
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
