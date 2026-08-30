/** Режимы голосового ввода Shell (voiceInputMode). */

export const VOICE_INPUT_MODES = ["live", "meeting", "hold", "fn_button"];

/** Откуда берётся звук (захват микрофона). */
export const STT_SOURCE_IDS = ["auto", "browser", "sidecar"];

export const STT_SOURCE_LABELS = {
  auto: "Авто",
  browser: "Микрофон браузера",
  sidecar: "Sidecar (локальная программа)"
};

/** Как распознаётся речь (движок STT). */
export const STT_ENGINE_IDS = ["auto", "browser", "google", "whisper", "elevenlabs"];

export const STT_ENGINE_LABELS = {
  auto: "Авто",
  browser: "Web Speech",
  google: "Google STT",
  whisper: "Whisper локально",
  elevenlabs: "ElevenLabs Scribe"
};

const LEGACY_MAP = {
  browser: "hold",
  sidecar: "hold",
  always: "live",
  wake_name: "live",
  fn_button: "fn_button",
  disabled: "disabled"
};

export const VOICE_MODE_LABELS = {
  live: "Живой диалог",
  meeting: "Запись встречи",
  hold: "Голосовое",
  fn_button: "Shift"
};

/** Короткая подпись в `<option>` — режим + суть одной строкой. */
export const VOICE_MODE_OPTION_LABELS = {
  live: "Живой диалог — sidecar, речь по паузе → агенту",
  meeting: "Запись встречи — 🎤 старт / стоп",
  hold: "Голосовое — удерживать 🎤",
  fn_button: "Shift — удерживать клавишу"
};

export const VOICE_MODE_HINTS = {
  live:
    "Sidecar постоянно слушает. Фраза по паузе → агенту. Ваш голос останавливает TTS. Нужен npm run shell:sidecar.",
  meeting:
    "🎤 — старт/стоп длинной записи. Аудио → awn-dialogs/records/, текст → агенту. Нужен sidecar.",
  hold:
    "Зажмите 🎤 — говорите — отпустите. Web Speech в браузере или sidecar (Google / Whisper / Scribe).",
  fn_button:
    "Удерживайте Shift. Без «Глобально» — когда Shell в фокусе (не в поле ввода). С «Глобально» + sidecar — в любом приложении."
};

export function normalizeVoiceInputMode(mode) {
  const raw = String(mode || "").trim();
  if (raw === "disabled") return "disabled";
  if (VOICE_INPUT_MODES.includes(raw)) return raw;
  return LEGACY_MAP[raw] || "hold";
}

export function isVoiceInputEnabled(mode) {
  return normalizeVoiceInputMode(mode) !== "disabled";
}

export function normalizeSttSource(value) {
  const raw = String(value || "").trim();
  if (STT_SOURCE_IDS.includes(raw)) return raw;
  return "auto";
}

export function normalizeSttEngine(value) {
  const raw = String(value || "").trim();
  if (raw === "sidecar") return "google";
  if (STT_ENGINE_IDS.includes(raw)) return raw;
  return "auto";
}

export function isSidecarSttEngine(engine) {
  const id = normalizeSttEngine(engine);
  return id === "google" || id === "whisper" || id === "elevenlabs";
}

function resolveSttSourceAuto(
  mode,
  { globalListen = false, sttEngine = "auto" } = {}
) {
  const m = normalizeVoiceInputMode(mode);
  const engine = normalizeSttEngine(sttEngine);
  if (voiceModeRequiresSidecar(m)) return "sidecar";
  if (engine === "browser") return "browser";
  if (isSidecarSttEngine(engine)) return "sidecar";
  if ((m === "hold" || m === "fn_button") && globalListen) return "sidecar";
  return "browser";
}

/** Источник звука: browser (микрофон вкладки) или sidecar (Python). */
export function resolveSttSource(
  mode,
  {
    globalListen = false,
    sidecarConnected = false,
    sttEngine = "auto",
    sttSource = "auto"
  } = {}
) {
  const source = normalizeSttSource(sttSource);
  if (source === "browser") return "browser";
  if (source === "sidecar") return "sidecar";
  void sidecarConnected;
  return resolveSttSourceAuto(mode, { globalListen, sttEngine });
}

/** @deprecated Имя историческое — это источник звука, не движок STT. */
export function resolveSttEngine(mode, context = {}) {
  return resolveSttSource(mode, context);
}

export function sttEngineIsAvailable(mode, context = {}) {
  const resolved = resolveSttSource(mode, context);
  if (resolved === "browser") return true;
  return Boolean(context.sidecarConnected);
}

/** Sidecar обязателен для режима (не считая глобальность). */
export function voiceModeRequiresSidecar(mode) {
  const m = normalizeVoiceInputMode(mode);
  return m === "live" || m === "meeting";
}

/** Микрофон через sidecar PTT / meeting / always. */
export function voiceModeUsesSidecarMic(
  mode,
  { globalListen = false, sidecarConnected = false, sttEngine = "auto", sttSource = "auto" } = {}
) {
  if (resolveSttSource(mode, { globalListen, sidecarConnected, sttEngine, sttSource }) !== "sidecar") {
    return false;
  }
  const m = normalizeVoiceInputMode(mode);
  if (voiceModeRequiresSidecar(m)) return Boolean(sidecarConnected);
  if (m === "hold" || m === "fn_button") return Boolean(sidecarConnected);
  return false;
}

/** Web Speech в браузере. */
export function voiceModeUsesBrowserStt(
  mode,
  { globalListen = false, sidecarConnected = false, sttEngine = "auto", sttSource = "auto" } = {}
) {
  if (resolveSttSource(mode, { globalListen, sidecarConnected, sttEngine, sttSource }) !== "browser") {
    return false;
  }
  const m = normalizeVoiceInputMode(mode);
  return m !== "disabled" && !voiceModeRequiresSidecar(m);
}

export function voiceModeMicAction(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "disabled") return "hint";

  const resolved = resolveSttSource(m, context);
  if (resolved === "browser") {
    if (m === "fn_button") return "hint";
    return "hold";
  }

  if (m === "meeting") return "toggle-meeting";
  if (m === "live") return "sidecar-always";
  if (m === "fn_button") return "hint";
  if (m === "hold") return "hold";
  return "hint";
}

/** Подпись кнопки 🎤 для режима. */
export function voiceModeMicLabel(mode, { meetingRecording = false } = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting") return meetingRecording ? "Стоп встречи" : "Запись встречи";
  if (m === "hold") return "Говорить";
  if (m === "live") return "Живой диалог";
  if (m === "fn_button") return "Shift";
  return "Говорить";
}
