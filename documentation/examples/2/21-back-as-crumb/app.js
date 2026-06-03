import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-21-back-as-crumb");
workspace.innerHTML = `
      <nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb back-crumb" data-action="back">← Назад к списку</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav>
      <div class="pad">
        <div class="head-line">
          <input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
        <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <div class="yaml-label">YAML · .props или frontmatter</div>
        <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
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
