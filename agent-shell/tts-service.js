const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const execFileAsync = promisify(execFile);

const TTS_ENGINES = ["browser", "edge", "piper", "elevenlabs"];
const ELEVENLABS_DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2";

const EDGE_VOICE_PRESETS = [
  { id: "ru-RU-SvetlanaNeural", label: "Svetlana (ru-RU, ж)" },
  { id: "ru-RU-DmitryNeural", label: "Dmitry (ru-RU, м)" },
  { id: "en-US-JennyNeural", label: "Jenny (en-US, ж)" },
  { id: "en-US-GuyNeural", label: "Guy (en-US, м)" }
];

function normalizeEngine(engine) {
  const value = String(engine || "browser").trim();
  if (value === "say" || value === "sidecar") return "browser";
  return TTS_ENGINES.includes(value) ? value : "browser";
}

function ttsEngineLang(settings = {}, engine = "browser") {
  return String(settings.ttsBrowserLang || settings.ttsLang || "ru-RU").trim() || "ru-RU";
}

function ttsEngineVoice(settings = {}, engine = "browser") {
  if (normalizeEngine(engine) === "browser") {
    return String(settings.ttsBrowserVoice ?? settings.ttsVoice ?? "").trim();
  }
  return String(settings.ttsVoice || "").trim();
}

