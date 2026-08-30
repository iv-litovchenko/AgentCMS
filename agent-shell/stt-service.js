const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");

const execFileAsync = promisify(execFile);

const STT_ENGINES = ["auto", "browser", "google", "whisper", "elevenlabs"];

const WHISPER_MODELS = ["tiny", "base", "small", "medium"];
const ELEVENLABS_STT_MODELS = ["scribe_v2", "scribe_v1"];

function normalizeSttEngine(engine) {
  const value = String(engine || "auto").trim();
  if (value === "sidecar") return "google";
  return STT_ENGINES.includes(value) ? value : "auto";
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
      auto: {
        available: true,
        label: "Авто",
        hint: "Web Speech или sidecar по режиму 🎤"
      },
      browser: {
        available: true,
        label: "Web Speech",
        hint: "Chrome / Safari, нужен HTTPS"
      },
      google: {
        available: true,
        label: "Google STT",
        hint: "Sidecar + интернет (speech_recognition)"
      },
      whisper: {
        available: whisperInstalled,
        label: "Whisper локально",
        hint: whisperInstalled
          ? "faster-whisper в voice-sidecar"
          : "В voice-sidecar: pip install faster-whisper"
      },
      elevenlabs: {
        available: Boolean(elevenKey),
        label: "ElevenLabs Scribe",
        hint: elevenKey ? "Облачный Scribe API" : "Укажите API key (STT или TTS ElevenLabs)"
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
