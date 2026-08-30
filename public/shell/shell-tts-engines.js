/** Движки озвучки ответа (TTS). */

export const SHELL_TTS_ENGINE_GROUPS = [
  {
    id: "local",
    label: "На этом устройстве",
    engines: ["browser", "say", "piper"]
  },
  {
    id: "online",
    label: "Онлайн / API",
    engines: ["edge", "elevenlabs"]
  }
];

export const SHELL_TTS_ENGINES = SHELL_TTS_ENGINE_GROUPS.flatMap((group) => group.engines);

export const SHELL_TTS_ENGINE_LABELS = {
  browser: "Браузер · Web Speech",
  say: "macOS say · сервер Mac",
  piper: "Piper · офлайн-модель",
  edge: "Edge TTS · Microsoft",
  elevenlabs: "ElevenLabs · API key"
};

export const SHELL_TTS_ENGINE_DESCRIPTIONS = {
  browser:
    "Озвучка во вкладке (Web Speech). На Mac часто тот же системный голос, что и say — для сравнения выберите другой голос ниже.",
  say:
    "Озвучка на сервере через macOS say (WAV с сервера). При том же голосе звучит почти как Web Speech — попробуйте Yuri или Katya.",
  edge: "Онлайн-синтез Microsoft Edge TTS. Нужен интернет, API key не нужен.",
  piper: "Локальная нейромодель на сервере. Нужен путь к .onnx и бинарник piper.",
  elevenlabs: "Облачный синтез ElevenLabs. Нужны API key и Voice ID."
};

export const SHELL_TTS_ENGINE_SHORT_LABELS = {
  browser: "Браузер",
  say: "macOS say",
  edge: "Edge TTS",
  piper: "Piper",
  elevenlabs: "ElevenLabs"
};

export function normalizeTtsEngine(value) {
  const raw = String(value || "").trim();
  if (raw === "sidecar") return "say";
  if (SHELL_TTS_ENGINES.includes(raw)) return raw;
  return "browser";
}

export function ttsEngineUsesLocalVoice(engine = "browser") {
  const id = normalizeTtsEngine(engine);
  return id === "browser" || id === "say";
}

export function ttsEngineDescription(engine = "browser") {
  return SHELL_TTS_ENGINE_DESCRIPTIONS[normalizeTtsEngine(engine)] || "";
}

export function ttsEngineLabel(engine = "browser") {
  return SHELL_TTS_ENGINE_SHORT_LABELS[normalizeTtsEngine(engine)] || String(engine || "").trim();
}

export function formatTtsEngineStatusEmoji({ available = true, configured = true } = {}) {
  if (available === false) return "🔴";
  if (configured === false) return "⚪";
  return "🟢";
}

export function formatTtsEngineSelectLabel(engine, meta = {}) {
  const id = normalizeTtsEngine(engine);
  const label = SHELL_TTS_ENGINE_LABELS[id] || id;
  const emoji = formatTtsEngineStatusEmoji(meta);
  return `${emoji} ${label}`;
}

export function formatTtsEngineSelectTitle(engine, meta = {}) {
  const id = normalizeTtsEngine(engine);
  const description = SHELL_TTS_ENGINE_DESCRIPTIONS[id] || "";
  if (meta.available === false && meta.hint) return meta.hint;
  if (meta.hint && meta.hint !== description) return `${description} ${meta.hint}`.trim();
  return description;
}
