import { KOKORO_LANG_PRESETS, fillKokoroVoiceSelect } from "./kokoro-presets.js";

const $ = (id) => document.getElementById(id);

/** CMS: /voice-test/ + /api/voice-test/* · отдельный сервер: / + /api/* */
const API_ROOT = location.pathname.startsWith("/voice-test") ? "/api/voice-test" : "/api";

const engines = ["edge", "kokoro", "chatterbox"];
let cachedStatus = null;

if (location.protocol === "file:") {
  const banner = document.createElement("p");
  banner.style.cssText =
    "background:#f87171;color:#111;padding:0.75rem 1rem;border-radius:8px;font-weight:600;margin:0 0 1rem";
  banner.textContent =
    "Страница открыта как файл. Запустите: npm run voice:test или npm start и откройте /voice-test/";
  document.querySelector(".wrap")?.prepend(banner);
}

function setBadge(engine, available) {
  const badge = $(`badge-${engine}`);
  if (!badge) return;
  badge.dataset.on = available ? "1" : "0";
  badge.textContent = available ? "OK" : "нет";
}

async function loadStatus() {
  try {
    const res = await fetch(`${API_ROOT}/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    for (const id of engines) {
      const info = data.engines?.[id];
      setBadge(id, Boolean(info?.available));
      const hint = $(`hint-${id}`);
      if (hint && info?.hint) hint.textContent = info.hint;
      const btn = $(`btn-${id}`);
      if (btn) btn.disabled = !info?.available;
    }
    cachedStatus = data;
    syncKokoroLangUi();
    return data;
  } catch (err) {
    for (const id of engines) {
      setBadge(id, false);
      const hint = $(`hint-${id}`);
      if (hint) hint.textContent = "Сервер недоступен — npm run voice:test";
      const btn = $(`btn-${id}`);
      if (btn) btn.disabled = false;
    }
    throw err;
  }
}

function playBase64(audioEl, mimeType, b64) {
  const prev = audioEl.dataset.objectUrl;
  if (prev) URL.revokeObjectURL(prev);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  audioEl.dataset.objectUrl = url;
  audioEl.src = url;
  return audioEl.play();
}

const SYNTH_HINT = {
  edge: "Синтез… Edge (обычно 10–40 с, нужен интернет)",
  kokoro: "Синтез… Kokoro (5–20 с, локально)",
  chatterbox: "Синтез… Chatterbox (может занять минуты)"
};

async function synthesize(engine) {
  const text = ($("text")?.value || "").trim();
  const status = $(`status-${engine}`);
  if (!text) {
    if (status) status.textContent = "Введите текст";
    return;
  }
  if (status) status.textContent = SYNTH_HINT[engine] || "Синтез…";

  const body = { engine, text };
  if (engine === "edge") {
    body.voice = $("edge-voice")?.value;
    body.rate = Number($("edge-rate")?.value) || 1;
  }
  if (engine === "kokoro") {
    const langKey = $("kokoro-lang-select")?.value || "en-us";
    const preset = KOKORO_LANG_PRESETS[langKey] || KOKORO_LANG_PRESETS["en-us"];
    if (preset.engine === "ru" && !cachedStatus?.engines?.kokoro?.ru) {
      if (status) {
        status.textContent = "Русский Kokoro не установлен. В терминале: npm run voice:test:kokoro-ru";
      }
      return;
    }
    body.voice = $("kokoro-voice")?.value || preset.voices[0]?.id;
    body.lang = preset.lang;
    if (preset.engine === "ru") body.kokoroMode = "ru";
    body.rate = 1;
  }

  try {
    const res = await fetch(`${API_ROOT}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let data;
    const raw = await res.text();
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      if (status) status.textContent = `Ошибка сервера (${res.status}): не JSON`;
      return;
    }
    if (!res.ok) {
      if (status) status.textContent = data.error || res.statusText || `HTTP ${res.status}`;
      return;
    }
    if (!data.audio) {
      if (status) status.textContent = "Сервер не вернул audio";
      return;
    }
    const audio = $(`audio-${engine}`);
    if (!audio) {
      if (status) status.textContent = "Нет элемента audio в странице";
      return;
    }
    await playBase64(audio, data.mimeType || "audio/mpeg", data.audio);
    if (status) status.textContent = `Готово · ${data.engine}${data.voice ? ` · ${data.voice}` : ""}`;
    audio.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    if (status) {
      status.textContent =
        err?.name === "TypeError" && String(err.message).includes("fetch")
          ? `Нет связи с API (${API_ROOT}/tts). Перезапустите: npm run voice:test`
          : String(err.message || err);
    }
  }
}

$("btn-edge")?.addEventListener("click", () => synthesize("edge"));
function syncKokoroLangUi() {
  const langKey = $("kokoro-lang-select")?.value || "en-us";
  fillKokoroVoiceSelect(langKey, $("kokoro-voice"));
  const hint = $("hint-kokoro");
  const preset = KOKORO_LANG_PRESETS[langKey];
  if (hint && preset?.engine === "ru") {
    hint.textContent = cachedStatus?.engines?.kokoro?.ru
      ? "Русский kokoro-ru: Sveta, Masha, Dima"
      : "⚠ Сначала: npm run voice:test:kokoro-ru (скачать модели ~400 MB)";
  }
}

$("kokoro-lang-select")?.addEventListener("change", syncKokoroLangUi);
$("btn-kokoro-sample")?.addEventListener("click", () => {
  const langKey = $("kokoro-lang-select")?.value || "en-us";
  const preset = KOKORO_LANG_PRESETS[langKey];
  if (preset?.sample && $("text")) $("text").value = preset.sample;
});

$("btn-kokoro")?.addEventListener("click", () => synthesize("kokoro"));
syncKokoroLangUi();
$("btn-chatterbox")?.addEventListener("click", () => synthesize("chatterbox"));

$("btn-all")?.addEventListener("click", async () => {
  const status = await loadStatus();
  for (const id of engines) {
    if (status.engines?.[id]?.available) {
      // eslint-disable-next-line no-await-in-loop
      await synthesize(id);
    }
  }
});

loadStatus().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
