const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const VERSION_TIMEOUT_MS = 8000;
const cliBinaryCache = new Map();

function preferredCliBinDirs(home = os.homedir()) {
  return [path.join(home, ".npm-global", "bin"), path.join(home, ".local", "bin")];
}

function fallbackCliBinDirs() {
  return ["/opt/homebrew/bin", "/usr/local/bin"];
}

/** User-local CLIs first. A stale Homebrew cask in /usr/local/bin must not win over npm-global. */
function enrichShellPath(env = process.env) {
  const existing = String(env.PATH || "").split(path.delimiter).filter(Boolean);
  const parts = [];
  const push = (dir) => {
    if (dir && !parts.includes(dir)) parts.push(dir);
  };
  for (const dir of preferredCliBinDirs()) push(dir);
  for (const dir of existing) push(dir);
  for (const dir of fallbackCliBinDirs()) push(dir);
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

function rankCliCandidate(filePath) {
  const p = String(filePath || "");
  if (p.includes(`${path.sep}.npm-global${path.sep}`)) return 0;
  if (p.includes(`${path.sep}node_modules${path.sep}`)) return 1;
  if (p.includes(`${path.sep}.local${path.sep}bin`)) return 2;
  if (p.includes("Caskroom")) return 9;
  if (p.startsWith(`/usr/local/bin${path.sep}`) || p === "/usr/local/bin") return 8;
  return 5;
}

function uniquePaths(paths) {
  const seen = new Set();
  const out = [];
  for (const item of paths) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

async function listWhichHits(name, env = enrichShellPath()) {
  const cmd = process.platform === "win32" ? "where" : "which";
  const args = process.platform === "win32" ? [name] : ["-a", name];
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 4000, env });
    return String(stdout || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    if (process.platform === "win32") return [];
    try {
      const { stdout } = await execFileAsync(cmd, [name], { timeout: 4000, env });
      const line = String(stdout || "").trim().split(/\r?\n/)[0].trim();
      return line ? [line] : [];
    } catch {
      return [];
    }
  }
}

async function whichBinary(name, env = enrichShellPath()) {
  const hits = await listWhichHits(name, env);
  return hits[0] || null;
}

async function listCliBinaryCandidates(runtime, settings = {}) {
  const candidate = readCliPathFromSettings(settings, runtime);
  if (candidate.includes("/") || candidate.includes("\\")) return [candidate];
  const env = enrichShellPath();
  const hits = await listWhichHits(candidate, env);
  const ranked = uniquePaths(hits).sort((a, b) => rankCliCandidate(a) - rankCliCandidate(b));
  return ranked.length ? ranked : [candidate];
}

async function resolveCliBinary(runtime, settings = {}) {
  const key = `${String(runtime || "").trim()}:${readCliPathFromSettings(settings, runtime)}`;
  if (cliBinaryCache.has(key)) return cliBinaryCache.get(key);
  const candidates = await listCliBinaryCandidates(runtime, settings);
  const binary = candidates[0] || defaultCliBinary(runtime);
  cliBinaryCache.set(key, binary);
  return binary;
}

function clearCliBinaryCache() {
  cliBinaryCache.clear();
}

async function probeOneBinary(binary, env, label) {
  try {
    const { stdout, stderr } = await execFileAsync(binary, ["--version"], {
      timeout: VERSION_TIMEOUT_MS,
      env
    });
    const version = String(stdout || stderr || "")
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

async function probeCliBinary(runtime, settings = {}) {
  const env = enrichShellPath();
  const id = String(runtime || "").trim();
  const label = defaultCliBinary(id);
  const candidates = await listCliBinaryCandidates(id, settings);
  let last = {
    ok: false,
    binary: candidates[0] || label,
    error: `${label} недоступен (${label} --version)`
  };
  for (const binary of candidates.slice(0, 3)) {
    last = await probeOneBinary(binary, env, label);
    if (last.ok) return last;
  }
  return last;
}

module.exports = {
  enrichShellPath,
  defaultCliBinary,
  readCliPathFromSettings,
  resolveCliBinary,
  clearCliBinaryCache,
  probeCliBinary
};
