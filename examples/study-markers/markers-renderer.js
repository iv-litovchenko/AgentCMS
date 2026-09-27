(function () {
  const { MARKER_TYPES, metaFor, normalizeGrouped } = window.MarkerTypes;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFileRecord(record) {
    if (!record) return "";
    const parts = [];
    if (record.created) parts.push(`созд. ${record.created}`);
    if (record.updated) parts.push(`обн. ${record.updated}`);
    if (record.topic) parts.push(record.topic);
    if (!parts.length) return "";
    return `<span class="file-dates">${escapeHtml(parts.join(" · "))}</span>`;
  }

  const KNOWN_META_KEYS = new Set(["added", "updated", "review", "status", "created", "topic"]);

  function renderMarkerDates(meta) {
    if (!meta) return "";
    const chips = [];
    if (meta.added) chips.push(`<span class="date-chip date-added" title="Добавлено">+ ${escapeHtml(meta.added)}</span>`);
    if (meta.updated) chips.push(`<span class="date-chip date-updated" title="Обновлено">↻ ${escapeHtml(meta.updated)}</span>`);
    if (meta.review) chips.push(`<span class="date-chip date-review" title="Повторить">⏱ ${escapeHtml(meta.review)}</span>`);
    if (meta.status) {
      const slug = String(meta.status).toLowerCase().replace(/\s+/g, "-");
      chips.push(`<span class="date-chip date-status status-${escapeHtml(slug)}">${escapeHtml(meta.status)}</span>`);
    }
    for (const [key, value] of Object.entries(meta)) {
      if (KNOWN_META_KEYS.has(key)) continue;
      chips.push(`<span class="date-chip date-extra" title="${escapeHtml(key)}">${escapeHtml(key)}: ${escapeHtml(value)}</span>`);
    }
    if (!chips.length) return "";
    return `<div class="marker-dates">${chips.join("")}</div>`;
  }

  function renderMarkerList(markers) {
    return markers
      .map(
        (m) => {
        const multiline = m.text.includes("\n");
        const sourceBadge =
          m.source === "block"
            ? `<span class="marker-source">awn-marker-${escapeHtml(m.blockSlug || "…")}</span>`
            : "";
        return `
      <li class="marker-item${m.source === "block" ? " is-block" : ""}">
        <div class="marker-meta">
          <span class="section">${escapeHtml(m.section)}</span>
          <span class="line">стр. ${m.line}${sourceBadge}</span>
        </div>
        ${renderMarkerDates(m.meta)}
        <p class="marker-text${multiline ? " is-multiline" : ""}">${escapeHtml(m.text)}</p>
        <a class="marker-link" href="${escapeHtml(m.href)}">перейти к месту →</a>
      </li>`;
      }
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
        const record = items[0]?.fileRecord;
        html += `<div class="file-group">`;
        html += `<h3>${escapeHtml(fileName)}${renderFileRecord(record)}</h3>`;
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

    let html = `<button type="button" data-filter="all" class="is-active">Все</button>`;
    for (const t of MARKER_TYPES) {
      const count = markers.filter((m) => m.type === t.type).length;
      const emptyClass = count === 0 ? " is-empty" : "";
      html += `<button type="button" data-filter="${escapeHtml(t.type)}" class="filter-${t.slug}${emptyClass}" title="${count ? `${count} пометок` : "Пока нет пометок"}">${t.icon} ${escapeHtml(t.short)}</button>`;
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
