import { mountShell, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const workspace = mountShell(root, "variant-18-vscode-layout");
workspace.innerHTML = `
      <header class="ws-header path-bar"><nav class="breadcrumbs" aria-label="Путь"><button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">_Content</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">Заметка о маршруте.md</span></nav></header>
      <div class="editor-block">
  <div class="editor-head"><span>Содержимое</span><div class="view-toggle" role="tablist"><button type="button" class="active">Редакт.</button><button type="button">Просмотр</button></div></div>
  <textarea class="editor-textarea"># Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30</textarea>
</div>`;
const bar = document.createElement("footer");
      bar.className = "status-bar";
      bar.innerHTML = ["🧩 Основное","🧭 Навигация","🧠 Память","📎 Медиа","📦 Вложения","⚙️ Auto"].map((t,i)=> `<span class="status-pill${i===2?" active":""}">${t}</span>`).join("");
      root.querySelector(".shell-body").appendChild(bar);
      root.querySelector(".right-panel").innerHTML = `<section class="form-props">
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
</section><div class="inline-actions"><button type="button" class="btn btn-ghost" data-action="back">← Назад</button><button type="button" class="btn btn-primary" data-action="save">Сохранить</button></div>`;

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
