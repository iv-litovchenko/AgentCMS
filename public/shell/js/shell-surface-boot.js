/** Runs before modules — stores trusted surface hints from parent iframe. */
(function initShellSurfaceBoot() {
  if (window.__shellSurfaceBoot) return;
  window.__shellSurfaceBoot = true;

  window.addEventListener("message", function onShellSurfaceHost(event) {
    var data = event && event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:surface-host") return;

    var host = String(data.host || data.surface || "").trim();
    var origin = String(event.origin || "");

    if (host === "chrome-side-panel" || host === "chrome-panel") {
      if (/^chrome-extension:\/\//i.test(origin)) {
        window.shellCompanion = { isCompanion: true, surface: "side-panel" };
      }
    }

    if (host === "cms-dialog") {
      if (origin === window.location.origin || /^chrome-extension:\/\//i.test(origin)) {
        window.shellCmsEmbed = { isEmbed: true, desktop: Boolean(data.desktop) };
      }
    }
  });
})();
