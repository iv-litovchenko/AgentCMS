import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-23-vscode-bar");
workspace.innerHTML = `
      <div class="vscode">
        <div class="vscode-tab">Заметка о маршруте.md ✕</div>
        <div class="vscode-bar">
          <span class="vscode-path">05 Хобби › Дальнобойщики-2 › _Content › Заметка о маршруте.md</span>
          <span class="vscode-status" id="vs-status">Изменён</span>
          <button type="button" class="btn btn-primary sm" data-action="save">Save</button>
        </div>
        <div class="vscode-body">
          <textarea class="editor-textarea code"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
          <div class="vscode-sidebar">
            <div class="yaml-label">YAML</div>
            <textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea>
            <button type="button" class="btn full" data-action="back">← Explorer</button>
          </div>
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

      root.querySelector('[data-action="save"]')?.addEventListener('click', () => {
        const st = root.querySelector('#vs-status');
        if (st) st.textContent = 'Сохранено';
      });