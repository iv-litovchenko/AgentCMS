const fsSync = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, "..", "..");
const VOICE_TEST_ROOT = path.join(REPO_ROOT, "voice-test");
const DEFAULT_VENV_PYTHON = path.join(VOICE_TEST_ROOT, ".venv", "bin", "python");
const CHATTERBOX_VENV_PYTHON = path.join(VOICE_TEST_ROOT, ".venv-chatterbox", "bin", "python");
const KOKORO_MODEL_DIR = path.join(VOICE_TEST_ROOT, "models");
const KOKORO_RU_DIR = path.join(KOKORO_MODEL_DIR, "kokoro-ru");

function resolvePythonCandidates() {
  const list = [];
  for (const key of ["VOICE_TEST_PYTHON", "EDGE_TTS_PYTHON"]) {
    const configured = String(process.env[key] || "").trim();
    if (configured) list.push(configured);
  }
  if (fsSync.existsSync(DEFAULT_VENV_PYTHON)) list.push(DEFAULT_VENV_PYTHON);
  list.push("python3");
  return [...new Set(list)];
}

let cachedPython;
async function resolveVoiceTestPython() {
  if (cachedPython !== undefined) return cachedPython;
  for (const candidate of resolvePythonCandidates()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await execFileAsync(candidate, ["--version"], { timeout: 5000 });
      cachedPython = candidate;
      return candidate;
    } catch {
      // try next
    }
  }
  cachedPython = null;
  return null;
}

function kokoroModelPaths() {
  const modelDir = process.env.KOKORO_MODEL_DIR || KOKORO_MODEL_DIR;
  const voices = path.join(modelDir, "voices-v1.0.bin");
  const candidates = [
    process.env.KOKORO_ONNX,
    path.join(modelDir, "kokoro-v1.0.onnx"),
    path.join(modelDir, "kokoro-v1.0.int8.onnx"),
    path.join(modelDir, "kokoro-v1.0.fp16.onnx")
  ].filter(Boolean);
  const onnx = candidates.find((p) => fsSync.existsSync(p)) || candidates[1];
  return { modelDir, onnx, voices, voicesOk: fsSync.existsSync(voices), onnxOk: candidates.some((p) => fsSync.existsSync(p)) };
}

async function probePythonModule(moduleName) {
  const py = await resolveVoiceTestPython();
  if (!py) return false;
  try {
    await execFileAsync(py, ["-c", `import importlib; importlib.import_module(${JSON.stringify(moduleName)})`], {
      timeout: 15000
    });
    return true;
  } catch {
    return false;
  }
}

function isKokoroRuReadySync() {
  const need = [
    path.join(KOKORO_RU_DIR, "kokoro-config.json"),
    path.join(KOKORO_RU_DIR, "ru_g2p.py"),
    path.join(KOKORO_RU_DIR, "voices", "sveta.bin"),
    path.join(KOKORO_RU_DIR, "onnx", "model.onnx")
  ];
  return need.every((p) => fsSync.existsSync(p));
}

async function isKokoroV1Ready() {
  const mod = await probePythonModule("kokoro_onnx");
  const { voicesOk, onnxOk } = kokoroModelPaths();
  return mod && voicesOk && onnxOk;
}

async function isKokoroRuReady() {
  return isKokoroRuReadySync() && (await probePythonModule("onnxruntime"));
}

async function isKokoroReady() {
  return (await isKokoroV1Ready()) || (await isKokoroRuReady());
}

async function resolveChatterboxPython() {
  const configured = String(process.env.CHATTERBOX_PYTHON || "").trim();
  if (configured) return configured;
  if (fsSync.existsSync(CHATTERBOX_VENV_PYTHON)) return CHATTERBOX_VENV_PYTHON;
  return null;
}

async function probeChatterboxImport(pythonBin) {
  try {
    await execFileAsync(
      pythonBin,
      ["-c", "from chatterbox.tts import ChatterboxTTS"],
      { timeout: 60000 }
    );
    return true;
  } catch {
    return false;
  }
}

async function isChatterboxReady() {
  const py = await resolveChatterboxPython();
  if (!py) return false;
  return probeChatterboxImport(py);
}

async function chatterboxStatusHint() {
  const py = await resolveChatterboxPython();
  if (!py) return "npm run voice:test:chatterbox (отдельный venv, Python 3.11)";
  if (!(await probeChatterboxImport(py))) {
    return "Chatterbox не импортируется — npm run voice:test:chatterbox";
  }
  return "Локально (Resemble); первый запуск качает модель с Hugging Face";
}

module.exports = {
  VOICE_TEST_ROOT,
  DEFAULT_VENV_PYTHON,
  CHATTERBOX_VENV_PYTHON,
  resolveVoiceTestPython,
  resolveChatterboxPython,
  resolvePythonCandidates,
  probePythonModule,
  kokoroModelPaths,
  isKokoroReady,
  isKokoroV1Ready,
  isKokoroRuReady,
  isKokoroRuReadySync,
  isChatterboxReady,
  chatterboxStatusHint
};
