/** Иконки активного отдыха на экране перерыва помидора (Shell + Editor). */
export const POMODORO_BREAK_ACTIVITY_EMOJIS = [
  "🚴",
  "🏊",
  "🚶",
  "🏃",
  "🤸",
  "🧘",
  "💪",
  "🏋️",
  "🧗",
  "🎾",
  "⛸️",
  "🚵"
];

const DEFAULT_INTERVAL_MS = 3000;

/**
 * @param {HTMLElement | null} node
 * @param {{ intervalMs?: number, emojis?: string[] }} [options]
 */
export function createPomodoroBreakEmojiRotator(node, options = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const emojis = options.emojis ?? POMODORO_BREAK_ACTIVITY_EMOJIS;
  let timer = null;
  let index = 0;

  function pulseSwap() {
    if (!node) return;
    node.classList.remove("is-swap");
    void node.offsetWidth;
    node.classList.add("is-swap");
  }

  function advance() {
    if (!node || emojis.length === 0) return;
    index = (index + 1) % emojis.length;
    node.textContent = emojis[index];
    pulseSwap();
  }

  return {
    start() {
      this.stop();
      if (!node || emojis.length === 0) return;
      index = 0;
      node.textContent = emojis[0];
      timer = window.setInterval(advance, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      node?.classList.remove("is-swap");
    }
  };
}
