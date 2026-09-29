import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-07-center-tabs");
workspace.innerHTML = `
      <div class="crumb-bar"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav></div>
      <div class="tab-bar">
        <button type="button" class="tab active" data-tab="content">Содержимое</button>
        <button type="button" class="tab" data-tab="yaml">YAML-свойства</button>
        <div class="tab-spacer"></div>
        <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
        <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
      </div>
      <div class="tab-panels">
        <div class="tab-panel" data-panel="content">
          <div class="title-row"><input class="doc-title-input" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        </div>
        <div class="tab-panel hidden" data-panel="yaml">
          <textarea class="yaml-textarea big">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
        </div>
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

      root.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          root.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const id = tab.dataset.tab;
          root.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== id));
        });
      });