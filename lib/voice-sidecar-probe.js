const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function resolveVoiceSidecarDir(projectRoot) {
  return path.join(projectRoot, "agent-shell", "voice-sidecar");
}

function resolveSidecarPython(projectRoot) {
  const sidecarDir = resolveVoiceSidecarDir(projectRoot);
  const venvBase = path.join(sidecarDir, ".venv");
  const unixPy = path.join(venvBase, "bin", "python3");
  const winPy = path.join(venvBase, "Scripts", "python.exe");
  if (fs.existsSync(unixPy)) return { python: unixPy, sidecarDir, venv: true };
  if (fs.existsSync(winPy)) return { python: winPy, sidecarDir, venv: true };
  return {
    python: process.platform === "win32" ? "python" : "python3",
    sidecarDir,
    venv: false
  };
}

async function probeFasterWhisper(projectRoot = path.resolve(__dirname, "..")) {
  const { python, sidecarDir, venv } = resolveSidecarPython(projectRoot);
  try {
    const { stdout } = await execFileAsync(
      python,
      ["-c", "import faster_whisper; print(getattr(faster_whisper, '__version__', 'ok'))"],
      { cwd: sidecarDir, timeout: 12000, encoding: "utf8" }
    );
    const version = String(stdout || "")
      .trim()
      .split(/\r?\n/)
      .pop()
      .trim();
    return {
      installed: true,
      venv,
      python,
      sidecarDir,
      version: version && version !== "ok" ? version : "ok"
    };
  } catch {
    return { installed: false, venv, python, sidecarDir, version: null };
  }
}

module.exports = {
  resolveVoiceSidecarDir,
  resolveSidecarPython,
  probeFasterWhisper
};
