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

/** Пока в UI доступен только Web Speech; остальные видны, но disabled. */
export const STT_SERVER_ENGINES_SELECTABLE = false;

/** Формат: название — где работает (провайдер). Симметрично SHELL_TTS_ENGINE_LABELS. */
export const STT_ENGINE_LABELS = {
  browser: "Web Speech — в браузере (устройство)",
  google: "Google STT — облако (Google)",
  whisper: "Whisper — локально (сервер)",
  elevenlabs: "ElevenLabs Scribe — облако (ElevenLabs)"
};

export function formatSttEngineSelectLabel(engine = "browser") {
  const id = normalizeSttEngine(engine);
  return STT_ENGINE_LABELS[id] || id;
}

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
    const nav = String((typeof navigator !== "undefined" && navigator.language) || "").trim();
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

/** Живой диалог v1 — Web Speech + пауза + barge-in. */
export const LIVE_VOICE_MODE_ENABLED = true;

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
  hold: "Зажмите 🎤 — говорите — отпустите.",
  fn_button: "Удерживайте Shift (вне поля ввода)."
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

export function sttEngineUsesWebSpeech(engine) {
  return normalizeSttEngine(engine) === "browser";
}

export function sttEngineUsesServer(engine) {
  return isLocalSttEngine(engine);
}

/** browser = Web Speech в вкладке; server = запись в браузере → STT API на сервере */
export function resolveSttSource(
  mode,
  {
    sttEngine = "browser",
    sttCapture = "microphone",
    sttSource = null
  } = {}
) {
  const capture = normalizeSttCapture(sttCapture, {
    legacySource: sttSource != null ? String(sttSource) : ""
  });
  const engine = normalizeSttEngine(sttEngine);

  if (capture === "microphone") {
    return sttEngineUsesWebSpeech(engine) ? "browser" : "server";
  }

  if (sttCaptureRequiresLocalAgent(capture) || isLocalSttEngine(engine)) return "server";
  return "browser";
}

/** @deprecated */
export function resolveSttEngine(mode, context = {}) {
  return resolveSttSource(mode, context);
}

export function sttEngineIsAvailable(mode, context = {}) {
  const engine = normalizeSttEngine(context.sttEngine ?? "browser");
  if (sttEngineUsesWebSpeech(engine)) return true;
  if (engine === "whisper" && context.whisperAvailable === false) return false;
  if (engine === "elevenlabs" && context.elevenlabsAvailable === false) return false;
  void mode;
  return true;
}

export function voiceModeUsesBrowserStt(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "disabled") return false;
  // Живой диалог всегда через Web Speech API, независимо от движка STT в настройках.
  if (m === "live") return true;
  const capture = normalizeSttCapture(context.sttCapture ?? "microphone");
  if (capture !== "microphone") return false;
  return sttEngineUsesWebSpeech(context.sttEngine ?? "browser");
}

export function voiceModeUsesServerStt(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "live" || m === "disabled") return false;
  const capture = normalizeSttCapture(context.sttCapture ?? "microphone");
  if (capture !== "microphone") return false;
  return sttEngineUsesServer(context.sttEngine ?? "browser");
}

export function formatSttSummary(capture, engine, lang) {
  const cap = normalizeSttCapture(capture);
  const eng = normalizeSttEngine(engine);
  const capLabel = STT_CAPTURE_SHORT_LABELS[cap] || STT_CAPTURE_LABELS[cap] || cap;
  const engLabel = STT_ENGINE_SHORT_LABELS[eng] || STT_ENGINE_LABELS[eng] || eng;
  const langRaw = String(lang || "").trim().toLowerCase();
  if (langRaw === STT_LANG_AUTO && sttLangSupportsAuto(eng)) {
    return `${capLabel} · ${engLabel} · авто`;
  }
  return `${capLabel} · ${engLabel}`;
}

export function voiceModeMicAction(mode, context = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "disabled") return "hint";
  if (m === "meeting") return "toggle-meeting";
  if (m === "live") return "toggle-live";

  if (m === "fn_button") return "hint";
  return "hold";
}

