import { MOBILE_STORAGE_LEGACY, SHELL_STORAGE } from "@shell/storage-keys";
import { playShellMicSound, primeShellProcessingAudio } from "@shell/ui-sounds";

const VOICE_CONFIRM_KEY = SHELL_STORAGE.voiceConfirm;
const VOICE_CONFIRM_MOBILE_KEY = MOBILE_STORAGE_LEGACY.voiceConfirm;
const KEEP_AWAKE_KEY = SHELL_STORAGE.keepAwake;

/** ~3s varied pattern: buzz · pause · buzz · … */
const HAPTIC_DEMO_PATTERN = [120, 70, 180, 90, 240, 110, 80, 60, 320, 140, 100, 80, 420, 120, 520, 160, 680];

export function readVoiceConfirmSetting() {
  const shell = localStorage.getItem(VOICE_CONFIRM_KEY);
  if (shell !== null) return shell !== "0";
  return localStorage.getItem(VOICE_CONFIRM_MOBILE_KEY) !== "0";
}

export function writeVoiceConfirmSetting(enabled) {
  localStorage.setItem(VOICE_CONFIRM_KEY, enabled ? "1" : "0");
}

export function hapticSupported() {
  return typeof navigator.vibrate === "function";
}

export function hapticTap() {
  if (!hapticSupported()) return false;
  try {
    return Boolean(navigator.vibrate(12));
  } catch {
    return false;
  }
}

export function runHapticDemo() {
  if (!hapticSupported()) return false;
  try {
    navigator.vibrate(0);
    return Boolean(navigator.vibrate(HAPTIC_DEMO_PATTERN));
  } catch {
    return false;
  }
}

export function readKeepAwakeSetting() {
  const stored = localStorage.getItem(KEEP_AWAKE_KEY);
  if (stored !== null) return stored !== "0";
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export function writeKeepAwakeSetting(enabled) {
  localStorage.setItem(KEEP_AWAKE_KEY, enabled ? "1" : "0");
}

function ensureWakeLockTags(state) {
  if (!state.wakeLockTags) state.wakeLockTags = new Set();
  return state.wakeLockTags;
}

export async function acquireShellWakeLock(state, tag = "session") {
  if (!state || !("wakeLock" in navigator)) return false;
  const tags = ensureWakeLockTags(state);
  tags.add(tag);
  if (state.wakeLock) return true;
  try {
    const sentinel = await navigator.wakeLock.request("screen");
    state.wakeLock = sentinel;
    sentinel.addEventListener("release", () => {
      if (state.wakeLock === sentinel) state.wakeLock = null;
    });
    return true;
  } catch {
    tags.delete(tag);
    return false;
  }
}

export async function releaseShellWakeLock(state, tag = "session") {
  if (!state) return;
  const tags = ensureWakeLockTags(state);
  tags.delete(tag);
  if (tags.size > 0) return;
  try {
    await state.wakeLock?.release();
  } catch {
    // ignore
  }
  state.wakeLock = null;
}

export function initShellKeepAwake(state, { getEnabled = readKeepAwakeSetting } = {}) {
  if (!state || !("wakeLock" in navigator)) {
    return { sync: () => {}, destroy: () => {} };
  }

  let armed = false;

  const sync = async () => {
    if (document.visibilityState !== "visible") {
      await releaseShellWakeLock(state, "keep-awake");
      return;
    }
    if (!getEnabled()) {
      await releaseShellWakeLock(state, "keep-awake");
      return;
    }
    await acquireShellWakeLock(state, "keep-awake");
  };

  const onVisibility = () => {
    void sync();
  };

  const arm = () => {
    if (armed) return;
    armed = true;
    document.removeEventListener("pointerdown", arm, true);
    document.removeEventListener("keydown", arm, true);
    void sync();
  };

  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("pointerdown", arm, true);
  document.addEventListener("keydown", arm, true);
  if (getEnabled() && document.visibilityState === "visible") void sync();

  return {
    sync,
    destroy: () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", arm, true);
      document.removeEventListener("keydown", arm, true);
      void releaseShellWakeLock(state, "keep-awake");
    }
  };
}

