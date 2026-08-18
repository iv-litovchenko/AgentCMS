/** Режимы голосового ввода Shell (voiceInputMode). */

export const VOICE_INPUT_MODES = ["live", "wake_name", "meeting", "hold", "fn_button"];

const LEGACY_MAP = {
  browser: "hold",
  sidecar: "hold",
  always: "live",
  fn_button: "fn_button",
  disabled: "disabled"
};

export const VOICE_MODE_LABELS = {
  live: "Живой диалог",
  wake_name: "По имени",
  meeting: "Запись встречи",
  hold: "Голосовое",
  fn_button: "Shift"
};

/** Короткая подпись в `<option>` — режим + суть одной строкой. */
export const VOICE_MODE_OPTION_LABELS = {
  live: "Живой диалог — sidecar, речь по паузе → агенту",
  wake_name: "По имени — sidecar, wake-слово из ⚙️",
  meeting: "Запись встречи — 🎤 старт / стоп",
  hold: "Голосовое — удерживать 🎤",
  fn_button: "Shift — удерживать клавишу"
};

export const VOICE_MODE_HINTS = {
  live:
    "Sidecar постоянно слушает. Фраза по паузе → агенту. Ваш голос останавливает TTS. Нужен npm run shell:sidecar.",
  wake_name:
    "Sidecar слушает всегда, но шлёт агенту только если в речи есть wake-имя (поле в ⚙️ STT). Нужен sidecar.",
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

/** Sidecar обязателен для режима (не считая глобальность). */
export function voiceModeRequiresSidecar(mode) {
  const m = normalizeVoiceInputMode(mode);
  return m === "live" || m === "wake_name" || m === "meeting";
}

/** Микрофон через sidecar PTT / meeting / always. */
export function voiceModeUsesSidecarMic(mode, { globalListen = false, sidecarConnected = false } = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (voiceModeRequiresSidecar(m)) return sidecarConnected;
  if (m === "fn_button" || m === "hold") return Boolean(globalListen && sidecarConnected);
  return false;
}

/** Web Speech в браузере. */
export function voiceModeUsesBrowserStt(mode, { globalListen = false, sidecarConnected = false } = {}) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "disabled" || voiceModeRequiresSidecar(m)) return false;
  if (m === "hold") return !voiceModeUsesSidecarMic(m, { globalListen, sidecarConnected });
  if (m === "fn_button") return !voiceModeUsesSidecarMic(m, { globalListen, sidecarConnected });
  return false;
}

export function voiceModeMicAction(mode) {
  const m = normalizeVoiceInputMode(mode);
  if (m === "meeting") return "toggle-meeting";
  if (m === "hold") return "hold";
  if (m === "live" || m === "wake_name") return "none";
  if (m === "fn_button") return "hint";
  return "none";
}
