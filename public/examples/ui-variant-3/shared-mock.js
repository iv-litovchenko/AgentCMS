export const DEMO = {
  agent: "Main.agent",
  folder: "05 Хобби",
  node: "Дальнобойщики-2",
  mode: "_Content",
  file: "Заметка о маршруте",
  ext: ".md",
  content: `# Маршрут Москва — Казань

- Старт: 06:00
- Остановка: Нижний Новгород
- Прибытие: 18:30

> Внешняя память — отдельный md-файл в _Content.`,
  yaml: `title: Заметка о маршруте
tags: логистика, маршрут
status: draft
created: 2026-04-19`
};

export const MODE_GROUPS = [
  { id: "main", icon: "🧩", label: "Основное" },
  { id: "nav", icon: "🧭", label: "Навигация" },
  { id: "memory", icon: "🧠", label: "Память" },
  { id: "media", icon: "📎", label: "Медиа" },
  { id: "attach", icon: "📦", label: "Вложения" },
  { id: "auto", icon: "⚙️", label: "Автоматизация" }
];

const FLYOUT_MODES = {
  main: ["Описание", "Превью", "Свойства ноды"],
  nav: ["Оглавление", "Ссылки", "MOC"],
  memory: ["Описание", "Внутренняя", "Внешняя (_Content)", "TODO"],
  media: ["Файлы", "Изображения", "Аудио"],
  attach: ["Вложения", "Архивы"],
  auto: ["Скрипты", "Workflow", ".env"]
};

export function crumbs(includeFile = true) {
  const parts = [DEMO.folder, DEMO.node, DEMO.mode];
  if (includeFile) parts.push(`${DEMO.file}${DEMO.ext}`);
  return parts;
}

export function renderBreadcrumbsHtml(parts) {
  const items = [];
  parts.forEach((part, index) => {
    if (index > 0) items.push('<span class="breadcrumb-sep">/</span>');
    const isLast = index === parts.length - 1;
    items.push(
      isLast
        ? `<span class="breadcrumb current">${part}</span>`
        : `<button type="button" class="breadcrumb">${part}</button>`
    );
  });
  return `<nav class="breadcrumbs" aria-label="Путь">${items.join("")}</nav>`;
}

export function renderRailHtml(activeGroup = "memory") {
  return MODE_GROUPS.map(
    (group) =>
      `<button class="rail-btn${group.id === activeGroup ? " active" : ""}" type="button" title="${group.label}">${group.icon}</button>`
  ).join("");
}

export function renderFlyoutHtml(activeGroup = "memory", activeMode = "Внешняя (_Content)") {
  const modes = FLYOUT_MODES[activeGroup] || [];
  const switches = modes
    .map(
      (mode) =>
        `<button type="button" class="mode-switch${mode === activeMode ? " active" : ""}">${mode}</button>`
    )
    .join("");
  const label = MODE_GROUPS.find((g) => g.id === activeGroup)?.label || "Режим";
  return `<div class="flyout-title">${label}</div>${switches}`;
}

export function mountShell(root, variantClass = "", { activeGroup = "memory", activeMode = "Внешняя (_Content)" } = {}) {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>${DEMO.agent} · _.node.md</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <p class="sidebar-title">Дерево нод</p>
          <div class="sidebar-item">${DEMO.folder}</div>
          <div class="sidebar-item active">${DEMO.node}</div>
          <div class="sidebar-item">Test-Коллекция</div>
          <div class="sidebar-item">02 Focus</div>
        </aside>
        <nav class="mode-rail" aria-label="Группы режимов">${renderRailHtml(activeGroup)}</nav>
        <aside class="mode-flyout">${renderFlyoutHtml(activeGroup, activeMode)}</aside>
        <section class="workspace" data-doc-workspace></section>
        <aside class="right-panel" data-right-panel>
          <button type="button" class="btn" style="width:100%">Открыть в Обсидиан</button>
          <button type="button" class="btn btn-primary" data-action="save" style="width:100%">Сохранить</button>
          <button type="button" class="btn btn-danger" style="width:100%">Удалить</button>
        </aside>
      </div>
    </div>`;
  return root.querySelector("[data-doc-workspace]");
}

export function bindDemoActions(root) {
  const toast = document.getElementById("toast");
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
  root.querySelectorAll("[data-action='back'], [data-action='close']").forEach((btn) => {
    btn.addEventListener("click", () => show("Возврат к списку"));
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
    btn.addEventListener("click", () => {
      target.classList.toggle("hidden");
      btn.textContent = target.classList.contains("hidden") ? "Показать YAML" : "Скрыть YAML";
    });
  });
  root.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      const wrap = btn.closest("[data-tab-wrap]");
      if (!wrap) return;
      wrap.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
      wrap.querySelectorAll("[data-tab-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.tabPanel !== tab);
      });
    });
  });
}
