/** Shared AudioContext — unlock/resume on user gesture (iOS Safari). */
let audioCtx = null;

export function getMobileAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
  return audioCtx;
}

export async function unlockMobileAudio() {
  const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ctx = getMobileAudioContext();
  if (ctx) {
    try {
      await Promise.race([ctx.resume(), timeout(400)]);
    } catch {
      // ignore
    }
  }
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
  } catch {
    // ignore — Web Audio path may still work
  }
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