export function voiceModeMicLabel(mode, { meetingRecording = false, liveDialogActive = false } = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting") return meetingRecording ? "Стоп встречи" : "Запись встречи";
  if (m === "hold") return "Говорить";
  if (m === "live") return liveDialogActive ? "Стоп живого диалога" : "Живой диалог";
  if (m === "fn_button") return "Shift";
  return "Говорить";
}

/**
 * Подсказка под «Движок STT»: источник (микрофон/система) → движок обработки.
 * Не смешиваем с подсказками режима 🎤 (Shift / удержание) — они у селекта режима.
 */
export function formatSttEngineNote({
  capture = "microphone",
  engine = "browser",
  mode = "hold",
  engineMeta = {},
  captureMeta = {},
  sttLang = "ru-RU"
} = {}) {
  const cap = normalizeSttCapture(capture);
  const eng = normalizeSttEngine(engine);
  const capLabel = STT_CAPTURE_LABELS[cap] || cap;
  const engLabel = STT_ENGINE_LABELS[eng] || eng;
  const parts = [];
  let warn = false;

  const langRaw = String(sttLang || "").trim().toLowerCase();
  if (langRaw === STT_LANG_AUTO && sttLangSupportsAuto(eng)) {
    parts.push("Язык: авто — Whisper/Scribe определят язык сами.");
  } else if (langRaw === STT_LANG_AUTO) {
    parts.push("«Авто» только для Whisper и Scribe — для Web Speech выберите ru-RU или en-US.");
    warn = true;
  }

  if (captureMeta.available === false) {
    parts.push(captureMeta.hint || STT_CAPTURE_HINTS[cap] || "Этот источник пока недоступен.");
    warn = true;
  }

  if (cap === "microphone") {
    parts.push(`Микрофон → ${engLabel}.`);
    if (eng === "browser") {
      parts.push("Web Speech — в браузере (устройство).");
    } else if (eng === "google") {
      parts.push("Запись в браузере → распознавание Google STT на сервере (нужен интернет).");
    } else if (eng === "whisper") {
      if (engineMeta.available === false) {
        parts.push("Whisper не установлен — Agent CMS Control → Установить зависимости.");
        warn = true;
      } else {
        parts.push("Запись в браузере → Whisper (faster-whisper) на сервере, локально.");
      }
    } else if (eng === "elevenlabs") {
      if (engineMeta.available === false) {
        parts.push("Укажите API key ElevenLabs (поле ниже или ключ из TTS).");
        warn = true;
      } else {
        parts.push("Запись в браузере → ElevenLabs Scribe API.");
      }
    }
    if (normalizeVoiceInputMode(mode) === "meeting") {
      parts.push("Встреча: MediaRecorder + выбранный движок, файлы в awn-dialogs/audio/stt/.");
    }
    if (normalizeVoiceInputMode(mode) === "live") {
      parts.push("Живой диалог: Web Speech, фраза по паузе, перебивание останавливает озвучку и ответ.");
    }
    parts.push("Нужен HTTPS (localhost или https://…:3488).");
    return {
      text: parts.join(" ").replace(/\s+/g, " ").trim(),
      warn
    };
  }

  parts.push(`${capLabel} → ${engLabel}.`);
  if (eng === "whisper" && engineMeta.available === false) {
    parts.push("Whisper не установлен — Agent CMS Control → Установить зависимости.");
    warn = true;
  } else if (eng === "elevenlabs" && engineMeta.available === false) {
    parts.push("Укажите API key ElevenLabs (поле ниже или ключ из TTS).");
    warn = true;
  }
  parts.push("Системный звук и смешанный поток — в разработке.");

  return {
    text: parts.join(" ").replace(/\s+/g, " ").trim(),
    warn: warn || captureMeta.available === false
  };
}

/** Иконка на 🎤 в compose: всегда 🎤 в покое, ⏹ при записи. */
export function resolveMicIcon(mode, { recording = false } = {}) {
  void mode;
  if (recording) return "⏹";
  return "🎤";
}
