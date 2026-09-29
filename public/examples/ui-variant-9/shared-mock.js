export const SCENARIOS = {
  service: {
    id: "service",
    label: "Служебный файл",
    ctxClass: "ctx-service",
    prefix: null,
    select: null,
    crumbs: ["Assistant.Ai", "docker-compose.yml"],
    showViewToggle: true,
    showSave: true,
    showDelete: false,
    showProps: false,
    extraActions: [],
    viewSelect: null,
    title: "docker-compose.yml",
    locked: true,
    hint: "Системный конфиг инфраструктуры. Имя файла фиксировано, удаление недоступно."
  },
  plain: {
    id: "plain",
    label: "Обычные крошки",
    ctxClass: "ctx-plain",
    prefix: null,
    select: null,
    crumbs: ["Tests", "Folder-2", "Folder-3", "readme.md"],
    showViewToggle: true,
    showSave: true,
    showDelete: true,
    showProps: true,
    extraActions: [],
    viewSelect: null,
    title: "readme.md",
    locked: false,
    hint: "Стандартный документ в дереве ноды — только путь без доменного префикса."
  },
  settings: {
    id: "settings",
    label: "Настройки ноды",
    ctxClass: "ctx-settings",
    prefix: "Настройки ноды",
    prefixClass: "node-settings-crumb-prefix",
    select: {
      value: "todo",
      options: [
        { value: "description", label: "Описание, инструкции, правила" },
        { value: "configs", label: "Конфигурации" },
        { value: "scripts", label: "Скрипты" },
        { value: "env", label: ".env" },
        { value: "todo", label: "TODO" },
        { value: "node-preview", label: "Превью" }
      ]
    },
    crumbs: ["Tests", "Folder-2", "Folder-3", "Folder-5"],
    showViewToggle: true,
    showSave: true,
    showDelete: true,
    showProps: true,
    extraActions: [],
    viewSelect: null,
    title: "Folder-5 · TODO",
    locked: false,
    hint: "Домен «Настройки» — select переключает подрежим, префикс в крошках."
  },
  memory: {
    id: "memory",
    label: "Память ноды",
    ctxClass: "ctx-memory",
    prefix: "Память ноды",
    prefixClass: "node-memory-crumb-prefix",
    select: {
      value: "external",
      options: [
        { value: "inbox", label: "Входящие" },
        { value: "external", label: "Многофайловая" },
        { value: "internal", label: "Однофайловая" },
        { value: "tabular", label: "Табличная память" },
        { value: "media", label: "Медиа и документы" }
      ]
    },
    crumbs: ["Tests", "Folder-2", "Folder-3", "Folder-5", "_Parts", "test2"],
    showViewToggle: true,
    showSave: true,
    showDelete: true,
    showProps: true,
    extraActions: ["createMemory", "createSection"],
    viewSelect: {
      value: "table",
      options: [
        { value: "table", label: "Таблица" },
        { value: "list", label: "Список" },
        { value: "cards", label: "Карточки" }
      ]
    },
    title: "Воспоминание-2",
    locked: false,
    hint: "Домен «Память» — select подрежима + доп. кнопки создания + переключатель вида списка."
  },
  overview: {
    id: "overview",
    label: "Обзор ноды",
    ctxClass: "ctx-overview",
    prefix: "Обзор ноды",
    prefixClass: "node-overview-crumb-prefix",
    select: null,
    crumbs: ["Tests", "Folder-2", "Folder-3", "Folder-5", "_.node.md"],
    showViewToggle: false,
    showSave: false,
    showDelete: false,
    showProps: false,
    extraActions: [],
    viewSelect: null,
    title: "Folder-5",
    locked: false,
    hint: "Обзор ноды — только навигационный префикс и путь, действия в hero-блоке ниже."
  }
};

