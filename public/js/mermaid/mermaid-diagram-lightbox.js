import {
  normalizeMermaidRenderedSvgRoot,
  refreshMermaidDiagramPanZoom,
  resetMermaidDiagramPanZoom,
  snapshotMermaidDiagramView
} from "./mermaid-diagram-panzoom.js";
import { normalizeMermaidFrameTheme } from "./mermaid-diagram-theme.js";
import {
  MERMAID_EXIT_FULLSCREEN_BUTTON_HTML,
  MERMAID_REFRESH_BUTTON_HTML,
  MERMAID_RESET_ZOOM_BUTTON_HTML
} from "./mermaid-diagram-chrome.js";

let lightboxNode = null;
/** @type {WeakMap<Element, { frame: Element, onRefresh?: () => Promise<boolean> }>} */
const lightboxSession = new WeakMap();

function closeLightbox(overlay) {
  overlay?.classList.add("hidden");
}

function syncLightboxTheme(overlay, frame) {
  const frameTheme = normalizeMermaidFrameTheme(frame?.dataset?.mermaidTheme, "light");
  overlay.classList.toggle("is-dark", frameTheme === "dark");
  overlay.classList.toggle("is-original", frameTheme === "original");
}

function mountLightboxDiagram(stage, frame) {
  const block = frame?.querySelector("pre.mermaid");
  const svg = block?.querySelector("svg");
  if (!svg?.querySelector("g")) return false;

  stage.replaceChildren();
  const pre = document.createElement("pre");
  pre.className = "mermaid";
  const clone = svg.cloneNode(true);
  clone.removeAttribute("data-mermaid-intrinsic-viewbox");
  clone.removeAttribute("style");
  pre.appendChild(clone);
  stage.appendChild(pre);
  normalizeMermaidRenderedSvgRoot(pre);
  refreshMermaidDiagramPanZoom(stage, { reset: true });
  return true;
}

function createLightboxChromeButton(className, html, title) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `${className} mermaid-diagram-chrome-btn`;
  btn.innerHTML = html;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  return btn;
}

export function ensureMermaidDiagramLightbox() {
  if (lightboxNode) return lightboxNode;

  const overlay = document.createElement("div");
  overlay.className = "mermaid-diagram-lightbox hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Диаграмма Mermaid");

  const panel = document.createElement("div");
  panel.className = "mermaid-diagram-lightbox-panel";

  const toolbar = document.createElement("div");
  toolbar.className = "mermaid-diagram-lightbox-toolbar mermaid-diagram-actions";

  const refreshBtn = createLightboxChromeButton(
    "mermaid-diagram-refresh-btn",
    MERMAID_REFRESH_BUTTON_HTML,
    "Обновить диаграмму с диска"
  );
  const resetBtn = createLightboxChromeButton(
    "mermaid-diagram-reset-zoom-btn",
    MERMAID_RESET_ZOOM_BUTTON_HTML,
    "Сбросить масштаб и позицию"
  );
  resetBtn.disabled = true;
  const exitBtn = createLightboxChromeButton(
    "mermaid-diagram-exit-fullscreen-btn",
    MERMAID_EXIT_FULLSCREEN_BUTTON_HTML,
    "Свернуть"
  );

  toolbar.append(refreshBtn, resetBtn, exitBtn);

  const stage = document.createElement("div");
  stage.className = "mermaid-diagram-lightbox-stage";

  panel.append(toolbar, stage);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  exitBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeLightbox(overlay);
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeLightbox(overlay);
  });
  panel.addEventListener("click", (event) => event.stopPropagation());
  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetMermaidDiagramPanZoom(stage);
    resetBtn.disabled = !stage.classList.contains("is-mermaid-zoomed");
  });
  refreshBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const session = lightboxSession.get(overlay);
    if (!session?.frame || refreshBtn.disabled) return;
    const viewSnapshot = snapshotMermaidDiagramView(stage);
    refreshBtn.disabled = true;
    refreshBtn.classList.add("is-busy");
    void Promise.resolve(session.onRefresh?.())
      .then(() => {
        syncLightboxTheme(overlay, session.frame);
        mountLightboxDiagram(stage, session.frame);
        if (viewSnapshot?.transformed) {
          refreshMermaidDiagramPanZoom(stage, { reset: false, viewSnapshot });
        }
        resetBtn.disabled = !stage.classList.contains("is-mermaid-zoomed");
      })
      .catch((error) => console.warn("Mermaid lightbox refresh failed:", error))
      .finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("is-busy");
      });
  });
  document.addEventListener("keydown", (event) => {
    if (overlay.classList.contains("hidden")) return;
    if (event.key === "Escape") closeLightbox(overlay);
  });

  lightboxNode = overlay;
  return overlay;
}

export function openMermaidDiagramLightbox(frame, options = {}) {
  if (!(frame instanceof Element)) return false;
  const overlay = ensureMermaidDiagramLightbox();
  const stage = overlay.querySelector(".mermaid-diagram-lightbox-stage");
  if (!stage) return false;

  lightboxSession.set(overlay, {
    frame,
    onRefresh: typeof options.onRefresh === "function" ? options.onRefresh : null
  });

  syncLightboxTheme(overlay, frame);
  if (!mountLightboxDiagram(stage, frame)) return false;

  const resetBtn = overlay.querySelector(".mermaid-diagram-reset-zoom-btn");
  if (resetBtn) resetBtn.disabled = !stage.classList.contains("is-mermaid-zoomed");

  overlay.classList.remove("hidden");
  return true;
}
