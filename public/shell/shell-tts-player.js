export function createShellTtsPlayer({ apiFetch, getTtsSettings = () => ({}), synthTimeoutMs = 45000 }) {
  /** @type {HTMLAudioElement | null} */
  let audio = null;
  let objectUrl = "";
  let speakGeneration = 0;
  /** @type {{ blob: Blob, mimeType: string, text: string } | null} */
  let lastRecording = null;

  function cleanupAudio() {
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.src = "";
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function isPlaying() {
    return Boolean(audio && !audio.paused && !audio.ended);
  }

  function isPaused() {
    return Boolean(audio && audio.paused && !audio.ended && audio.currentTime > 0);
  }

  function hasAudio() {
    return Boolean(audio);
  }

  function stop() {
    speakGeneration += 1;
    cleanupAudio();
  }

  function pause() {
    if (!audio || audio.paused) return;
    audio.pause();
  }

  function resume() {
    if (!audio) return;
    void audio.play().catch(() => {});
  }

  async function speak(text, { onPhase } = {}) {
    const generation = ++speakGeneration;
    cleanupAudio();
    const payload = String(text || "").trim();
    if (!payload) return;

    const settings = getTtsSettings();
    const engine = String(settings?.ttsEngine || "").trim();
    onPhase?.("synthesizing", engine);
    const result = await apiFetch("/api/shell/tts/synthesize", {
      method: "POST",
      timeoutMs: synthTimeoutMs,
      body: JSON.stringify({ text: payload, settings, engine })
    });
    if (generation !== speakGeneration) return;

    const mimeType = String(result.mimeType || "audio/mpeg");
    const binary = atob(String(result.audio || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    lastRecording = { blob, mimeType, text: payload };
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    if (generation !== speakGeneration) {
      cleanupAudio();
      return;
    }

    onPhase?.("playing", engine);
    await new Promise((resolve, reject) => {
      if (generation !== speakGeneration) {
        resolve();
        return;
      }
      const finish = () => {
        if (generation !== speakGeneration) {
          resolve();
          return;
        }
        cleanupAudio();
        resolve();
      };
      const fail = (error) => {
        cleanupAudio();
        reject(error instanceof Error ? error : new Error(String(error || "audio-error")));
      };
      audio.onended = finish;
      audio.onerror = () => fail(new Error("Не удалось воспроизвести аудио"));
      const playTimer = setTimeout(() => fail(new Error("Не удалось начать воспроизведение")), 12000);
      audio.play()
        .then(() => clearTimeout(playTimer))
        .catch((error) => {
          clearTimeout(playTimer);
          fail(error);
        });
    });
    return {
      engine: String(result.engine || ""),
      voice: String(result.voice || ""),
      mimeType
    };
  }

  function getLastRecording() {
    return lastRecording;
  }

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    hasAudio,
    cleanupAudio,
    getLastRecording
  };
}
