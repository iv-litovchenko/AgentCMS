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

function readCliPathFromSettings(settings, runtime) {
  const id = String(runtime || "").trim();
  const custom = String(settings?.[`${id}CliPath`] || "").trim();
  if (custom && !/^https?:\/\//i.test(custom)) return custom;
  return id === "codex" ? "codex" : "claude";
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
  const binary = await resolveCliBinary(runtime, settings);
  try {
    await execFileAsync(binary, ["--help"], { timeout: 6000, env });
    return { ok: true, binary };
  } catch (error) {
    if (String(runtime) === "codex") {
      try {
        await execFileAsync(binary, ["doctor"], { timeout: 10000, env });
        return { ok: true, binary };
      } catch (doctorError) {
        const message = String(doctorError?.stderr || doctorError?.message || doctorError).trim();
        return { ok: false, binary, error: message.slice(0, 240) || "codex недоступен" };
      }
    }
    const message = String(error?.stderr || error?.message || error).trim();
    return { ok: false, binary, error: message.slice(0, 240) || "claude недоступен" };
  }
}

module.exports = {
  enrichShellPath,
  readCliPathFromSettings,
  resolveCliBinary,
  probeCliBinary
};
