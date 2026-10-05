export const PROACTIVE_TAG_OPEN = "[proactive]";
export const PROACTIVE_TAG_CLOSE = "[/proactive]";
export const PROACTIVE_EMPTY_MARKER = "[proactive-empty]";

const PROACTIVE_BLOCK_RE = /^\[proactive\]\s*([\s\S]*?)\s*\[\/proactive\]\s*$/i;

export function unwrapProactiveMessage(text) {
  const raw = String(text || "").trim();
  const block = raw.match(PROACTIVE_BLOCK_RE);
  if (block) return block[1].trim();
  return raw
    .replace(/^\[proactive\]\s*/i, "")
    .replace(/\s*\[\/proactive\]\s*$/i, "")
    .trim();
}

export function wrapProactiveDialogBody(text) {
  const inner = unwrapProactiveMessage(text);
  if (!inner) return "";
  return `${PROACTIVE_TAG_OPEN}\n${inner}\n${PROACTIVE_TAG_CLOSE}`;
}

export function isProactiveDialogBody(text) {
  return PROACTIVE_BLOCK_RE.test(String(text || "").trim());
}

export function stripProactiveEmptyMarkers(text) {
  return String(text || "")
    .replace(/^\s*\[proactive-empty\]\s*$/gim, "")
    .replace(/\[proactive-empty\]/gi, "")
    .trim();
}

export function isProactiveEmptyReply(text) {
  const cleaned = stripProactiveEmptyMarkers(text)
    .replace(/\[tts-break\]/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return !cleaned;
}

export function normalizeProactiveAgentReply(text) {
  const raw = String(text || "").trim();
  if (!isProactiveEmptyReply(raw)) {
    return { empty: false, body: raw, raw };
  }
  return { empty: true, body: PROACTIVE_EMPTY_MARKER, raw };
}
