/** Mock + shell for Examples8 — memory block only */

export const MEMORY = {
  internal: {
    icon: "📝",
    title: "Краткая память",
    path: "_.node.content.md",
    stat: "842 симв.",
    excerpt: "Краткие заметки о тоне и стиле…"
  },
  external: {
    icon: "📁",
    title: "Архив",
    path: "_Content/",
    stat: "12 записей",
    recent: ["Профиль.md", "FAQ.md", "Onboarding.md"]
  },
  tabular: {
    icon: "📊",
    title: "Таблица",
    path: "_.node.content.csv",
    stat: "4 строки · 3 кол.",
    cols: "name · role · status"
  }
};

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Examples8 — блок памяти</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-label">Контекст</div>
          <div class="sidebar-item active">Assistant.Ai</div>
          <div class="sidebar-item">Обзор ноды</div>
        </aside>
        <section class="workspace" data-mem-workspace></section>
      </div>
    </div>`;
  return root.querySelector("[data-mem-workspace]");
}

export function bindDemoActions(root) {
  const toast = document.getElementById("toast");
  const show = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(show._t);
    show._t = setTimeout(() => toast.classList.remove("show"), 1500);
  };
  root.querySelectorAll("[data-action='open']").forEach((el) => {
    el.addEventListener("click", () => show(`Открыть: ${el.dataset.label || el.dataset.driver || "память"}`));
  });
}

export function bindMemoryTabs(workspace) {
  workspace.querySelectorAll("[data-mem-tabs]").forEach((bar) => {
    const host = bar.closest(".mem-host") || bar.parentElement;
    const panels = host.querySelectorAll("[data-mem-panel]");
    bar.querySelectorAll("button[data-driver]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.driver;
        bar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        panels.forEach((p) => p.classList.toggle("hidden", p.dataset.memPanel !== id));
      });
    });
  });
}

export function bindSegment(workspace) {
  const bar = workspace.querySelector("[data-mem-segment]");
  if (!bar) return;
  const panels = workspace.querySelectorAll("[data-seg-panel]");
  bar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((p) => p.classList.toggle("hidden", p.dataset.segPanel !== btn.dataset.seg));
    });
  });
}

export function bindAll(workspace) {
  bindMemoryTabs(workspace);
  bindSegment(workspace);
}

const I = MEMORY.internal;
const E = MEMORY.external;
const T = MEMORY.tabular;

export const MEM_TITLE = `<h2 class="mem-block-title">🧠 Память</h2>`;

export const CARD_INTERNAL = `<article class="mem-card mem-card--internal">
  <div class="mem-card-head"><span class="mem-icon">${I.icon}</span><div><strong>${I.title}</strong><span class="mem-path">${I.path}</span></div></div>
  <p class="mem-stat">${I.stat}</p><p class="mem-excerpt">${I.excerpt}</p>
  <button type="button" class="mem-open" data-action="open" data-driver="internal" data-label="${I.title}">Открыть</button>
</article>`;

export const CARD_EXTERNAL = `<article class="mem-card mem-card--external">
  <div class="mem-card-head"><span class="mem-icon">${E.icon}</span><div><strong>${E.title}</strong><span class="mem-path">${E.path}</span></div></div>
  <p class="mem-stat">${E.stat}</p>
  <ul class="mem-recent">${E.recent.map((f) => `<li>${f}</li>`).join("")}</ul>
  <button type="button" class="mem-open" data-action="open" data-driver="external" data-label="${E.title}">Открыть</button>
</article>`;

export const CARD_TABULAR = `<article class="mem-card mem-card--tabular">
  <div class="mem-card-head"><span class="mem-icon">${T.icon}</span><div><strong>${T.title}</strong><span class="mem-path">${T.path}</span></div></div>
  <p class="mem-stat">${T.stat}</p><p class="mem-excerpt">${T.cols}</p>
  <button type="button" class="mem-open" data-action="open" data-driver="tabular" data-label="${T.title}">Открыть</button>
</article>`;

export const GRID_CLASSIC = `<section class="mem-block">${MEM_TITLE}<div class="mem-grid">${CARD_INTERNAL}${CARD_EXTERNAL}${CARD_TABULAR}</div></section>`;

export const ROW_INTERNAL = `<div class="mem-row" data-action="open" data-driver="internal" data-label="${I.title}" role="button" tabindex="0">
  <span class="mem-row-icon">${I.icon}</span>
  <div class="mem-row-body"><strong>${I.title}</strong><span class="mem-path">${I.path}</span><span class="mem-excerpt">${I.excerpt}</span></div>
  <span class="mem-row-stat">${I.stat}</span><span class="mem-chevron">›</span>
</div>`;

export const ROW_EXTERNAL = `<div class="mem-row" data-action="open" data-driver="external" data-label="${E.title}" role="button" tabindex="0">
  <span class="mem-row-icon">${E.icon}</span>
  <div class="mem-row-body"><strong>${E.title}</strong><span class="mem-path">${E.path}</span><span class="mem-recent-inline">${E.recent.slice(0, 2).join(" · ")}</span></div>
  <span class="mem-row-stat">${E.stat}</span><span class="mem-chevron">›</span>
</div>`;

export const ROW_TABULAR = `<div class="mem-row" data-action="open" data-driver="tabular" data-label="${T.title}" role="button" tabindex="0">
  <span class="mem-row-icon">${T.icon}</span>
  <div class="mem-row-body"><strong>${T.title}</strong><span class="mem-path">${T.path}</span><span class="mem-excerpt">${T.cols}</span></div>
  <span class="mem-row-stat">${T.stat}</span><span class="mem-chevron">›</span>
</div>`;

export function buildReplacements() {
  return {
    "{{memTitle}}": MEM_TITLE,
    "{{cardInternal}}": CARD_INTERNAL,
    "{{cardExternal}}": CARD_EXTERNAL,
    "{{cardTabular}}": CARD_TABULAR,
    "{{gridClassic}}": GRID_CLASSIC,
    "{{rowInternal}}": ROW_INTERNAL,
    "{{rowExternal}}": ROW_EXTERNAL,
    "{{rowTabular}}": ROW_TABULAR,
    "{{allCards}}": CARD_INTERNAL + CARD_EXTERNAL + CARD_TABULAR,
    "{{allRows}}": ROW_INTERNAL + ROW_EXTERNAL + ROW_TABULAR
  };
}
