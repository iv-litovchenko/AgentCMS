export const MERMAID_FRAME_THEMES = ["original", "light", "dark"];

const THEME_LABELS = {
  original: "Обычная (Mermaid default)",
  light: "Светлая тема",
  dark: "Тёмная тема"
};

const THEME_BUTTON_LABELS = {
  original: "Обычная",
  light: "Светлая",
  dark: "Тёмная"
};

const MERMAID_THEME_ICONS_HTML =
  '<svg class="mermaid-diagram-theme-icon mermaid-diagram-theme-icon--original" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">' +
  '<rect x="2.5" y="3" width="11" height="10" rx="2"/><path d="M5 6.2h6M5 8.6h4.2M5 11h2.8"/></svg>' +
  '<svg class="mermaid-diagram-theme-icon mermaid-diagram-theme-icon--moon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 1.8a5.2 5.2 0 1 0 4.7 4.7 4.1 4.1 0 0 1-4.7-4.7z"/></svg>' +
  '<svg class="mermaid-diagram-theme-icon mermaid-diagram-theme-icon--sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="3.1"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.3 3.3l1.3 1.3M11.4 11.4l1.3 1.3M3.3 12.7l1.3-1.3M11.4 4.6l1.3-1.3"/></svg>';

const MERMAID_THEME_TEXT_HTML =
  '<span class="mermaid-diagram-theme-text" aria-hidden="true">' +
  '<span class="mermaid-diagram-theme-label"></span>' +
  "</span>";

export const MERMAID_THEME_BUTTON_HTML = MERMAID_THEME_ICONS_HTML + MERMAID_THEME_TEXT_HTML;

export function normalizeMermaidFrameTheme(value, fallback = "light") {
  const theme = String(value || "").trim();
  return MERMAID_FRAME_THEMES.includes(theme) ? theme : fallback;
}

export function nextMermaidFrameTheme(current, fallback = "light") {
  const theme = normalizeMermaidFrameTheme(current, fallback);
  const index = MERMAID_FRAME_THEMES.indexOf(theme);
  return MERMAID_FRAME_THEMES[(index + 1) % MERMAID_FRAME_THEMES.length];
}

export function mermaidEngineThemeForFrame(frameTheme, fallback = "light") {
  const theme = normalizeMermaidFrameTheme(frameTheme, fallback);
  if (theme === "dark") return "dark";
  if (theme === "light") return "neutral";
  return "default";
}

export function applyMermaidFrameTheme(frame, theme, fallback = "light") {
  if (!(frame instanceof Element)) return "light";
  const resolved = normalizeMermaidFrameTheme(theme, fallback);
  frame.dataset.mermaidTheme = resolved;
  frame.classList.toggle("is-dark", resolved === "dark");
  frame.classList.toggle("is-original", resolved === "original");
  return resolved;
}

export function ensureMermaidThemeButtonMarkup(btn) {
  if (!btn || btn.querySelector(".mermaid-diagram-theme-text")) return;
  btn.insertAdjacentHTML("beforeend", MERMAID_THEME_TEXT_HTML);
}

export function syncMermaidThemeToggleUi(frame, fallback = "light") {
  const btn = frame?.querySelector(".mermaid-diagram-theme-btn");
  if (!btn) return;
  ensureMermaidThemeButtonMarkup(btn);

  const theme = normalizeMermaidFrameTheme(frame.dataset.mermaidTheme, fallback);
  btn.classList.remove(
    "is-theme-original",
    "is-theme-light",
    "is-theme-dark",
    "is-dark-active"
  );
  btn.classList.add(`is-theme-${theme}`);
  if (theme === "dark") btn.classList.add("is-dark-active");

  const labelEl = btn.querySelector(".mermaid-diagram-theme-label");
  btn.querySelector(".mermaid-diagram-theme-hint")?.remove();
  if (labelEl) labelEl.textContent = THEME_BUTTON_LABELS[theme];

  btn.title = `${THEME_LABELS[theme]}. Нажмите для смены темы`;
  btn.setAttribute("aria-label", btn.title);
  btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}
