/** Куда Shell отправляет сообщения (runtime / «кто думает»). */

export const SHELL_RUNTIMES = ["qwenpaw", "hermes", "openclaw", "cursor", "codex", "claude"];

/** Подключено в Shell (маршрутизация + настройки). */
export const SHELL_RUNTIME_IMPLEMENTED = new Set(SHELL_RUNTIMES);

const LEGACY_TARGET_MAP = {
  cms: "qwenpaw",
  "qwenpaw-log": "qwenpaw"
};

export const SHELL_RUNTIME_LABELS = {
  qwenpaw: "QwenPaw",
  hermes: "Hermes Agent",
  openclaw: "OpenClaw",
  cursor: "Cursor",
  codex: "Codex (ChatGPT)",
  claude: "Claude"
};

export const SHELL_RUNTIME_HINTS = {
  qwenpaw: "Локальный QwenPaw (:8088). Профиль и чат — ниже.",
  hermes: "Hermes API server (:8642/v1). Профиль — префикс /p/<profile>/.",
  openclaw: "OpenClaw Gateway (:18789/v1). Модель openclaw/<agent>.",
  cursor: "OpenAI-совместимый endpoint Cursor (локальный или cloud).",
  codex: "OpenAI API (Codex / ChatGPT). Ключ — OPENAI_API_KEY.",
  claude: "Anthropic Messages API. Ключ — ANTHROPIC_API_KEY."
};

export const RUNTIME_DEFAULTS = {
  hermes: {
    baseUrl: "http://127.0.0.1:8642",
    model: "hermes-agent",
    profile: "",
    sessionId: "agent-shell"
  },
  openclaw: {
    baseUrl: "http://127.0.0.1:18789",
    model: "openclaw/default",
    agentId: "",
    sessionId: "agent-shell"
  },
  cursor: {
    baseUrl: "http://127.0.0.1:3210",
    model: "default",
    sessionId: "agent-shell"
  },
  codex: {
    baseUrl: "https://api.openai.com",
    model: "gpt-4o",
    sessionId: "agent-shell"
  },
  claude: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
    sessionId: "agent-shell"
  }
};

export function runtimeField(runtime, suffix) {
  return `${runtime}${suffix}`;
}

export function normalizeMessageRuntime(value) {
  const raw = String(value || "").trim();
  const mapped = LEGACY_TARGET_MAP[raw] || raw;
  if (SHELL_RUNTIMES.includes(mapped)) return mapped;
  return "qwenpaw";
}

export function isRuntimeImplemented(runtime) {
  return SHELL_RUNTIME_IMPLEMENTED.has(normalizeMessageRuntime(runtime));
}

export function runtimeUsesQwenPaw(runtime) {
  return normalizeMessageRuntime(runtime) === "qwenpaw";
}

export function runtimeUsesBridge(runtime) {
  return normalizeMessageRuntime(runtime) !== "qwenpaw";
}

export function bridgeRuntimeField(runtime, field) {
  const id = normalizeMessageRuntime(runtime);
  const map = {
    baseUrl: "BaseUrl",
    apiKey: "ApiKey",
    model: "Model",
    profile: "Profile",
    agentId: "AgentId",
    sessionId: "SessionId"
  };
  return runtimeField(id, map[field] || field);
}

export function runtimeShowsProfile(runtime) {
  return normalizeMessageRuntime(runtime) === "hermes";
}

export function runtimeShowsAgentId(runtime) {
  return normalizeMessageRuntime(runtime) === "openclaw";
}

export function runtimeShowsApiKey(runtime) {
  return normalizeMessageRuntime(runtime) !== "qwenpaw";
}