export function createVoiceConfirmDialog(nodes) {
  return function showVoiceConfirmDialog(text) {
    if (!nodes.voiceConfirmDialog || !nodes.voiceConfirmForm || !nodes.voiceConfirmText) {
      return Promise.resolve(String(text || "").trim() || null);
    }

    return new Promise((resolve) => {
      nodes.voiceConfirmText.value = text;
      nodes.voiceConfirmDialog.showModal();
      nodes.voiceConfirmText.focus();

      const cleanup = (result) => {
        nodes.voiceConfirmForm.removeEventListener("submit", onSubmit);
        nodes.voiceCancel?.removeEventListener("click", onCancel);
        nodes.voiceRetry?.removeEventListener("click", onRetry);
        nodes.voiceConfirmDialog.close();
        resolve(result);
      };

      const onSubmit = (event) => {
        event.preventDefault();
        cleanup(nodes.voiceConfirmText.value.trim() || null);
      };
      const onCancel = () => cleanup(null);
      const onRetry = () => cleanup("__retry__");

      nodes.voiceConfirmForm.addEventListener("submit", onSubmit);
      nodes.voiceCancel?.addEventListener("click", onCancel);
      nodes.voiceRetry?.addEventListener("click", onRetry);
    });
  };
}

function usesBrowserRecognition(mode) {
  const m = String(mode || "").trim();
  return m === "hold" || m === "browser" || m === "fn_button";
}

