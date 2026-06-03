export const AGENTS = {
  crumbs: ["Workspaces", "Main Agent", "AGENTS.md"],
  content: `# Main Agent

Роль: координатор воркспейса.

## Правила
- Не переименовывать этот файл
- Путь агента задаётся в реестре`,
  yaml: `agent_id: main\nname: Main Agent\nversion: 1`
};

export const NODE = {
  crumbs: ["05 Хобби", "Дальнобойщики-2", "Память", "Внешняя", "Заметка.md"],
  title: "Дальнобойщики-2",
  content: `# Маршрут Москва — Казань

- Старт: 06:00
- Прибытие: 18:30`,
  yaml: `title: Заметка о маршруте\ntags: [логистика]\nstatus: draft`
};

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Examples5 — форма документа</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-item">Main Agent</div>
          <div class="sidebar-item active">Дальнобойщики-2</div>
          <div class="sidebar-item">Test</div>
        </aside>
        <section class="workspace" data-doc-workspace></section>
      </div>
    </div>`;
  return root.querySelector("[data-doc-workspace]");
}

export const DOC_TYPE_SWITCH = `
  <div class="doc-type-switch" role="tablist" aria-label="Тип документа">
    <button type="button" data-doc-type="agents" class="active">AGENTS.md</button>
    <button type="button" data-doc-type="node">_.node.md</button>
  </div>`;

export function crumbsHtml(parts) {
  return parts
    .map((part, i) => {
      const sep = i > 0 ? '<span class="breadcrumb-sep">/</span>' : "";
      const isLast = i === parts.length - 1;
      const inner = isLast
        ? `<span class="breadcrumb current">${part}</span>`
        : `<button type="button" class="breadcrumb">${part}</button>`;
      return sep + inner;
    })
    .join("");
}

export const ACTIONS_STANDARD = `
  <div class="doc-actions">
    <button type="button" class="btn" data-action="props">Свойства</button>
    <button type="button" class="btn btn-primary" data-action="save">Сохранить</button>
    <button type="button" class="btn btn-danger" data-action="delete">Удалить</button>
  </div>`;

export const ACTIONS_ICONS = `
  <div class="doc-actions">
    <button type="button" class="btn btn-icon" data-action="props" title="Свойства">⚙</button>
    <button type="button" class="btn btn-icon btn-primary" data-action="save" title="Сохранить">💾</button>
    <button type="button" class="btn btn-icon btn-danger" data-action="delete" title="Удалить">🗑</button>
  </div>`;

export const VIEW_TOGGLE = `
  <div class="view-toggle" role="tablist">
    <button type="button" class="active">Источник</button>
    <button type="button">Просмотр</button>
  </div>`;

export function titleAgentsHtml() {
  return `<div class="title-fixed"><span>AGENTS.md</span><span class="lock" title="Имя нельзя менять">🔒</span></div>`;
}

export function titleNodeHtml() {
  return `<input class="doc-title-input" value="${NODE.title}" /><span class="doc-ext">.node.md</span>`;
}

export function bindDocTypeToggle(workspace) {
  const agentsCrumbs = workspace.querySelectorAll("[data-crumb-zone='agents']");
  const nodeCrumbs = workspace.querySelectorAll("[data-crumb-zone='node']");
  const agentsTitles = workspace.querySelectorAll("[data-title-zone='agents']");
  const nodeTitles = workspace.querySelectorAll("[data-title-zone='node']");
  const deleteBtns = workspace.querySelectorAll("[data-action='delete']");
  const agentsOnly = workspace.querySelectorAll("[data-agents-only]");
  const nodeOnly = workspace.querySelectorAll("[data-node-only]");

  function setType(type) {
    workspace.querySelectorAll(".doc-type-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.docType === type);
    });
    agentsCrumbs.forEach((el) => el.classList.toggle("hidden", type !== "agents"));
    nodeCrumbs.forEach((el) => el.classList.toggle("hidden", type !== "node"));
    agentsTitles.forEach((el) => el.classList.toggle("hidden", type !== "agents"));
    nodeTitles.forEach((el) => el.classList.toggle("hidden", type !== "node"));
    agentsOnly.forEach((el) => el.classList.toggle("hidden", type !== "agents"));
    nodeOnly.forEach((el) => el.classList.toggle("hidden", type !== "node"));
    deleteBtns.forEach((btn) => {
      btn.classList.toggle("hidden", type === "agents");
      btn.disabled = type === "agents";
    });
  }

  workspace.querySelectorAll(".doc-type-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setType(btn.dataset.docType));
  });
  setType("agents");
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
  root.querySelectorAll("[data-action='props']").forEach((btn) => {
    btn.addEventListener("click", () => show("Панель свойств"));
  });
  root.querySelectorAll("[data-action='delete']").forEach((btn) => {
    btn.addEventListener("click", () => show("Удаление ноды (демо)"));
  });
  root.querySelectorAll("[data-action='back']").forEach((btn) => {
    btn.addEventListener("click", () => show("Назад к списку"));
  });
}

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildReplacements() {
  const agentsCrumbs = `<nav class="breadcrumbs crumb-zone" data-crumb-zone="agents">${crumbsHtml(AGENTS.crumbs)}</nav>`;
  const nodeCrumbs = `<nav class="breadcrumbs crumb-zone hidden" data-crumb-zone="node">${crumbsHtml(NODE.crumbs)}</nav>`;
  const agentsTitle = `<div class="title-zone" data-title-zone="agents">${titleAgentsHtml()}</div>`;
  const nodeTitle = `<div class="title-zone hidden" data-title-zone="node">${titleNodeHtml()}</div>`;

  return {
    "{{docTypeSwitch}}": DOC_TYPE_SWITCH,
    "{{agentsCrumbs}}": agentsCrumbs,
    "{{nodeCrumbs}}": nodeCrumbs,
    "{{bothCrumbs}}": agentsCrumbs + nodeCrumbs,
    "{{agentsTitle}}": agentsTitle,
    "{{nodeTitle}}": nodeTitle,
    "{{bothTitles}}": agentsTitle + nodeTitle,
    "{{actions}}": ACTIONS_STANDARD,
    "{{actionsIcons}}": ACTIONS_ICONS,
    "{{viewToggle}}": VIEW_TOGGLE,
    "{{agentsContent}}": escapeHtml(AGENTS.content),
    "{{nodeContent}}": escapeHtml(NODE.content),
    "{{agentsYaml}}": escapeHtml(AGENTS.yaml),
    "{{nodeYaml}}": escapeHtml(NODE.yaml)
  };
}
