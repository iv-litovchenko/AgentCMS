function waitForSpeechVoices(timeoutMs = 3000) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve([]);

  const existing = synth.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(synth.getVoices()), timeoutMs);
    synth.onvoiceschanged = () => {
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
  });
}

function pickVoice(voices, lang) {
  const prefix = String(lang || "ru-RU").split("-")[0].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

/** Safari / iOS speechSynthesis — success only on onend (onstart lies on iOS). */
export async function speakBrowserTts(text, { lang = "ru-RU", rate = 1 } = {}) {
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

  const voices = await waitForSpeechVoices();
  const voice = pickVoice(voices, lang);

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let started = false;
    const finish = (ok, reason = "") => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ ok, reason });
    };

    const utterance = new SpeechSynthesisUtterance(payload);
    utterance.lang = lang;
    utterance.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(started);
    utterance.onerror = (event) => finish(false, event?.error || "speech-error");

    synth.speak(utterance);

    const ms = Math.min(120_000, payload.length * 120 + 8000);
    timer = setTimeout(() => finish(false, started ? "speech-end-timeout" : "speech-timeout"), ms);
  });
}
