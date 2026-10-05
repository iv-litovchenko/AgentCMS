/** Mock + shell for Examples10 — домен «Навигация» (все доступные элементы) */

export const NODE = {
  name: "MedCenter",
  crumbs: ["Tests", "Folder-2", "Folder-3", "MedCenter"]
};

export const SUBSECTIONS = [
  { title: "Задачи", emoji: "📋", color: "#dbeafe", text: "#1e40af" },
  { title: "Документы", emoji: "📄", color: "#fef3c7", text: "#92400e" },
  { title: "Архив", emoji: "🗄️", color: "#dcfce7", text: "#166534" },
  { title: "Команда", emoji: "👥", color: "#ede9fe", text: "#5b21b6" }
];

export const INTERNAL_HTML = `
<h2>О проекте Medknizhky.Ru</h2>
<p>Платформа для медицинских центров: запись на приём, личный кабинет пациента, интеграция с ЕГИСЗ.</p>
<h3>Тон коммуникации</h3>
<ul>
  <li>Тёплый, без канцелярита</li>
  <li>Компетентный, но не сухой</li>
  <li>Обращение на «вы»</li>
</ul>
<p><strong>Ключевые метрики:</strong> конверсия записи, NPS, время ответа оператора.</p>`;

export const EXTERNAL_GROUPS = [
  { title: "Корень", items: ["README", "Roadmap", "Changelog"] },
  { title: "docs", items: ["API", "Onboarding", "FAQ"] },
  { title: "marketing", items: ["Landing copy", "Email templates"] }
];

export const TABULAR = {
  columns: ["name", "role", "status"],
  rows: [
    ["Иванова А.", "врач", "active"],
    ["Петров С.", "админ", "active"],
    ["Сидорова М.", "оператор", "vacation"],
    ["Козлов Д.", "разработчик", "active"]
  ]
};

export const MEDIA = [
  "logo.svg",
  "hero-banner.webp",
  "intro-video.mp4",
  "price-list.pdf",
  "archive-2024.zip"
];

export function mountShell(root, variantClass = "") {
  root.innerHTML = `
    <div class="shell ${variantClass}">
      <header class="shell-header">
        <h1>Agent CMS</h1>
        <span>Examples10 — навигация ноды</span>
      </header>
      <div class="shell-body">
        <aside class="sidebar">
          <div class="sidebar-label">Дерево</div>
          <div class="sidebar-item">Tests</div>
          <div class="sidebar-item active">MedCenter</div>
          <div class="sidebar-item">Assistant.Ai</div>
        </aside>
        <section class="workspace" data-nav-workspace></section>
      </div>
    </div>`;
  return root.querySelector("[data-nav-workspace]");
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
  root.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const label = el.dataset.label || el.textContent?.trim() || "элемент";
      show(`Открыть: ${label}`);
    });
  });
  root.querySelectorAll("[data-subsection-select]").forEach((sel) => {
    sel.addEventListener("change", () => show(`Фильтр: ${sel.options[sel.selectedIndex]?.text || sel.value}`));
  });
}

function subsectionCard(sub, layout = "gallery") {
  const style = `--sub-color:${sub.color};--sub-text:${sub.text}`;
  if (layout === "row") {
    return `<button type="button" class="nav-sub-row" data-action="open" data-label="${sub.title}" style="${style}">
      <span class="nav-sub-row-icon">${sub.emoji}</span>
      <span class="nav-sub-row-title">${sub.title}</span>
      <span class="nav-sub-row-chevron">›</span>
    </button>`;
  }
  if (layout === "chip") {
    return `<button type="button" class="nav-sub-chip" data-action="open" data-label="${sub.title}" style="${style}">${sub.emoji} ${sub.title}</button>`;
  }
  if (layout === "compact") {
    return `<button type="button" class="nav-sub-compact" data-action="open" data-label="${sub.title}" style="${style}">
      <span class="nav-sub-compact-cover">${sub.emoji}</span>
      <span class="nav-sub-compact-title">${sub.title}</span>
    </button>`;
  }
  return `<article class="nav-sub-card" data-action="open" data-label="${sub.title}" tabindex="0" role="button" style="${style}">
    <div class="nav-sub-cover">${sub.emoji}</div>
    <div class="nav-sub-foot"><strong>${sub.title}</strong></div>
  </article>`;
}

function externalList() {
  return EXTERNAL_GROUPS.map(
    (g) => `<section class="nav-ext-section">
      <h4 class="nav-ext-title">${g.title}</h4>
      <ul class="nav-ext-list">${g.items.map((i) => `<li><a href="#" data-action="open" data-label="${i}">${i}</a></li>`).join("")}</ul>
    </section>`
  ).join("");
}

