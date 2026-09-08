/** Delimiter: voice text before, screen text after. Own line only. */

const SHELL_VOICE_END_MARKER = "{{shell:voice-end}}";
const LEGACY_VOICE_END_MARKER = "::: VOICE-END :::";
const VOICE_END_MARKER = SHELL_VOICE_END_MARKER;

const SHELL_VOICE_END_DELIM_RE = /\n\s*\{\{shell:voice-end\}\}\s*(?:\n|$)/i;
const LEGACY_VOICE_END_DELIM_RE = /\n\s*:::\s*VOICE-END\s:::\s*(?:\n|$)/i;
const LEGACY_VOICE_END_HOLD_BACK_RE =
  /(?:\n|^)\s*:::\s*(?:V(?:O(?:I(?:C(?:E(?:\-(?:E(?:N(?:D)?)?)?)?)?)?)?)?(?:\s*:::\s*)?)?$/i;

const SHELL_VOICE_END_MARKER_CHARS = "{{shell:voice-end}}";
const SHELL_VOICE_END_PARTIAL_PREFIXES = (() => {
  const out = [];
  for (let i = 1; i < SHELL_VOICE_END_MARKER_CHARS.length; i += 1) {
    out.push(SHELL_VOICE_END_MARKER_CHARS.slice(0, i));
  }
  return out.sort((a, b) => b.length - a.length);
})();

function holdBackPartialShellVoiceEndSuffix(text) {
  const raw = String(text || "");
  const match = raw.match(/([\s\S]*?)(\n[ \t]*[^\n]*)$/);
  if (!match) return raw;
  const main = match[1];
  const line = String(match[2] || "").replace(/^\n[ \t]*/, "");
  if (!line) return raw;
  const compact = line.replace(/\s/g, "");
  if (!/^[\{a-z:\-]*$/i.test(compact)) return raw;
  const lower = compact.toLowerCase();
  for (const prefix of SHELL_VOICE_END_PARTIAL_PREFIXES) {
    const p = prefix.toLowerCase();
    if (lower === p || p.startsWith(lower)) return main.replace(/\s+$/, "");
  }
  return raw;
}

function stripHtmlComments(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<!--[\s\S]*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findVoiceEndDelimiter(text) {
  const raw = String(text || "");
  let match = SHELL_VOICE_END_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length, marker: SHELL_VOICE_END_MARKER };
  }
  match = LEGACY_VOICE_END_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length, marker: LEGACY_VOICE_END_MARKER };
  }
  return null;
}

function hasVoiceEndDelimiter(text) {
  return Boolean(findVoiceEndDelimiter(text));
}

function splitVoiceEndReply(text) {
  const raw = String(text || "");
  const delim = findVoiceEndDelimiter(raw);
  if (!delim) return null;
  const spoken = raw.slice(0, delim.index).trim();
  const body = raw.slice(delim.index + delim.length).trim();
  return {
    spoken,
    body,
    spokenParts: spoken ? [spoken] : [],
    marker: delim.marker
  };
}

function holdBackPartialVoiceEndSuffix(text) {
  const raw = String(text || "");
  const shellHeld = holdBackPartialShellVoiceEndSuffix(raw);
  if (shellHeld.length < raw.length) return shellHeld;
  const match = LEGACY_VOICE_END_HOLD_BACK_RE.exec(raw);
  if (match && match.index !== undefined) return raw.slice(0, match.index);
  return raw;
}

function extractStreamingVoiceSpeech(partialText) {
  const raw = String(partialText || "");
  const split = splitVoiceEndReply(raw);
  if (split) return split.spoken;
  return holdBackPartialVoiceEndSuffix(raw).trim();
}

function extractStreamingVoiceDisplay(partialText) {
  const raw = String(partialText || "");
  const split = splitVoiceEndReply(raw);
  if (split) {
    const markerLine = `\n\n${split.marker || SHELL_VOICE_END_MARKER}\n\n`;
    if (split.spoken && split.body) return `${split.spoken}${markerLine}${split.body}`;
    return split.body || split.spoken || "";
  }
  return holdBackPartialVoiceEndSuffix(raw).trim();
}

function composeVoiceEndDisplayBody(spoken, body, { marker = SHELL_VOICE_END_MARKER } = {}) {
  const voice = String(spoken || "").trim();
  const screen = String(body || "").trim();
  const mark = String(marker || SHELL_VOICE_END_MARKER).trim();
  if (voice && screen) return `${voice}\n\n${mark}\n\n${screen}`;
  return screen || voice;
}

module.exports = {
  SHELL_VOICE_END_MARKER,
  LEGACY_VOICE_END_MARKER,
  VOICE_END_MARKER,
  stripHtmlComments,
  findVoiceEndDelimiter,
  hasVoiceEndDelimiter,
  splitVoiceEndReply,
  holdBackPartialVoiceEndSuffix,
  extractStreamingVoiceSpeech,
  extractStreamingVoiceDisplay,
  composeVoiceEndDisplayBody
};
