/** BBCode-разметка голосового блока в сообщении пользователя. */

export const STT_BLOCK_OPEN = "[stt]";
export const STT_BLOCK_CLOSE = "[/stt]";

const STT_BLOCK_RE = /\[stt\][\s\S]*?\[\/stt\]/i;

export function hasSttVoiceBlock(text) {
  return STT_BLOCK_RE.test(String(text || ""));
}

/** Оборачивает сырой STT-текст, если блока ещё нет. */
export function wrapSttVoiceBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasSttVoiceBlock(raw)) return raw;
  return `${STT_BLOCK_OPEN}\n${raw}\n${STT_BLOCK_CLOSE}`;
}
