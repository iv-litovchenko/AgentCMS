/** Mock data and shell for Examples7 — node overview central content */

export const CONTAINER = {
  crumbs: ["Обзор ноды", "Assistant.Ai", "_.node.md"],
  title: "Assistant.Ai",
  type: "NODE/INDEX",
  desc: "Кластер идентичности ассистента: правила, профиль, пользователи.",
  meta: [
    { key: "AWN-STATUS", value: "active" },
    { key: "AWN-MEMORY", value: "hybrid" },
    { key: "AWN-PRIORITY", value: "30" },
    { key: "AWN-CATEGORY", value: "system" },
    { key: "AWN-VERSION", value: "1.0.0" },
    { key: "AWN-UPDATED", value: "2026-05-06" }
  ],
  children: [
    { title: "Assistant", path: "Assistant.node.md", type: "NODE/SOLO", folder: false },
    { title: "Rules", path: "Rules.node.md", type: "NODE/SOLO", folder: false },
    { title: "User", path: "User.node.md", type: "NODE/SOLO", folder: false },
    { title: "Users", path: "Users.node.md", type: "NODE/INDEX", folder: true }
  ],
  memory: {
    internal: { exists: true, label: "842 симв.", excerpt: "Краткие заметки о тоне и стиле…" },
    external: { exists: true, label: "12 записей", recent: ["Профиль.md", "FAQ.md"] },
    tabular: { exists: true, label: "4 строки · 3 кол.", cols: "name · role · status" }
  }
};

export const SOLO = {
  crumbs: ["Обзор ноды", "Assistant.Ai", "Assistant.node.md"],
  title: "Assistant",
  type: "NODE/SOLO",
  desc: "Идентичность ассистента: имя, характер, принципы, стиль общения.",
  meta: [
    { key: "AWN-STATUS", value: "active" },
    { key: "AWN-MEMORY", value: "none" },
    { key: "AWN-PRIORITY", value: "30" },
    { key: "AWN-TRIGGERS", value: "assistant, ассистент" },
    { key: "AWN-CATEGORY", value: "system" },
    { key: "AWN-UPDATED", value: "2026-05-06" }
  ],
  children: [],
  memory: null
};

export const NODE_TYPE_SWITCH = `
  <div class="node-type-switch" role="tablist" aria-label="Тип ноды">
    <button type="button" data-node-type="container" class="active">Контейнер</button>
    <button type="button" data-node-type="solo">Solo-нода</button>
  </div>`;

export const SURFACE_TABS = `
  <div class="ov-surface-tabs" data-surface-tabs role="tablist">
    <button type="button" class="active" data-surface="overview">Обзор</button>
    <button type="button" data-surface="description">Описание</button>
    <button type="button" data-surface="memory">Память</button>
    <button type="button" data-surface="preview">Превью</button>
  </div>`;

export const PREVIEW_PANE = `
  <div class="ov-preview-pane" data-surface-panel="preview">
    <div class="ov-preview-large"><span aria-hidden="true">🖼</span><p>Assistant.node.preview.png</p></div>
  </div>`;

export const DESCRIPTION_PANE = `
  <div class="ov-desc-pane hidden" data-surface-panel="description">
    <h3>Assistant — Марина</h3>
    <p>Тёплая, компетентная. Помогать по делу, без воды. Иметь мнение и вкус.</p>
    <ul><li>Помогать по делу</li><li>Держать контекст пользователя</li></ul>
  </div>`;

