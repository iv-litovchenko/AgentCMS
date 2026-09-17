const PROACTIVE_BLOCK_RE = /^\[proactive\]\s*([\s\S]*?)\s*\[\/proactive\]\s*$/i;

function unwrapProactiveMessage(text) {
  const raw = String(text || "").trim();
  const block = raw.match(PROACTIVE_BLOCK_RE);
  if (block) return block[1].trim();
  return raw
    .replace(/^\[proactive\]\s*/i, "")
    .replace(/\s*\[\/proactive\]\s*$/i, "")
    .trim();
}

function wrapProactiveDialogBody(text) {
  const inner = unwrapProactiveMessage(text);
  if (!inner) return "";
  return `[proactive]\n${inner}\n[/proactive]`;
}

function isProactiveDialogBody(text) {
  return PROACTIVE_BLOCK_RE.test(String(text || "").trim());
}

function resolveProactiveDialogLogBody(body, dialogBody) {
  const explicit = String(dialogBody || "").trim();
  if (explicit) return explicit;
  const raw = String(body || "").trim();
  if (!raw) return "";
  if (isProactiveDialogBody(raw)) return raw;
  return wrapProactiveDialogBody(raw);
}

module.exports = {
  unwrapProactiveMessage,
  wrapProactiveDialogBody,
  isProactiveDialogBody,
  resolveProactiveDialogLogBody
};
