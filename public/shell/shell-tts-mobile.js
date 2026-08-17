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
  } else if (serverReason === "audio-playback-timeout") {
    parts.push("Воспроизведение зависло — выберите Edge TTS в настройках");
  } else if (serverReason === "audio-load-timeout") {
    parts.push("Аудио не загрузилось — проверьте сеть или выберите Edge TTS");
  } else if (serverReason === "engine-browser" && useServerTts) {
    parts.push("Настройки TTS не загрузились — обновите страницу");
  } else if (serverReason && serverReason !== "engine-browser") {
    parts.push(`Сервер: ${serverReason}`);
  }

  if (browserReason === "speech-not-allowed" || browserReason === "speech-no-start") {
    parts.push("Браузер заблокировал TTS — нажмите «Пробная озвучка» или выберите Edge/say");
  } else if (browserReason === "speech-cut-short") {
    parts.push("Safari оборвал TTS — выберите Edge TTS или macOS say");
  } else if (browserReason === "speech-timeout" || browserReason === "speech-end-timeout") {
    parts.push("Safari TTS завис — для ответов агента выберите Edge TTS или macOS say");
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
