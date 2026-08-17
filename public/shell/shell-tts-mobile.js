/** Mobile/iOS TTS helpers — truncate, error hints (#23–24). */

export const SHELL_TTS_MAX_LEN = 700;

export function truncateForShellTts(text, maxLen = SHELL_TTS_MAX_LEN) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value || value.length <= maxLen) return value;
  const cut = value.slice(0, maxLen);
  return `${cut.replace(/\s+\S*$/, "").trim()}…`;
}

export function formatTtsErrorHint({ serverReason = "", browserReason = "", useServerTts = true } = {}) {
  const parts = [];
  if (serverReason === "synthesize-fetch" || /fetch|network|failed/i.test(serverReason)) {
    parts.push("Нет связи с CMS — Wi‑Fi и https://IP:3443");
  } else if (serverReason === "play-not-allowed") {
    parts.push("iPhone заблокировал звук — нажмите 🎤 или «Отправить» и сразу задайте вопрос");
  } else if (serverReason === "play-failed" || serverReason === "audio-element-error") {
    parts.push("Выключите беззвучный режим, громкость вверх");
  } else if (serverReason === "audio-load-timeout") {
    parts.push("Аудио не загрузилось — проверьте сеть или выберите «Браузер» в TTS");
  } else if (serverReason === "engine-browser" && useServerTts) {
    parts.push("Настройки TTS не загрузились — обновите страницу");
  } else if (serverReason && serverReason !== "engine-browser") {
    parts.push(`Сервер: ${serverReason}`);
  }

  if (browserReason === "speech-timeout" || browserReason === "speech-end-timeout") {
    parts.push("Safari TTS завис — попробуйте Edge/say на Mac или перезагрузите вкладку");
  } else if (browserReason && browserReason !== "no-speech-synthesis") {
    parts.push(`Safari: ${browserReason}`);
  }

  if (!parts.length) {
    parts.push("Беззвучный режим выкл · TTS включён в настройках Shell");
  }
  return parts.join(" · ");
}

export function shellTtsFailureMessage(serverReason = "", browserReason = "", useServerTts = true) {
  return {
    title: "Не удалось озвучить ответ",
    hint: formatTtsErrorHint({ serverReason, browserReason, useServerTts })
  };
}
