/** Delimiter: voice text before, screen text after. Own line only. */

export const VOICE_END_MARKER = "::: VOICE-END :::";

/** Убирает HTML-комментарии (в т.ч. незакрытые при стриме). */
export function stripHtmlComments(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<!--[\s\S]*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const VOICE_END_DELIM_RE = /\n\s*:::\s*VOICE-END\s:::\s*(?:\n|$)/i;
const VOICE_END_HOLD_BACK_RE =
  /(?:\n|^)\s*:::\s*(?:V(?:O(?:I(?:C(?:E(?:\-(?:E(?:N(?:D)?)?)?)?)?)?)?)?(?:\s*:::\s*)?)?$/i;

export function findVoiceEndDelimiter(text) {
  const raw = String(text || "");
  const match = VOICE_END_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length };
  }
  return null;
}

export function hasVoiceEndDelimiter(text) {
  return Boolean(findVoiceEndDelimiter(text));
}

export function splitVoiceEndReply(text) {
  const raw = String(text || "");
  const delim = findVoiceEndDelimiter(raw);
  if (!delim) return null;
  const spoken = raw.slice(0, delim.index).trim();
  const body = raw.slice(delim.index + delim.length).trim();
  return { spoken, body, spokenParts: spoken ? [spoken] : [] };
}

export function holdBackPartialVoiceEndSuffix(text) {
  const raw = String(text || "");
  const match = VOICE_END_HOLD_BACK_RE.exec(raw);
  if (!match || match.index === undefined) return raw;
  return raw.slice(0, match.index);
}

export function extractStreamingVoiceSpeech(partialText) {
  const raw = String(partialText || "");
  const split = splitVoiceEndReply(raw);
  if (split) return split.spoken;
  return holdBackPartialVoiceEndSuffix(raw).trim();
}

export function extractStreamingVoiceDisplay(partialText) {
  const raw = String(partialText || "");
  const split = splitVoiceEndReply(raw);
  if (split) {
    if (split.spoken && split.body) return `${split.spoken}\n\n${split.body}`;
    return split.body || split.spoken || "";
  }
  return holdBackPartialVoiceEndSuffix(raw).trim();
}

export function composeVoiceEndDisplayBody(spoken, body) {
  const voice = String(spoken || "").trim();
  const screen = String(body || "").trim();
  if (voice && screen) return `${voice}\n\n${screen}`;
  return screen || voice;
}
