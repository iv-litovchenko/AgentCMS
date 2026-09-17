const PROACTIVE_BLOCK_RE = /^\[proactive\]\s*([\s\S]*?)\s*\[\/proactive\]\s*$/i;
const PROACTIVE_EMPTY_MARKER = "[proactive-empty]";

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

function stripProactiveEmptyMarkers(text) {
  return String(text || "")
    .replace(/^\s*\[proactive-empty\]\s*$/gim, "")
    .replace(/\[proactive-empty\]/gi, "")
    .trim();
}

function isProactiveEmptyReply(text) {
  const cleaned = stripProactiveEmptyMarkers(text)
    .replace(/\[tts-break\]/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return !cleaned;
}

function normalizeProactiveAgentReply(text) {
  const raw = String(text || "").trim();
  if (!isProactiveEmptyReply(raw)) {
    return { empty: false, body: raw, raw };
  }
  return { empty: true, body: PROACTIVE_EMPTY_MARKER, raw };
}

function finalizeProactiveAgentReply(rawReply, settings, finalizeDualReply) {
  const normalized = normalizeProactiveAgentReply(rawReply);
  if (!normalized.empty) {
    return { ...finalizeDualReply(rawReply, settings), body: normalized.body, rawReply: normalized.raw };
  }
  return {
    body: PROACTIVE_EMPTY_MARKER,
    rawReply: PROACTIVE_EMPTY_MARKER,
    spoken: null,
    spokenParts: [],
    proactiveEmpty: true
  };
}

module.exports = {
  PROACTIVE_EMPTY_MARKER,
  unwrapProactiveMessage,
  wrapProactiveDialogBody,
  isProactiveDialogBody,
  resolveProactiveDialogLogBody,
  stripProactiveEmptyMarkers,
  isProactiveEmptyReply,
  normalizeProactiveAgentReply,
  finalizeProactiveAgentReply
};
