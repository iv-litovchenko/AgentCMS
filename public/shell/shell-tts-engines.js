/** Движки озвучки ответа (TTS). */

/** Единая подпись Web Speech в селектах STT и TTS. */
export const WEB_SPEECH_ENGINE_LABEL = "Web Speech — в браузере (устройство)";

export const SHELL_TTS_ENGINES = ["browser", "edge", "piper", "elevenlabs"];

/** Формат: название — где работает (провайдер). Симметрично STT_ENGINE_LABELS. */
export const SHELL_TTS_ENGINE_LABELS = {
  browser: WEB_SPEECH_ENGINE_LABEL,
  edge: "Edge TTS — облако (Microsoft)",
  piper: "Piper — локально (сервер)",
  elevenlabs: "ElevenLabs — облако (ElevenLabs)"
};

export const SHELL_TTS_ENGINE_DESCRIPTIONS = {
  browser:
    "Озвучка в браузере через Web Speech API. Голоса — из ОС/браузера на вашем устройстве, сервер не участвует.",
  edge: "Онлайн-синтез Microsoft Edge TTS. Нужен интернет, API key не нужен.",
  piper: "Локальная нейромодель на сервере. Нужен путь к .onnx и бинарник piper.",
  elevenlabs: "Облачный синтез ElevenLabs. Нужны API key и Voice ID."
};

export const SHELL_TTS_ENGINE_SHORT_LABELS = {
  browser: "Web Speech",
  edge: "Edge TTS",
  piper: "Piper",
  elevenlabs: "ElevenLabs"
};

export function normalizeTtsEngine(value) {
  const raw = String(value || "").trim();
  if (raw === "sidecar" || raw === "say") return "browser";
  if (SHELL_TTS_ENGINES.includes(raw)) return raw;
  return "browser";
}

export function ttsEngineUsesLocalVoice(engine = "browser") {
  return normalizeTtsEngine(engine) === "browser";
}

export function ttsEngineDescription(engine = "browser") {
  return SHELL_TTS_ENGINE_DESCRIPTIONS[normalizeTtsEngine(engine)] || "";
}

export function ttsEngineLabel(engine = "browser") {
  return SHELL_TTS_ENGINE_SHORT_LABELS[normalizeTtsEngine(engine)] || String(engine || "").trim();
}

export function formatTtsEngineSelectLabel(engine, _meta = {}) {
  const id = normalizeTtsEngine(engine);
  return SHELL_TTS_ENGINE_LABELS[id] || id;
}

export function formatTtsEngineSelectTitle(engine, meta = {}) {
  const id = normalizeTtsEngine(engine);
  const description = SHELL_TTS_ENGINE_DESCRIPTIONS[id] || "";
  if (meta.available === false && meta.hint) return meta.hint;
  if (meta.hint && meta.hint !== description) return `${description} ${meta.hint}`.trim();
  return description;
}
