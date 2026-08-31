import { getShellAudioContext, unlockShellAudio } from "@shell/audio-unlock";

const PROCESSING_SOUND_KEY = "agentcms.shell.processingSound.v1";
const DEFAULT_PROCESSING_SOUND = "gurgle";

export const PROCESSING_SOUND_IDS = [
  "clock",
  "heartbeat",
  "sonar",
  "chimes",
  "pulse",
  "rain",
  "type",
  "wood",
  "bubbles",
  "spark",
  "search",
  "gurgle",
  "pendulum",
  "hold",
  "air",
  "drip",
  "hum",
  "sand",
  "far",
  "swell",
  "note",
  "room",
  "breeze",
  "breath",
  "wind",
  "whisper",
  "gust",
  "hollow",
  "flutter",
  "draft",
  "mist",
  "sigh"
];

export const PROCESSING_SOUND_OPTIONS = [
  { id: "clock", label: "Тик-так", hint: "Мягкие часы" },
  { id: "heartbeat", label: "Сердце", hint: "Двойной пульс" },
  { id: "sonar", label: "Сонар", hint: "Тихий пинг" },
  { id: "chimes", label: "Колокольчики", hint: "Редкие ноты" },
  { id: "pulse", label: "Пульс", hint: "Дыхание баса" },
  { id: "rain", label: "Капли", hint: "Редкий дождь" },
  { id: "type", label: "Клавиши", hint: "Печатает" },
  { id: "wood", label: "Дерево", hint: "Деревянный метроном" },
  { id: "bubbles", label: "Пузырьки", hint: "Вода" },
  { id: "spark", label: "Искры", hint: "Короткие вспышки" },
  { id: "search", label: "Поиск", hint: "Цифровое мерцание" },
  { id: "gurgle", label: "Буль-буль", hint: "Буль-буль-буль" },
  { id: "pendulum", label: "Маятник", hint: "Тёплый тик" },
  { id: "hold", label: "Ожидание", hint: "Две мягкие ноты" },
  { id: "air", label: "Воздух", hint: "Тихое дыхание" },
  { id: "drip", label: "Капля", hint: "Редкая и мягкая" },
  { id: "hum", label: "Гул", hint: "Тёплый фон" },
  { id: "sand", label: "Песок", hint: "Часы с песком" },
  { id: "far", label: "Далеко", hint: "Глухой пинг" },
  { id: "swell", label: "Волна", hint: "Мягкий шум" },
  { id: "note", label: "Нота", hint: "Одна тёплая" },
  { id: "room", label: "Тишина", hint: "Лёгкий шорох" },
  { id: "breeze", label: "Ветерок", hint: "Лёгкий ветер" },
  { id: "breath", label: "Вдох", hint: "Вдох и выдох" },
  { id: "wind", label: "Ветер", hint: "Мягкий поток" },
  { id: "whisper", label: "Шёпот", hint: "Воздушный шёпот" },
  { id: "gust", label: "Порыв", hint: "Редкий вздох ветра" },
  { id: "hollow", label: "Пустота", hint: "Воздух в трубе" },
  { id: "flutter", label: "Порхание", hint: "Ткань на ветру" },
  { id: "draft", label: "Сквозняк", hint: "Тонкая струя" },
  { id: "mist", label: "Дымка", hint: "Очень тихо" },
  { id: "sigh", label: "Вздох", hint: "Длинный выдох" }
];

export function normalizeProcessingSound(id) {
  const raw = String(id || "").trim();
  return PROCESSING_SOUND_IDS.includes(raw) ? raw : DEFAULT_PROCESSING_SOUND;
}

export function readProcessingSound() {
  try {
    const stored = localStorage.getItem(PROCESSING_SOUND_KEY);
    if (stored == null || stored === "") return DEFAULT_PROCESSING_SOUND;
    return normalizeProcessingSound(stored);
  } catch {
    return DEFAULT_PROCESSING_SOUND;
  }
}

export function writeProcessingSound(id) {
  const next = normalizeProcessingSound(id);
  try {
    localStorage.setItem(PROCESSING_SOUND_KEY, next);
  } catch {
    // ignore quota / private mode
  }
  return next;
}

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

function createNoiseBuffer(ctx, duration, decay = 0.2) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * decay));
  }
  return buffer;
}

function playFilteredNoise(ctx, output, { frequency, q = 0.9, gain = 0.08, duration = 0.04, type = "bandpass" }) {
  const t0 = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  source.connect(filter);
  filter.connect(g);
  g.connect(output);
  source.start(t0);
}

