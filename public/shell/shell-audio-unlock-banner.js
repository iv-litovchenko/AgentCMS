/** Плашка «Включить звук» — на iOS Safari показывается при каждой загрузке страницы. */

import {
  isIosDevice,
  isShellAudioGestureFresh,
  markShellAudioGesture,
  unlockShellAudio
} from "@shell/audio-unlock";
import { playShellUiSound, primeShellProcessingAudio } from "@shell/ui-sounds";

/** @type {HTMLElement | null} */
let bannerElRef = null;
/** @type {HTMLButtonElement | null} */
let enableBtnRef = null;
let unlocking = false;
let sessionDismissed = false;

export function shouldOfferAudioUnlockBanner() {
  if (!isIosDevice()) return false;
  if (sessionDismissed) return false;
  return true;
}

export function dismissShellAudioUnlockBanner() {
  sessionDismissed = true;
  bannerElRef?.classList.add("hidden");
}

export function syncShellAudioUnlockBanner() {
  if (!bannerElRef || bannerElRef.classList.contains("hidden")) return;
  if (!isShellAudioGestureFresh()) return;
  dismissShellAudioUnlockBanner();
}

/**
 * @param {{
 *   bannerEl?: HTMLElement | null,
 *   enableBtn?: HTMLButtonElement | null
 * }} options
 */
export function initShellAudioUnlockBanner({ bannerEl, enableBtn } = {}) {
  bannerElRef = bannerEl || null;
  enableBtnRef = enableBtn || null;
  if (!bannerElRef || !enableBtnRef) return;
  if (!shouldOfferAudioUnlockBanner()) return;

  enableBtnRef.disabled = false;
  enableBtnRef.textContent = "🔊 Включить звук";
  bannerElRef.classList.remove("hidden");

  if (enableBtnRef.dataset.shellBound === "1") return;
  enableBtnRef.dataset.shellBound = "1";

  enableBtnRef.addEventListener("click", async () => {
    if (unlocking) return;
    unlocking = true;
    enableBtnRef.disabled = true;
    enableBtnRef.textContent = "…";

    markShellAudioGesture({ extendMs: 300_000 });
    primeShellProcessingAudio();
    const unlocked = await unlockShellAudio({ markGesture: true });

    if (unlocked || isShellAudioGestureFresh()) {
      await playShellUiSound("switch");
      enableBtnRef.textContent = "Готово ✓";
      dismissShellAudioUnlockBanner();
      unlocking = false;
      return;
    }

    enableBtnRef.disabled = false;
    enableBtnRef.textContent = "Ещё раз";
    unlocking = false;
  });
}
