import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-19-fullbleed-overlay");
workspace.innerHTML = `
      <div class="fullbleed">
        <div class="overlay-top">
          <button type="button" class="icon-btn" data-action="back" title="Назад">←</button>
          <span class="overlay-path">05 Хобби / Дальнобойщики-2 / _Content / <strong>Заметка о маршруте.md</strong></span>
          <button type="button" class="icon-btn save" data-action="save" title="Сохранить">💾</button>
          <button type="button" class="icon-btn" data-action="close" title="Закрыть">✕</button>
        </div>
        <textarea class="editor-textarea fullbleed-editor"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

&gt; Внешняя память — отдельный md-файл в _Content.</textarea>
        <button type="button" class="yaml-fab" data-yaml-toggle="#yaml-ov">YAML</button>
        <div id="yaml-ov" class="yaml-overlay hidden"><textarea class="yaml-textarea">title: Заметка о маршруте
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
