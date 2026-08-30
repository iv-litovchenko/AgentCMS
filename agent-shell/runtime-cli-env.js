const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function enrichShellPath(env = process.env) {
  const home = os.homedir();
  const extras = [
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".local", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin"
  ];
  const parts = String(env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const dir of extras) {
    if (dir && !parts.includes(dir)) parts.push(dir);
  }
  return { ...env, PATH: parts.join(path.delimiter) };
}

function defaultCliBinary(runtime) {
  const id = String(runtime || "").trim();
  if (id === "codex") return "codex";
  if (id === "qwen" || id === "qwenpaw") return "qwen";
  return "claude";
}

function readCliPathFromSettings(settings, runtime) {
  const id = String(runtime || "").trim();
  const keys = [`${id}CliPath`];
  if (id === "qwen" || id === "qwenpaw") keys.push("qwenCliPath", "qwenpawCliPath");
  for (const key of keys) {
    const custom = String(settings?.[key] || "").trim();
    if (custom && !/^https?:\/\//i.test(custom)) return custom;
  }
  return defaultCliBinary(id);
}

async function whichBinary(name, env = enrichShellPath()) {
  const cmd = process.platform === "win32" ? "where" : "which";
  const { stdout } = await execFileAsync(cmd, [name], { timeout: 4000, env });
  const line = String(stdout || "")
    .trim()
    .split(/\r?\n/)[0]
    .trim();
  return line || null;
}

async function resolveCliBinary(runtime, settings = {}) {
  const env = enrichShellPath();
  const candidate = readCliPathFromSettings(settings, runtime);
  if (candidate.includes("/") || candidate.includes("\\")) return candidate;
  try {
    return (await whichBinary(candidate, env)) || candidate;
  } catch {
    return candidate;
  }
}

async function probeCliBinary(runtime, settings = {}) {
  const env = enrichShellPath();
  const id = String(runtime || "").trim();
  const binary = await resolveCliBinary(id, settings);
  const label = defaultCliBinary(id);
  try {
    const { stdout } = await execFileAsync(binary, ["--version"], { timeout: 6000, env });
    const version = String(stdout || "")
      .trim()
      .split(/\r?\n/)[0]
      .trim();
    return { ok: true, binary, version: version || null };
  } catch (error) {
    const message = String(error?.stderr || error?.message || error).trim();
    return {
      ok: false,
      binary,
      error: message.slice(0, 240) || `${label} недоступен (${label} --version)`
    };
  }
}

module.exports = {
  enrichShellPath,
  defaultCliBinary,
  readCliPathFromSettings,
  resolveCliBinary,
  probeCliBinary
};
