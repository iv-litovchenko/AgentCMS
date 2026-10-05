import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-05-notion-header");
workspace.innerHTML = `
      <div class="notion-doc">
        <button type="button" class="btn btn-ghost back-top" data-action="back">← Внешняя память</button>
        <p class="notion-path">05 Хобби / Дальнобойщики-2 / _Content / Заметка о маршруте.md</p>
        <div class="notion-title-row"><span class="emoji">📄</span><input class="notion-title" value="Заметка о маршруте" /><span class="doc-ext">.md</span></div>
        <div class="props-table">
          <div class="prop-row"><span>tags</span><input value="логистика, маршрут" /></div>
          <div class="prop-row"><span>status</span><select><option>draft</option><option>published</option></select></div>
          <div class="prop-row"><span>created</span><input value="2026-04-19" /></div>
        </div>
        <details class="yaml-raw"><summary>Raw YAML</summary><textarea class="yaml-textarea">title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19</textarea></details>
        <textarea class="editor-textarea borderless"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <div class="notion-footer"><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>
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
