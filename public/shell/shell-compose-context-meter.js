/** Compact context-size meter for compose textarea (Agent CMS-style). */

const COMPOSE_CONTEXT_WINDOW_STORAGE_KEY = "yamlcms.composeContextMeterWindowTokens";
const COMPOSE_CONTEXT_WINDOW_DEFAULT = 5000;
const COMPOSE_CONTEXT_WINDOW_PRESETS = [
  { tokens: 1000, label: "1K" },
  { tokens: 5000, label: "5K" },
  { tokens: 10000, label: "10K" },
  { tokens: 32000, label: "32K" }
];
const COMPOSE_CONTEXT_SOFT_RATIO = 0.24;
const COMPOSE_CONTEXT_WARN_RATIO = 0.5;

function countWords(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function getComposeContextWindowTokens() {
  try {
    const raw = localStorage.getItem(COMPOSE_CONTEXT_WINDOW_STORAGE_KEY);
    const parsed = Number(raw);
    if (COMPOSE_CONTEXT_WINDOW_PRESETS.some((preset) => preset.tokens === parsed)) {
      return parsed;
    }
  } catch (_) {
    /* ignore */
  }
  return COMPOSE_CONTEXT_WINDOW_DEFAULT;
}

function setComposeContextWindowTokens(tokens) {
  try {
    localStorage.setItem(COMPOSE_CONTEXT_WINDOW_STORAGE_KEY, String(tokens));
  } catch (_) {
    /* ignore */
  }
}

function analyzeComposeContextStats(text, windowTokens = getComposeContextWindowTokens()) {
  const raw = String(text ?? "");
  const trimmed = raw.trim();
  const words = countWords(trimmed);
  const chars = trimmed.length;
  const bytes = new TextEncoder().encode(raw).length;
  const tokensEstimate = Math.max(0, Math.ceil(chars / 4));
  const windowSize = Math.max(1, Number(windowTokens) || COMPOSE_CONTEXT_WINDOW_DEFAULT);
  const fillRatio = Math.min(1, tokensEstimate / windowSize);

  let level = "comfort";
  if (tokensEstimate > windowSize) level = "overflow";
  else if (fillRatio >= COMPOSE_CONTEXT_WARN_RATIO) level = "split";
  else if (fillRatio >= COMPOSE_CONTEXT_SOFT_RATIO) level = "warn";

  return {
    words,
    chars,
    bytes,
    tokensEstimate,
    fillRatio,
    level,
    windowTokens: windowSize,
    overLimit: tokensEstimate > windowSize
  };
}

function formatByteSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value.toLocaleString("ru-RU")} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatTokenEstimate(tokens) {
  const value = Number(tokens) || 0;
  if (value >= 1000) return `~${(value / 1000).toFixed(1)}k ток.`;
  return `~${value.toLocaleString("ru-RU")} ток.`;
}

function formatContextStatsInline(stats) {
  const pct = Math.round((stats.fillRatio || 0) * 100);
  return `(${stats.words.toLocaleString("ru-RU")} сл · ${formatByteSize(stats.bytes)} · ${formatTokenEstimate(stats.tokensEstimate)} · ${pct}%)`;
}

function contextLevelLabel(level) {
  switch (level) {
    case "overflow":
      return "Лимит";
    case "split":
      return "Разбить";
    case "warn":
      return "Растёт";
    default:
      return "Ок";
  }
}

export function getComposeContextLimitState(text, windowTokens = getComposeContextWindowTokens()) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    const windowSize = Math.max(1, Number(windowTokens) || COMPOSE_CONTEXT_WINDOW_DEFAULT);
    return {
      words: 0,
      chars: 0,
      bytes: 0,
      tokensEstimate: 0,
      fillRatio: 0,
      level: "comfort",
      windowTokens: windowSize,
      overLimit: false
    };
  }
  return analyzeComposeContextStats(trimmed, windowTokens);
}

export function isComposeMessageOverLimit(text) {
  return getComposeContextLimitState(text).overLimit;
}

function createComposeContextWindowSelect(selectedTokens, onChange) {
  const select = document.createElement("select");
  select.className = "shell-compose-context-meter-window-select";
  select.title = "Ориентир размера одного сообщения";
  select.setAttribute("aria-label", "Ориентир размера сообщения");
  for (const preset of COMPOSE_CONTEXT_WINDOW_PRESETS) {
    const option = document.createElement("option");
    option.value = String(preset.tokens);
    option.textContent = preset.label;
    option.selected = preset.tokens === selectedTokens;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    const next = Number(select.value);
    if (!Number.isFinite(next)) return;
    setComposeContextWindowTokens(next);
    onChange(next);
  });
  select.addEventListener("click", (event) => event.stopPropagation());
  return select;
}

