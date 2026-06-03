import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-22-resizable-yaml");
workspace.innerHTML = `
      <header class="rz-head"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></header>
      <div class="rz-split" id="rz-split">
        <div class="rz-editor">
          <button type="button" class="btn btn-ghost" data-action="back">← Назад</button>
          <input class="doc-title-input" value="Заметка о маршруте.md" />
          <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        </div>
        <div class="rz-handle" id="rz-handle" title="Потяните"></div>
        <aside class="rz-yaml"><div class="yaml-label">YAML</div><textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea></aside>
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

      const split = root.querySelector('#rz-split');
      const handle = root.querySelector('#rz-handle');
      const yaml = root.querySelector('.rz-yaml');
      let dragging = false;
      handle?.addEventListener('mousedown', () => { dragging = true; });
      window.addEventListener('mouseup', () => { dragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!dragging || !split || !yaml) return;
        const rect = split.getBoundingClientRect();
        const w = rect.right - e.clientX;
        if (w > 160 && w < 480) yaml.style.width = w + 'px';
      });