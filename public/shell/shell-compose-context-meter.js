/** Compact context-size meter for compose textarea (Agent CMS-style). */

const COMPOSE_CONTEXT_SOFT_WORDS = 1200;
const COMPOSE_CONTEXT_WARN_WORDS = 2500;
const COMPOSE_CONTEXT_MAX_WORDS = 5000;

function countWords(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function analyzeComposeContextStats(text) {
  const raw = String(text ?? "");
  const trimmed = raw.trim();
  const words = countWords(trimmed);
  const chars = trimmed.length;
  const bytes = new TextEncoder().encode(raw).length;
  const tokensEstimate = Math.max(0, Math.ceil(chars / 4));
  const fillRatio = COMPOSE_CONTEXT_MAX_WORDS
    ? Math.min(1, words / COMPOSE_CONTEXT_MAX_WORDS)
    : 0;

  let level = "comfort";
  if (words >= COMPOSE_CONTEXT_MAX_WORDS * 0.9) level = "overflow";
  else if (words >= COMPOSE_CONTEXT_WARN_WORDS) level = "split";
  else if (words >= COMPOSE_CONTEXT_SOFT_WORDS) level = "warn";

  return { words, chars, bytes, tokensEstimate, fillRatio, level };
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

function contextLevelLabel(level) {
  switch (level) {
    case "overflow":
      return "Много";
    case "split":
      return "Разбить";
    case "warn":
      return "Растёт";
    default:
      return "Ок";
  }
}

function renderComposeContextMeter(mountEl, text) {
  if (!mountEl) return;

  const stats = analyzeComposeContextStats(text);
  if (!stats.words && !stats.chars) {
    mountEl.classList.add("hidden");
    mountEl.replaceChildren();
    mountEl.setAttribute("aria-hidden", "true");
    return;
  }

  mountEl.classList.remove("hidden");
  mountEl.setAttribute("aria-hidden", "false");
  mountEl.className = `shell-compose-context-meter shell-compose-context-meter--${stats.level}`;
  mountEl.setAttribute("aria-label", "Размер контекста сообщения");

  const head = document.createElement("div");
  head.className = "shell-compose-context-meter-head";

  const label = document.createElement("span");
  label.className = "shell-compose-context-meter-label";
  label.textContent = "Контекст";

  const status = document.createElement("span");
  status.className = "shell-compose-context-meter-status";
  status.textContent = contextLevelLabel(stats.level);

  head.append(label, status);

  const track = document.createElement("div");
  track.className = "shell-compose-context-meter-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(COMPOSE_CONTEXT_MAX_WORDS));
  track.setAttribute("aria-valuenow", String(stats.words));
  track.title = `${stats.words.toLocaleString("ru-RU")} слов · ${Math.round(stats.fillRatio * 100)}%`;

  const fill = document.createElement("div");
  fill.className = "shell-compose-context-meter-fill";
  fill.style.width = `${Math.max(3, Math.round(stats.fillRatio * 100))}%`;
  track.appendChild(fill);

  const meta = document.createElement("div");
  meta.className = "shell-compose-context-meter-meta";
  meta.textContent = `${stats.words.toLocaleString("ru-RU")} сл · ${formatByteSize(stats.bytes)} · ${formatTokenEstimate(stats.tokensEstimate)}`;

  mountEl.replaceChildren(head, track, meta);
}

export function initShellComposeContextMeter({ textarea, mountEl } = {}) {
  if (!textarea || !mountEl) return {};

  const update = () => {
    renderComposeContextMeter(mountEl, textarea.value);
  };

  textarea.addEventListener("input", update);
  textarea.addEventListener("paste", () => {
    window.requestAnimationFrame(update);
  });

  update();

  return { update, clear: () => renderComposeContextMeter(mountEl, "") };
}
