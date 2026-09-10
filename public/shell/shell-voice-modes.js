/** Режимы голосового ввода Shell (voiceInputMode). */

export const VOICE_INPUT_MODES = ["live", "meeting", "hold", "fn_button"];

/** Что слушать (захват аудио). */
export const STT_CAPTURE_IDS = ["microphone", "system", "mix"];

export const STT_CAPTURE_LABELS = {
  microphone: "Микрофон",
  system: "Системный звук",
  mix: "Микрофон + система"
};

export const STT_CAPTURE_SHORT_LABELS = {
  microphone: "🎤",
  system: "🖥",
  mix: "🔀"
};

export const STT_CAPTURE_HINTS = {
  microphone: "Обычный физический микрофон",
  system: "То, что происходит на компьютере (колонки / приложения)",
  mix: "Смешать два потока программно — для продвинутых сценариев"
};

/** Движок распознавания речи (STT driver). */
export const STT_ENGINE_IDS = ["browser", "google", "whisper", "elevenlabs"];

export const STT_ENGINE_LABELS = {
  browser: "Web Speech",
  google: "Google STT",
  whisper: "Whisper локально",
  elevenlabs: "ElevenLabs Scribe"
};

export const STT_ENGINE_SHORT_LABELS = {
  browser: "Web",
  google: "Google",
  whisper: "Whisper",
  elevenlabs: "Scribe"
};

/** Язык STT: автоопределение (Whisper / ElevenLabs Scribe). */
export const STT_LANG_AUTO = "auto";

export function sttLangSupportsAuto(engine) {
  const id = normalizeSttEngine(engine);
  return id === "whisper" || id === "elevenlabs";
}

export function normalizeSttLang(value, { engine = "browser", fallback = "ru-RU" } = {}) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === STT_LANG_AUTO) {
    return sttLangSupportsAuto(engine) ? STT_LANG_AUTO : fallback;
  }
  return raw;
}

/** Web Speech / Google не умеют «авто» — подставляем локаль браузера или ru-RU. */
export function resolveBrowserRecognitionLang(sttLang, { fallback = "ru-RU" } = {}) {
  const raw = String(sttLang || "").trim();
  if (raw.toLowerCase() === STT_LANG_AUTO) {
    const nav = String(typeof navigator !== "undefined" ? navigator.language : "" || "").trim();
    if (nav && nav.includes("-")) return nav;
    if (nav) return `${nav}-${nav.toUpperCase()}`;
    return fallback;
  }
  return raw || fallback;
}

/** @deprecated Старый transport-слой; в UI не показываем. */
export const STT_SOURCE_IDS = ["browser", "sidecar"];

export const STT_SOURCE_LABELS = {
  browser: "Браузер",
  sidecar: "Локальный агент"
};

const LEGACY_MODE_MAP = {
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

export const VOICE_MODE_COMPACT_LABELS = {
  live: "Живой",
  meeting: "Встреча",
  hold: "Голос",
  fn_button: "Shift"
};

/** Порядок и подписи режима 🎤 в compose. */
export const COMPOSE_VOICE_MODE_ORDER = ["live", "meeting", "hold", "fn_button"];

/** Живой диалог — в списке, но пока disabled. */
export const LIVE_VOICE_MODE_ENABLED = false;

export function isComposeVoiceModeDisabled(mode) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "live" && !LIVE_VOICE_MODE_ENABLED) return true;
  return false;
}

export function composeVoiceModeSelectLabel(mode) {
  const m = normalizeVoiceInputMode(mode);
  const base = COMPOSE_VOICE_MODE_LABELS[m] || VOICE_MODE_LABELS[m] || m;
  if (isComposeVoiceModeDisabled(m)) return `${base} (скоро)`;
  return base;
}

export const COMPOSE_VOICE_MODE_LABELS = {
  live: "Живой диалог",
  meeting: "Встреча (запись)",
  hold: "Голосовое",
  fn_button: "По кнопке Shift"
};

export const VOICE_MODE_OPTION_LABELS = {
  live: "Живой диалог — речь по паузе → агенту",
  meeting: "Запись встречи — 🎤 старт / стоп",
  hold: "Голосовое — удерживать 🎤",
  fn_button: "Shift — удерживать клавишу"
};

export const VOICE_MODE_HINTS = {
  live: "Постоянно слушает. Фраза по паузе → агенту. Ваш голос останавливает TTS.",
  meeting: "🎤 — старт/стоп длинной записи. Аудио и текст сохраняются в awn-dialogs/audio/stt/.",
  hold: "Зажмите 🎤 — говорите — отпустите. Web Speech в браузере или локальный движок.",
  fn_button: "Удерживайте Shift. С «Глобально» — когда Shell не в фокусе."
};

export function normalizeVoiceInputMode(mode) {
  const raw = String(mode || "").trim();
  if (raw === "disabled") return "disabled";
  if (VOICE_INPUT_MODES.includes(raw)) return raw;
  return LEGACY_MODE_MAP[raw] || "hold";
}

export function isVoiceInputEnabled(mode) {
  return normalizeVoiceInputMode(mode) !== "disabled";
}

