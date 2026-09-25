(function () {
  const TYPE_META = {
    повторить: { icon: "↻", label: "Повторить" },
    вопрос: { icon: "?", label: "Вопрос" },
  };

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

  function renderDashboard(grouped, filterType) {
    const container = document.getElementById("dashboard");
    if (!container) return;

    let html = "";
    for (const [type, byFile] of grouped) {
      if (filterType && type !== filterType) continue;
      const meta = TYPE_META[type] || { icon: "•", label: type };
      html += `<section class="type-group" data-type="${escapeHtml(type)}">`;
      html += `<h2><span class="type-icon type-${escapeHtml(type)}">${meta.icon}</span> [${escapeHtml(type)}]</h2>`;

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

  function updateStats(markers, filterType) {
    const filtered = filterType ? markers.filter((m) => m.type === filterType) : markers;
    const repeat = markers.filter((m) => m.type === "повторить").length;
    const question = markers.filter((m) => m.type === "вопрос").length;

    const elTotal = document.getElementById("stat-total");
    const elRepeat = document.getElementById("stat-repeat");
    const elQuestion = document.getElementById("stat-question");
    const elShown = document.getElementById("stat-shown");

    if (elTotal) elTotal.textContent = markers.length;
    if (elRepeat) elRepeat.textContent = repeat;
    if (elQuestion) elQuestion.textContent = question;
    if (elShown) elShown.textContent = filtered.length;
  }

  function bindFilters(grouped, markers) {
    let current = null;

    const buttons = document.querySelectorAll("[data-filter]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.filter === "all" ? null : btn.dataset.filter;
        current = type;
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
        renderDashboard(grouped, type);
        updateStats(markers, type);
      });
    });

    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.classList.add("is-active");
  }

  window.MarkersDashboard = { renderDashboard, updateStats, bindFilters };
})();
