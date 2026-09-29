/** Пять доменов управления нодой (как в production Agent CMS, переименовано «Файлы» → «Вложения»). */
export const DOMAINS = [
  {
    id: "nav",
    icon: "🧭",
    label: "Навигация",
    hint: "Ориентация в пространстве ноды",
    modes: ["Граф", "Карта (MOC)", "Индекс"]
  },
  {
    id: "memory",
    icon: "🧠",
    label: "Память",
    hint: "Заметки, inbox, TODO",
    modes: ["Входящие", "Внешняя память", "Внутренняя", "Источники", "TODO.md"]
  },
  {
    id: "attachments",
    icon: "📎",
    label: "Вложения",
    hint: "_Assets и превью",
    modes: ["Медиа и документы", "Превью"]
  },
  {
    id: "settings",
    icon: "⚙️",
    label: "Настройки",
    hint: "Описание, конфиги, скрипты",
    modes: ["Описание", "Конфигурации", "Скрипты", ".env"]
  },
  {
    id: "auto",
    icon: "⚡",
    label: "Автоматизация",
    hint: "Расписание и heartbeat",
    modes: ["Расписание", "Heartbeat"]
  }
];

export const DEMO = {
  agent: "Main.agent",
  folder: "05 Хобби",
  node: "Дальнобойщики-2",
  path: "_Content / Заметка о маршруте.md"
};

const PREVIEW_BY_DOMAIN = {
  nav: (mode) => `
    <div class="preview-graph">
      <p class="preview-kicker">🧭 ${mode}</p>
      <div class="preview-graph-placeholder" aria-hidden="true">
        <span>●</span><span>◎</span><span>○</span><span>○</span><span>●</span>
      </div>
      <p class="preview-note">Клик по узлу → переход в домен (Память, Вложения…)</p>
    </div>`,
  memory: (mode) => `
    <div class="preview-editor">
      <p class="preview-kicker">🧠 ${mode}</p>
      <textarea class="preview-textarea" readonly># Маршрут Москва — Казань

- Старт: 06:00
- Внешняя память: _Content/*.md</textarea>
    </div>`,
  attachments: (mode) => `
    <div class="preview-files">
      <p class="preview-kicker">📎 ${mode}</p>
      <ul class="preview-file-list">
        <li>🖼 preview.png</li>
        <li>📕 route-map.pdf</li>
        <li>📄 sidecar.md</li>
      </ul>
    </div>`,
  settings: (mode) => `
    <div class="preview-settings">
      <p class="preview-kicker">⚙️ ${mode}</p>
      <dl class="preview-dl">
        <dt>Файл</dt><dd>Дальнобойщики-2.node.md</dd>
        <dt>Конфиг</dt><dd>Configuration.md</dd>
        <dt>Скрипты</dt><dd>_Scripts/</dd>
      </dl>
    </div>`,
  auto: (mode) => `
    <div class="preview-auto">
      <p class="preview-kicker">⚡ ${mode}</p>
      <ul class="preview-timeline">
        <li><time>08:00</time> heartbeat ping</li>
        <li><time>12:00</time> sync _Content</li>
        <li class="muted">Расписание (скоро)</li>
      </ul>
    </div>`
};

export function findDomain(id) {
  return DOMAINS.find((d) => d.id === id) || DOMAINS[0];
}

export function renderBreadcrumbs() {
  return `<nav class="breadcrumbs" aria-label="Путь">
    <button type="button" class="breadcrumb">${DEMO.folder}</button>
    <span class="breadcrumb-sep">/</span>
    <button type="button" class="breadcrumb">${DEMO.node}</button>
    <span class="breadcrumb-sep">/</span>
    <span class="breadcrumb current">${DEMO.path}</span>
  </nav>`;
}

export function renderPreview(domainId, modeLabel) {
  const fn = PREVIEW_BY_DOMAIN[domainId] || PREVIEW_BY_DOMAIN.memory;
  return `<section class="preview-panel" data-preview>${fn(modeLabel)}</section>`;
}

