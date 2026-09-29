(function () {
  function init() {
    const data = window.ROADMAP_DATA;
    const container = document.getElementById("roadmap");
    const { renderRoadmap, bindHighlight, updateProgress } = window.RoadmapRenderer;

    document.getElementById("roadmap-title").textContent = data.title;
    renderRoadmap(data, container);
    bindHighlight(container);
    updateProgress(data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
