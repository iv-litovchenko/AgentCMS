/** BBCode-разметка голосового блока в сообщении пользователя. */

const STT_BLOCK_OPEN = "[stt]";
const STT_BLOCK_CLOSE = "[/stt]";

const STT_BLOCK_RE = /\[stt\][\s\S]*?\[\/stt\]/i;

function hasSttVoiceBlock(text) {
  return STT_BLOCK_RE.test(String(text || ""));
}

function wrapSttVoiceBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasSttVoiceBlock(raw)) return raw;
  return `${STT_BLOCK_OPEN}\n${raw}\n${STT_BLOCK_CLOSE}`;
}

module.exports = {
  STT_BLOCK_OPEN,
  STT_BLOCK_CLOSE,
  hasSttVoiceBlock,
  wrapSttVoiceBlock
};
