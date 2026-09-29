export const MERMAID_SOURCE_BUTTON_HTML =
  '<svg class="mermaid-diagram-chrome-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">' +
  '<path d="M5.5 2.5h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/>' +
  '<path d="M6 5h5M6 7.5h5M6 10h3"/></svg>' +
  '<span class="mermaid-diagram-chrome-label">Исходник</span>';

export const MERMAID_RESET_ZOOM_BUTTON_HTML =
  '<svg class="mermaid-diagram-chrome-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
  '<path d="M10.5 2.5H13v2.5M5.5 13.5H3V11M13 10.5V13h-2.5M3 5.5V3h2.5"/></svg>' +
  '<span class="mermaid-diagram-chrome-label">Сбросить</span>';

const MERMAID_ACTION_BUTTON_ORDER = [
  ".mermaid-diagram-theme-btn",
  ".mermaid-diagram-source-btn",
  ".mermaid-diagram-reset-zoom-btn"
];

export function sortMermaidDiagramActionButtons(bar) {
  if (!(bar instanceof Element)) return;
  for (const selector of MERMAID_ACTION_BUTTON_ORDER) {
    const btn = bar.querySelector(selector);
    if (btn) bar.appendChild(btn);
  }
}

export function ensureMermaidDiagramActionsBar(frame) {
  let bar = frame.querySelector(".mermaid-diagram-actions");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "mermaid-diagram-actions";
    frame.appendChild(bar);
  }
  for (const selector of MERMAID_ACTION_BUTTON_ORDER) {
    const direct = frame.querySelector(`:scope > ${selector}`);
    if (direct && direct.parentElement === frame) bar.appendChild(direct);
  }
  sortMermaidDiagramActionButtons(bar);
  return bar;
}
