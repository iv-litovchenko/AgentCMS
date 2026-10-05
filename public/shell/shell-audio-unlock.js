/** Shared AudioContext — unlock/resume on user gesture (iOS Safari). */
let audioCtx = null;
/** Последний user-gesture unlock — iOS разрешает play() только «рядом» с нажатием. */
let gestureUnlockedUntil = 0;
const GESTURE_UNLOCK_MS = 120_000;

export function getShellAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
  return audioCtx;
}

export function markShellAudioGesture({ extendMs = GESTURE_UNLOCK_MS } = {}) {
  gestureUnlockedUntil = Math.max(gestureUnlockedUntil, Date.now() + Math.max(1000, extendMs));
}

export function isShellAudioGestureFresh() {
  return Date.now() < gestureUnlockedUntil;
}

export async function unlockShellAudio({ markGesture = true } = {}) {
  const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ctx = getShellAudioContext();
  if (ctx) {
    try {
      await Promise.race([ctx.resume(), timeout(400)]);
    } catch {
      // ignore
    }
  }
  let unlocked = false;
  try {
    const audio = new Audio();
    audio.preload = "auto";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "true");
    audio.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    audio.volume = 0.01;
    await Promise.race([audio.play(), timeout(400)]);
    audio.pause();
    unlocked = true;
  } catch {
    // ignore — Web Audio path may still work
  }
  if (markGesture && (unlocked || ctx?.state === "running")) {
    markShellAudioGesture();
  }
  return unlocked || ctx?.state === "running";
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
