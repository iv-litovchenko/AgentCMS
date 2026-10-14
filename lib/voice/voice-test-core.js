const { spawn } = require("child_process");
const path = require("path");

const VOICE_TEST_ROOT = path.join(__dirname, "..", "..", "voice-test");
const PUBLIC_DIR = path.join(VOICE_TEST_ROOT, "public");

const { synthesizeEdge, isEdgeTtsAvailable, resolveEdgeTtsPython } = require("./synthesize-edge.js");
const {
  resolveVoiceTestPython,
  resolveChatterboxPython,
  probePythonModule,
  isKokoroReady,
  isKokoroV1Ready,
  isKokoroRuReady,
  isChatterboxReady,
  chatterboxStatusHint,
  kokoroModelPaths
} = require("./voice-test-python.js");

async function runPythonScript(scriptName, payload, timeoutMs = 300000, pythonOverride = null) {
  const py =
    pythonOverride ||
    (scriptName === "chatterbox_synth.py" ? await resolveChatterboxPython() : null) ||
    (await resolveVoiceTestPython());
  if (!py) {
    throw new Error(
      scriptName === "chatterbox_synth.py"
        ? "Chatterbox venv не найден — npm run voice:test:chatterbox"
        : "Python не найден — npm run voice:test:setup"
    );
  }
  const scriptPath = path.join(VOICE_TEST_ROOT, "python", scriptName);
  return new Promise((resolve, reject) => {
    const child = spawn(py, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });
    const stdout = [];
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${scriptName}: timeout (${timeoutMs / 1000}s)`));
    }, timeoutMs);

    child.stdout.on("data", (d) => stdout.push(d));
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = Buffer.concat(stdout);
      if (code !== 0) {
        let message = stderr.trim() || `exit ${code}`;
        try {
          const parsed = JSON.parse(message);
          if (parsed.error) message = parsed.error;
        } catch {
          // keep stderr
        }
        reject(new Error(message));
        return;
      }
      resolve(out);
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

async function getStatus(options = {}) {
  const edge = await isEdgeTtsAvailable();
  const edgePython = Boolean(await resolveEdgeTtsPython());
  const kokoro = await isKokoroReady();
  const kokoroV1 = await isKokoroV1Ready();
  const kokoroRu = await isKokoroRuReady();
  const kokoroPaths = kokoroModelPaths();
  const chatterbox = await isChatterboxReady();
  const chatterboxHint = await chatterboxStatusHint();
  return {
    port: options.port ?? null,
    mode: options.mode || "standalone",
    urls: options.urls || [],
    engines: {
      edge: {
        id: "edge",
        label: "Microsoft Edge TTS",
        available: edge,
        hint: edgePython
          ? "Python edge-tts (рекомендуется)"
          : edge
            ? "npm edge-tts-universal (может быть 403 — см. voice-test README)"
            : "cd voice-test && python3 -m venv .venv && .venv/bin/pip install edge-tts"
      },
      kokoro: {
        id: "kokoro",
        label: "Kokoro",
        available: kokoro,
        v1: kokoroV1,
        ru: kokoroRu,
        hint: kokoro
          ? kokoroRu
            ? "EN/ES/FR/… + русский (Sveta/Masha/Dima)"
            : "RU: npm run voice:test:kokoro-ru · остальные языки — OK"
          : "npm run voice:test:kokoro"
      },
      chatterbox: {
        id: "chatterbox",
        label: "Chatterbox",
        available: chatterbox,
        hint: chatterboxHint
      }
    }
  };
}

async function synthesizeEdgeVoice(text, options = {}) {
  return synthesizeEdge(text, {
    ttsEdgeVoice: options.voice || "ru-RU-SvetlanaNeural",
    ttsRate: Number(options.rate) || 1
  });
}

async function synthesizeKokoro(text, options = {}) {
  const wav = await runPythonScript("kokoro_synth.py", {
    text,
    voice: options.voice || "af_bella",
    speed: Number(options.rate) || 1,
    lang: options.lang || "en-us",
    kokoroMode: options.kokoroMode || ""
  });
  return {
    engine: "kokoro",
    mimeType: "audio/wav",
    audio: wav.toString("base64"),
    voice: options.voice || "af_bella"
  };
}

async function synthesizeChatterbox(text) {
  const wav = await runPythonScript("chatterbox_synth.py", { text }, 600000);
  return {
    engine: "chatterbox",
    mimeType: "audio/wav",
    audio: wav.toString("base64"),
    voice: "default"
  };
}

async function handleTts(body) {
  const text = String(body.text || "").trim();
  if (!text) throw new Error("Пустой текст");
  const engine = String(body.engine || "edge").trim().toLowerCase();
  if (engine === "edge") return synthesizeEdgeVoice(text, body);
  if (engine === "kokoro") {
    return synthesizeKokoro(text, {
      voice: body.voice,
      lang: body.lang,
      rate: body.rate,
      kokoroMode: body.kokoroMode
    });
  }
  if (engine === "chatterbox") return synthesizeChatterbox(text);
  throw new Error(`Неизвестный engine: ${engine}`);
}

module.exports = {
  VOICE_TEST_ROOT,
  PUBLIC_DIR,
  getStatus,
  handleTts
};
