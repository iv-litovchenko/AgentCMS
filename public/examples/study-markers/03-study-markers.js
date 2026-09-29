(function () {
  function init() {
    const { markers, grouped } = window.MARKERS_DATA;
    const { renderDashboard, renderStats, buildFilterButtons } = window.MarkersDashboard;

    const summary = document.getElementById("summary-line");
    if (summary) {
      const files = new Set(markers.map((m) => m.fileName)).size;
      summary.textContent = `sample-notes/ — ${files} файла, ${markers.length} пометок`;
    }

    renderStats(markers);
    buildFilterButtons(document.getElementById("filter-buttons"), grouped, markers);
    renderDashboard(grouped, null, markers);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
