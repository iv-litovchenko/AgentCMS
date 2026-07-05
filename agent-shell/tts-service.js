const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const execFileAsync = promisify(execFile);

const TTS_ENGINES = ["browser", "say", "edge", "piper", "elevenlabs"];

const EDGE_VOICE_PRESETS = [
  { id: "ru-RU-SvetlanaNeural", label: "Svetlana (ru-RU, ж)" },
  { id: "ru-RU-DmitryNeural", label: "Dmitry (ru-RU, м)" },
  { id: "en-US-JennyNeural", label: "Jenny (en-US, ж)" },
  { id: "en-US-GuyNeural", label: "Guy (en-US, м)" }
];

const DEFAULT_SAY_VOICES = {
  "ru-RU": "Milena",
  "en-US": "Samantha"
};

function isDarwin() {
  return process.platform === "darwin";
}

function normalizeEngine(engine) {
  const value = String(engine || "browser").trim();
  return TTS_ENGINES.includes(value) ? value : "browser";
}

function speechRateToSayWpm(rate) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return 175;
  return Math.round(Math.min(350, Math.max(80, 175 * numeric)));
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
      say: {
        available: isDarwin(),
        label: "macOS say",
        hint: isDarwin() ? "Встроено в macOS" : "Только macOS"
      },
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
        available: Boolean(String(settings.ttsElevenlabsApiKey || "").trim()),
        label: "ElevenLabs",
        hint: "Нужен API key в настройках"
      }
    }
  };
}

async function listSayVoices(lang = "ru-RU") {
  if (!isDarwin()) return [];
  const { stdout } = await execFileAsync("say", ["-v", "?"], { maxBuffer: 1024 * 1024 });
  const prefix = String(lang || "ru-RU").split("-")[0].toLowerCase();
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^\s]+)\s+([a-z]{2}_[A-Z]{2})/i);
      if (!match) return null;
      return { id: match[1], label: `${match[1]} (${match[2].replace("_", "-")})`, locale: match[2] };
    })
    .filter(Boolean)
    .filter((voice) => voice.locale.toLowerCase().startsWith(prefix));
}

async function listVoices(engine, settings = {}) {
  const normalized = normalizeEngine(engine);
  if (normalized === "browser") {
    return { engine: normalized, voices: [], note: "Голоса берутся из Web Speech API в браузере" };
  }
  if (normalized === "say") {
    const voices = await listSayVoices(settings.ttsLang);
    return { engine: normalized, voices };
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
    const voiceId = String(settings.ttsElevenlabsVoiceId || "").trim();
    return {
      engine: normalized,
      voices: voiceId ? [{ id: voiceId, label: voiceId }] : []
    };
  }
  return { engine: normalized, voices: [] };
}

async function synthesizeSay(text, settings = {}) {
  if (!isDarwin()) throw new Error("macOS say доступен только на Mac");
  const lang = String(settings.ttsLang || "ru-RU");
  const voice =
    String(settings.ttsVoice || "").trim() ||
    DEFAULT_SAY_VOICES[lang] ||
    DEFAULT_SAY_VOICES["ru-RU"];
  const tmpBase = path.join(os.tmpdir(), `shell-tts-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const aiffPath = `${tmpBase}.aiff`;
  const wavPath = `${tmpBase}.wav`;
  const args = ["-v", voice, "-r", String(speechRateToSayWpm(settings.ttsRate)), "-o", aiffPath, text];
  try {
    await execFileAsync("say", args, { maxBuffer: 1024 * 1024, timeout: 120000 });
    await execFileAsync("afconvert", ["-f", "WAVE", "-d", "LEI16", aiffPath, wavPath], {
      timeout: 30000
    });
    const audio = await fs.readFile(wavPath);
    return { engine: "say", mimeType: "audio/wav", audio: audio.toString("base64"), voice };
  } finally {
    await fs.unlink(aiffPath).catch(() => {});
    await fs.unlink(wavPath).catch(() => {});
  }
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

async function synthesizeElevenLabs(text, settings = {}) {
  const apiKey = String(settings.ttsElevenlabsApiKey || "").trim();
  if (!apiKey) throw new Error("ElevenLabs: укажите API key в настройках TTS");
  const voiceId = String(settings.ttsElevenlabsVoiceId || settings.ttsVoice || "").trim();
  if (!voiceId) throw new Error("ElevenLabs: укажите Voice ID");
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: String(settings.ttsElevenlabsModel || "eleven_multilingual_v2")
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs: HTTP ${response.status}${detail ? ` — ${detail.slice(0, 180)}` : ""}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  return { engine: "elevenlabs", mimeType: "audio/mpeg", audio: audio.toString("base64"), voice: voiceId };
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
  if (engine === "say") return synthesizeSay(payload, settings);
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
