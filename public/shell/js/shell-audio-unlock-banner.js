/** iOS Safari: один touch на экран → звук разблокирован; pending TTS стартует на следующем касании. */

import {
  isIosDevice,
  isShellAudioGestureFresh,
  markShellAudioGesture,
  unlockShellAudio
} from "@shell/audio-unlock";
import { playShellUiSound, primeShellProcessingAudio } from "@shell/ui-sounds";

const TAB_AUDIO_OK_KEY = "agentcms.shell.iosAudioOk.v1";
const TAB_GESTURE_MS = 8 * 60 * 60 * 1000;

/** @type {HTMLElement | null} */
let hintElRef = null;
/** @type {HTMLButtonElement | null} */
let enableBtnRef = null;
/** @type {(() => boolean | void) | null} */
let onResumePendingTts = null;
let bridgeInstalled = false;
let pendingTtsResume = false;
let hintHidden = false;

function isTabAudioUnlocked() {
  try {
    return sessionStorage.getItem(TAB_AUDIO_OK_KEY) === "1";
  } catch {
    return false;
  }
}

function markTabAudioUnlocked() {
  try {
    sessionStorage.setItem(TAB_AUDIO_OK_KEY, "1");
  } catch {
    // ignore
  }
  markShellAudioGesture({ extendMs: TAB_GESTURE_MS });
  hideHint();
}

function hideHint() {
  hintHidden = true;
  hintElRef?.classList.add("hidden");
}

export function dismissShellAudioUnlockBanner() {
  hideHint();
}

export function syncShellAudioUnlockBanner() {
  if (hintHidden || !hintElRef || hintElRef.classList.contains("hidden")) return;
  if (!isShellAudioGestureFresh()) return;
  hideHint();
}

export function armIosPendingTtsPlayback() {
  if (!isIosDevice()) return;
  pendingTtsResume = true;
}

function tryResumePendingTts() {
  if (!pendingTtsResume || !onResumePendingTts) return;
  const resumed = onResumePendingTts();
  if (resumed) pendingTtsResume = false;
}

function handleIosUserTouch() {
  if (!isIosDevice()) return;

  markShellAudioGesture({ extendMs: TAB_GESTURE_MS });
  primeShellProcessingAudio();
  void unlockShellAudio({ markGesture: true });

  if (!isTabAudioUnlocked()) {
    markTabAudioUnlocked();
    void playShellUiSound("switch");
  }

  tryResumePendingTts();
}

function installIosTouchBridge() {
  if (bridgeInstalled || !isIosDevice()) return;
  bridgeInstalled = true;
  const opts = { capture: true, passive: true };
  document.addEventListener("touchstart", handleIosUserTouch, opts);
  document.addEventListener("click", handleIosUserTouch, opts);
}

function bindEnableButton() {
  if (!enableBtnRef || enableBtnRef.dataset.shellBound === "1") return;
  enableBtnRef.dataset.shellBound = "1";
  enableBtnRef.addEventListener("click", (event) => {
    event.stopPropagation();
    handleIosUserTouch();
    tryResumePendingTts();
  });
}

/** @deprecated — больше не показываем плашку при каждом ответе */
export function showShellAudioUnlockBanner() {
  armIosPendingTtsPlayback();
}

export function shouldOfferAudioUnlockBanner() {
  if (!isIosDevice()) return false;
  if (hintHidden || isTabAudioUnlocked()) return false;
  return !isShellAudioGestureFresh();
}

/**
 * @param {{
 *   bannerEl?: HTMLElement | null,
 *   enableBtn?: HTMLButtonElement | null,
 *   onUnlockGesture?: (() => boolean | void) | null
 * }} options
 */
export function initShellAudioUnlockBanner({ bannerEl, enableBtn, onUnlockGesture: onResume } = {}) {
  hintElRef = bannerEl || null;
  enableBtnRef = enableBtn || null;
  onResumePendingTts = onResume || null;

  installIosTouchBridge();
  bindEnableButton();

  if (isTabAudioUnlocked()) {
    hideHint();
    return;
  }

  if (shouldOfferAudioUnlockBanner()) {
    hintElRef?.classList.remove("hidden");
  }
}
