/** Delimiter: voice text before, screen text after. Own line only. */

export const TTS_BREAK_MARKER = "[tts-break]";
export const LEGACY_SHELL_VOICE_END_MARKER = "{{shell:voice-end}}";
export const LEGACY_VOICE_END_MARKER = "::: VOICE-END :::";
/** Primary marker for prompts and new replies. */
export const SHELL_VOICE_END_MARKER = TTS_BREAK_MARKER;
export const VOICE_END_MARKER = TTS_BREAK_MARKER;

const TTS_BREAK_DELIM_RE = /\n\s*\[tts-break\]\s*(?:\n|$)/i;
const LEGACY_SHELL_VOICE_END_DELIM_RE = /\n\s*\{\{shell:voice-end\}\}\s*(?:\n|$)/i;
const LEGACY_VOICE_END_DELIM_RE = /\n\s*:::\s*VOICE-END\s:::\s*(?:\n|$)/i;
const LEGACY_VOICE_END_HOLD_BACK_RE =
  /(?:\n|^)\s*:::\s*(?:V(?:O(?:I(?:C(?:E(?:\-(?:E(?:N(?:D)?)?)?)?)?)?)?)?(?:\s*:::\s*)?)?$/i;

const TTS_BREAK_MARKER_CHARS = "[tts-break]";
const TTS_BREAK_PARTIAL_PREFIXES = (() => {
  const out = [];
  for (let i = 1; i < TTS_BREAK_MARKER_CHARS.length; i += 1) {
    out.push(TTS_BREAK_MARKER_CHARS.slice(0, i));
  }
  return out.sort((a, b) => b.length - a.length);
})();

const LEGACY_SHELL_VOICE_END_MARKER_CHARS = "{{shell:voice-end}}";
const LEGACY_SHELL_VOICE_END_PARTIAL_PREFIXES = (() => {
  const out = [];
  for (let i = 1; i < LEGACY_SHELL_VOICE_END_MARKER_CHARS.length; i += 1) {
    out.push(LEGACY_SHELL_VOICE_END_MARKER_CHARS.slice(0, i));
  }
  return out.sort((a, b) => b.length - a.length);
})();

function holdBackPartialMarkerSuffix(text, { compactRe, prefixes }) {
  const raw = String(text || "");
  const match = raw.match(/([\s\S]*?)(\n[ \t]*[^\n]*)$/);
  if (!match) return raw;
  const main = match[1];
  const line = String(match[2] || "").replace(/^\n[ \t]*/, "");
  if (!line) return raw;
  const compact = line.replace(/\s/g, "");
  if (!compactRe.test(compact)) return raw;
  const lower = compact.toLowerCase();
  for (const prefix of prefixes) {
    const p = prefix.toLowerCase();
    if (lower === p || p.startsWith(lower)) return main.replace(/\s+$/, "");
  }
  return raw;
}

function holdBackPartialTtsBreakSuffix(text) {
  return holdBackPartialMarkerSuffix(text, {
    compactRe: /^[[\]a-z-]*$/i,
    prefixes: TTS_BREAK_PARTIAL_PREFIXES
  });
}

function holdBackPartialLegacyShellVoiceEndSuffix(text) {
  return holdBackPartialMarkerSuffix(text, {
    compactRe: /^[\{a-z:\-]*$/i,
    prefixes: LEGACY_SHELL_VOICE_END_PARTIAL_PREFIXES
  });
}

/** Убирает HTML-комментарии (в т.ч. незакрытые при стриме). */
export function stripHtmlComments(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<!--[\s\S]*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function findVoiceEndDelimiter(text) {
  const raw = String(text || "");
  let match = TTS_BREAK_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length, marker: TTS_BREAK_MARKER };
  }
  match = LEGACY_SHELL_VOICE_END_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length, marker: LEGACY_SHELL_VOICE_END_MARKER };
  }
  match = LEGACY_VOICE_END_DELIM_RE.exec(raw);
  if (match && match.index !== undefined) {
    return { index: match.index, length: match[0].length, marker: LEGACY_VOICE_END_MARKER };
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
  return {
    spoken,
    body,
    spokenParts: spoken ? [spoken] : [],
    marker: delim.marker
  };
}

export function holdBackPartialVoiceEndSuffix(text) {
  const raw = String(text || "");
  const ttsHeld = holdBackPartialTtsBreakSuffix(raw);
  if (ttsHeld.length < raw.length) return ttsHeld;
  const shellHeld = holdBackPartialLegacyShellVoiceEndSuffix(raw);
  if (shellHeld.length < raw.length) return shellHeld;
  const match = LEGACY_VOICE_END_HOLD_BACK_RE.exec(raw);
  if (match && match.index !== undefined) return raw.slice(0, match.index);
  return raw;
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
    const markerLine = `\n\n${split.marker || TTS_BREAK_MARKER}\n\n`;
    if (split.spoken && split.body) return `${split.spoken}${markerLine}${split.body}`;
    return split.body || split.spoken || "";
  }
  return holdBackPartialVoiceEndSuffix(raw).trim();
}

export function composeVoiceEndDisplayBody(spoken, body, { marker = TTS_BREAK_MARKER } = {}) {
  const voice = String(spoken || "").trim();
  const screen = String(body || "").trim();
  const mark = String(marker || TTS_BREAK_MARKER).trim();
  if (voice && screen) return `${voice}\n\n${mark}\n\n${screen}`;
  return screen || voice;
}

export function createVoiceEndMarkerElement(marker = TTS_BREAK_MARKER) {
  const wrap = document.createElement("div");
  wrap.className = "shell-marker-divider";
  wrap.setAttribute("role", "separator");
  wrap.setAttribute("aria-label", "Разделитель голоса и экрана");
  const code = document.createElement("code");
  code.className = "shell-compose-templates-marker shell-marker-divider-label";
  code.textContent = marker || TTS_BREAK_MARKER;
  wrap.appendChild(code);
  return wrap;
}