export function renderRailHtml(activeDomain, { clusterIds = null } = {}) {
  const list = clusterIds
    ? DOMAINS.filter((d) => clusterIds.includes(d.id))
    : DOMAINS;
  return list
    .map(
      (d) =>
        `<button type="button" class="rail-btn${d.id === activeDomain ? " active" : ""}" data-domain="${d.id}" title="${d.label}">${d.icon}</button>`
    )
    .join("");
}

export function renderFlyoutHtml(activeDomain, activeMode) {
  const domain = findDomain(activeDomain);
  const switches = domain.modes
    .map(
      (mode) =>
        `<button type="button" class="mode-switch${mode === activeMode ? " active" : ""}" data-mode="${mode}">${mode}</button>`
    )
    .join("");
  return `<div class="flyout-title">${domain.icon} ${domain.label}</div><p class="flyout-hint">${domain.hint}</p>${switches}`;
}

export function mountBaseShell(root, { activeDomain = "memory", activeMode = "Внешняя память", variantClass = "" } = {}) {
  const domain = findDomain(activeDomain);
  const mode = activeMode || domain.modes[0];
  root.innerHTML = `
    <div class="shell ${variantClass}" data-shell>
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>${DEMO.agent} · навигация по доменам</span>
      </header>
      <div class="shell-body" data-shell-body>
        <aside class="sidebar">
          <p class="sidebar-title">Дерево нод</p>
          <div class="sidebar-item">${DEMO.folder}</div>
          <div class="sidebar-item active">${DEMO.node}</div>
        </aside>
        <nav class="mode-rail" data-nav-rail aria-label="Домены">${renderRailHtml(activeDomain)}</nav>
        <aside class="mode-flyout" data-nav-flyout>${renderFlyoutHtml(activeDomain, mode)}</aside>
        <section class="workspace" data-workspace>
          <header class="ws-header">${renderBreadcrumbs()}</header>
          <div class="ws-context" data-ws-context>
            <span class="ctx-domain" data-ctx-domain>${domain.icon} ${domain.label}</span>
            <span class="ctx-sep">›</span>
            <span class="ctx-mode" data-ctx-mode>${mode}</span>
          </div>
          ${renderPreview(activeDomain, mode)}
        </section>
      </div>
    </div>`;
  return { domain: activeDomain, mode };
}

export function bindNavInteractions(root, state) {
  const toast = document.getElementById("toast");
  const show = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(show._t);
    show._t = setTimeout(() => toast.classList.remove("show"), 1600);
  };

  function apply(domainId, modeLabel) {
    state.domain = domainId;
    const domain = findDomain(domainId);
    state.mode = modeLabel || domain.modes[0];

    root.querySelectorAll("[data-domain]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.domain === domainId);
    });
    const flyout = root.querySelector("[data-nav-flyout]");
    if (flyout) flyout.innerHTML = renderFlyoutHtml(domainId, state.mode);

    const ctxDomain = root.querySelector("[data-ctx-domain]");
    const ctxMode = root.querySelector("[data-ctx-mode]");
    if (ctxDomain) ctxDomain.textContent = `${domain.icon} ${domain.label}`;
    if (ctxMode) ctxMode.textContent = state.mode;

    const preview = root.querySelector("[data-preview]");
    if (preview) preview.outerHTML = renderPreview(domainId, state.mode);

    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === state.mode);
    });

    root.querySelectorAll("[data-domain-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.domainTab === domainId);
    });
    root.querySelectorAll("[data-domain-chip]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.domainChip === domainId);
    });
  }

  root.addEventListener("click", (event) => {
    const domainBtn = event.target.closest("[data-domain], [data-domain-tab], [data-domain-chip]");
    if (domainBtn) {
      const id = domainBtn.dataset.domain || domainBtn.dataset.domainTab || domainBtn.dataset.domainChip;
      apply(id);
      show(`${findDomain(id).label}`);
      return;
    }
    const modeBtn = event.target.closest("[data-mode]");
    if (modeBtn) {
      apply(state.domain, modeBtn.dataset.mode);
      show(modeBtn.dataset.mode);
    }
  });

  return { apply, state };
}

export function bindDemoActions() {
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const toast = document.getElementById("toast");
      if (!toast) return;
      toast.textContent = btn.dataset.action === "save" ? "Сохранено" : "Действие";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1600);
    });
  });
}
