(function initFileHubBandPanel(global) {
  "use strict";

  const COLLAPSED_STORAGE_KEY = "agentcms.fileHubBand.collapsed.v1";
  let bandNode = null;
  let toggleBtn = null;

  function isFileHubBandCollapsed() {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return true;
    }
  }

  function syncFileHubBandCollapsed(collapsed = isFileHubBandCollapsed()) {
    if (!bandNode) return;
    bandNode.classList.toggle("is-collapsed", collapsed);
    toggleBtn?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggleBtn?.setAttribute(
      "title",
      collapsed ? "Развернуть файлообменник" : "Свернуть файлообменник"
    );
  }

  function setFileHubBandCollapsed(collapsed) {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
    syncFileHubBandCollapsed(collapsed);
  }

  function resolveFileHubBandMountParent() {
    const app = document.getElementById("app-root");
    if (!app || !bandNode) return null;
    if (app.classList.contains("not-found-view")) return null;
    if (app.classList.contains("app-landing-view")) {
      return document.getElementById("app-landing-stack");
    }
    if (app.classList.contains("home-view")) {
      return document.getElementById("agent-canvas-stack");
    }
    return document.getElementById("workspace-main-stack");
  }

  function syncFileHubBandMount() {
    if (!bandNode) return;
    const parent = resolveFileHubBandMountParent();
    if (!parent) {
      bandNode.hidden = true;
      return;
    }
    bandNode.hidden = false;
    const contextBand = document.getElementById("context-buffer-band");
    if (contextBand?.parentElement === parent) {
      if (contextBand.nextElementSibling !== bandNode) {
        parent.insertBefore(bandNode, contextBand.nextSibling);
      }
    } else if (bandNode.parentElement !== parent) {
      parent.appendChild(bandNode);
    }
  }

  function init() {
    bandNode = document.getElementById("file-hub-band");
    toggleBtn = document.getElementById("file-hub-toggle-btn");
    syncFileHubBandCollapsed();
    syncFileHubBandMount();

    toggleBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      setFileHubBandCollapsed(!isFileHubBandCollapsed());
    });
  }

  global.FileHubBandPanel = {
    init,
    syncMount: syncFileHubBandMount
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
