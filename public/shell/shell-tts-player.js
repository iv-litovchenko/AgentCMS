export function createShellTtsPlayer({ apiFetch }) {
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

  async function speak(text) {
    const generation = ++speakGeneration;
    cleanupAudio();
    const payload = String(text || "").trim();
    if (!payload) return;

    const result = await apiFetch("/api/shell/tts/synthesize", {
      method: "POST",
      body: JSON.stringify({ text: payload })
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
      audio.onended = finish;
      audio.onerror = () => reject(new Error("Не удалось воспроизвести аудио"));
      audio.play().catch(reject);
    });
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