export function createShellTapVoice(deps) {
  let finalText = "";
  let micTapHeld = false;
  let micStarting = false;
  let stopWhenReady = false;
  let micRestartTimer = null;

  const clearMicRestartTimer = () => {
    if (micRestartTimer) {
      clearTimeout(micRestartTimer);
      micRestartTimer = null;
    }
  };

  const isSessionActive = () => Boolean(micTapHeld || deps.state.pttKeyboardHeld);

  const syncMicUi = (active) => {
    deps.state.micTapHeld = micTapHeld;
    deps.setMicButtonState(active ? "Стоп" : "Говорить", { active });
    deps.syncVoiceRecordTimer?.();
  };

  const scheduleRecognitionRestart = (delayMs = 140) => {
    clearMicRestartTimer();
    if (!isSessionActive()) return;
    micRestartTimer = window.setTimeout(() => {
      micRestartTimer = null;
      if (!isSessionActive()) return;
      try {
        deps.recognition.start();
        syncMicUi(true);
      } catch {
        if (isSessionActive()) scheduleRecognitionRestart(260);
      }
    }, delayMs);
  };

  const finishRecordingSession = async () => {
    clearMicRestartTimer();
    micStarting = false;
    stopWhenReady = false;
    micTapHeld = false;
    deps.state.micTapHeld = false;
    deps.state.micActive = false;
    syncMicUi(false);
    await releaseShellWakeLock(deps.state, "recording");

    const text = (finalText || deps.getLivePhrase?.() || "").trim();
    finalText = "";
    if (text) {
      await deps.handleVoiceTranscript(text);
      return;
    }
    deps.renderWaitingPhrase?.();
  };

  const configureRecognition = (recognition) => {
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
  };

  const bindHandlers = (recognition) => {
    recognition.onstart = () => {
      deps.state.micActive = true;
      syncMicUi(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += part;
        else interim += part;
      }
      const phrase = (finalText + interim).trim();
      if (phrase) deps.renderPhase("listening", phrase);
      else if (isSessionActive()) deps.renderPhase("listening", "Запись…");
    };

    recognition.onerror = (event) => {
      const errorCode = event.error || "unknown";
      if (isSessionActive() && (errorCode === "no-speech" || errorCode === "aborted")) {
        scheduleRecognitionRestart();
        return;
      }

      clearMicRestartTimer();
      micStarting = false;
      stopWhenReady = false;
      micTapHeld = false;
      deps.state.micTapHeld = false;
      deps.state.micActive = false;
      syncMicUi(false);
      void releaseShellWakeLock(deps.state, "recording");

      if (errorCode === "not-allowed") {
        deps.renderPhase("waiting", "Нет доступа к микрофону · Настройки → Safari → Микрофон");
        deps.showMicPermissionDialog?.();
        return;
      }
      if (errorCode === "service-not-allowed" || deps.shellPermissionIssue?.()) {
        deps.renderPhase("waiting", `Микрофон заблокирован · откройте ${deps.getShellHttpsUrl?.()}`);
        deps.showMicPermissionDialog?.();
        return;
      }
      deps.renderPhase("waiting", errorCode || "Ошибка распознавания");
    };

    recognition.onend = () => {
      deps.state.micActive = false;
      if (isSessionActive()) {
        scheduleRecognitionRestart();
        return;
      }
      void finishRecordingSession();
    };
  };

  const prepareSession = () => {
    finalText = "";
    stopWhenReady = false;
  };

  const startSession = async ({ viaTap = false, skipPressSound = false } = {}) => {
    if (!deps.recognition) return false;
    if (!usesBrowserRecognition(deps.getVoiceInputMode?.())) return false;
    if (deps.getVoiceInputMode?.() === "disabled" || deps.isSttDisabled?.()) {
      deps.renderPhase("disabled", "Голосовой ввод выключен");
      return false;
    }
    if (deps.isMessageBusy?.()) {
      deps.renderPhase("waiting", "Дождитесь ответа агента или нажмите ✕");
      return false;
    }

    if (deps.shellPermissionIssue?.()) {
      deps.renderPhase("waiting", `Safari не спрашивает микрофон по HTTP · ${deps.getShellHttpsUrl?.()}`);
      deps.showMicPermissionDialog?.();
      return false;
    }

    if (viaTap) {
      if (micTapHeld || micStarting) return false;
      micTapHeld = true;
      deps.state.micTapHeld = true;
      primeShellProcessingAudio();
      if (!skipPressSound) {
        playShellMicSound("press");
        hapticTap();
      }
    } else if (!deps.state.pttKeyboardHeld) {
      return false;
    }

    prepareSession();
    micStarting = true;
    syncMicUi(true);
    deps.renderPhase("listening", "Запись…");
    deps.clearShellError?.();
    void acquireShellWakeLock(deps.state, "recording");

    try {
      if (!deps.state.micWarmed) {
        await deps.warmUpMicrophone?.();
        deps.state.micWarmed = true;
      }
      if (stopWhenReady || !isSessionActive()) {
        micTapHeld = false;
        deps.state.micTapHeld = false;
        micStarting = false;
        syncMicUi(false);
        deps.renderWaitingPhrase?.();
        void releaseShellWakeLock(deps.state, "recording");
        return false;
      }
      try {
        deps.recognition.start();
      } catch (error) {
        const msg = String(error?.message || error?.name || "");
        if (/already/i.test(msg) || error?.name === "InvalidStateError") return true;
        throw error;
      }
      return true;
    } catch (error) {
      micStarting = false;
      stopWhenReady = false;
      micTapHeld = false;
      deps.state.micTapHeld = false;
      syncMicUi(false);
      void releaseShellWakeLock(deps.state, "recording");
      deps.state.micWarmed = false;

      if (error?.code === "insecure-context") {
        deps.renderPhase("waiting", "Нужен HTTPS для микрофона · npm run start:https");
        deps.showMicPermissionDialog?.();
        return false;
      }
      if (error?.name === "NotAllowedError") {
        deps.renderPhase("waiting", "Нет доступа к микрофону · Настройки → Safari → Микрофон");
        deps.showMicPermissionDialog?.();
        return false;
      }
      deps.renderPhase("waiting", error?.message || "Не удалось включить микрофон");
      return false;
    } finally {
      micStarting = false;
    }
  };

  const stopSession = ({ skipReleaseSound = false } = {}) => {
    clearMicRestartTimer();
    if (micStarting) {
      stopWhenReady = true;
      return;
    }
    if (!isSessionActive()) return;
    const wasTap = micTapHeld;
    micTapHeld = false;
    deps.state.micTapHeld = false;
    if (wasTap && !skipReleaseSound) {
      playShellMicSound("release");
      hapticTap();
    }
    try {
      deps.recognition?.stop();
    } catch {
      void finishRecordingSession();
    }
  };

  const toggleTap = () => {
    if (micTapHeld || micStarting) {
      stopSession();
      return;
    }
    void startSession({ viaTap: true });
  };

  const abortSession = () => {
    clearMicRestartTimer();
    micStarting = false;
    stopWhenReady = false;
    micTapHeld = false;
    deps.state.micTapHeld = false;
    finalText = "";
    syncMicUi(false);
    void releaseShellWakeLock(deps.state, "recording");
    if (deps.recognition) {
      try {
        deps.recognition.stop();
      } catch {
        // ignore
      }
    }
    deps.state.micActive = false;
  };

  return {
    configureRecognition,
    bindHandlers,
    toggleTap,
    stopSession,
    abortSession,
    prepareSession,
    startSession,
    isSessionActive,
    isTapHeld: () => micTapHeld,
    isStarting: () => micStarting
  };
}

export function isBrowserTapVoiceMode(mode) {
  return usesBrowserRecognition(mode);
}