function playSoftTone(ctx, output, { frequency, duration, gain, type = "sine", attack = 0.008, slideTo } = {}) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(output);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function scheduleLoop(ctl, nextDelay, tick) {
  const pulse = () => {
    if (ctl.stopped) return;
    tick();
    ctl.timer = window.setTimeout(pulse, nextDelay());
  };
  pulse();
}

/** Мягкий «тик» / «так» — короткий bandpass-click, слышно даже тихо. */
function playSoftClockClick(ctx, output, kind = "tick") {
  const t0 = ctx.currentTime;
  const isTick = kind === "tick";
  const duration = 0.04;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, duration);
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

function startClock(ctx, output, ctl) {
  let tickPhase = true;
  scheduleLoop(
    ctl,
    () => (tickPhase ? 520 : 580),
    () => {
      playSoftClockClick(ctx, output, tickPhase ? "tick" : "tock");
      tickPhase = !tickPhase;
    }
  );
}

function startHeartbeat(ctx, output, ctl) {
  const beat = (freq, gain, duration) => {
    playSoftTone(ctx, output, { frequency: freq, duration, gain, attack: 0.018 });
  };
  scheduleLoop(
    ctl,
    () => 980,
    () => {
      beat(62, 0.07, 0.16);
      window.setTimeout(() => {
        if (!ctl.stopped) beat(48, 0.055, 0.2);
      }, 210);
    }
  );
}

function startSonar(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 1320,
    () => {
      playSoftTone(ctx, output, {
        frequency: 784,
        slideTo: 620,
        duration: 0.55,
        gain: 0.055,
        attack: 0.004
      });
      playFilteredNoise(ctx, output, { frequency: 1200, q: 2.2, gain: 0.03, duration: 0.08 });
    }
  );
}

const CHIME_NOTES = [523.25, 587.33, 659.25, 783.99, 880];

function startChimes(ctx, output, ctl) {
  let last = -1;
  scheduleLoop(
    ctl,
    () => 720 + Math.random() * 700,
    () => {
      let index = Math.floor(Math.random() * CHIME_NOTES.length);
      if (index === last) index = (index + 2) % CHIME_NOTES.length;
      last = index;
      playSoftTone(ctx, output, {
        frequency: CHIME_NOTES[index],
        duration: 1.15,
        gain: 0.032,
        attack: 0.012
      });
    }
  );
}

function startPulse(ctx, output, ctl) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 88;
  g.gain.value = 0.001;
  osc.connect(g);
  g.connect(output);
  osc.start();
  ctl.nodes.push(osc, g);
  const breathe = () => {
    if (ctl.stopped) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.001, g.gain.value), t);
    g.gain.linearRampToValueAtTime(0.038, t + 0.85);
    g.gain.linearRampToValueAtTime(0.006, t + 1.75);
    ctl.timer = window.setTimeout(breathe, 1760);
  };
  breathe();
}

function startRain(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 90 + Math.random() * 220,
    () => {
      const high = Math.random() > 0.35;
      playFilteredNoise(ctx, output, {
        frequency: high ? 4200 + Math.random() * 1800 : 2400 + Math.random() * 900,
        q: 1.1,
        gain: high ? 0.055 : 0.04,
        duration: 0.035 + Math.random() * 0.03
      });
    }
  );
}

function startType(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => (Math.random() > 0.86 ? 380 : 70 + Math.random() * 150),
    () => {
      playFilteredNoise(ctx, output, {
        frequency: 1700 + Math.random() * 900,
        q: 1.4,
        gain: 0.07,
        duration: 0.028
      });
      playSoftTone(ctx, output, {
        frequency: 2100 + Math.random() * 400,
        duration: 0.022,
        gain: 0.018,
        attack: 0.001
      });
    }
  );
}

function startWood(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 640,
    () => {
      playFilteredNoise(ctx, output, { frequency: 920, q: 2.4, gain: 0.08, duration: 0.032, type: "bandpass" });
      playSoftTone(ctx, output, { frequency: 740, duration: 0.045, gain: 0.04, type: "triangle", attack: 0.002 });
    }
  );
}

function startBubbles(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 320 + Math.random() * 520,
    () => {
      const start = 220 + Math.random() * 180;
      playSoftTone(ctx, output, {
        frequency: start,
        slideTo: start * (2.4 + Math.random() * 1.1),
        duration: 0.16 + Math.random() * 0.08,
        gain: 0.04,
        attack: 0.006
      });
    }
  );
}

