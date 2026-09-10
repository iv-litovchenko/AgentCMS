const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");

const execFileAsync = promisify(execFile);

const STT_ENGINES = ["browser", "google", "whisper", "elevenlabs"];

const WHISPER_MODELS = ["tiny", "base", "small", "medium"];
const ELEVENLABS_STT_MODELS = ["scribe_v2", "scribe_v1"];

function normalizeSttEngine(engine) {
  const value = String(engine || "browser").trim();
  if (value === "sidecar") return "google";
  if (value === "auto") return "browser";
  return STT_ENGINES.includes(value) ? value : "browser";
}

function readElevenlabsSttApiKey(settings = {}) {
  return String(settings.sttElevenlabsApiKey || settings.ttsElevenlabsApiKey || "").trim();
}

async function probeWhisperInstalled() {
  const sidecarDir = path.join(__dirname, "voice-sidecar");
  try {
    await execFileAsync("python3", ["-c", "import faster_whisper"], {
      cwd: sidecarDir,
      timeout: 8000
    });
    return true;
  } catch {
    return false;
  }
}

async function getCapabilities(settings = {}) {
  const whisperInstalled = await probeWhisperInstalled();
  const elevenKey = readElevenlabsSttApiKey(settings);
  return {
    engines: {
      browser: {
        available: true,
        label: "Web Speech",
        hint: "Chrome / Safari, нужен HTTPS · только микрофон"
      },
      google: {
        available: true,
        label: "Google STT",
        hint: "Локальный агент + интернет (speech_recognition)"
      },
      whisper: {
        available: whisperInstalled,
        label: "Whisper локально",
        hint: whisperInstalled
          ? "faster-whisper в локальном агенте"
          : "pip install faster-whisper в voice-sidecar"
      },
      elevenlabs: {
        available: Boolean(elevenKey),
        label: "ElevenLabs Scribe",
        hint: elevenKey ? "Облачный Scribe API" : "Укажите API key (STT или TTS ElevenLabs)"
      }
    },
    capture: {
      microphone: { available: true, label: "Микрофон" },
      system: {
        available: false,
        label: "Системный звук",
        hint: "Скоро — нужен локальный голосовой агент"
      },
      mix: {
        available: false,
        label: "Микрофон + система",
        hint: "Скоро — программное микширование потоков"
      }
    },
    whisperModels: WHISPER_MODELS,
    elevenlabsModels: ELEVENLABS_STT_MODELS
  };
}

module.exports = {
  STT_ENGINES,
  WHISPER_MODELS,
  ELEVENLABS_STT_MODELS,
  normalizeSttEngine,
  readElevenlabsSttApiKey,
  getCapabilities
};