export const SCENARIO_ORDER = ["service", "plain", "settings", "memory", "overview"];

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Examples9 — хлебные крошки</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-item">Assistant.Ai</div>
          <div class="sidebar-item active">Folder-5</div>
          <div class="sidebar-item">Tests</div>
        </aside>
        <section class="workspace" data-path-workspace></section>
      </div>
    </div>`;
  return root.querySelector("[data-path-workspace]");
}

export function scenarioSwitchHtml() {
  const buttons = SCENARIO_ORDER.map(
    (id) =>
      `<button type="button" data-scenario="${id}"${id === "settings" ? ' class="active"' : ""}>${SCENARIOS[id].label}</button>`
  ).join("");
  return `<div class="scenario-switch" role="tablist" aria-label="Контекст навигации">${buttons}</div>`;
}

export function crumbsHtml(parts, prefix = null, prefixClass = "") {
  const chunks = [];
  if (prefix) {
    chunks.push(`<span class="breadcrumb ${prefixClass}">${prefix}</span>`);
    if (parts.length) chunks.push('<span class="breadcrumb-sep">/</span>');
  }
  parts.forEach((part, i) => {
    if (i > 0) chunks.push('<span class="breadcrumb-sep">/</span>');
    const isLast = i === parts.length - 1;
    chunks.push(
      isLast
        ? `<span class="breadcrumb current">${part}</span>`
        : `<button type="button" class="breadcrumb">${part}</button>`
    );
  });
  return `<nav class="breadcrumbs" aria-label="Путь">${chunks.join("")}</nav>`;
}

export function selectHtml(select, className = "domain-select") {
  if (!select) return "";
  const opts = select.options
    .map((o) => `<option value="${o.value}"${o.value === select.value ? " selected" : ""}>${o.label}</option>`)
    .join("");
  return `<select class="${className}" aria-label="Подрежим">${opts}</select>`;
}

export function viewToggleHtml(disabled = false) {
  return `<div class="view-toggle" role="tablist">
    <button type="button"${disabled ? " disabled" : ""}>Просмотр</button>
    <button type="button"${disabled ? " disabled" : ""}>Редактировать</button>
    <button type="button" class="active">Источник</button>
    <button type="button" class="btn-icon" title="YAML">#</button>
  </div>`;
}

export function mainActionsHtml(s) {
  const parts = [];
  if (s.showProps) parts.push('<button type="button" class="btn" data-action="props">Свойства</button>');
  if (s.showSave) parts.push('<button type="button" class="btn btn-primary" data-action="save">Сохранить</button>');
  if (s.showDelete) parts.push('<button type="button" class="btn btn-danger" data-action="delete">Удалить</button>');
  if (!parts.length) return "";
  return `<div class="path-actions">${parts.join("")}</div>`;
}

export function extraActionsHtml(s) {
  const parts = [];
  if (s.extraActions.includes("createMemory")) {
    parts.push('<button type="button" class="btn btn-success" data-action="create-memory">Создать воспоминание</button>');
  }
  if (s.extraActions.includes("createSection")) {
    parts.push('<button type="button" class="btn btn-warn" data-action="create-section">Создать раздел</button>');
  }
  if (s.viewSelect) {
    parts.push(selectHtml(s.viewSelect, "view-select"));
  }
  return parts.length ? `<div class="path-actions path-actions--extra">${parts.join("")}</div>` : "";
}

export function previewBodyInnerHtml(s) {
  const lock = s.locked ? '<span class="file-lock" title="Имя нельзя менять">🔒</span>' : "";
  return `<div class="doc-title-slab"><h2>${lock}${s.title}</h2></div>
    <p class="preview-hint">${s.hint}</p>`;
}

/** Компонуем шапку по layout-id */
export function renderPathHeader(layout, scenarioId) {
  const s = SCENARIOS[scenarioId];
  const select = selectHtml(s.select);
  const crumbs = crumbsHtml(s.crumbs, s.prefix, s.prefixClass || "");
  const crumbsPlain = crumbsHtml(s.crumbs);
  const view = s.showViewToggle ? viewToggleHtml(scenarioId === "service") : "";
  const actions = mainActionsHtml(s);
  const extra = extraActionsHtml(s);
  const lock = s.locked ? '<span class="file-lock">🔒</span>' : "";

  const chipPrefix = s.prefix
    ? `<span class="breadcrumb-chip ${s.id === "settings" ? "settings" : s.id === "memory" ? "memory" : "overview"}">${s.prefix}</span>`
    : "";

  const segmentRail =
    s.select && layout === "04-mode-segments"
      ? `<div class="mode-rail mode-rail--inline">${s.select.options
          .map(
            (o) =>
              `<button type="button"${o.value === s.select.value ? ' class="active"' : ""}>${o.label.split(",")[0].split(" ")[0]}</button>`
          )
          .join("")}</div>`
      : "";

  if (layout === "04-mode-segments") {
    return `<header class="path-header ${s.ctxClass}">${crumbsPlain}${chipPrefix ? `<span class="breadcrumb-sep">/</span>${chipPrefix}` : ""}${segmentRail}<span class="spacer"></span>${extra}${view}${actions}</header>`;
  }

  if (layout === "05-two-row-anti") {
    return `<header class="path-header path-header--stack ${s.ctxClass}">
      <div class="path-header-row">${select || chipPrefix || ""}${!select && !chipPrefix ? crumbs : ""}<span class="spacer"></span>${actions}</div>
      <div class="path-header-row">${select || chipPrefix ? crumbs : ""}${view}${extra}</div>
    </header>`;
  }

  if (layout === "07-zoned-toolbar") {
    return `<header class="path-header path-header--zones ${s.ctxClass}">
      <div class="zone zone-select">${select || chipPrefix || "—"}</div>
      <div class="vdivider"></div>
      <div class="zone zone-crumbs">${crumbs}</div>
      <div class="vdivider"></div>
      <div class="zone zone-actions">${extra}${view}${actions}</div>
    </header>`;
  }

  const layouts = {
    "01-production-row": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</header>`,
    "02-select-then-crumbs": `<header class="path-header ${s.ctxClass}">${select}${crumbsPlain}<span class="spacer"></span>${view}${actions}</header>`,
    "03-crumbs-then-select": `<header class="path-header ${s.ctxClass}">${crumbs}${select}<span class="spacer"></span>${view}${actions}</header>`,
    "06-chip-prefix": `<header class="path-header ${s.ctxClass}">${chipPrefix}${select}${crumbsPlain}<span class="spacer"></span>${view}${actions}</header>`,
    "08-actions-first": `<header class="path-header ${s.ctxClass}">${actions}${select}${crumbs}<span class="spacer"></span>${view}</header>`,
    "09-overflow-menu": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}<div class="menu-dropdown"><details><summary class="btn btn-icon">⋯</summary><div class="menu-panel"><button data-action="save">Сохранить</button><button data-action="props">Свойства</button><button data-action="delete">Удалить</button></div></details></div></header>`,
    "10-icons-only": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}<div class="path-actions"><button class="btn btn-icon" data-action="props" title="Свойства">⚙</button><button class="btn btn-icon btn-primary" data-action="save" title="Сохранить">💾</button><button class="btn btn-icon btn-danger" data-action="delete" title="Удалить">🗑</button></div></header>`,
    "11-service-minimal": `<header class="path-header ${s.ctxClass}">${crumbs}${lock}<span class="spacer"></span>${view}${actions}</header>`,
    "12-memory-extended": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</header>`,
    "13-view-center": `<header class="path-header ${s.ctxClass}">${select}${crumbs}${view}<span class="spacer"></span>${extra}${actions}</header>`,
    "14-divider-groups": `<header class="path-header ${s.ctxClass}">${select}<div class="vdivider"></div>${crumbs}<div class="vdivider"></div>${extra}${view}${actions}</header>`,
    "15-glass-sticky": `<header class="path-header path-header--glass ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</header>`,
    "16-compact-dense": `<header class="path-header path-header--compact ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</header>`,
    "17-truncate-path": `<header class="path-header ${s.ctxClass}">${select}<nav class="breadcrumbs breadcrumbs--truncate" aria-label="Путь">${crumbs.replace(/^<nav[^>]*>|<\/nav>$/g, "")}</nav><span class="spacer"></span>${view}${actions}</header>`,
    "18-select-as-crumb": `<header class="path-header ${s.ctxClass}"><nav class="breadcrumbs" aria-label="Путь">${s.prefix ? `<span class="breadcrumb ${s.prefixClass}">${s.prefix}</span><span class="breadcrumb-sep">/</span>` : ""}${s.select ? `<select class="domain-select domain-select--inline">${s.select.options.map((o) => `<option${o.value === s.select.value ? " selected" : ""}>${o.label}</option>`).join("")}</select><span class="breadcrumb-sep">/</span>` : ""}${s.crumbs.map((p, i) => `${i ? '<span class="breadcrumb-sep">/</span>' : ""}${i === s.crumbs.length - 1 ? `<span class="breadcrumb current">${p}</span>` : `<button type="button" class="breadcrumb">${p}</button>`}`).join("")}</nav><span class="spacer"></span>${view}${actions}</header>`,
    "19-service-title-below": `<header class="path-header path-header--stack ${s.ctxClass}"><div class="path-header-row">${crumbs}${lock}<span class="spacer"></span>${view}${actions}</div><div class="path-header-row path-header-row--title"><strong>${s.title}</strong></div></header>`,
    "20-crumb-actions": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}<nav class="breadcrumbs breadcrumbs--actions"><span class="breadcrumb-sep">·</span><button class="breadcrumb breadcrumb-action" data-action="save">Сохранить</button><button class="breadcrumb breadcrumb-action breadcrumb-action--danger" data-action="delete">Удалить</button></nav></header>`,
    "21-wrap-responsive": `<header class="path-header path-header--wrap ${s.ctxClass}">${select}${crumbs}${extra}${view}${actions}</header>`,
    "22-overview-quiet": `<header class="path-header ${s.ctxClass}">${crumbs}<span class="spacer"></span>${scenarioId === "overview" ? '<span class="preview-hint" style="margin:0;font-size:11px">Действия в hero ↓</span>' : `${view}${actions}`}</header>`,
    "23-mode-rail-below": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${view}${actions}</header>`,
    "24-slab-stack": `<section class="path-slab ${s.ctxClass}"><div class="path-slab-row">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</div></section>`,
    "25-recommended-blend": `<header class="path-header ${s.ctxClass}">${select}${crumbs}<span class="spacer"></span>${extra}${view}${actions}</header>`
  };

  let html = layouts[layout] || layouts["01-production-row"];

  if (layout === "23-mode-rail-below" && s.select && scenarioId === "settings") {
    html += `<div class="mode-rail">${s.select.options
      .map(
        (o) =>
          `<button type="button"${o.value === s.select.value ? ' class="active"' : ""}>${o.label.split(",")[0]}</button>`
      )
      .join("")}</div>`;
  }

  return html;
}

