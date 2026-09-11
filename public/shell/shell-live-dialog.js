/** Живой диалог v11: half-duplex TTS + надёжный VAD barge-in. */

import { playShellMicSound, primeShellProcessingAudio } from "@shell/ui-sounds";
import { acquireShellWakeLock, hapticTap, releaseShellWakeLock } from "@shell/voice";

export const LIVE_UTTERANCE_END_MS = 1400;
export const LIVE_BARGE_IN_MIN_CHARS = 3;
export const LIVE_RESTART_MS = 120;
const BARGE_VAD_INTERVAL_MS = 40;
const BARGE_VAD_WARMUP_MS = 480;
const BARGE_VAD_HOT_FRAMES = 5;
const BARGE_VAD_MIN_RMS = 0.028;
const BARGE_VAD_SPIKE_RATIO = 1.48;
const BARGE_VAD_START_DELAY_MS = 120;
const BARGE_MIC_RETRY_MS = 160;
const BARGE_MIC_MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function createShellLiveDialog(deps) {
  let recognition = null;
  let utteranceFinal = "";
  let utteranceInterim = "";
  let endTimer = 0;
  let restartTimer = 0;
  let starting = false;
  let bargeCooldownUntil = 0;
  /** Half-duplex: STT остановлен, пока агент озвучивает (Safari: recognition ломает TTS). */
  let listeningPausedForAgent = false;
  /** VAD-монитор для barge-in (без Web Speech — не рвёт TTS). */
  let bargeMonitorActive = false;
  let bargeStream = null;
  let bargeAudioCtx = null;
  let bargeAnalyser = null;
  let bargeSource = null;
  let bargeTimer = 0;
  let bargeBaseline = 0;
  let bargeHotFrames = 0;
  let bargeStartedAt = 0;
  let bargeRecentPeak = 0;
  let bargeMonitorStarting = false;
  let bargeArmTimer = 0;

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

  const isSendLocked = () => Boolean(deps.isVoiceSttProcessing?.());

  const shouldHoldStt = () =>
    Boolean(
      listeningPausedForAgent ||
        deps.isHalfDuplexPause?.() ||
        deps.isAgentEchoHardBlock?.() && deps.isHalfDuplexPause?.()
    );

  const currentPhrase = () => (utteranceFinal + utteranceInterim).replace(/\s+/g, " ").trim();

  const resetUtterance = () => {
    utteranceFinal = "";
    utteranceInterim = "";
    clearEndTimer();
    if (!deps.state?.liveUserBarging) deps.setLiveUserSpeaking?.(false);
  };

  const scheduleUtteranceEnd = () => {
    clearEndTimer();
    endTimer = window.setTimeout(() => {
      endTimer = 0;
      void commitUtterance();
    }, LIVE_UTTERANCE_END_MS);
  };

  function ensureListening() {
    if (!isActive() || !recognition) return;
    if (shouldHoldStt()) return;
    try {
      recognition.start();
      deps.state.micActive = true;
    } catch (error) {
      const msg = String(error?.message || error?.name || "");
      if (/already/i.test(msg) || error?.name === "InvalidStateError") {
        deps.state.micActive = true;
        return;
      }
      scheduleRestart(80);
    }
  }

  const scheduleRestart = (delayMs = LIVE_RESTART_MS) => {
    clearRestartTimer();
    if (!isActive() || shouldHoldStt()) return;
    restartTimer = window.setTimeout(() => {
      restartTimer = 0;
      if (!isActive() || shouldHoldStt()) return;
      ensureListening();
    }, delayMs);
  };

  const releaseMic = ({ abort = false } = {}) => {
    clearEndTimer();
    clearRestartTimer();
    if (!recognition) return;
    try {
      if (abort) recognition.abort();
      else recognition.stop();
    } catch {
      // ignore
    }
  };

  const stopRecognition = () => {
    listeningPausedForAgent = false;
    releaseMic({ abort: false });
  };

  function clearBargeArmTimer() {
    if (!bargeArmTimer) return;
    clearInterval(bargeArmTimer);
    bargeArmTimer = 0;
  }

  function stopBargeMonitor() {
    clearBargeArmTimer();
    bargeMonitorActive = false;
    bargeHotFrames = 0;
    bargeBaseline = 0;
    bargeRecentPeak = 0;
    if (bargeTimer) {
      clearInterval(bargeTimer);
      bargeTimer = 0;
    }
    try {
      bargeSource?.disconnect();
    } catch {
      // ignore
    }
    bargeSource = null;
    bargeAnalyser = null;
    if (bargeAudioCtx) {
      void bargeAudioCtx.close().catch(() => {});
      bargeAudioCtx = null;
    }
    if (bargeStream) {
      for (const track of bargeStream.getTracks()) track.stop();
      bargeStream = null;
    }
  }

  function measureMicRms(analyser) {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  function tickBargeMonitor() {
    if (!bargeMonitorActive || !bargeAnalyser || !isActive()) {
      stopBargeMonitor();
      return;
    }
    if (!listeningPausedForAgent && !deps.isHalfDuplexPause?.()) {
      stopBargeMonitor();
      return;
    }
    if (!deps.shouldBargeIn?.()) return;

    const rms = measureMicRms(bargeAnalyser);
    const elapsed = Date.now() - bargeStartedAt;
    if (elapsed < BARGE_VAD_WARMUP_MS) {
      bargeBaseline = bargeBaseline ? bargeBaseline * 0.82 + rms * 0.18 : rms;
      return;
    }

    const prevPeak = bargeRecentPeak;
    bargeRecentPeak = Math.max(bargeRecentPeak * 0.988, rms);
    const spikeThreshold = Math.max(BARGE_VAD_MIN_RMS, prevPeak * BARGE_VAD_SPIKE_RATIO + 0.01);
    const voiceDetected = rms > spikeThreshold;
    if (voiceDetected) {
      bargeHotFrames += 1;
      if (bargeHotFrames >= BARGE_VAD_HOT_FRAMES) {
        const now = Date.now();
        if (now < bargeCooldownUntil) return;
        bargeCooldownUntil = now + 1000;
        stopBargeMonitor();
        void deps.bargeInLiveDialog?.({ phrase: "", voice: true });
      }
    } else {
      bargeHotFrames = Math.max(0, bargeHotFrames - 1);
    }
  }

  async function acquireBargeMicStream() {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    let lastError = null;
    for (let attempt = 0; attempt < BARGE_MIC_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (error) {
        lastError = error;
        if (attempt + 1 < BARGE_MIC_MAX_ATTEMPTS) {
          await sleep(BARGE_MIC_RETRY_MS * (attempt + 1));
        }
      }
    }
    deps.shellLog?.("live", "barge mic failed", String(lastError?.message || lastError?.name || "unknown"));
    return null;
  }

  async function startBargeMonitor() {
    if (!isActive() || !deps.shouldBargeIn?.()) return;
    if (bargeMonitorActive || bargeMonitorStarting) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    bargeMonitorStarting = true;
    stopBargeMonitor();

    try {
      bargeStream = await acquireBargeMicStream();
      if (!bargeStream || !isActive() || !listeningPausedForAgent) return;

      bargeAudioCtx = new AudioContext();
      if (bargeAudioCtx.state === "suspended") {
        await bargeAudioCtx.resume().catch(() => {});
      }
      bargeSource = bargeAudioCtx.createMediaStreamSource(bargeStream);
      bargeAnalyser = bargeAudioCtx.createAnalyser();
      bargeAnalyser.fftSize = 2048;
      bargeSource.connect(bargeAnalyser);
      bargeStartedAt = Date.now();
      bargeBaseline = 0;
      bargeHotFrames = 0;
      bargeRecentPeak = 0;
      bargeMonitorActive = true;
      bargeTimer = window.setInterval(tickBargeMonitor, BARGE_VAD_INTERVAL_MS);
      deps.syncMicButtonUi?.({ force: true });
      deps.shellLog?.("live", "barge monitor on");
    } catch (error) {
      deps.shellLog?.("live", "barge monitor failed", String(error?.message || error));
      stopBargeMonitor();
    } finally {
      bargeMonitorStarting = false;
    }
  }

  function pauseListeningDuringAgent() {
    if (!isActive()) return;
    listeningPausedForAgent = true;
    flushCapture();
    releaseMic({ abort: true });
    deps.state.micActive = false;
    const armBargeMonitor = () => {
      if (!isActive() || !listeningPausedForAgent) return;
      void startBargeMonitor();
    };
    clearBargeArmTimer();
    window.setTimeout(armBargeMonitor, BARGE_VAD_START_DELAY_MS);
    window.setTimeout(armBargeMonitor, BARGE_VAD_START_DELAY_MS + BARGE_MIC_RETRY_MS * 2);
    bargeArmTimer = window.setInterval(() => {
      if (!isActive() || !listeningPausedForAgent) {
        clearBargeArmTimer();
        return;
      }
      if (!bargeMonitorActive && !bargeMonitorStarting && deps.shouldBargeIn?.()) {
        void startBargeMonitor();
      }
    }, 900);
    deps.syncMicButtonUi?.({ force: true });
    deps.syncVoiceRecordTimer?.();
  }

  function resumeListeningAfterAgent() {
    if (!isActive()) return;
    stopBargeMonitor();
    listeningPausedForAgent = false;
    flushCapture();
    deps.state.micActive = false;
    ensureListening();
    deps.syncMicButtonUi?.({ force: true });
    deps.syncVoiceRecordTimer?.();
    deps.renderLiveHeroStatus?.();
  }

  function acceptUserPhrase(phrase) {
    deps.setLiveUserSpeaking?.(Boolean(phrase), phrase);
    if (phrase) {
      deps.renderPhase?.("listening", phrase);
      scheduleUtteranceEnd();
    } else {
      deps.renderLiveHeroStatus?.();
    }
  }

  const bindRecognition = (rec) => {
    recognition = rec;
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (isActive()) deps.state.micActive = true;
      deps.syncMicButtonUi?.({ force: true });
      deps.syncVoiceRecordTimer?.();
    };

    recognition.onresult = (event) => {
      if (!isActive() || shouldHoldStt() || isSendLocked()) {
        flushCapture();
        return;
      }

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) utteranceFinal += part;
        else interim += part;
      }
      utteranceInterim = interim;

      const phrase = currentPhrase();
      if (phrase && deps.utteranceLooksLikeEcho?.(phrase)) {
        flushCapture();
        return;
      }
      acceptUserPhrase(phrase);
    };

    recognition.onerror = (event) => {
      const code = String(event.error || "unknown");
      if (isActive() && (code === "no-speech" || code === "aborted")) {
        if (!shouldHoldStt()) scheduleRestart();
        return;
      }
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
      if (isActive() && !shouldHoldStt()) scheduleRestart(320);
      else if (!isActive()) {
        deps.state.micActive = false;
        deps.renderPhase?.("waiting", code || "Ошибка распознавания");
      }
    };

    recognition.onend = () => {
      if (isActive()) {
        if (shouldHoldStt()) {
          deps.state.micActive = false;
          deps.syncMicButtonUi?.({ force: true });
          return;
        }
        scheduleRestart(80);
        deps.syncMicButtonUi?.({ force: true });
        return;
      }
      deps.state.micActive = false;
      deps.syncMicButtonUi?.({ force: true });
    };
  };

  function flushCapture() {
    clearEndTimer();
    resetUtterance();
  }

  function clearDiscardWindow() {}

  function suspendCapture() {
    if (!isActive()) return;
    flushCapture();
    deps.state.micActive = true;
    if (!shouldHoldStt()) ensureListening();
    deps.syncMicButtonUi?.({ force: true });
  }

  function resumeRecognition() {
    resumeListeningAfterAgent();
  }

  async function commitUtterance() {
    if (!isActive() || shouldHoldStt() || deps.isVoiceSttProcessing?.() || deps.shouldBlockLiveUtterance?.()) {
      flushCapture();
      return;
    }
    const text = currentPhrase();
    flushCapture();
    if (!text) return;
    if (deps.utteranceLooksLikeEcho?.(text)) {
      deps.onEchoSuppressed?.(text);
      return;
    }
    try {
      await deps.handleLiveUtterance?.(text);
    } catch (error) {
      deps.renderPhase?.("waiting", error?.message || "Не удалось отправить фразу");
    } finally {
      deps.state.liveUserBarging = false;
      if (isActive()) deps.renderLiveHeroStatus?.();
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
    deps.state.liveUserBarging = false;
    listeningPausedForAgent = false;
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
      deps.renderLiveHeroStatus?.();
      void acquireShellWakeLock(deps.state, "live-dialog");
      ensureListening();
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
    clearRestartTimer();
    bargeMonitorStarting = false;
    stopBargeMonitor();
    listeningPausedForAgent = false;
    deps.state.liveDialogActive = false;
    deps.state.liveUserBarging = false;
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
    isActive,
    suspendRecognition: suspendCapture,
    suspendCapture,
    resumeRecognition,
    pauseListeningDuringAgent,
    resumeListeningAfterAgent,
    flushCapture,
    clearDiscardWindow,
    ensureListening,
    isRecognitionPaused: () => listeningPausedForAgent,
    isBargeMonitorActive: () => bargeMonitorActive
  };
}
