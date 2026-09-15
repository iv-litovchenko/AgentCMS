const path = require("path");
const { probeFasterWhisper } = require("../lib/voice-sidecar-probe");

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
  const probe = await probeFasterWhisper(path.join(__dirname, ".."));
  return probe.installed;
}

async function getCapabilities(settings = {}) {
  const whisperInstalled = await probeWhisperInstalled();
  const elevenKey = readElevenlabsSttApiKey(settings);
  return {
    engines: {
      browser: {
        available: true,
        label: "Web Speech",
        hint: "Микрофон браузера · Chrome / Safari · HTTPS"
      },
      google: {
        available: true,
        label: "Google STT",
        hint: "Системный звук (скоро) · speech_recognition"
      },
      whisper: {
        available: whisperInstalled,
        label: "Whisper локально",
        hint: whisperInstalled
          ? "faster-whisper на сервере Shell"
          : "Agent Control → Установить зависимости (Python 3.12 + ffmpeg)"
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
        hint: "Скоро — захват звука с компьютера"
      },
      mix: {
        available: false,
        label: "Микрофон + система",
        hint: "Скоро — смешанный поток"
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
