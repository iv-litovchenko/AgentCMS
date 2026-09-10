/** Живой диалог v1: непрерывный Web Speech, отправка по паузе, barge-in при перебивании. */

import { playShellMicSound, primeShellProcessingAudio } from "@shell/ui-sounds";
import { acquireShellWakeLock, hapticTap, releaseShellWakeLock } from "@shell/voice";

export const LIVE_UTTERANCE_END_MS = 1400;
export const LIVE_BARGE_IN_MIN_CHARS = 2;
export const LIVE_RESTART_MS = 180;

export function createShellLiveDialog(deps) {
  let recognition = null;
  let utteranceFinal = "";
  let utteranceInterim = "";
  let endTimer = 0;
  let restartTimer = 0;
  let starting = false;
  let bargeCooldownUntil = 0;

  const clearEndTimer = () => {
    if (!endTimer) return;
    clearTimeout(endTimer);
    endTimer = 0;
  };

  const clearRestartTimer = () => {
    if (!restartTimer) return;
    clearTimeout(restartTimer);
    restartTimer = 0;
  };

  const isActive = () => Boolean(deps.state?.liveDialogActive);

  const currentPhrase = () => (utteranceFinal + utteranceInterim).replace(/\s+/g, " ").trim();

  const resetUtterance = () => {
    utteranceFinal = "";
    utteranceInterim = "";
    clearEndTimer();
    deps.setLiveUserSpeaking?.(false);
  };

  const scheduleUtteranceEnd = () => {
    clearEndTimer();
    endTimer = window.setTimeout(() => {
      endTimer = 0;
      void commitUtterance();
    }, LIVE_UTTERANCE_END_MS);
  };

  const scheduleRestart = (delayMs = LIVE_RESTART_MS) => {
    clearRestartTimer();
    if (!isActive()) return;
    restartTimer = window.setTimeout(() => {
      restartTimer = 0;
      if (!isActive()) return;
      try {
        recognition?.start();
      } catch {
        scheduleRestart(Math.min(delayMs + 120, 900));
      }
    }, delayMs);
  };

  const stopRecognition = () => {
    clearEndTimer();
    clearRestartTimer();
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  };

  function onLiveSpeechActivity(phrase, { interim = false } = {}) {
    if (!isActive() || !interim) return;
    const now = Date.now();
    if (now < bargeCooldownUntil) return;
    if (!deps.shouldBargeIn?.()) return;
    bargeCooldownUntil = now + 900;
    void deps.bargeInLiveDialog?.();
  }

  const bindRecognition = (rec) => {
    recognition = rec;
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      deps.state.micActive = true;
      deps.syncMicButtonUi?.({ force: true });
      deps.syncVoiceRecordTimer?.();
    };

    recognition.onresult = (event) => {
      if (!isActive()) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) utteranceFinal += part;
        else interim += part;
      }
      utteranceInterim = interim;
      const phrase = currentPhrase();
      if (phrase.length >= LIVE_BARGE_IN_MIN_CHARS) {
        onLiveSpeechActivity(phrase, { interim: Boolean(interim) });
      }
      deps.setLiveUserSpeaking?.(Boolean(phrase));
      if (phrase) deps.renderPhase?.("listening", phrase);
      else deps.renderPhase?.("waiting", deps.getLiveListeningPhrase?.() || "Живой диалог · жду");
      if (phrase) scheduleUtteranceEnd();
    };

    recognition.onerror = (event) => {
      const code = String(event.error || "unknown");
      if (isActive() && (code === "no-speech" || code === "aborted")) {
        scheduleRestart();
        return;
      }
      deps.state.micActive = false;
      if (code === "not-allowed") {
        void stop({ notify: false });
        deps.renderPhase?.("waiting", "Нет доступа к микрофону · разрешите в Safari");
        deps.showMicPermissionDialog?.("denied");
        return;
      }
      if (code === "service-not-allowed" || deps.shellPermissionIssue?.()) {
        void stop({ notify: false });
        deps.renderPhase?.("waiting", `Нужен HTTPS · ${deps.getShellHttpsUrl?.()}`);
        deps.showMicPermissionDialog?.("insecure");
        return;
      }
      if (isActive()) scheduleRestart(320);
      else deps.renderPhase?.("waiting", code || "Ошибка распознавания");
    };

    recognition.onend = () => {
      deps.state.micActive = false;
      if (isActive()) scheduleRestart();
      else deps.syncMicButtonUi?.({ force: true });
    };
  };

  async function commitUtterance() {
    if (!isActive() || deps.isVoiceSttProcessing?.()) return;
    const text = currentPhrase();
    resetUtterance();
    if (!text) return;
    try {
      await deps.handleLiveUtterance?.(text);
    } catch (error) {
      deps.renderPhase?.("waiting", error?.message || "Не удалось отправить фразу");
    } finally {
      if (isActive()) {
        deps.renderPhase?.("waiting", deps.getLiveListeningPhrase?.() || "Живой диалог · жду");
      }
    }
  }

  async function start() {
    if (isActive() || starting) return true;
    if (!recognition) {
      throw new Error("Web Speech недоступен — выберите движок «Web Speech» для живого диалога");
    }
    if (deps.shellPermissionIssue?.()) {
      throw new Error(`Нужен HTTPS для микрофона · ${deps.getShellHttpsUrl?.()}`);
    }

    starting = true;
    deps.shellTapVoice?.abortSession?.();
    resetUtterance();
    primeShellProcessingAudio();
    playShellMicSound("press");
    hapticTap();
    deps.markShellAudioGesture?.();
    void deps.unlockShellAudio?.({ markGesture: true });
    deps.clearShellError?.();

    try {
      if (!deps.state.micWarmed) {
        await deps.warmUpMicrophone?.();
        deps.state.micWarmed = true;
      }
      deps.setLiveUserSpeaking?.(false);
      deps.state.liveDialogActive = true;
      deps.syncMicButtonUi?.({ force: true });
      deps.syncVoiceRecordTimer?.();
      deps.renderPhase?.("waiting", deps.getLiveListeningPhrase?.() || "Живой диалог · жду");
      void acquireShellWakeLock(deps.state, "live-dialog");
      try {
        recognition.start();
      } catch (error) {
        const msg = String(error?.message || error?.name || "");
        if (!/already/i.test(msg) && error?.name !== "InvalidStateError") throw error;
      }
      return true;
    } catch (error) {
      deps.state.liveDialogActive = false;
      deps.state.micActive = false;
      deps.syncMicButtonUi?.({ force: true });
      deps.syncVoiceRecordTimer?.();
      void releaseShellWakeLock(deps.state, "live-dialog");
      throw error;
    } finally {
      starting = false;
    }
  }

  async function stop({ notify = true } = {}) {
    if (!isActive() && !starting) return;
    deps.state.liveDialogActive = false;
    deps.state.micActive = false;
    deps.setLiveUserSpeaking?.(false);
    resetUtterance();
    stopRecognition();
    void releaseShellWakeLock(deps.state, "live-dialog");
    deps.syncMicButtonUi?.({ force: true });
    deps.syncVoiceRecordTimer?.();
    if (notify) {
      playShellMicSound("release");
      hapticTap();
      deps.renderPhase?.("waiting", deps.getHeroIdlePhrase?.() || "Ожидаю");
    }
  }

  async function toggle() {
    if (isActive()) {
      await stop();
      return false;
    }
    await start();
    return true;
  }

  return {
    bindRecognition,
    start,
    stop,
    toggle,
    isActive
  };
}
