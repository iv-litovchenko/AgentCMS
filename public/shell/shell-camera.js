export function createShellCamera({ videoEl, stageEl, statusEl } = {}) {
  let stream = null;

  function isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  async function start() {
    if (stream) return true;
    if (!isSupported()) {
      throw new Error("Камера недоступна в этом браузере");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
    }
    stageEl?.classList.remove("hidden");
    if (statusEl) statusEl.textContent = "";
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
  }

  async function setEnabled(enabled) {
    if (enabled) {
      try {
        await start();
        return true;
      } catch (error) {
        const message =
          error?.name === "NotAllowedError"
            ? "Нет доступа к камере — разрешите в браузере"
            : error?.message || "Не удалось включить камеру";
        stageEl?.classList.remove("hidden");
        if (statusEl) statusEl.textContent = message;
        await stop();
        throw new Error(message);
      }
    }
    await stop();
    return false;
  }

  function captureFrame(mimeType = "image/jpeg", quality = 0.85) {
    if (!stream || !videoEl?.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0);
    return canvas.toDataURL(mimeType, quality);
  }

  function isActive() {
    return Boolean(stream);
  }

  window.addEventListener("pagehide", () => {
    void stop();
  });

  return { isSupported, start, stop, setEnabled, captureFrame, isActive };
}
