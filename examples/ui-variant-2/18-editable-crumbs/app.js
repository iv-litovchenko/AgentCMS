import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-18-editable-crumbs");
workspace.innerHTML = `
      <nav class="edit-crumbs"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><input type="text" value="Заметка о маршруте" /><span class="doc-ext">.md</span></nav>
      <div class="ec-actions">
        <button type="button" class="btn" data-action="back">← К списку</button>
        <div class="view-toggle" role="tablist"><button type="button" class="active">Редактирование</button><button type="button">Просмотр</button></div>
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </div>
      <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
      <details open><summary class="yaml-label">YAML-свойства (_Content)</summary><textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea></details>`;

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
