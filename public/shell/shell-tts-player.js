import {
  getShellAudioContext,
  isIosDevice,
  isShellAudioGestureFresh,
  markShellAudioGesture,
  unlockShellAudio
} from "@shell/audio-unlock";

export function createShellTtsPlayer({
  apiFetch,
  getTtsSettings = () => ({}),
  synthTimeoutMs = 45000,
  onPlaybackBlocked = null,
  onPlaybackStart = null,
  onPlaybackEnd = null
} = {}) {
  /** @type {HTMLAudioElement | null} */
  let audio = null;
  let objectUrl = "";
  let webSource = null;
  let speakGeneration = 0;
  let playbackLive = false;
  /** @type {{ blob: Blob, mimeType: string, text: string } | null} */
  let lastRecording = null;

  function notifyPlaybackStart() {
    try {
      onPlaybackStart?.();
    } catch {
      // ignore
    }
  }

  function notifyPlaybackEnd() {
    try {
      onPlaybackEnd?.();
    } catch {
      // ignore
    }
  }

  function cleanupAudio({ notifyEnd = false } = {}) {
    const wasLive = playbackLive || Boolean(webSource) || Boolean(audio && !audio.ended && audio.currentTime > 0);
    playbackLive = false;
    if (webSource) {
      try {
        webSource.stop();
      } catch {
        // ignore
      }
      webSource.disconnect?.();
      webSource = null;
    }
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.src = "";
      audio.removeAttribute("src");
      audio.load();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
    if (notifyEnd && wasLive) notifyPlaybackEnd();
  }

  function isPlaying() {
    if (playbackLive || webSource) return true;
    if (!audio || audio.ended) return false;
    return !audio.paused || audio.currentTime > 0;
  }

  function isPaused() {
    return Boolean(audio && audio.paused && !audio.ended && audio.currentTime > 0);
  }

  /** Аудio загружено, но Safari ждёт нажатия (autoplay block). */
  function hasAwaitingPlay() {
    if (!audio || audio.ended) return false;
    if (!audio.paused) return false;
    return Boolean(String(audio.currentSrc || audio.src || "").trim());
  }

  function hasAudio() {
    return Boolean(audio);
  }

  function stop() {
    speakGeneration += 1;
    cleanupAudio({ notifyEnd: true });
  }

  function pause() {
    if (!audio || audio.paused) return;
    audio.pause();
  }

  function resume() {
    if (!audio) return;
    void audio.play().catch(() => {});
  }

  /** Запуск в том же user-gesture, что и кнопка «Включить звук» / ▶. */
  function startFromUserGesture() {
    if (!hasAwaitingPlay()) return { ok: false, reason: "no-audio" };
    markShellAudioGesture();
    try {
      void audio
        .play()
        .then(() => {
          playbackLive = true;
          notifyPlaybackStart();
        })
        .catch(() => {
          playbackLive = false;
        });
      return { ok: true, reason: "resumed" };
    } catch (error) {
      return { ok: false, reason: error?.message || "play-failed" };
    }
  }

  function waitForAudioReady(element, gen, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (gen !== speakGeneration) {
        reject(new Error("cancelled"));
        return;
      }
      if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        element.removeEventListener("canplaythrough", onReady);
        element.removeEventListener("loadeddata", onReady);
        reject(new Error("audio-load-timeout"));
      }, timeoutMs);
      const onReady = () => {
        clearTimeout(timer);
        element.removeEventListener("canplaythrough", onReady);
        element.removeEventListener("loadeddata", onReady);
        resolve();
      };
      element.addEventListener("canplaythrough", onReady, { once: true });
      element.addEventListener("loadeddata", onReady, { once: true });
    });
  }

  async function playViaElement(bytes, mimeType, gen, { base64 = "" } = {}) {
    if (gen !== speakGeneration) return { ok: false, reason: "cancelled" };

    await unlockShellAudio({ markGesture: isShellAudioGestureFresh() });
    if (gen !== speakGeneration) return { ok: false, reason: "cancelled" };

    cleanupAudio();

    const blob = new Blob([bytes], { type: mimeType });
    const useDataUri =
      isIosDevice() &&
      base64 &&
      bytes.length <= 180_000 &&
      !mimeType.includes("wav");
    if (useDataUri) {
      audio = new Audio(`data:${mimeType};base64,${base64}`);
    } else {
      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);
    }
    audio.playsInline = true;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.preload = "auto";
    audio.volume = 1;

    try {
      audio.load();
      await waitForAudioReady(audio, gen);
    } catch (error) {
      cleanupAudio();
      return { ok: false, reason: error?.message || "audio-load-failed" };
    }

    if (gen !== speakGeneration) {
      cleanupAudio();
      return { ok: false, reason: "cancelled" };
    }

    return new Promise((resolve) => {
      let settled = false;
      const mobileCap = isIosDevice() ? 45_000 : 180_000;
      const maxMs = Math.min(mobileCap, Math.max(isIosDevice() ? 12_000 : 20_000, bytes.length * 8 + 5000));
      const maxTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanupAudio();
        resolve({ ok: false, reason: "audio-playback-timeout" });
      }, maxMs);
      let lastProgressAt = Date.now();
      let lastCurrentTime = 0;
      const stallTimer = window.setInterval(() => {
        if (settled || !audio) return;
        if (audio.paused || audio.ended) return;
        const now = Date.now();
        if (audio.currentTime > lastCurrentTime + 0.01) {
          lastCurrentTime = audio.currentTime;
          lastProgressAt = now;
          return;
        }
        if (now - lastProgressAt > (isIosDevice() ? 3500 : 6000)) {
          if (settled) return;
          settled = true;
          clearTimeout(maxTimer);
          window.clearInterval(stallTimer);
          cleanupAudio();
          resolve({ ok: false, reason: "audio-playback-stall" });
        }
      }, 900);
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(maxTimer);
        window.clearInterval(stallTimer);
        resolve(result);
      };

      audio.onended = () => {
        playbackLive = false;
        audio.onended = null;
        audio.onerror = null;
        notifyPlaybackEnd();
        finish({ ok: true, reason: "audio-element" });
      };
      audio.onerror = () => {
        cleanupAudio();
        finish({ ok: false, reason: "audio-element-error" });
      };
      const markLive = () => {
        playbackLive = true;
        markShellAudioGesture();
        notifyPlaybackStart();
      };
      audio.addEventListener("playing", markLive, { once: true });
      void audio
        .play()
        .then(() => {
          markLive();
        })
        .catch(async (error) => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            await unlockShellAudio({ markGesture: attempt === 0 && isShellAudioGestureFresh() });
            if (gen !== speakGeneration) {
              cleanupAudio();
              finish({ ok: false, reason: "cancelled" });
              return;
            }
            try {
              await audio.play();
              markLive();
              return;
            } catch (retryError) {
              if (attempt === 1) {
                const msg = String(retryError?.message || error?.message || "play-failed");
                const blocked =
                  /notallowed|interact|user gesture|not supported/i.test(msg) ||
                  (isIosDevice() && !isShellAudioGestureFresh());
                if (blocked) {
                  playbackLive = false;
                  try {
                    onPlaybackBlocked?.();
                  } catch {
                    // ignore
                  }
                  finish({ ok: false, reason: "play-not-allowed" });
                } else {
                  cleanupAudio();
                  finish({ ok: false, reason: "play-failed" });
                }
              }
            }
          }
        });
    });
  }

  async function playViaWebAudio(bytes, mimeType, gen) {
    if (isIosDevice() && mimeType.includes("mpeg")) {
      return { ok: false, reason: "web-audio-skip-mp3" };
    }
    const ctx = getShellAudioContext();
    if (!ctx || gen !== speakGeneration) return { ok: false, reason: "no-context" };

    await unlockShellAudio();
    if (gen !== speakGeneration) return { ok: false, reason: "cancelled" };

    try {
      const slice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const audioBuffer = await ctx.decodeAudioData(slice.slice(0));
      if (gen !== speakGeneration) return { ok: false, reason: "cancelled" };

      return new Promise((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        webSource = source;
        source.onended = () => {
          if (gen !== speakGeneration) {
            resolve({ ok: false, reason: "cancelled" });
            return;
          }
          webSource = null;
          playbackLive = false;
          notifyPlaybackEnd();
          resolve({ ok: true, reason: "web-audio" });
        };
        try {
          source.start(0);
          playbackLive = true;
          notifyPlaybackStart();
        } catch (error) {
          webSource = null;
          resolve({ ok: false, reason: error?.message || "web-audio-start" });
        }
      });
    } catch (error) {
      return { ok: false, reason: error?.message || "web-audio-decode" };
    }
  }

  async function synthesize(text, { engine: engineOverride = "" } = {}) {
    const payload = String(text || "").trim();
    if (!payload) return { ok: false, reason: "empty" };

    const settings = getTtsSettings();
    const engine = String(engineOverride || settings?.ttsEngine || "").trim();

    let result;
    try {
      result = await apiFetch("/api/shell/tts/synthesize", {
        method: "POST",
        timeoutMs: synthTimeoutMs,
        body: JSON.stringify({ text: payload, settings, engine: engine || undefined })
      });
    } catch (error) {
      return { ok: false, reason: error?.message || "synthesize-fetch" };
    }

    const mimeType = String(result.mimeType || "audio/mpeg");
    const base64 = String(result.audio || "");
    const binary = atob(base64);
    if (!binary.length) return { ok: false, reason: "empty-audio" };

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    lastRecording = { blob: new Blob([bytes], { type: mimeType }), mimeType, text: payload };

    return {
      ok: true,
      text: payload,
      bytes,
      mimeType,
      base64,
      engine: String(result.engine || engine),
      voice: String(result.voice || "")
    };
  }

  async function playPrepared(prepared, { onPhase, generation } = {}) {
    if (!prepared?.ok || !prepared.bytes?.length) {
      return { ok: false, reason: prepared?.reason || "empty-prepared" };
    }
    const gen = generation ?? ++speakGeneration;
    if (generation == null) cleanupAudio();

    onPhase?.("playing", prepared.engine || "");
    const element = await playViaElement(prepared.bytes, prepared.mimeType, gen, {
      base64: prepared.base64 || ""
    });
    if (element.ok) {
      return {
        ok: true,
        engine: prepared.engine || "",
        voice: prepared.voice || "",
        mimeType: prepared.mimeType,
        transport: element.reason
      };
    }

    const web = await playViaWebAudio(prepared.bytes, prepared.mimeType, gen);
    if (web.ok) {
      return {
        ok: true,
        engine: prepared.engine || "",
        voice: prepared.voice || "",
        mimeType: prepared.mimeType,
        transport: web.reason
      };
    }

    return { ok: false, reason: element.reason || web.reason || "play-failed" };
  }

  async function speak(text, { onPhase, engine: engineOverride = "" } = {}) {
    const generation = ++speakGeneration;
    cleanupAudio();
    const payload = String(text || "").trim();
    if (!payload) return { ok: false, reason: "empty" };

    const engine = String(engineOverride || getTtsSettings()?.ttsEngine || "").trim();
    onPhase?.("synthesizing", engine);

    const prepared = await synthesize(payload, { engine });
    if (generation !== speakGeneration) return { ok: false, reason: "cancelled" };
    if (!prepared.ok) return prepared;

    return playPrepared(prepared, { onPhase, generation });
  }

  function getLastRecording() {
    return lastRecording;
  }

  return {
    speak,
    synthesize,
    playPrepared,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    hasAwaitingPlay,
    hasAudio,
    startFromUserGesture,
    cleanupAudio,
    getLastRecording
  };
}