export function bindScenarioToggle(workspace, renderHeader, initial = "settings") {
  const host = workspace.querySelector("[data-path-header-host]");
  if (!host) return;

  function setScenario(id) {
    workspace.querySelectorAll(".scenario-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.scenario === id);
    });
    host.innerHTML = renderHeader(id);
    const preview = workspace.querySelector("[data-preview-body]");
    if (preview) preview.innerHTML = previewBodyInnerHtml(SCENARIOS[id]);
    bindDemoActions(document.body);
  }

  workspace.querySelectorAll(".scenario-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setScenario(btn.dataset.scenario));
  });
  setScenario(initial);
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

  const actions = ["save", "props", "delete", "create-memory", "create-section"];
  const messages = {
    save: "Сохранено",
    props: "Панель свойств",
    delete: "Удаление (демо)",
    "create-memory": "Создать воспоминание",
    "create-section": "Создать раздел"
  };

  actions.forEach((action) => {
    root.querySelectorAll(`[data-action='${action}']`).forEach((btn) => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      clone.addEventListener("click", () => show(messages[action]));
    });
  });
}

export function buildWorkspaceHtml() {
  return `${scenarioSwitchHtml()}
    <div data-path-header-host></div>
    <div class="preview-body" data-preview-body></div>`;
}

export function initVariant(root, layout, variantClass, initial = "settings") {
  const workspace = mountShell(root, variantClass);
  workspace.innerHTML = buildWorkspaceHtml();
  const render = (id) => renderPathHeader(layout, id);
  bindScenarioToggle(workspace, render, initial);
}
