(function initMcpDocsPrimitivesHelp() {
  const helpBtn = document.getElementById("mcp-docs-help-btn");
  const helpPanel = document.getElementById("mcp-docs-help-panel");
  const toolsWrap = document.getElementById("mcp-docs-tools-wrap");
  const config = document.getElementById("mcp-docs-config");
  const notes = document.getElementById("mcp-docs-notes");

  if (!helpBtn || !helpPanel || !toolsWrap) return;

  let helpOpen = false;

  function setHelpOpen(open) {
    helpOpen = Boolean(open);
    helpPanel.hidden = !helpOpen;
    helpPanel.classList.toggle("hidden", !helpOpen);
    toolsWrap.classList.toggle("hidden", helpOpen);
    toolsWrap.hidden = helpOpen;
    if (config) {
      config.classList.toggle("hidden", helpOpen || !String(config.textContent || "").trim());
    }
    if (notes) notes.classList.toggle("hidden", helpOpen);
    helpBtn.textContent = helpOpen ? "Список tools" : "Помощь";
    helpBtn.setAttribute("aria-expanded", helpOpen ? "true" : "false");
  }

  window.resetMcpDocsHelpView = () => setHelpOpen(false);

  helpBtn.addEventListener("click", () => setHelpOpen(!helpOpen));
})();
