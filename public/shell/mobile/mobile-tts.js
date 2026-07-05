import { getMobileAudioContext, unlockMobileAudio, isIosDevice } from "/shell/mobile/mobile-audio-unlock.js?v=3";

/** Server TTS via /api/shell/tts/synthesize — iOS-safe playback. */
export function createMobileTtsPlayer(apiFetch) {
  let audio = null;
  let objectUrl = "";
  let webSource = null;
  let generation = 0;

  function cleanup() {
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

  function stop() {
    generation += 1;
    cleanup();
  }

  function isPlaying() {
    return Boolean((audio && !audio.paused && !audio.ended) || webSource);
  }

  function waitForAudioReady(element, gen, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (gen !== generation) {
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
    if (gen !== generation) return { ok: false, reason: "cancelled" };

    await unlockMobileAudio();
    if (gen !== generation) return { ok: false, reason: "cancelled" };

    cleanup();

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
      cleanup();
      return { ok: false, reason: error?.message || "audio-load-failed" };
    }

    if (gen !== generation) {
      cleanup();
      return { ok: false, reason: "cancelled" };
    }

    return new Promise((resolve) => {
      audio.onended = () => {
        cleanup();
        resolve({ ok: true, reason: "audio-element" });
      };
      audio.onerror = () => {
        cleanup();
        resolve({ ok: false, reason: "audio-element-error" });
      };
      void audio
        .play()
        .then(() => {
          // wait for onended
        })
        .catch(async (error) => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            await unlockMobileAudio();
            if (gen !== generation) {
              cleanup();
              resolve({ ok: false, reason: "cancelled" });
              return;
            }
            try {
              await audio.play();
              return;
            } catch (retryError) {
              if (attempt === 1) {
                cleanup();
                const msg = String(retryError?.message || error?.message || "play-failed");
                resolve({
                  ok: false,
                  reason: /notallowed|interact/i.test(msg) ? "play-not-allowed" : msg
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
    const ctx = getMobileAudioContext();
    if (!ctx || gen !== generation) return { ok: false, reason: "no-context" };

    await unlockMobileAudio();
    if (gen !== generation) return { ok: false, reason: "cancelled" };

    try {
      const slice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const audioBuffer = await ctx.decodeAudioData(slice.slice(0));
      if (gen !== generation) return { ok: false, reason: "cancelled" };

      return new Promise((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        webSource = source;
        source.onended = () => {
          if (gen !== generation) {
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

  async function speak(text) {
    const gen = ++generation;
    cleanup();
    const payload = String(text || "").trim();
    if (!payload) return { ok: false, reason: "empty" };

    let result;
    try {
      result = await apiFetch("/api/shell/tts/synthesize", {
        method: "POST",
        body: JSON.stringify({ text: payload })
      });
    } catch (error) {
      return { ok: false, reason: error?.message || "synthesize-fetch" };
    }

    if (gen !== generation) return { ok: false, reason: "cancelled" };

    const mimeType = String(result.mimeType || "audio/mpeg");
    const base64 = String(result.audio || "");
    const binary = atob(base64);
    if (!binary.length) return { ok: false, reason: "empty-audio" };

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    // Desktop Shell uses <audio> only — на iPhone это надёжнее Web Audio для MP3.
    const element = await playViaElement(bytes, mimeType, gen, { base64 });
    if (element.ok) return element;

    const web = await playViaWebAudio(bytes, mimeType, gen);
    if (web.ok) return web;

    return element.reason ? element : web;
  }

  return { speak, stop, isPlaying };
}
