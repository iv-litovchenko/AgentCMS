const { SHELL_RUNTIMES, isRuntimeImplemented, normalizeMessageRuntime } = require("./shell-runtimes");
const { probeCliBinary } = require("./runtime-cli-env");

async function isCliRuntimeReady(runtime, settings = {}) {
  const id = normalizeMessageRuntime(runtime);
  if (id !== "claude" && id !== "codex") return false;
  const probe = await probeCliBinary(id, settings);
  return probe.ok;
}

async function probeAvailableRuntimes(settings = {}) {
  const implemented = SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));
  const installed = [];
  for (const runtime of ["claude", "codex"]) {
    if (await isCliRuntimeReady(runtime, settings)) installed.push(runtime);
  }
  return { available: implemented, installed };
}

module.exports = {
  probeAvailableRuntimes,
  isCliRuntimeReady,
  probeCliBinary
};
