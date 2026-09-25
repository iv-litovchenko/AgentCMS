(function () {
  const { MARKER_TYPES, metaFor, normalizeGrouped } = window.MarkerTypes;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkerList(markers) {
    return markers
      .map(
        (m) => `
      <li class="marker-item">
        <div class="marker-meta">
          <span class="section">${escapeHtml(m.section)}</span>
          <span class="line">стр. ${m.line}</span>
        </div>
        <p class="marker-text">${escapeHtml(m.text)}</p>
        <a class="marker-link" href="${escapeHtml(m.href)}">перейти к месту →</a>
      </li>`
      )
      .join("");
  }

  function renderDashboard(grouped, filterType, markers) {
    const container = document.getElementById("dashboard");
    if (!container) return;

    const ordered = normalizeGrouped(grouped, markers || []);
    let html = "";

    for (const [type, byFile] of ordered) {
      if (filterType && type !== filterType) continue;
      const meta = metaFor(type);
      html += `<section class="type-group" data-type="${escapeHtml(type)}">`;
      html += `<h2><span class="type-icon type-${meta.slug}">${meta.icon}</span> [${escapeHtml(type)}]</h2>`;

      for (const [fileName, items] of byFile) {
        html += `<div class="file-group">`;
        html += `<h3>${escapeHtml(fileName)}</h3>`;
        html += `<ul class="marker-list">${renderMarkerList(items)}</ul>`;
        html += `</div>`;
      }
      html += `</section>`;
    }

    container.innerHTML = html || `<p class="empty">Пометок не найдено.</p>`;
  }

  function renderStats(markers) {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;

    let html = `<div class="stat"><span>Всего</span><strong id="stat-total">${markers.length}</strong></div>`;
    for (const t of MARKER_TYPES) {
      const count = markers.filter((m) => m.type === t.type).length;
      html += `<div class="stat"><span>${t.icon} ${escapeHtml(t.short)}</span><strong data-stat-type="${escapeHtml(t.type)}">${count}</strong></div>`;
    }
    html += `<div class="stat"><span>Показано</span><strong id="stat-shown">${markers.length}</strong></div>`;
    grid.innerHTML = html;
  }

  function updateShownCount(markers, filterType) {
    const shown = filterType ? markers.filter((m) => m.type === filterType).length : markers.length;
    const el = document.getElementById("stat-shown");
    if (el) el.textContent = shown;
  }

  function buildFilterButtons(container, grouped, markers) {
    if (!container) return;

    const normalized = normalizeGrouped(grouped, markers);
    let html = `<button type="button" data-filter="all" class="is-active">Все</button>`;
    for (const t of MARKER_TYPES) {
      const hasItems = normalized.some(([type]) => type === t.type);
      if (!hasItems) continue;
      html += `<button type="button" data-filter="${escapeHtml(t.type)}" class="filter-${t.slug}">${t.icon} ${escapeHtml(t.short)}</button>`;
    }
    container.innerHTML = html;

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.filter === "all" ? null : btn.dataset.filter;
        container.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderDashboard(grouped, type, markers);
        updateShownCount(markers, type);
      });
    });
  }

  window.MarkersDashboard = {
    renderDashboard,
    renderStats,
    updateShownCount,
    buildFilterButtons,
  };
})();
