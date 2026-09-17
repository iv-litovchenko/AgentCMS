export const PROACTIVE_TAG_OPEN = "[proactive]";
export const PROACTIVE_TAG_CLOSE = "[/proactive]";

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
