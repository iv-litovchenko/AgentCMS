// Голосовой блок: fence awn-stt (legacy: теги [stt]).

const STT_FENCE_OPEN = "```awn-stt";
const STT_FENCE_CLOSE = "```";

const STT_BLOCK_OPEN = "[stt]";
const STT_BLOCK_CLOSE = "[/stt]";

const AWN_STT_FENCE_RE = new RegExp("^```awn-stt\\s*\\r?\\n[\\s\\S]*?\\r?\\n```", "im");
const LEGACY_STT_BLOCK_RE = /\[stt\][\s\S]*?\[\/stt\]/i;

function hasSttVoiceBlock(text) {
  const raw = String(text || "");
  return AWN_STT_FENCE_RE.test(raw) || LEGACY_STT_BLOCK_RE.test(raw);
}

function wrapSttVoiceBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasSttVoiceBlock(raw)) return raw;
  return `${STT_FENCE_OPEN}\n${raw}\n${STT_FENCE_CLOSE}`;
}

module.exports = {
  STT_FENCE_OPEN,
  STT_FENCE_CLOSE,
  STT_BLOCK_OPEN,
  STT_BLOCK_CLOSE,
  hasSttVoiceBlock,
  wrapSttVoiceBlock
};