function renderComposeContextMeter(mountEl, text, draftStatusEl = null, windowTokens = getComposeContextWindowTokens()) {
  if (!mountEl) return;

  const stats = analyzeComposeContextStats(text, windowTokens);
  mountEl.classList.remove("hidden");
  mountEl.setAttribute("aria-hidden", "false");
  mountEl.className = `shell-compose-context-meter shell-compose-context-meter--${stats.level}${
    stats.overLimit ? " shell-compose-context-meter--blocked" : ""
  }`;
  mountEl.setAttribute(
    "aria-label",
    `Контекст сообщения ${formatContextStatsInline(stats)} · ${contextLevelLabel(stats.level)}`
  );

  const head = document.createElement("div");
  head.className = "shell-compose-context-meter-head";

  const label = document.createElement("span");
  label.className = "shell-compose-context-meter-label";

  const labelTitle = document.createElement("span");
  labelTitle.className = "shell-compose-context-meter-label-title";
  labelTitle.textContent = "Контекст ";

  const labelStats = document.createElement("span");
  labelStats.className = "shell-compose-context-meter-label-stats";
  labelStats.textContent = formatContextStatsInline(stats);

  label.append(labelTitle, labelStats);

  const status = document.createElement("span");
  status.className = "shell-compose-context-meter-status";
  status.textContent = contextLevelLabel(stats.level);

  const badges = document.createElement("div");
  badges.className = "shell-compose-context-meter-badges";
  badges.append(
    createComposeContextWindowSelect(stats.windowTokens, (nextWindow) => {
      renderComposeContextMeter(mountEl, text, draftStatusEl, nextWindow);
    }),
    status
  );
  if (draftStatusEl) badges.append(draftStatusEl);

  head.append(label, badges);

  const track = document.createElement("div");
  track.className = "shell-compose-context-meter-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(stats.windowTokens));
  track.setAttribute("aria-valuenow", String(stats.tokensEstimate));
  track.title = stats.overLimit
    ? `Превышен лимит ${stats.windowTokens.toLocaleString("ru-RU")} ток. — сократите сообщение`
    : `${formatTokenEstimate(stats.tokensEstimate)} от ориентира ${stats.windowTokens.toLocaleString("ru-RU")} ток.`;

  const fill = document.createElement("div");
  fill.className = "shell-compose-context-meter-fill";
  const fillPct = Math.round(stats.fillRatio * 100);
  fill.style.width = fillPct > 0 ? `${Math.max(2, fillPct)}%` : "0%";
  track.appendChild(fill);

  mountEl.replaceChildren(head, track);

  const textareaRef = mountEl.__composeTextareaRef;
  if (textareaRef) syncComposeTextareaLimitState(textareaRef, stats);
}

function syncComposeTextareaLimitState(textarea, stats) {
  if (!textarea) return;
  const overLimit = Boolean(stats?.overLimit);
  textarea.classList.toggle("is-compose-over-limit", overLimit);
  textarea.setAttribute("aria-invalid", overLimit ? "true" : "false");
  const wrap = textarea.closest(".shell-compose-input-wrap");
  wrap?.classList.toggle("is-compose-over-limit", overLimit);
  if (overLimit) {
    textarea.title = `Превышен лимит ${stats.windowTokens.toLocaleString("ru-RU")} ток. — сократите текст`;
  } else if (String(textarea.getAttribute("title") || "").includes("Превышен лимит")) {
    textarea.removeAttribute("title");
  }
}

export function initShellComposeContextMeter({ textarea, mountEl, draftStatusEl, onStatsChange } = {}) {
  if (!textarea || !mountEl) return {};
  mountEl.__composeTextareaRef = textarea;

  const update = () => {
    const stats = getComposeContextLimitState(textarea.value);
    renderComposeContextMeter(mountEl, textarea.value, draftStatusEl || null);
    onStatsChange?.(stats);
  };

  textarea.addEventListener("input", update);
  textarea.addEventListener("paste", () => {
    window.requestAnimationFrame(update);
  });

  update();

  return {
    update,
    clear: () => renderComposeContextMeter(mountEl, "", draftStatusEl || null)
  };
}
