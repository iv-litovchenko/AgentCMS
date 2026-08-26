const { execFile } = require("child_process");
const { promisify } = require("util");
const { SHELL_RUNTIMES, isRuntimeImplemented, normalizeMessageRuntime } = require("./shell-runtimes");

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
  const implemented = SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));
  const installed = [];
  for (const runtime of ["claude", "codex"]) {
    if ((await probeCliRuntime(runtime)) || hasApiKeyForRuntime(runtime, settings)) {
      installed.push(runtime);
    }
  }
  return { available: implemented, installed };
}

module.exports = {
  probeAvailableRuntimes,
  probeCliRuntime,
  hasApiKeyForRuntime
};
