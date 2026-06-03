export const MODE_GROUPS = [
  {
    id: "main",
    title: "Основное",
    modes: [
      { id: "description", label: "Описание, инструкции, правила" },
      { id: "configs", label: "Конфигурации" },
      { id: "scripts", label: "Скрипты" },
      { id: "env", label: ".env" }
    ]
  },
  {
    id: "memory",
    title: "Память",
    modes: [
      { id: "internal", label: "Внутренняя память" },
      { id: "external", label: "Внешняя память" },
      { id: "external-db", label: "Внешняя память (БД)", disabled: true },
      { id: "references", label: "Источники", disabled: true }
    ]
  },
  {
    id: "files",
    title: "Файлы",
    modes: [
      { id: "media", label: "Медиа и документы" },
      { id: "inbox", label: "Входящие" }
    ]
  },
  {
    id: "auto",
    title: "Автоматизация",
    modes: [
      { id: "schedule", label: "Задачи по расписанию", disabled: true },
      { id: "heartbeat", label: "Heartbeat (сердцебиение)", disabled: true }
    ]
  }
];

export const MOCK_TREE = `
  <div class="tree-item folder open">▾ Workspaces</div>
  <div class="tree-children">
    <div class="tree-item folder">▸ Agents</div>
    <div class="tree-item file active">● Research Agent</div>
    <div class="tree-item file">● Support Bot</div>
    <div class="tree-item folder">▸ Templates</div>
  </div>
`;

export const MOCK_PATH = "Workspaces / Agents / Research Agent.node.md";

export function modePreviewText(modeId) {
  const map = {
    description: "Описание агента, инструкции и правила поведения…",
    configs: "configuration.yaml, settings.json…",
    scripts: "run.sh, deploy.js, helpers/…",
    env: "API_KEY=…\nDB_URL=…",
    internal: "Краткосрочный контекст и заметки агента…",
    external: "Список файлов _Content: 12 воспоминаний…",
    media: "logo.png, diagram.svg…",
    inbox: "3 необработанных входящих…"
  };
  return map[modeId] || "Содержимое режима…";
}

export function allModes() {
  return MODE_GROUPS.flatMap((g) => g.modes.map((m) => ({ ...m, group: g.title })));
}

export function findMode(modeId) {
  for (const group of MODE_GROUPS) {
    const mode = group.modes.find((m) => m.id === modeId);
    if (mode) return { ...mode, groupTitle: group.title };
  }
  return null;
}

export function renderModeButtons(className = "mode-btn") {
  return MODE_GROUPS.map(
    (group) => `
    <div class="mode-group">
      <div class="mode-group-title">${group.title}</div>
      ${group.modes
        .map(
          (mode) =>
            `<button type="button" class="${className}" data-mode="${mode.id}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
        )
        .join("")}
    </div>`
  ).join("");
}

export function renderModePills(className = "pill") {
  return MODE_GROUPS.flatMap((group) =>
    group.modes.map(
      (mode) =>
        `<button type="button" class="${className}" data-mode="${mode.id}" title="${group.title}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
    )
  ).join("");
}

export function renderModeSelectOptions() {
  return MODE_GROUPS.flatMap((group) =>
    group.modes.map(
      (mode) =>
        `<option value="${mode.id}"${mode.disabled ? " disabled" : ""}>${group.title} → ${mode.label}</option>`
    )
  ).join("");
}

export function bindModeButtons(root, onChange) {
  let active = "description";
  const preview = root.querySelector("[data-mode-preview]");
  const label = root.querySelector("[data-active-mode-label]");

  function setActive(modeId) {
    const mode = findMode(modeId);
    if (!mode || mode.disabled) return;
    active = modeId;
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === modeId);
      btn.setAttribute("aria-pressed", btn.dataset.mode === modeId ? "true" : "false");
    });
    if (preview) preview.textContent = modePreviewText(modeId);
    if (label) label.textContent = mode.label;
    onChange?.(mode);
  }

  root.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setActive(btn.dataset.mode));
  });

  setActive(active);
  return { setActive, getActive: () => active };
}
