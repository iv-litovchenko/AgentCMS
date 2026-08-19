/** Серверная копия — держите в sync с public/shell/shell-runtimes.js */

const SHELL_RUNTIMES = [
  "claude",
  "codex",
  "cursor",
  "openclaw",
  "hermes",
  "agent-zero",
  "qwenpaw"
];
const SHELL_RUNTIME_IMPLEMENTED = new Set(["qwenpaw"]);

const LEGACY_TARGET_MAP = {
  cms: "qwenpaw",
  "qwenpaw-log": "qwenpaw",
  agentzero: "agent-zero"
};

function normalizeMessageRuntime(value) {
  const raw = String(value || "").trim();
  const mapped = LEGACY_TARGET_MAP[raw] || raw;
  if (SHELL_RUNTIMES.includes(mapped)) return mapped;
  return "qwenpaw";
}

function isRuntimeImplemented(runtime) {
  return SHELL_RUNTIME_IMPLEMENTED.has(normalizeMessageRuntime(runtime));
}

function runtimeUsesQwenPaw(runtime) {
  return normalizeMessageRuntime(runtime) === "qwenpaw";
}

function runtimeUsesBridge(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return id !== "qwenpaw";
}

module.exports = {
  SHELL_RUNTIMES,
  SHELL_RUNTIME_IMPLEMENTED,
  normalizeMessageRuntime,
  isRuntimeImplemented,
  runtimeUsesQwenPaw,
  runtimeUsesBridge
};
