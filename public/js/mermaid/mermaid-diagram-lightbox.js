import { ensureMermaidDiagramPanZoom } from "./mermaid-diagram-panzoom.js";
import { normalizeMermaidFrameTheme } from "./mermaid-diagram-theme.js";

let lightboxNode = null;

export function ensureMermaidDiagramLightbox() {
  if (lightboxNode) return lightboxNode;

  const overlay = document.createElement("div");
  overlay.className = "mermaid-diagram-lightbox hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Диаграмма Mermaid");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "mermaid-diagram-lightbox-close";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.textContent = "×";

  const stage = document.createElement("div");
  stage.className = "mermaid-diagram-lightbox-stage";

  overlay.append(closeBtn, stage);
  document.body.appendChild(overlay);

  const close = () => overlay.classList.add("hidden");
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  stage.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", (event) => {
    if (lightboxNode?.classList.contains("hidden")) return;
    if (event.key === "Escape") close();
  });

  lightboxNode = overlay;
  return overlay;
}

export function openMermaidDiagramLightbox(frame, block) {
  const svg = block?.querySelector("svg");
  if (!svg?.querySelector("g")) return false;

  const overlay = ensureMermaidDiagramLightbox();
  const stage = overlay.querySelector(".mermaid-diagram-lightbox-stage");
  if (!stage) return false;

  stage.replaceChildren();
  const clone = svg.cloneNode(true);
  clone.removeAttribute("style");
  stage.appendChild(clone);

  const frameTheme = normalizeMermaidFrameTheme(frame?.dataset?.mermaidTheme, "light");
  overlay.classList.toggle("is-dark", frameTheme === "dark");
  overlay.classList.toggle("is-original", frameTheme === "original");
  overlay.classList.remove("hidden");
  ensureMermaidDiagramPanZoom(stage, { reset: true });
  return true;
}