export const MODE_PILLS = `
  <div class="ov-pills" role="tablist">
    <button type="button" class="active">Обзор</button>
    <button type="button" data-action="open-mode" data-label="Описание">Описание</button>
    <button type="button" data-action="open-mode" data-label="Память">Память</button>
    <button type="button" data-action="open-mode" data-label="Медиа">Медиа</button>
    <button type="button" data-action="open-mode" data-label="Граф">Граф</button>
  </div>`;

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Examples7 — обзор ноды</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-label">Дерево</div>
          <div class="sidebar-item">02 MedCenterAgent</div>
          <div class="sidebar-item active">Assistant.Ai</div>
          <div class="sidebar-item indent">Assistant</div>
          <div class="sidebar-item indent">Rules</div>
          <div class="sidebar-item indent">User</div>
        </aside>
        <section class="workspace" data-overview-workspace></section>
      </div>
    </div>`;
  return root.querySelector("[data-overview-workspace]");
}

export function bindNodeTypeToggle(workspace) {
  const containerZones = workspace.querySelectorAll("[data-node-zone='container']");
  const soloZones = workspace.querySelectorAll("[data-node-zone='solo']");

  function setType(type) {
    workspace.querySelectorAll(".node-type-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nodeType === type);
    });
    containerZones.forEach((el) => el.classList.toggle("hidden", type !== "container"));
    soloZones.forEach((el) => el.classList.toggle("hidden", type !== "solo"));
  }

  workspace.querySelectorAll(".node-type-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setType(btn.dataset.nodeType));
  });
  setType("container");
}

export function bindSurfaceTabs(workspace) {
  workspace.querySelectorAll("[data-surface-tabs]").forEach((bar) => {
    const host = bar.closest(".ov-surface-host") || bar.parentElement;
    const panels = host.querySelectorAll("[data-surface-panel]");
    bar.querySelectorAll("button[data-surface]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.surface;
        bar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        panels.forEach((p) => p.classList.toggle("hidden", p.dataset.surfacePanel !== id));
      });
    });
  });
}

export function bindDemoActions(root) {
  const toast = document.getElementById("toast");
  const show = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(show._t);
    show._t = setTimeout(() => toast.classList.remove("show"), 1600);
  };

  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const label = btn.dataset.label || btn.textContent.trim();
      show(label || "Действие");
    });
  });
}

export function bindAll(workspace) {
  bindNodeTypeToggle(workspace);
  bindSurfaceTabs(workspace);
}

function crumbsHtml(parts) {
  return parts
    .map((part, i) => {
      const sep = i > 0 ? '<span class="ov-crumb-sep">/</span>' : "";
      const isLast = i === parts.length - 1;
      return (
        sep +
        (isLast
          ? `<span class="ov-crumb current">${part}</span>`
          : `<button type="button" class="ov-crumb">${part}</button>`)
      );
    })
    .join("");
}

export function heroBlock(node, large = false) {
  const cls = large ? "ov-hero ov-hero-lg" : "ov-hero";
  return `<div class="${cls}">
    <div class="ov-thumb" aria-hidden="true"><span class="ov-thumb-ph">🧩</span></div>
    <div class="ov-head">
      <h2 class="ov-title">${node.title}</h2>
      <span class="ov-type">${node.type}</span>
      <p class="ov-desc">${node.desc}</p>
    </div>
  </div>`;
}

export function metaCells(meta) {
  return meta
    .map(
      (m) =>
        `<div class="ov-meta-item"><span class="ov-meta-key">${m.key}</span><span class="ov-meta-val">${m.value}</span></div>`
    )
    .join("");
}

export function memoryCards(mem) {
  if (!mem) return "";
  const specs = [
    { id: "internal", icon: "📝", title: "Краткая память", sub: "_.node.content.md", data: mem.internal },
    { id: "external", icon: "📁", title: "Архив", sub: "_Content/", data: mem.external },
    { id: "tabular", icon: "📊", title: "Таблица", sub: "_.node.content.csv", data: mem.tabular }
  ];
  return specs
    .map((s) => {
      const d = s.data || {};
      const body = d.excerpt
        ? `<p class="ov-mem-excerpt">${d.excerpt}</p>`
        : d.recent
          ? `<ul class="ov-mem-recent">${d.recent.map((r) => `<li>${r}</li>`).join("")}</ul>`
          : d.cols
            ? `<p class="ov-mem-excerpt">${d.cols}</p>`
            : "";
      return `<article class="ov-mem-card">
        <div class="ov-mem-head"><span>${s.icon}</span><div><strong>${s.title}</strong><span class="ov-mem-sub">${s.sub}</span></div></div>
        <p class="ov-mem-meta">${d.label || "Не создано"}</p>${body}
        <button type="button" class="ov-btn ov-btn-ghost" data-action="open-memory" data-label="${s.title}">Открыть</button>
      </article>`;
    })
    .join("");
}

export function memorySection(mem) {
  if (!mem) return "";
  return `<section class="ov-memory"><h3 class="ov-section-title">🧠 Память</h3><div class="ov-mem-grid">${memoryCards(mem)}</div></section>`;
}

export function childCards(children) {
  if (!children.length) return "";
  return `<section class="ov-children">
    <h3 class="ov-section-title">Подразделы</h3>
    <div class="ov-children-grid">${children
      .map(
        (c) =>
          `<button type="button" class="ov-child-card${c.folder ? " is-folder" : ""}" data-action="open-child" data-label="${c.title}">
            <span class="ov-child-icon">${c.folder ? "📁" : "🧩"}</span>
            <span class="ov-child-title">${c.title}</span>
            <span class="ov-child-type">${c.type}</span>
          </button>`
      )
      .join("")}</div></section>`;
}

export function modeLinks(compact = false) {
  const groups = [
    { icon: "⚙️", title: "Настройки", items: ["Описание", "Конфигурации", "Скрипты", ".env", "TODO", "Превью"] },
    { icon: "📎", title: "Файлы", items: ["Медиа и документы"] },
    { icon: "🧭", title: "Навигация", items: ["Граф"] }
  ];
  const cls = compact ? "ov-mode-links compact" : "ov-mode-links";
  return `<div class="${cls}">${groups
    .map(
      (g) =>
        `<section class="ov-mode-group"><h3 class="ov-section-title">${g.icon} ${g.title}</h3><div class="ov-mode-btns">${g.items
          .map(
            (l) =>
              `<button type="button" class="ov-mode-btn" data-action="open-mode" data-label="${l}"><span aria-hidden="true">${g.icon}</span>${l}</button>`
          )
          .join("")}</div></section>`
    )
    .join("")}</div>`;
}

export function zoneInner(node, { memory = true, children = true, modes = true } = {}) {
  return `
    <nav class="ov-crumbs">${crumbsHtml(node.crumbs)}</nav>
    ${heroBlock(node)}
    <div class="ov-meta">${metaCells(node.meta)}</div>
    ${memory && node.memory ? memorySection(node.memory) : ""}
    ${children ? childCards(node.children) : ""}
    ${modes ? modeLinks() : ""}`;
}

export function bothZonesHtml(opts) {
  return `<div class="ov-zone" data-node-zone="container">${zoneInner(CONTAINER, opts)}</div>
    <div class="ov-zone hidden" data-node-zone="solo">${zoneInner(SOLO, { ...opts, children: false, memory: false })}</div>`;
}

export function buildReplacements() {
  return {
    "{{nodeTypeSwitch}}": NODE_TYPE_SWITCH,
    "{{bothZones}}": bothZonesHtml({}),
    "{{bothZonesNoModes}}": bothZonesHtml({ modes: false }),
    "{{heroContainer}}": heroBlock(CONTAINER),
    "{{heroSolo}}": heroBlock(SOLO),
    "{{metaContainer}}": metaCells(CONTAINER.meta),
    "{{memoryContainer}}": memoryCards(CONTAINER.memory),
    "{{memorySection}}": memorySection(CONTAINER.memory),
    "{{childrenContainer}}": childCards(CONTAINER.children),
    "{{modeLinks}}": modeLinks(),
    "{{modeLinksCompact}}": modeLinks(true),
    "{{crumbsContainer}}": crumbsHtml(CONTAINER.crumbs),
    "{{surfaceTabs}}": SURFACE_TABS,
    "{{previewPane}}": PREVIEW_PANE,
    "{{descriptionPane}}": DESCRIPTION_PANE,
    "{{modePills}}": MODE_PILLS,
    "{{zoneContainer}}": zoneInner(CONTAINER, {}),
    "{{zoneSolo}}": zoneInner(SOLO, { children: false, memory: false })
  };
}