function startSpark(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 380 + Math.random() * 720,
    () => {
      const count = Math.random() > 0.7 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        window.setTimeout(() => {
          if (ctl.stopped) return;
          playSoftTone(ctx, output, {
            frequency: 2400 + Math.random() * 2200,
            duration: 0.03,
            gain: 0.028,
            attack: 0.001
          });
          playFilteredNoise(ctx, output, {
            frequency: 5000,
            q: 3.2,
            gain: 0.025,
            duration: 0.018
          });
        }, i * 42);
      }
    }
  );
}

function playGurgle(ctx, output, { startFreq, endFreq, duration, gain }) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const body = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sine";
  body.type = "sine";
  osc.frequency.setValueAtTime(startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + duration);
  body.frequency.setValueAtTime(startFreq * 0.5, t0);
  body.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq * 0.48), t0 + duration);
  filter.type = "lowpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(startFreq * 3.2, t0);
  filter.frequency.exponentialRampToValueAtTime(endFreq * 2.4, t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.014);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(filter);
  body.connect(filter);
  filter.connect(g);
  g.connect(output);
  osc.start(t0);
  body.start(t0);
  osc.stop(t0 + duration + 0.02);
  body.stop(t0 + duration + 0.02);
  playFilteredNoise(ctx, output, {
    frequency: startFreq * 2.1,
    q: 1.6,
    gain: gain * 0.4,
    duration: 0.028
  });
}

/** Фраза «буль · буль · буль» — мягкие водяные бульки. */
function startGurgle(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 1480 + Math.random() * 280,
    () => {
      playGurgle(ctx, output, { startFreq: 188, endFreq: 390, duration: 0.11, gain: 0.046 });
      later(ctl, 168, () => {
        playGurgle(ctx, output, { startFreq: 160, endFreq: 350, duration: 0.12, gain: 0.042 });
      });
      later(ctl, 360, () => {
        playGurgle(ctx, output, { startFreq: 128, endFreq: 268, duration: 0.18, gain: 0.05 });
      });
    }
  );
}

function later(ctl, ms, fn) {
  window.setTimeout(() => {
    if (!ctl.stopped) fn();
  }, ms);
}

/** Короткое цифровое мерцание + тихие клики + воздушные импульсы. */
function startSearch(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 1720 + Math.random() * 320,
    () => {
      playSoftTone(ctx, output, {
        frequency: 2480 + Math.random() * 180,
        duration: 0.26,
        gain: 0.016,
        attack: 0.03
      });
      playSoftTone(ctx, output, {
        frequency: 3120 + Math.random() * 220,
        duration: 0.2,
        gain: 0.012,
        attack: 0.02
      });
      playFilteredNoise(ctx, output, {
        frequency: 6800,
        q: 3.6,
        gain: 0.018,
        duration: 0.11
      });

      const clicks = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clicks; i++) {
        later(ctl, 90 + i * 72, () => {
          playFilteredNoise(ctx, output, {
            frequency: 2400 + i * 260,
            q: 2.8,
            gain: 0.028,
            duration: 0.016
          });
          playSoftTone(ctx, output, {
            frequency: 1540 + i * 90,
            duration: 0.02,
            gain: 0.012,
            attack: 0.002
          });
        });
      }

      later(ctl, 380, () => {
        playSoftTone(ctx, output, {
          frequency: 680 + Math.random() * 80,
          slideTo: 1080,
          duration: 0.32,
          gain: 0.026,
          attack: 0.045
        });
      });
      later(ctl, 620, () => {
        playSoftTone(ctx, output, {
          frequency: 980,
          slideTo: 740,
          duration: 0.26,
          gain: 0.018,
          attack: 0.05
        });
      });
    }
  );
}

function playWarmTone(ctx, output, { frequency, duration, gain, attack = 0.05, slideTo, lowpass = 1200 }) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  filter.Q.value = 0.65;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(filter);
  filter.connect(g);
  g.connect(output);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

function createLoopNoise(ctx, seconds = 1.2) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function startPendulum(ctx, output, ctl) {
  let left = true;
  scheduleLoop(
    ctl,
    () => (left ? 980 : 1040),
    () => {
      playWarmTone(ctx, output, {
        frequency: left ? 196 : 147,
        duration: 0.09,
        gain: left ? 0.032 : 0.026,
        attack: 0.02,
        lowpass: 700
      });
      left = !left;
    }
  );
}

function startHold(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2100,
    () => {
      playWarmTone(ctx, output, { frequency: 349, duration: 0.42, gain: 0.028, attack: 0.06, lowpass: 900 });
      later(ctl, 220, () => {
        playWarmTone(ctx, output, { frequency: 262, duration: 0.5, gain: 0.024, attack: 0.07, lowpass: 800 });
      });
    }
  );
}

