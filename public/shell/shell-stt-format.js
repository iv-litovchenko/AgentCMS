// Голосовой блок в сообщении: fence awn-stt (legacy: теги [stt]).

export const STT_FENCE_OPEN = "```awn-stt";
export const STT_FENCE_CLOSE = "```";

/** @deprecated Legacy BBCode — чтение сохраняется */
export const STT_BLOCK_OPEN = "[stt]";
export const STT_BLOCK_CLOSE = "[/stt]";

const AWN_STT_FENCE_RE = new RegExp("```awn-stt\\s*\\r?\\n[\\s\\S]*?\\r?\\n```", "i");
const LEGACY_STT_BLOCK_RE = /\[stt\][\s\S]*?\[\/stt\]/i;
const STT_SEGMENT_RE = new RegExp(
  "```awn-stt\\s*\\r?\\n([\\s\\S]*?)\\r?\\n```|\\[stt\\]\\s*([\\s\\S]*?)\\s*\\[/stt\\]",
  "gi"
);

export function hasSttVoiceBlock(text) {
  const raw = String(text || "");
  return AWN_STT_FENCE_RE.test(raw) || LEGACY_STT_BLOCK_RE.test(raw);
}

/** Оборачивает сырой STT-текст в ```awn-stt```, если блока ещё нет. */
export function wrapSttVoiceBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasSttVoiceBlock(raw)) return raw;
  return `${STT_FENCE_OPEN}\n${raw}\n${STT_FENCE_CLOSE}`;
}

/**
 * @returns {Array<{ kind: "text" | "stt", text: string, raw?: string }>}
 */
export function parseSttMessageSegments(text) {
  const raw = String(text || "");
  if (!raw) return [{ kind: "text", text: "" }];

  const segments = [];
  let lastIndex = 0;
  let match;
  STT_SEGMENT_RE.lastIndex = 0;
  while ((match = STT_SEGMENT_RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", text: raw.slice(lastIndex, match.index) });
    }
    const voice = String(match[1] ?? match[2] ?? "").trim();
    segments.push({ kind: "stt", text: voice, raw: match[0] });
    lastIndex = STT_SEGMENT_RE.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ kind: "text", text: raw.slice(lastIndex) });
  }
  if (!segments.length) {
    segments.push({ kind: "text", text: raw });
  }
  return segments;
}
