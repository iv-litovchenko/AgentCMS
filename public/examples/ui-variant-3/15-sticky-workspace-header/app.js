import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-15-sticky-workspace-header");
workspace.innerHTML = `
      <div class="sticky-zone">
        <header class="ws-header"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav></header>
        <div class="title-row"><input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        <section class="form-props">
  <h3>Свойства заметки</h3>
  <label>title <input value="Заметка о маршруте" /></label>
  <label>tags <input value="логистика, маршрут" /></label>
  <label>status <select><option>draft</option><option selected>draft</option></select></label>
  <button type="button" class="btn btn-ghost" data-yaml-toggle="#raw-yaml">Показать YAML</button>
  <textarea id="raw-yaml" class="yaml-textarea hidden">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft</textarea>
</section>
      </div>
      <div class="scroll-editor"><div class="editor-block">
  <div class="editor-head"><span>Содержимое</span><div class="view-toggle" role="tablist"><button type="button" class="active">Редакт.</button><button type="button">Просмотр</button></div></div>
  <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30</textarea>
</div></div>`;


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