function startAir(ctx, output, ctl) {
  const src = ctx.createBufferSource();
  src.buffer = createLoopNoise(ctx, 1.4);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 780;
  filter.Q.value = 0.55;
  const g = ctx.createGain();
  g.gain.value = 0.001;
  src.connect(filter);
  filter.connect(g);
  g.connect(output);
  src.start();
  ctl.nodes.push(src, filter, g);
  const breathe = () => {
    if (ctl.stopped) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.001, g.gain.value), t);
    g.gain.linearRampToValueAtTime(0.026, t + 1.15);
    g.gain.linearRampToValueAtTime(0.005, t + 2.3);
    ctl.timer = window.setTimeout(breathe, 2300);
  };
  breathe();
}

function startDrip(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 1760 + Math.random() * 520,
    () => {
      playWarmTone(ctx, output, {
        frequency: 420,
        slideTo: 240,
        duration: 0.16,
        gain: 0.03,
        attack: 0.012,
        lowpass: 1000
      });
      playFilteredNoise(ctx, output, { frequency: 900, q: 1.2, gain: 0.02, duration: 0.04 });
    }
  );
}

function startHum(ctx, output, ctl) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 68;
  filter.type = "lowpass";
  filter.frequency.value = 240;
  g.gain.value = 0.001;
  osc.connect(filter);
  filter.connect(g);
  g.connect(output);
  osc.start();
  ctl.nodes.push(osc, filter, g);
  const breathe = () => {
    if (ctl.stopped) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.001, g.gain.value), t);
    g.gain.linearRampToValueAtTime(0.03, t + 1.4);
    g.gain.linearRampToValueAtTime(0.008, t + 2.8);
    ctl.timer = window.setTimeout(breathe, 2800);
  };
  breathe();
}

function startSand(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 420 + Math.random() * 620,
    () => {
      playFilteredNoise(ctx, output, {
        frequency: 720 + Math.random() * 380,
        q: 0.7,
        gain: 0.022,
        duration: 0.055 + Math.random() * 0.04
      });
    }
  );
}

function startFar(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2200 + Math.random() * 400,
    () => {
      playWarmTone(ctx, output, {
        frequency: 494,
        slideTo: 430,
        duration: 0.55,
        gain: 0.022,
        attack: 0.09,
        lowpass: 780
      });
    }
  );
}

function startSwell(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2000,
    () => {
      playFilteredNoise(ctx, output, { frequency: 640, q: 0.55, gain: 0.03, duration: 0.55 });
      playWarmTone(ctx, output, {
        frequency: 110,
        slideTo: 92,
        duration: 0.7,
        gain: 0.024,
        attack: 0.12,
        lowpass: 400
      });
    }
  );
}

function startNote(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2000,
    () => {
      playWarmTone(ctx, output, { frequency: 329.6, duration: 0.82, gain: 0.03, attack: 0.08, lowpass: 900 });
    }
  );
}

function startRoom(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 700 + Math.random() * 900,
    () => {
      playFilteredNoise(ctx, output, {
        frequency: 1100 + Math.random() * 400,
        q: 0.9,
        gain: 0.016,
        duration: 0.03 + Math.random() * 0.025
      });
    }
  );
}

function startNoiseBed(ctx, output, ctl, {
  cutoff = 780,
  q = 0.55,
  peak = 0.026,
  floor = 0.005,
  rise = 1.15,
  fall = 1.15,
  filterType = "lowpass",
  sweepTo = null
} = {}) {
  const src = ctx.createBufferSource();
  src.buffer = createLoopNoise(ctx, 1.5);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0.001;
  src.connect(filter);
  filter.connect(g);
  g.connect(output);
  src.start();
  ctl.nodes.push(src, filter, g);
  const cycleMs = Math.round((rise + fall) * 1000);
  const breathe = () => {
    if (ctl.stopped) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.001, g.gain.value), t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.linearRampToValueAtTime(floor, t + rise + fall);
    if (sweepTo != null) {
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(filter.frequency.value, t);
      filter.frequency.linearRampToValueAtTime(sweepTo, t + rise);
      filter.frequency.linearRampToValueAtTime(cutoff, t + rise + fall);
    }
    ctl.timer = window.setTimeout(breathe, cycleMs);
  };
  breathe();
}

function startBreeze(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, { cutoff: 520, peak: 0.022, floor: 0.006, rise: 1.6, fall: 1.8 });
}

function startBreath(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, {
    cutoff: 640,
    sweepTo: 980,
    peak: 0.03,
    floor: 0.003,
    rise: 0.85,
    fall: 1.35
  });
}

