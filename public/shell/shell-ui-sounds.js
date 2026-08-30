import { getShellAudioContext, unlockShellAudio } from "@shell/audio-unlock";

function playTone(ctx, { frequency, duration = 0.08, type = "sine", gain = 0.2, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

async function ensureAudioContext() {
  const ctx = getShellAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
  await unlockShellAudio();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === "running" ? ctx : null;
}

/** Вызовите синхронно из click/keydown — иначе браузер заблокирует Web Audio. */
export function primeShellProcessingAudio() {
  const ctx = getShellAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  void unlockShellAudio();
}

/** @type {null | (() => void)} */
let stopProcessingAmbient = null;

/** Мягкий «тик» / «так» — короткий bandpass-click, слышно даже тихо. */
function playSoftClockClick(ctx, output, kind = "tick") {
  const t0 = ctx.currentTime;
  const isTick = kind === "tick";
  const duration = 0.04;
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.ceil(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.2));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = isTick ? 3400 : 1900;
  filter.Q.value = 0.85;

  const tone = ctx.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(isTick ? 1760 : 1046, t0);

  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0, t0);
  toneGain.gain.linearRampToValueAtTime(isTick ? 0.045 : 0.032, t0 + 0.002);
  toneGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0, t0);
  clickGain.gain.linearRampToValueAtTime(isTick ? 0.11 : 0.085, t0 + 0.001);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  source.connect(filter);
  filter.connect(clickGain);
  tone.connect(toneGain);
  clickGain.connect(output);
  toneGain.connect(output);
  source.start(t0);
  tone.start(t0);
  tone.stop(t0 + duration + 0.01);
}

/** Мягкий ритм «тик-так» пока идёт «Обрабатываю». */
export async function startShellProcessingAmbient() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  stopShellProcessingAmbient();

  try {
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    let tickPhase = true;
    let tickTimer = null;
    let stopped = false;

    const pulse = () => {
      if (stopped) return;
      playSoftClockClick(ctx, master, tickPhase ? "tick" : "tock");
      tickPhase = !tickPhase;
      tickTimer = window.setTimeout(pulse, tickPhase ? 520 : 580);
    };

    pulse();

    stopProcessingAmbient = () => {
      stopped = true;
      if (tickTimer) window.clearTimeout(tickTimer);
      tickTimer = null;
      window.setTimeout(() => {
        try {
          master.disconnect();
        } catch {
          // ignore
        }
      }, 80);
      stopProcessingAmbient = null;
    };
  } catch {
    stopProcessingAmbient = null;
  }
}

export function stopShellProcessingAmbient() {
  stopProcessingAmbient?.();
  stopProcessingAmbient = null;
}

/**
 * @param {"saved" | "toggle" | "switch"} kind
 */
export async function playShellUiSound(kind = "saved") {
  try {
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    if (kind === "toggle") {
      playTone(ctx, { frequency: 523.25, duration: 0.038, gain: 0.045, type: "sine" });
      return;
    }

    if (kind === "switch") {
      playTone(ctx, { frequency: 349.23, duration: 0.06, gain: 0.14, type: "sine" });
      playTone(ctx, { frequency: 392, duration: 0.07, gain: 0.1, type: "sine", delay: 0.06 });
      return;
    }

    playTone(ctx, { frequency: 493.88, duration: 0.085, gain: 0.18, type: "sine" });
    playTone(ctx, { frequency: 587.33, duration: 0.1, gain: 0.14, type: "sine", delay: 0.09 });
  } catch {
    // ignore
  }
}
