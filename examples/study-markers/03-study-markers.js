(function () {
  function init() {
    const { markers, grouped } = window.MARKERS_DATA;
    const { renderDashboard, updateStats, bindFilters } = window.MarkersDashboard;
    renderDashboard(grouped, null);
    updateStats(markers, null);
    bindFilters(grouped, markers);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
