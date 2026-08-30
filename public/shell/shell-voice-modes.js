/** Режимы голосового ввода Shell (voiceInputMode). */

export const VOICE_INPUT_MODES = ["live", "meeting", "hold", "fn_button"];

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
    "Зажмите 🎤 — говорите — отпустите. Без «Глобально» — Web Speech в Shell. С «Глобально» — sidecar.",
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

export function normalizeSttEngine(value) {
  const raw = String(value || "").trim();
  if (raw === "browser" || raw === "sidecar") return raw;
  return "auto";
}

/** Какой STT реально использовать: browser или sidecar. */
export function resolveSttEngine(
  mode,
  { globalListen = false, sidecarConnected = false, sttEngine = "auto" } = {}
) {
  const m = normalizeVoiceInputMode(mode);
  if (voiceModeRequiresSidecar(m)) return "sidecar";
  const engine = normalizeSttEngine(sttEngine);
  if (engine === "browser") return "browser";
  if (engine === "sidecar") return "sidecar";
  if ((m === "hold" || m === "fn_button") && globalListen) return "sidecar";
  return "browser";
}

export function sttEngineIsAvailable(mode, context = {}) {
  const resolved = resolveSttEngine(mode, context);
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
  { globalListen = false, sidecarConnected = false, sttEngine = "auto" } = {}
) {
  if (resolveSttEngine(mode, { globalListen, sidecarConnected, sttEngine }) !== "sidecar") {
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
  { globalListen = false, sidecarConnected = false, sttEngine = "auto" } = {}
) {
  if (resolveSttEngine(mode, { globalListen, sidecarConnected, sttEngine }) !== "browser") {
    return false;
  }
  const m = normalizeVoiceInputMode(mode);
  return m !== "disabled" && !voiceModeRequiresSidecar(m);
}

export function voiceModeMicAction(mode) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting") return "toggle-meeting";
  if (m === "hold") return "hold";
  if (m === "live") return "sidecar-always";
  if (m === "fn_button") return "hint";
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
