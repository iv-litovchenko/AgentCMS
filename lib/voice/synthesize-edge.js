const { execFile } = require("child_process");
const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, "..", "..");
const DEFAULT_VENV_PYTHON = path.join(REPO_ROOT, "voice-test", ".venv", "bin", "python");

function speechRateToEdgePercent(rate) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return "+0%";
  const delta = Math.round((numeric - 1) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}

function resolvePythonCandidates() {
  const list = [];
  const configured = String(process.env.EDGE_TTS_PYTHON || "").trim();
  if (configured) list.push(configured);
  if (fsSync.existsSync(DEFAULT_VENV_PYTHON)) list.push(DEFAULT_VENV_PYTHON);
  list.push(process.env.VOICE_TEST_PYTHON || "python3");
  return [...new Set(list)];
}

async function pythonHasEdgeTts(pythonBin) {
  try {
    await execFileAsync(pythonBin, ["-c", "import edge_tts"], { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

let cachedPython;
async function resolveEdgeTtsPython() {
  if (cachedPython !== undefined) return cachedPython;
  for (const candidate of resolvePythonCandidates()) {
    // eslint-disable-next-line no-await-in-loop
    if (await pythonHasEdgeTts(candidate)) {
      cachedPython = candidate;
      return candidate;
    }
  }
  cachedPython = null;
  return null;
}

async function synthesizeEdgePython(text, settings = {}) {
  const pythonBin = await resolveEdgeTtsPython();
  if (!pythonBin) return null;

  const voice =
    String(settings.ttsEdgeVoice || settings.ttsVoice || "").trim() || "ru-RU-SvetlanaNeural";
  const rate = speechRateToEdgePercent(settings.ttsRate);
  const outPath = path.join(os.tmpdir(), `edge-tts-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`);

  try {
    await execFileAsync(
      pythonBin,
      ["-m", "edge_tts", "--text", text, "--voice", voice, "--rate", rate, "--write-media", outPath],
      { timeout: 120000, maxBuffer: 1024 * 1024 }
    );
    const audio = await fs.readFile(outPath);
    if (!audio.length) throw new Error("Edge TTS (python): пустой файл");
    return { engine: "edge", mimeType: "audio/mpeg", audio: audio.toString("base64"), voice, backend: "python" };
  } finally {
    await fs.unlink(outPath).catch(() => {});
  }
}

async function synthesizeEdgeUniversal(text, settings = {}) {
  const EDGE_TIMEOUT_MS = 45000;
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
    return { engine: "edge", mimeType: "audio/mpeg", audio: audio.toString("base64"), voice, backend: "universal" };
  };

  let timer;
  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Edge TTS: timeout (45s)")), EDGE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function synthesizeEdge(text, settings = {}) {
  const payload = String(text || "").trim();
  if (!payload) throw new Error("Пустой текст для озвучки");

  const py = await synthesizeEdgePython(payload, settings);
  if (py) return py;

  try {
    return await synthesizeEdgeUniversal(payload, settings);
  } catch (universalErr) {
    throw new Error(
      `${String(universalErr.message || universalErr)}. ` +
        "Установите Python edge-tts: cd voice-test && python3 -m venv .venv && .venv/bin/pip install edge-tts"
    );
  }
}

async function isEdgeTtsAvailable() {
  if (await resolveEdgeTtsPython()) return true;
  try {
    require.resolve("edge-tts-universal");
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  synthesizeEdge,
  isEdgeTtsAvailable,
  resolveEdgeTtsPython,
  speechRateToEdgePercent
};