export function normalizeSttCapture(value, { legacySource = "" } = {}) {
  const raw = String(value || "").trim();
  if (STT_CAPTURE_IDS.includes(raw)) return raw;
  const legacy = String(legacySource || raw).trim();
  if (legacy === "browser" || legacy === "sidecar" || legacy === "auto") return "microphone";
  return "microphone";
}

/** @deprecated Используйте normalizeSttCapture. */
export function normalizeSttSource(value) {
  const raw = String(value || "").trim();
  if (raw === "browser") return "browser";
  if (raw === "sidecar") return "sidecar";
  return "browser";
}

export function normalizeSttEngine(value, { legacySource = "" } = {}) {
  const raw = String(value || "").trim();
  if (raw === "sidecar") return "google";
  if (raw === "auto") {
    const legacy = String(legacySource || "").trim();
    return legacy === "sidecar" ? "google" : "browser";
  }
  if (STT_ENGINE_IDS.includes(raw)) return raw;
  return "browser";
}

export function isLocalSttEngine(engine) {
  const id = normalizeSttEngine(engine);
  return id === "google" || id === "whisper" || id === "elevenlabs";
}

/** @deprecated alias */
export function isSidecarSttEngine(engine) {
  return isLocalSttEngine(engine);
}

export function sttCaptureRequiresLocalAgent(capture) {
  const id = normalizeSttCapture(capture);
  return id === "system" || id === "mix";
}

export function sttEngineRequiresLocalAgent(engine, capture = "microphone") {
  if (sttCaptureRequiresLocalAgent(capture)) return true;
  return isLocalSttEngine(engine);
}

/** browser = Web Speech во вкладке; sidecar = локальный голосовой агент (Python). */
export function resolveSttSource(
  mode,
  {
    globalListen = false,
    sidecarConnected = false,
    sttEngine = "browser",
    sttCapture = "microphone",
    sttSource = null
  } = {}
) {
  void sidecarConnected;
  const capture = normalizeSttCapture(sttCapture, {
    legacySource: sttSource != null ? String(sttSource) : ""
  });
  const engine = normalizeSttEngine(sttEngine);
  const m = normalizeVoiceInputMode(mode);

  if (m === "live") return "sidecar";
  if (m === "meeting" && engine !== "browser") return "sidecar";
  if (sttCaptureRequiresLocalAgent(capture)) return "sidecar";
  if (isLocalSttEngine(engine)) return "sidecar";
  if ((m === "hold" || m === "fn_button") && globalListen) return "sidecar";
  if (capture === "microphone" && engine === "browser") return "browser";
  return "sidecar";
}

/** @deprecated */
export function resolveSttEngine(mode, context = {}) {
  return resolveSttSource(mode, context);
}

export function sttEngineIsAvailable(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting" && normalizeSttEngine(context.sttEngine ?? "browser") === "browser") {
    return true;
  }
  const resolved = resolveSttSource(mode, context);
  if (resolved === "browser") return true;
  return Boolean(context.sidecarConnected);
}

export function voiceModeRequiresSidecar(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "live") return true;
  if (m === "meeting") {
    return normalizeSttEngine(context.sttEngine ?? "browser") !== "browser";
  }
  return false;
}

export function voiceModeUsesSidecarMic(mode, context = {}) {
  if (resolveSttSource(mode, context) !== "sidecar") return false;
  const m = normalizeVoiceInputMode(mode);
  if (voiceModeRequiresSidecar(m)) return Boolean(context.sidecarConnected);
  if (m === "hold" || m === "fn_button") return Boolean(context.sidecarConnected);
  return false;
}

export function voiceModeUsesBrowserStt(mode, context = {}) {
  if (resolveSttSource(mode, context) !== "browser") return false;
  const m = normalizeVoiceInputMode(mode);
  if (m === "live") return false;
  return m !== "disabled";
}

export function formatSttSummary(capture, engine) {
  const cap = normalizeSttCapture(capture);
  const eng = normalizeSttEngine(engine);
  const capLabel = STT_CAPTURE_SHORT_LABELS[cap] || STT_CAPTURE_LABELS[cap] || cap;
  const engLabel = STT_ENGINE_SHORT_LABELS[eng] || STT_ENGINE_LABELS[eng] || eng;
  return `${capLabel} · ${engLabel}`;
}

export function voiceModeMicAction(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "disabled") return "hint";
  if (m === "meeting") return "toggle-meeting";
  if (m === "live") return "disabled-hint";

  const resolved = resolveSttSource(m, context);
  if (resolved === "browser") {
    if (m === "fn_button") return "hint";
    return "hold";
  }

  if (m === "fn_button") return "hint";
  if (m === "hold") return "hold";
  return "hint";
}

export function voiceModeMicLabel(mode, { meetingRecording = false } = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting") return meetingRecording ? "Стоп встречи" : "Запись встречи";
  if (m === "hold") return "Говорить";
  if (m === "live") return "Живой диалог";
  if (m === "fn_button") return "Shift";
  return "Говорить";
}
