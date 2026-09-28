(function initMcpDocsPrimitivesHelp() {
  const helpBtn = document.getElementById("mcp-docs-help-btn");
  const helpPanel = document.getElementById("mcp-docs-help-panel");
  const content = document.getElementById("mcp-docs-content");
  const config = document.getElementById("mcp-docs-config");
  const notes = document.getElementById("mcp-docs-notes");

  if (!helpBtn || !helpPanel || !content) return;

  let helpOpen = false;

  function setHelpOpen(open) {
    helpOpen = Boolean(open);
    helpPanel.hidden = !helpOpen;
    helpPanel.classList.toggle("hidden", !helpOpen);
    content.classList.toggle("hidden", helpOpen);
    content.hidden = helpOpen;
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
