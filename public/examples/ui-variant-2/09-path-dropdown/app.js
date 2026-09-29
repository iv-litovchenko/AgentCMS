import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-09-path-dropdown");
workspace.innerHTML = `
      <header class="compact-head">
        <button type="button" class="path-dd" id="path-dd">📁 … / _Content / Заметка о маршруте.md</button>
        <div class="head-actions">
          <button type="button" class="btn btn-ghost" data-action="back">Назад</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
        </div>
      </header>
      <div class="dd-menu hidden" id="dd-menu"><div>05 Хобби</div><div>Дальнобойщики-2</div><div>_Content</div><div>Заметка о маршруте.md</div></div>
      <div class="body-pad">
        <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <aside class="yaml-side"><div class="yaml-label">props.yaml</div><textarea class="yaml-textarea">title: Заметка о маршруте
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

      const dd = root.querySelector('#path-dd');
      const menu = root.querySelector('#dd-menu');
      dd?.addEventListener('click', () => menu?.classList.toggle('hidden'));