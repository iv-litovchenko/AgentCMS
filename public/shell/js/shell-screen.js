export function createShellScreen({ videoEl, stageEl, statusEl, onInactive } = {}) {
  let stream = null;

  function isSupported() {
    return Boolean(navigator.mediaDevices?.getDisplayMedia);
  }

  async function start() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (!isSupported()) {
      throw new Error("Демонстрация экрана недоступна в этом браузере");
    }

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });

    const track = stream.getVideoTracks()[0];
    if (track) {
      track.addEventListener("ended", () => {
        void stop();
      });
    }

    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
    }
    stageEl?.classList.remove("hidden");
    if (statusEl) statusEl.textContent = "Выберите окно или экран в диалоге системы";
    return true;
  }

  async function stop() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    stageEl?.classList.add("hidden");
    if (statusEl) statusEl.textContent = "";
    onInactive?.();
  }

  async function setEnabled(enabled) {
    if (enabled) {
      try {
        await start();
        if (statusEl) statusEl.textContent = "";
        return true;
      } catch (error) {
        const message =
          error?.name === "NotAllowedError"
            ? "Демонстрация экрана отменена — разрешите доступ"
            : error?.message || "Не удалось включить демонстрацию экрана";
        stageEl?.classList.remove("hidden");
        if (statusEl) statusEl.textContent = message;
        await stop();
        throw new Error(message);
      }
    }
    await stop();
    return false;
  }

  function captureFrame(mimeType = "image/png", quality = 0.92) {
    if (!stream || !videoEl?.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0);
    return {
      dataUrl: canvas.toDataURL(mimeType, quality),
      width: canvas.width,
      height: canvas.height
    };
  }

  function isActive() {
    return Boolean(stream);
  }

  window.addEventListener("pagehide", () => {
    void stop();
  });

  return { isSupported, start, stop, setEnabled, captureFrame, isActive };
}
