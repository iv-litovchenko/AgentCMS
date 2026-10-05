/**
 * Подписи awn-status (awn-system/types/base/base.yml → awn.field.choice.one).
 * Ключ в frontmatter — slug; в ячейке оглавления — name с эмодзи.
 */
const AWN_STATUS_LABELS = Object.freeze({
  new: "🔵 Новая",
  draft: "🟡 Черновик",
  open: "🟢 Открыта",
  planned: "🟠 Запланирована",
  "in-progress": "🟣 В работе",
  blocked: "🚧 Заблокирована",
  "waiting-review": "⏳ Ожидает проверку",
  done: "✅ Готова",
  closed: "🔴 Закрыта",
  archived: "⚫ Архив",
  backlog: "📥 Backlog",
  none: "⚪ Без статуса"
});

function normalizeAwnStatusKey(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (Object.prototype.hasOwnProperty.call(AWN_STATUS_LABELS, raw)) return raw;
  const lower = raw.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(AWN_STATUS_LABELS, lower)) return lower;
  for (const [key, label] of Object.entries(AWN_STATUS_LABELS)) {
    if (label === raw) return key;
  }
  return lower;
}

function formatAwnStatusDisplay(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const key = normalizeAwnStatusKey(raw);
  if (key && AWN_STATUS_LABELS[key]) return AWN_STATUS_LABELS[key];
  return raw;
}

module.exports = {
  AWN_STATUS_LABELS,
  normalizeAwnStatusKey,
  formatAwnStatusDisplay
};
