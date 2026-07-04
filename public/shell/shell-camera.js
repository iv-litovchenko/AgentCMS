export function createShellCamera({ videoEl, stageEl, statusEl } = {}) {
  let stream = null;
  let constraints = { facingMode: "user", deviceId: "" };

  function isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  function setConstraints(next = {}) {
    constraints = {
      facingMode: next.facingMode || next.cameraFacing || constraints.facingMode || "user",
      deviceId: String(next.deviceId || next.cameraDeviceId || constraints.deviceId || "").trim()
    };
  }

  function buildVideoConstraints() {
    if (constraints.deviceId) {
      return {
        deviceId: { exact: constraints.deviceId },
        width: { ideal: 640 },
        height: { ideal: 480 }
      };
    }
    if (constraints.facingMode === "environment" || constraints.facingMode === "user") {
      return {
        facingMode: { ideal: constraints.facingMode },
        width: { ideal: 640 },
        height: { ideal: 480 }
      };
    }
    return { width: { ideal: 640 }, height: { ideal: 480 } };
  }

  async function listDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "videoinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Камера ${device.deviceId.slice(0, 6)}`
      }));
  }

  async function start(nextConstraints) {
    if (nextConstraints) setConstraints(nextConstraints);
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (!isSupported()) {
      throw new Error("Камера недоступна в этом браузере");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: buildVideoConstraints(),
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

  async function setEnabled(enabled, nextConstraints) {
    if (enabled) {
      try {
        await start(nextConstraints);
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
    if (constraints.facingMode === "user" && !constraints.deviceId) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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

  return {
    isSupported,
    setConstraints,
    listDevices,
    start,
    stop,
    setEnabled,
    captureFrame,
    isActive
  };
}
