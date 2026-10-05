function snapshotSpeechVoices() {
  try {
    return window.speechSynthesis?.getVoices() || [];
  } catch {
    return [];
  }
}

export function voiceLangPrefix(voice) {
  return String(voice?.lang || "")
    .toLowerCase()
    .replace("_", "-")
    .split("-")[0];
}

export function loadWebSpeechVoices(timeoutMs = 2500, pollMs = 200) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve([]);

  const seen = new Map();
  const merge = () => {
    for (const voice of snapshotSpeechVoices()) {
      const key = `${voice.voiceURI || ""}|${voice.name}|${voice.lang}`;
      if (!seen.has(key)) seen.set(key, voice);
    }
  };

  return new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", onChange);
      clearTimeout(hardTimer);
      clearInterval(pollTimer);
      merge();
      resolve(filterLocalWebSpeechVoices([...seen.values()]));
    };

    const onChange = () => merge();
    merge();
    synth.addEventListener("voiceschanged", onChange);
    synth.getVoices();

    const pollTimer = setInterval(() => {
      merge();
      synth.getVoices();
    }, pollMs);
    const hardTimer = setTimeout(finish, timeoutMs);
  });
}

/** @deprecated use loadWebSpeechVoices */
export function waitForSpeechVoices(timeoutMs = 2500) {
  return loadWebSpeechVoices(timeoutMs);
}

/** Облачные Google / online-голоса Chrome — не показываем и не используем. */
export function isCloudWebSpeechVoice(voice) {
  if (!voice) return false;
  if (voice.localService === false) return true;
  const name = String(voice.name || "");
  const uri = String(voice.voiceURI || "");
  return /^google\b/i.test(name) || /google/i.test(uri);
}

export function isLocalWebSpeechVoice(voice) {
  return Boolean(voice && !isCloudWebSpeechVoice(voice));
}

export function filterLocalWebSpeechVoices(voices = []) {
  return voices.filter(isLocalWebSpeechVoice);
}

export function isEnhancedLocalWebSpeechVoice(voice) {
  if (!isLocalWebSpeechVoice(voice)) return false;
  const name = String(voice.name || "");
  const uri = String(voice.voiceURI || "").toLowerCase();
  return (
    /\(Enhanced\)|\(Premium\)|\(Personal\)/i.test(name) ||
    /\b(Eddy|Flo|Siri)\b/i.test(name) ||
    /premium|enhanced|personal|compact/.test(uri)
  );
}

export function compareWebSpeechVoices(a, b) {
  const enhancedA = isEnhancedLocalWebSpeechVoice(a);
  const enhancedB = isEnhancedLocalWebSpeechVoice(b);
  if (enhancedA !== enhancedB) return enhancedA ? -1 : 1;
  return String(a.name || "").localeCompare(String(b.name || ""), "ru");
}

export function formatWebSpeechVoiceLabel(voice) {
  const lang = String(voice?.lang || "").replace("_", "-");
  const name = String(voice.name || "").trim();
  if (isEnhancedLocalWebSpeechVoice(voice) && !/\(Enhanced\)|\(Premium\)/i.test(name)) {
    return `${name} · Enhanced (${lang})`;
  }
  return lang ? `${name} (${lang})` : name;
}

function pickVoice(voices, lang, voiceName = "") {
  const named = String(voiceName || "").trim();
  if (named) {
    const match = voices.find((v) => v.name === named || v.voiceURI === named);
    if (match) return match;
  }
  const prefix = String(lang || "ru-RU").split("-")[0].toLowerCase();
  return (
    voices.find((v) => voiceLangPrefix(v) === prefix) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(prefix)) ||
    null
  );
}

/** Safari / iOS — успех только если был onstart и пришёл onend. */
export async function speakShellBrowserTts(text, { lang = "ru-RU", rate = 1, voiceName = "" } = {}) {
  const synth = window.speechSynthesis;
  const payload = String(text || "").trim();
  if (!synth || !payload) return { ok: false, reason: "empty" };

  synth.cancel();
  await new Promise((resolve) => setTimeout(resolve, 120));
  try {
    synth.resume();
  } catch {
    // ignore
  }

  const voices = await loadWebSpeechVoices();
  const voice = pickVoice(voices, lang, voiceName);

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let started = false;
    const finish = (ok, reason = "") => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ ok, reason, voice: voice?.name || "" });
    };

    const utterance = new SpeechSynthesisUtterance(payload);
    utterance.lang = lang;
    utterance.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(started);
    utterance.onerror = (event) => {
      const err = String(event?.error || "speech-error").toLowerCase();
      if (err === "interrupted" || err === "canceled" || err === "cancelled") {
        finish(true, err);
        return;
      }
      finish(false, event?.error || "speech-error");
    };

    synth.speak(utterance);

    const ms = Math.min(120_000, payload.length * 120 + 8000);
    timer = setTimeout(() => finish(false, started ? "speech-end-timeout" : "speech-timeout"), ms);
  });
}
