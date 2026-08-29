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
  const probes = await Promise.all(
    ["claude", "codex"].map(async (runtime) => {
      const ok = await isCliRuntimeReady(runtime, settings);
      return ok ? runtime : null;
    })
  );
  const installed = probes.filter(Boolean);
  return { available: implemented, installed };
}

module.exports = {
  probeAvailableRuntimes,
  isCliRuntimeReady,
  probeCliBinary
};
