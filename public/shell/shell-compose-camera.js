/** One-shot camera capture for compose 📷 → send (#43). */

export function isCoarsePointerDevice() {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export function preferredComposeCameraFacing(settings = {}) {
  const configured = String(settings?.cameraFacing || "").trim();
  if (configured === "environment" || configured === "user") {
    return configured === "device" ? "user" : configured;
  }
  if (isCoarsePointerDevice()) return "environment";
  return "user";
}

export function waitForVideoFrame(videoEl, { timeoutMs = 8000 } = {}) {
  if (videoEl?.videoWidth > 0) return Promise.resolve(true);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Камера не успела сфокусироваться"));
    }, timeoutMs);
    const onReady = () => {
      if (videoEl?.videoWidth > 0) {
        cleanup();
        resolve(true);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      videoEl?.removeEventListener("loadeddata", onReady);
      videoEl?.removeEventListener("loadedmetadata", onReady);
    };
    videoEl?.addEventListener("loadeddata", onReady);
    videoEl?.addEventListener("loadedmetadata", onReady);
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export function openCameraFilePicker(inputEl) {
  return new Promise((resolve, reject) => {
    if (!inputEl) {
      reject(new Error("File input unavailable"));
      return;
    }
    const onChange = async () => {
      inputEl.removeEventListener("change", onChange);
      const file = inputEl.files?.[0];
      inputEl.value = "";
      if (!file) {
        reject(new Error("cancelled"));
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        resolve({ dataUrl, width: 0, height: 0, fromFile: true });
      } catch (error) {
        reject(error);
      }
    };
    inputEl.addEventListener("change", onChange);
    inputEl.click();
  });
}

/**
 * Opens camera if needed, captures one JPEG frame, stops stream unless keepActive.
 * Tries alternate facingMode on failure (environment → user).
 */
export async function captureOneShotCameraFrame(shellCamera, videoEl, {
  facing = "user",
  keepActive = false
} = {}) {
  if (!shellCamera?.isSupported?.()) {
    throw new Error("Камера недоступна в этом браузере");
  }

  const facings = facing === "environment" ? ["environment", "user"] : [facing, "user"];
  let lastError = null;

  for (const mode of facings) {
    const startedHere = !shellCamera.isActive();
    try {
      if (startedHere) {
        await shellCamera.setEnabled(true, { facingMode: mode });
        await waitForVideoFrame(videoEl);
      }
      const frame = shellCamera.captureFrame();
      if (!frame?.dataUrl) throw new Error("Не удалось получить кадр");
      if (startedHere && !keepActive) await shellCamera.stop();
      return { frame, startedHere, facing: mode };
    } catch (error) {
      lastError = error;
      if (!shellCamera.isActive() || !keepActive) {
        await shellCamera.stop().catch(() => {});
      }
    }
  }

  throw lastError || new Error("Не удалось включить камеру");
}

export function buildComposeCameraMessage(userText, snapshotPath) {
  const text = String(userText || "").trim();
  const path = String(snapshotPath || "").trim() || ".agent-cms/cache/shell-camera/manual-latest.json";
  const body = text || "Что на этом фото?";
  return `${body}\n\n[Снимок камеры: ${path}]`;
}