function speechRateToEdgePercent(rate) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return "+0%";
  const delta = Math.round((numeric - 1) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolvePiperBinary(settings = {}) {
  const configured = String(settings.ttsPiperBinary || "").trim();
  if (configured) return configured;
  return "piper";
}

async function resolvePiperModel(settings = {}) {
  return String(settings.ttsPiperModel || "").trim();
}

async function detectPiper(settings = {}) {
  const model = await resolvePiperModel(settings);
  if (!model || !(await fileExists(model))) return false;
  const binary = await resolvePiperBinary(settings);
  try {
    await execFileAsync(binary, ["--help"], { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

async function getCapabilities(settings = {}) {
  const piperReady = await detectPiper(settings);
  return {
    engines: {
      browser: { available: true, label: "Браузер (Web Speech)" },
      edge: {
        available: true,
        label: "Edge TTS",
        hint: "Нужен интернет, без API key"
      },
      piper: {
        available: piperReady,
        label: "Piper",
        hint: piperReady
          ? "Локальная модель"
          : "Укажите путь к model.onnx и установите piper в PATH"
      },
      elevenlabs: {
        available: true,
        label: "ElevenLabs",
        hint: String(settings.ttsElevenlabsApiKey || "").trim()
          ? "API key сохранён — укажите Voice ID при необходимости"
          : "Выберите движок, введите API key и Voice ID, затем «Сохранить»"
      }
    }
  };
}

async function listVoices(engine, settings = {}, options = {}) {
  const normalized = normalizeEngine(engine);
  if (normalized === "browser") {
    return {
      engine: normalized,
      voices: [],
      source: "web-speech",
      note: "Голоса берутся из Web Speech API в браузере"
    };
  }
  if (normalized === "edge") {
    return { engine: normalized, voices: EDGE_VOICE_PRESETS };
  }
  if (normalized === "piper") {
    const model = await resolvePiperModel(settings);
    return {
      engine: normalized,
      voices: model ? [{ id: model, label: path.basename(model) }] : []
    };
  }
  if (normalized === "elevenlabs") {
    const voiceId = String(settings.ttsElevenlabsVoiceId || ELEVENLABS_DEFAULT_VOICE_ID).trim();
    return {
      engine: normalized,
      voices: voiceId ? [{ id: voiceId, label: voiceId }] : []
    };
  }
  return { engine: normalized, voices: [] };
}

async function synthesizeEdge(text, settings = {}) {
  const EDGE_TIMEOUT_MS = 15000;

  const run = async () => {
    const { Communicate } = require("edge-tts-universal");
    const voice =
      String(settings.ttsEdgeVoice || settings.ttsVoice || "").trim() || "ru-RU-SvetlanaNeural";
    const comm = new Communicate(text, {
      voice,
      rate: speechRateToEdgePercent(settings.ttsRate)
    });
    const chunks = [];
    for await (const chunk of comm.stream()) {
      if (chunk.type === "audio" && chunk.data) chunks.push(chunk.data);
    }
    const audio = Buffer.concat(chunks);
    if (!audio.length) throw new Error("Edge TTS не вернул аудио");
    return { engine: "edge", mimeType: "audio/mpeg", audio: audio.toString("base64"), voice };
  };

  let timer;
  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Edge TTS: timeout (15s)")), EDGE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function elevenlabsSpeedFromSettings(settings = {}) {
  const raw = Number(settings.ttsRate);
  const speed = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.min(4, Math.max(0.25, speed));
}

async function synthesizeElevenLabs(text, settings = {}) {
  const apiKey = String(settings.ttsElevenlabsApiKey || "").trim();
  if (!apiKey) throw new Error("ElevenLabs: укажите API key в настройках TTS");
  const voiceId = String(settings.ttsElevenlabsVoiceId || settings.ttsVoice || ELEVENLABS_DEFAULT_VOICE_ID).trim();
  if (!voiceId) throw new Error("ElevenLabs: укажите Voice ID");
  const ELEVENLABS_TIMEOUT_MS = 30000;
  const speed = elevenlabsSpeedFromSettings(settings);

  const run = async () => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: String(settings.ttsElevenlabsModel || ELEVENLABS_DEFAULT_MODEL),
        voice_settings: {
          speed,
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true
        }
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      let message = detail;
      try {
        const parsed = JSON.parse(detail);
        message = String(parsed?.detail?.message || parsed?.message || detail);
      } catch {
        // keep raw detail
      }
      if (/free_users_not_allowed|creator tier/i.test(message)) {
        throw new Error(
          `ElevenLabs: голос «${voiceId}» недоступен на free-плане — выберите premade-голос из библиотеки`
        );
      }
      if (/paid_plan_required/i.test(message)) {
        throw new Error("ElevenLabs: этот голос недоступен на free-плане — выберите другой Voice ID");
      }
      throw new Error(`ElevenLabs: HTTP ${response.status}${message ? ` — ${message.slice(0, 180)}` : ""}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    return { engine: "elevenlabs", mimeType: "audio/mpeg", audio: audio.toString("base64"), voice: voiceId };
  };

  let timer;
  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("ElevenLabs: timeout (30s)")), ELEVENLABS_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function synthesizePiper(text, settings = {}) {
  const modelPath = await resolvePiperModel(settings);
  if (!modelPath || !(await fileExists(modelPath))) {
    throw new Error("Piper: укажите путь к model.onnx в настройках TTS");
  }
  const binary = await resolvePiperBinary(settings);
  const outPath = path.join(os.tmpdir(), `shell-piper-${Date.now()}.wav`);
  try {
    await execFileAsync(binary, ["--model", modelPath, "--output_file", outPath], {
      input: text,
      maxBuffer: 1024 * 1024,
      timeout: 120000
    });
    const audio = await fs.readFile(outPath);
    return { engine: "piper", mimeType: "audio/wav", audio: audio.toString("base64"), voice: path.basename(modelPath) };
  } finally {
    await fs.unlink(outPath).catch(() => {});
  }
}

async function synthesize(text, settings = {}) {
  const payload = String(text || "").trim();
  if (!payload) throw new Error("Пустой текст для озвучки");
  const engine = normalizeEngine(settings.ttsEngine);
  if (engine === "browser") {
    throw new Error("Движок browser синтезируется в UI, не на сервере");
  }
  if (engine === "edge") return synthesizeEdge(payload, settings);
  if (engine === "piper") return synthesizePiper(payload, settings);
  if (engine === "elevenlabs") return synthesizeElevenLabs(payload, settings);
  throw new Error(`Неизвестный движок TTS: ${engine}`);
}

module.exports = {
  TTS_ENGINES,
  EDGE_VOICE_PRESETS,
  getCapabilities,
  listVoices,
  synthesize
};