function externalCards() {
  return `<div class="nav-ext-cards">${EXTERNAL_GROUPS.flatMap((g) =>
    g.items.map(
      (i) => `<a href="#" class="nav-ext-card" data-action="open" data-label="${i}"><span class="nav-ext-card-folder">${g.title}</span><strong>${i}</strong></a>`
    )
  ).join("")}</div>`;
}

function tabularTable() {
  const head = TABULAR.columns.map((c) => `<th>${c}</th>`).join("");
  const body = TABULAR.rows
    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="nav-tabular-wrap"><table class="nav-tabular"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function mediaList() {
  return `<ul class="nav-media-list">${MEDIA.map((m) => `<li><a href="#" data-action="open" data-label="${m}">${m}</a></li>`).join("")}</ul>`;
}

function mediaThumbs() {
  const icons = { svg: "🖼", webp: "🖼", mp4: "🎬", pdf: "📄", zip: "📦" };
  return `<div class="nav-media-grid">${MEDIA.map((m) => {
    const ext = m.split(".").pop();
    const icon = icons[ext] || "📎";
    return `<a href="#" class="nav-media-thumb" data-action="open" data-label="${m}"><span>${icon}</span><small>${m}</small></a>`;
  }).join("")}</div>`;
}

export const PATH_HEADER = `<header class="nav-path-header">
  <select class="nav-subsection-select" data-subsection-select aria-label="Подраздел навигации">
    <option value="all" selected>Все доступные элементы</option>
    <option value="tasks">Задачи</option>
    <option value="docs">Документы</option>
  </select>
  <nav class="nav-breadcrumbs" aria-label="Путь">
    <span class="nav-crumb-prefix">Навигация ноды</span>
    ${NODE.crumbs.map((c) => `<span class="nav-crumb">${c}</span>`).join('<span class="nav-crumb-sep">/</span>')}
  </nav>
</header>`;

export function subsectionsGrid(layout = "gallery") {
  const gridClass =
    layout === "chip"
      ? "nav-sub-chips"
      : layout === "row"
        ? "nav-sub-list"
        : layout === "compact"
          ? "nav-sub-compact-grid"
          : "nav-sub-grid";
  return `<section class="nav-block nav-block--subs">
    <h3 class="nav-block-title">🗂️ Подразделы</h3>
    <div class="${gridClass}">${SUBSECTIONS.map((s) => subsectionCard(s, layout)).join("")}</div>
  </section>`;
}

export const INTERNAL_PART = `<div class="nav-doc-part nav-doc-part--internal">
  <div class="nav-preview file-content-preview">${INTERNAL_HTML.trim()}</div>
</div>`;

export const EXTERNAL_PART = `<div class="nav-doc-part nav-doc-part--external"><div class="nav-ext-toc">${externalList()}</div></div>`;

export const TABULAR_PART = `<div class="nav-doc-part nav-doc-part--tabular">${tabularTable()}</div>`;

export const MEDIA_PART = `<div class="nav-doc-part nav-doc-part--media">${mediaList()}</div>`;

export const DOCUMENT_FLOW = `<article class="nav-document">${INTERNAL_PART}${EXTERNAL_PART}${TABULAR_PART}${MEDIA_PART}</article>`;

export const HUB_DEFAULT = `<div class="nav-stage">${PATH_HEADER}<div class="nav-hub">${subsectionsGrid()}${DOCUMENT_FLOW}</div></div>`;

export function buildReplacements() {
  return {
    "{{pathHeader}}": PATH_HEADER,
    "{{subsections}}": subsectionsGrid(),
    "{{subsectionsChips}}": subsectionsGrid("chip"),
    "{{subsectionsRows}}": subsectionsGrid("row"),
    "{{subsectionsCompact}}": subsectionsGrid("compact"),
    "{{document}}": DOCUMENT_FLOW,
    "{{internal}}": INTERNAL_PART,
    "{{external}}": EXTERNAL_PART,
    "{{externalCards}}": `<div class="nav-doc-part nav-doc-part--external">${externalCards()}</div>`,
    "{{tabular}}": TABULAR_PART,
    "{{media}}": MEDIA_PART,
    "{{mediaThumbs}}": `<div class="nav-doc-part nav-doc-part--media">${mediaThumbs()}</div>`,
    "{{hubDefault}}": HUB_DEFAULT
  };
}
