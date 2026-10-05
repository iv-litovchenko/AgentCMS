/** Mobile/iOS TTS helpers — truncate, error hints (#23–24). */

import { isIosDevice } from "@shell/audio-unlock";

export const SHELL_TTS_MAX_LEN = 700;

const IOS_UNLOCK_REASONS = new Set([
  "play-not-allowed",
  "blocked",
  "play-failed",
  "audio-element-error",
  "audio-playback-stall",
  "audio-playback-timeout",
  "audio-load-timeout",
  "audio-load-failed",
  "web-audio-start",
  "web-audio-decode"
]);

/** На iPhone почти любой сбой воспроизведения — блокировка Safari, не «громкость». */
export function isTtsIosUnlockIssue(reason = "") {
  if (!isIosDevice()) return false;
  const sr = String(reason || "").trim();
  if (!sr || sr === "cancelled" || sr === "empty") return false;
  if (sr === "play-not-allowed" || sr === "blocked") return true;
  if (/notallowed|interact|user gesture|not supported/i.test(sr)) return true;
  if (IOS_UNLOCK_REASONS.has(sr)) return true;
  return false;
}

export function truncateForShellTts(text, maxLen = SHELL_TTS_MAX_LEN) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value || value.length <= maxLen) return value;
  const cut = value.slice(0, maxLen);
  return `${cut.replace(/\s+\S*$/, "").trim()}…`;
}

/** Разбивает длинный текст на части для последовательной озвучки (без обрезки хвоста). */
export function splitTextForShellTts(text, maxLen = SHELL_TTS_MAX_LEN) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return [];
  if (value.length <= maxLen) return [value];

  const parts = [];
  let rest = value;
  while (rest.length > maxLen) {
    const cut = rest.slice(0, maxLen);
    let chunk = cut.replace(/\s+\S*$/, "").trim();
    if (!chunk) chunk = rest.slice(0, maxLen).trim();
    parts.push(chunk);
    rest = rest.slice(chunk.length).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function formatTtsErrorHint({ serverReason = "", browserReason = "", useServerTts = true } = {}) {
  const parts = [];
  const sr = String(serverReason || "");

  if (isTtsIosUnlockIssue(sr)) {
    return "";
  }
  if (sr === "play-not-allowed" || sr === "blocked") {
    return "";
  }
  if (sr === "play-failed" || sr === "audio-element-error") {
    parts.push("Не удалось запустить воспроизведение — попробуйте ▶ «Сначала»");
  } else if (sr === "synthesize-fetch") {
    parts.push("Не удалось связаться с сервером озвучки — проверьте интернет");
  } else if (/^(fetch failed|network error|failed to fetch)$/i.test(sr)) {
    parts.push("Нет связи с сервером — проверьте интернет");
  } else if (serverReason === "audio-playback-stall" || serverReason === "audio-playback-timeout") {
    parts.push("Воспроизведение зависло — нажмите ▶ «Сначала» или выберите Edge TTS");
  } else if (serverReason === "audio-load-timeout") {
    parts.push("Аудио не загрузилось — проверьте сеть или выберите Edge TTS");
  } else if (serverReason === "engine-browser" && useServerTts) {
    parts.push("Настройки TTS не загрузились — обновите страницу");
  } else if (/invalid_api_key|API key ID used as API key/i.test(serverReason)) {
    parts.push("ElevenLabs: вставьте API key (sk_…), а не ID ключа из профиля");
  } else if (/free_users_not_allowed|creator tier|paid_plan_required/i.test(serverReason)) {
    parts.push(
      "ElevenLabs: этот Voice ID недоступен на free-плане — выберите premade-голос из библиотеки или смените тариф"
    );
  } else if (serverReason && serverReason !== "engine-browser") {
    parts.push(`Сервер: ${serverReason}`);
  }

  if (browserReason === "speech-not-allowed" || browserReason === "speech-no-start") {
    parts.push("Браузер заблокировал TTS — нажмите «Пробная озвучка» или выберите Edge TTS");
  } else if (browserReason === "speech-cut-short") {
    parts.push("Safari оборвал TTS — выберите Edge TTS в настройках");
  } else if (browserReason === "speech-timeout" || browserReason === "speech-end-timeout") {
    parts.push("Safari TTS завис — для ответов агента выберите Edge TTS");
  } else if (browserReason && browserReason !== "no-speech-synthesis") {
    parts.push(`Safari: ${browserReason}`);
  }

  if (!parts.length) {
    parts.push("Беззвучный режим выкл · TTS включён в настройках Shell");
  }
  return parts.join(" · ");
}

export function shellTtsFailureMessage(serverReason = "", browserReason = "", useServerTts = true) {
  const sr = String(serverReason || "");
  if (isTtsIosUnlockIssue(sr) || sr === "play-not-allowed" || sr === "blocked") {
    return { title: "", hint: "" };
  }
  return {
    title: "Не удалось озвучить ответ",
    hint: formatTtsErrorHint({ serverReason: sr, browserReason, useServerTts })
  };
}
