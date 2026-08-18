import { getShellAudioContext, isIosDevice, unlockShellAudio } from "/shell/shell-audio-unlock.js?v=1";

export function createShellTtsPlayer({ apiFetch, getTtsSettings = () => ({}), synthTimeoutMs = 45000 }) {
  /** @type {HTMLAudioElement | null} */
  let audio = null;
  let objectUrl = "";
  let webSource = null;
  let speakGeneration = 0;
  /** @type {{ blob: Blob, mimeType: string, text: string } | null} */
  let lastRecording = null;

  function cleanupAudio() {
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
  }

  function isPlaying() {
    return Boolean((audio && !audio.paused && !audio.ended) || webSource);
  }

  function isPaused() {
    return Boolean(audio && audio.paused && !audio.ended && audio.currentTime > 0);
  }

  function hasAudio() {
    return Boolean(audio);
  }

  function stop() {
    speakGeneration += 1;
    cleanupAudio();
  }

  function pause() {
    if (!audio || audio.paused) return;
    audio.pause();
  }

  function resume() {
    if (!audio) return;
    void audio.play().catch(() => {});
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

    await unlockShellAudio();
    if (gen !== speakGeneration) return { ok: false, reason: "cancelled" };

    cleanupAudio();

    if (isIosDevice() && base64) {
      audio = new Audio(`data:${mimeType};base64,${base64}`);
    } else {
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
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
      const maxMs = Math.min(180_000, Math.max(20_000, bytes.length * 8 + 5000));
      const maxTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanupAudio();
        resolve({ ok: false, reason: "audio-playback-timeout" });
      }, maxMs);
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(maxTimer);
        resolve(result);
      };

      audio.onended = () => {
        cleanupAudio();
        finish({ ok: true, reason: "audio-element" });
      };
      audio.onerror = () => {
        cleanupAudio();
        finish({ ok: false, reason: "audio-element-error" });
      };
      void audio
        .play()
        .then(() => {
          // wait for onended
        })
        .catch(async (error) => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            await unlockShellAudio();
            if (gen !== speakGeneration) {
              cleanupAudio();
              finish({ ok: false, reason: "cancelled" });
              return;
            }
            try {
              await audio.play();
              return;
            } catch (retryError) {
              if (attempt === 1) {
                cleanupAudio();
                const msg = String(retryError?.message || error?.message || "play-failed");
                finish({
                  ok: false,
                  reason: /notallowed|interact/i.test(msg) ? "play-not-allowed" : "play-failed"
                });
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
          resolve({ ok: true, reason: "web-audio" });
        };
        try {
          source.start(0);
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
    hasAudio,
    cleanupAudio,
    getLastRecording
  };
}
