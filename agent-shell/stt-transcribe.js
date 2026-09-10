const path = require("path");
const { spawn } = require("child_process");
const { resolveSidecarPython } = require("../lib/voice-sidecar-probe");
const { normalizeSttEngine, readElevenlabsSttApiKey } = require("./stt-service");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const TRANSCRIBE_CLI = path.join(__dirname, "voice-sidecar", "transcribe_cli.py");

function shellSettingsToSttPayload(settings = {}) {
  return {
    sttLang: String(settings.sttLang || "ru-RU").trim() || "ru-RU",
    sttEngine: normalizeSttEngine(settings.sttEngine),
    sttWhisperModel: String(settings.sttWhisperModel || "base").trim() || "base",
    sttElevenlabsApiKey: readElevenlabsSttApiKey(settings),
    sttElevenlabsModel: String(settings.sttElevenlabsModel || "scribe_v2").trim() || "scribe_v2"
  };
}

function runTranscribeCli(pcmBuffer, settings = {}) {
  return new Promise((resolve, reject) => {
    const { python } = resolveSidecarPython(PROJECT_ROOT);
    const payload = JSON.stringify({
      pcmBase64: Buffer.from(pcmBuffer).toString("base64"),
      settings: shellSettingsToSttPayload(settings)
    });

    const child = spawn(python, [TRANSCRIBE_CLI], {
      cwd: path.join(PROJECT_ROOT, "agent-shell", "voice-sidecar"),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const line = stdout
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .pop();
      if (!line) {
        reject(new Error(stderr.trim() || `STT process exited (${code ?? "?"})`));
        return;
      }
      try {
        const parsed = JSON.parse(line);
        if (parsed.error) {
          reject(new Error(String(parsed.error)));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error(stderr.trim() || error.message || "Invalid STT response"));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

async function transcribePcmBuffer(pcmBuffer, settings = {}) {
  if (!pcmBuffer || !pcmBuffer.length) {
    throw new Error("Нет аудио — проверьте микрофон");
  }
  return runTranscribeCli(pcmBuffer, settings);
}

async function transcribeFromRequest(payload = {}, settings = {}) {
  const pcmBase64 = String(payload?.pcmBase64 || "").trim();
  if (!pcmBase64) {
    throw new Error("pcmBase64 is required");
  }
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  return transcribePcmBuffer(pcmBuffer, settings);
}

module.exports = {
  shellSettingsToSttPayload,
  transcribePcmBuffer,
  transcribeFromRequest
};