function startWind(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, {
    cutoff: 420,
    sweepTo: 880,
    peak: 0.028,
    floor: 0.008,
    rise: 1.8,
    fall: 1.6
  });
}

function startWhisper(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, {
    cutoff: 1400,
    q: 0.9,
    filterType: "bandpass",
    peak: 0.02,
    floor: 0.004,
    rise: 1.1,
    fall: 1.4
  });
}

function startGust(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2100 + Math.random() * 400,
    () => {
      playFilteredNoise(ctx, output, { frequency: 580, q: 0.5, gain: 0.034, duration: 0.62 });
      playWarmTone(ctx, output, {
        frequency: 96,
        slideTo: 78,
        duration: 0.7,
        gain: 0.02,
        attack: 0.14,
        lowpass: 360
      });
    }
  );
}

function startHollow(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, {
    cutoff: 280,
    q: 1.4,
    filterType: "bandpass",
    peak: 0.032,
    floor: 0.007,
    rise: 1.5,
    fall: 1.7,
    sweepTo: 360
  });
}

function startFlutter(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, { cutoff: 900, q: 0.6, peak: 0.02, floor: 0.01, rise: 0.28, fall: 0.32 });
}

function startDraft(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, { cutoff: 1100, peak: 0.018, floor: 0.008, rise: 2.2, fall: 2.0 });
}

function startMist(ctx, output, ctl) {
  startNoiseBed(ctx, output, ctl, { cutoff: 480, peak: 0.016, floor: 0.006, rise: 2.4, fall: 2.6 });
}

function startSigh(ctx, output, ctl) {
  scheduleLoop(
    ctl,
    () => 2400,
    () => {
      playFilteredNoise(ctx, output, { frequency: 720, q: 0.45, gain: 0.03, duration: 0.85 });
      playWarmTone(ctx, output, {
        frequency: 186,
        slideTo: 128,
        duration: 0.95,
        gain: 0.022,
        attack: 0.16,
        lowpass: 500
      });
    }
  );
}

const PROCESSING_STARTERS = {
  clock: startClock,
  heartbeat: startHeartbeat,
  sonar: startSonar,
  chimes: startChimes,
  pulse: startPulse,
  rain: startRain,
  type: startType,
  wood: startWood,
  bubbles: startBubbles,
  spark: startSpark,
  search: startSearch,
  gurgle: startGurgle,
  pendulum: startPendulum,
  hold: startHold,
  air: startAir,
  drip: startDrip,
  hum: startHum,
  sand: startSand,
  far: startFar,
  swell: startSwell,
  note: startNote,
  room: startRoom,
  breeze: startBreeze,
  breath: startBreath,
  wind: startWind,
  whisper: startWhisper,
  gust: startGust,
  hollow: startHollow,
  flutter: startFlutter,
  draft: startDraft,
  mist: startMist,
  sigh: startSigh
};

/** @type {null | { stop: () => void }} */
let activeProcessing = null;
let previewTimer = null;

function clearPreviewTimer() {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
}

function connectMaster(ctx) {
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  return master;
}

function beginProcessing(ctx, id) {
  const master = connectMaster(ctx);
  const ctl = { stopped: false, timer: null, nodes: [] };
  const start = PROCESSING_STARTERS[normalizeProcessingSound(id)] || startGurgle;
  start(ctx, master, ctl);

  return {
    stop() {
      ctl.stopped = true;
      if (ctl.timer) window.clearTimeout(ctl.timer);
      ctl.timer = null;
      for (const node of ctl.nodes) {
        try {
          if (typeof node.stop === "function") node.stop();
        } catch {
          // already stopped
        }
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
      ctl.nodes = [];
      window.setTimeout(() => {
        try {
          master.disconnect();
        } catch {
          // ignore
        }
      }, 80);
    }
  };
}

/** Мягкий ритм, пока идёт «Обрабатываю». */
export async function startShellProcessingAmbient(id = readProcessingSound()) {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  stopShellProcessingAmbient();

  try {
    const ctx = await ensureAudioContext();
    if (!ctx) return;
    activeProcessing = beginProcessing(ctx, id);
  } catch {
    activeProcessing = null;
  }
}

export function stopShellProcessingAmbient() {
  clearPreviewTimer();
  activeProcessing?.stop();
  activeProcessing = null;
}

/** Проиграть вариант несколько секунд — из клика по кнопке выбора. */
export async function previewShellProcessingAmbient(id, ms = 6200) {
  await startShellProcessingAmbient(id);
  clearPreviewTimer();
  previewTimer = window.setTimeout(() => {
    previewTimer = null;
    stopShellProcessingAmbient();
  }, ms);
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
