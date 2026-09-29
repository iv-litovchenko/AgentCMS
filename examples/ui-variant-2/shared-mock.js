export const DEMO = {
  node: "Дальнобойщики-2",
  folder: "05 Хобби",
  mode: "_Content",
  file: "Заметка о маршруте",
  ext: ".md",
  content: `# Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

> Внешняя память — отдельный md-файл в _Content.`,
  yaml: `title: Заметка о маршруте
tags:
  - логистика
  - маршрут
status: draft
created: 2026-04-19`
};

export function crumbs(includeFile = true) {
  const parts = [DEMO.folder, DEMO.node, DEMO.mode];
  if (includeFile) parts.push(`${DEMO.file}${DEMO.ext}`);
  return parts;
}

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Workspaces/*.node.md</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-item">05 Хобби</div>
          <div class="sidebar-item active">Дальнобойщики-2</div>
          <div class="sidebar-item">Test-Коллекция</div>
        </aside>
        <nav class="rail" aria-label="Режимы">
          <button class="rail-btn" type="button" title="Основное">🧩</button>
          <button class="rail-btn active" type="button" title="Память">🧠</button>
          <button class="rail-btn" type="button" title="Медиа">📎</button>
        </nav>
        <section class="workspace" data-doc-workspace></section>
      </div>
    </div>
  `;
  return root.querySelector("[data-doc-workspace]");
}

export function renderBreadcrumbsHtml(parts, { backFirst = false } = {}) {
  const items = [];
  if (backFirst) {
    items.push(`<button type="button" class="breadcrumb back-crumb" data-action="back">← Назад</button><span class="breadcrumb-sep">·</span>`);
  }
  parts.forEach((part, i) => {
    if (i > 0) items.push('<span class="breadcrumb-sep">/</span>');
    const isLast = i === parts.length - 1;
    items.push(
      isLast
        ? `<span class="breadcrumb current">${part}</span>`
        : `<button type="button" class="breadcrumb">${part}</button>`
    );
  });
  return `<nav class="breadcrumbs" aria-label="Путь">${items.join("")}</nav>`;
}

export function bindDemoActions(root) {
  const toast = document.getElementById("demo-toast");
  const show = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(show._t);
    show._t = setTimeout(() => toast.classList.remove("show"), 1800);
  };

  root.querySelectorAll("[data-action='save']").forEach((btn) => {
    btn.addEventListener("click", () => show("Сохранено"));
  });
  root.querySelectorAll("[data-action='back'], .back-crumb, [data-action='close']").forEach((btn) => {
    btn.addEventListener("click", () => show("Документ закрыт — возврат к списку"));
  });
  root.querySelectorAll(".view-toggle").forEach((group) => {
    group.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  });
  root.querySelectorAll("[data-yaml-toggle]").forEach((btn) => {
    const target = root.querySelector(btn.dataset.yamlToggle);
    if (!target) return;
    btn.addEventListener("click", () => target.classList.toggle("hidden"));
  });
}
