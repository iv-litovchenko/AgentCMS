import { FIELD_DEMOS, getCatalogWidgetHtml } from "./shared-schema.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getFieldDemo(id) {
  return FIELD_DEMOS.find((d) => d.id === id) || null;
}

/**
 * @param {HTMLElement} root
 * @param {import('./shared-schema.js').FieldDemo} demo
 */
export function mountFieldDemoPage(root, demo) {
  const statusLabel = demo.status === "now" ? "В main.js сейчас" : "По схеме (план)";
  const statusClass = demo.status === "now" ? "pill--now" : "pill--planned";

  let formHtml = demo.widgetHtml;
  if (demo.id === "15-catalog") {
    formHtml = `<div class="catalog-form">${FIELD_DEMOS.filter(
      (d) => !["14-full-node", "15-catalog"].includes(d.id)
    )
      .map(
        (d) => `
      <section class="catalog-section">
        <h3>${escapeHtml(d.num)} · ${escapeHtml(d.title)}</h3>
        ${d.widgetHtml}
      </section>`
      )
      .join("")}</div>`;
  }

  if (demo.id === "14-full-node") {
    root.innerHTML = `
      <div class="page">
        <header class="page-header">
          <h1>${escapeHtml(demo.num)} — ${escapeHtml(demo.title)}</h1>
          <p>${escapeHtml(demo.desc)}</p>
          <div class="status-pills">
            <span class="pill pill--kind">kind: mixed</span>
            <span class="pill pill--now">эталон</span>
          </div>
        </header>
        <div class="full-node-wrap">
          <article class="demo-panel">
            <h2>Frontmatter (_.node.md)</h2>
            <pre>${escapeHtml(demo.frontmatterYaml)}</pre>
          </article>
          <article class="demo-panel">
            <h2>Тело документа</h2>
            <pre># Дальнобойщики-2

Описание ноды в markdown…

## Связи
- _Content/Заметка о маршруте.md</pre>
          </article>
        </div>
        <p class="schema-ref">
          Схема: <a href="../node-props.schema.yaml">node-props.schema.yaml</a> ·
          <a href="../SCHEMA.md">SCHEMA.md</a>
        </p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="page">
      <header class="page-header">
        <h1>${escapeHtml(demo.num)} — ${escapeHtml(demo.title)}</h1>
        <p>${escapeHtml(demo.desc)}</p>
        <div class="status-pills">
          <span class="pill pill--kind">storage kind: ${escapeHtml(demo.storageKind)}</span>
          <span class="pill ${statusClass}">${escapeHtml(statusLabel)}</span>
        </div>
      </header>
      <div class="props-demo-grid">
        <article class="demo-panel">
          <h2>Схема (YAML)</h2>
          <pre>${escapeHtml(demo.schemaYaml)}</pre>
        </article>
        <article class="demo-panel">
          <h2>Frontmatter</h2>
          <pre>${escapeHtml(demo.frontmatterYaml)}</pre>
        </article>
        <article class="demo-panel demo-panel--form">
          <h2>Форма CMS</h2>
          ${formHtml}
        </article>
      </div>
      <p class="schema-ref">
        <a href="../index.html">← Все типы</a> ·
        <a href="../node-props.schema.yaml">node-props.schema.yaml</a>
      </p>
    </div>`;
}

export { FIELD_DEMOS, getCatalogWidgetHtml };
