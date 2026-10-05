(function initDocsSearchUi() {
  function setupDocsSearch({ searchInput, content, emptyHint, resetGlobalName }) {
    if (!searchInput || !content) return;

    function filterDocs() {
      const q = String(searchInput.value || "").trim().toLowerCase();
      let visibleEndpoints = 0;

      content.querySelectorAll(".api-docs-accordion").forEach((accordion) => {
        let groupVisible = 0;
        accordion.querySelectorAll(".api-docs-endpoint").forEach((endpoint) => {
          const hay = String(endpoint.dataset.apiDocsSearch || endpoint.textContent || "").toLowerCase();
          const groupHay = String(accordion.dataset.apiDocsGroup || "").toLowerCase();
          const match = !q || hay.includes(q) || groupHay.includes(q);
          endpoint.classList.toggle("hidden", !match);
          endpoint.hidden = !match;
          if (match) groupVisible += 1;
        });
        const showGroup = groupVisible > 0;
        accordion.classList.toggle("hidden", !showGroup);
        accordion.hidden = !showGroup;
        if (showGroup && q) accordion.open = true;
        visibleEndpoints += groupVisible;
      });

      if (emptyHint) {
        const showEmpty = Boolean(q) && visibleEndpoints === 0;
        emptyHint.classList.toggle("hidden", !showEmpty);
        emptyHint.hidden = !showEmpty;
      }
    }

    window[resetGlobalName] = () => {
      searchInput.value = "";
      filterDocs();
    };

    searchInput.addEventListener("input", filterDocs);
  }

  setupDocsSearch({
    searchInput: document.getElementById("api-docs-search"),
    content: document.getElementById("api-docs-content"),
    emptyHint: document.getElementById("api-docs-search-empty"),
    resetGlobalName: "resetApiDocsSearch"
  });

  setupDocsSearch({
    searchInput: document.getElementById("mcp-docs-search"),
    content: document.getElementById("mcp-docs-content"),
    emptyHint: document.getElementById("mcp-docs-search-empty"),
    resetGlobalName: "resetMcpDocsSearch"
  });
})();
