const { execFile } = require("child_process");
const { promisify } = require("util");
const { normalizeMessageRuntime } = require("./shell-runtimes");

const execFileAsync = promisify(execFile);

const CLI_BINARIES = {
  claude: ["claude"],
  codex: ["codex"]
};

async function whichBinary(name) {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(cmd, [name], { timeout: 3000 });
    return Boolean(String(stdout || "").trim());
  } catch {
    return false;
  }
}

async function probeCliRuntime(runtime) {
  for (const name of CLI_BINARIES[runtime] || []) {
    if (await whichBinary(name)) return true;
  }
  return false;
}

function hasApiKeyForRuntime(runtime, settings = {}) {
  const id = normalizeMessageRuntime(runtime);
  if (id === "claude") {
    return Boolean(String(settings.claudeApiKey || "").trim() || process.env.ANTHROPIC_API_KEY);
  }
  if (id === "codex") {
    return Boolean(String(settings.codexApiKey || "").trim() || process.env.OPENAI_API_KEY);
  }
  return false;
}

async function probeAvailableRuntimes(settings = {}) {
  const available = ["qwenpaw"];
  for (const runtime of ["claude", "codex"]) {
    if ((await probeCliRuntime(runtime)) || hasApiKeyForRuntime(runtime, settings)) {
      available.push(runtime);
    }
  }
  return available;
}

module.exports = {
  probeAvailableRuntimes,
  probeCliRuntime,
  hasApiKeyForRuntime
};
