export function createShellTtsPlayer({ apiFetch }) {
  /** @type {HTMLAudioElement | null} */
  let audio = null;
  let objectUrl = "";

  function cleanupAudio() {
    if (audio) {
      audio.pause();
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
    cleanupAudio();
    const payload = String(text || "").trim();
    if (!payload) return;

    const result = await apiFetch("/api/shell/tts/synthesize", {
      method: "POST",
      body: JSON.stringify({ text: payload })
    });

    const mimeType = String(result.mimeType || "audio/mpeg");
    const binary = atob(String(result.audio || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);

    await new Promise((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Не удалось воспроизвести аудио"));
      audio.play().catch(reject);
    });
    cleanupAudio();
  }

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    hasAudio,
    cleanupAudio
  };
}
