/** Движки озвучки ответа (TTS). */

export const SHELL_TTS_ENGINE_GROUPS = [
  {
    id: "browser",
    label: "В браузере",
    engines: ["browser"]
  },
  {
    id: "server",
    label: "На сервере",
    engines: ["piper"]
  },
  {
    id: "online",
    label: "Онлайн / API",
    engines: ["edge", "elevenlabs"]
  }
];

export const SHELL_TTS_ENGINES = SHELL_TTS_ENGINE_GROUPS.flatMap((group) => group.engines);

export const SHELL_TTS_ENGINE_LABELS = {
  browser: "Web Speech · во вкладке",
  piper: "Piper · офлайн-модель",
  edge: "Edge TTS · Microsoft",
  elevenlabs: "ElevenLabs · API key"
};

export const SHELL_TTS_ENGINE_DESCRIPTIONS = {
  browser:
    "Озвучка во вкладке через Web Speech API. Голоса — из браузера на вашем устройстве, сервер не участвует.",
  edge: "Онлайн-синтез Microsoft Edge TTS. Нужен интернет, API key не нужен.",
  piper: "Локальная нейромодель на сервере. Нужен путь к .onnx и бинарник piper.",
  elevenlabs: "Облачный синтез ElevenLabs. Нужны API key и Voice ID."
};

export const SHELL_TTS_ENGINE_SHORT_LABELS = {
  browser: "Браузер",
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
