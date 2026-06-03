import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-11-card-document");
workspace.innerHTML = `
      <div class="outer"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav></div>
      <article class="doc-card">
        <header class="card-head">
          <input class="doc-title-input flat" value="Заметка о маршруте" /><span class="doc-ext">.md</span>
          <div class="card-actions">
            <button type="button" class="btn btn-ghost" data-action="back">Назад</button>
            <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
          </div>
        </header>
        <div class="card-grid">
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
          <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
        </div>
      </article>`;

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
