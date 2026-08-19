/** Куда Shell отправляет сообщения (runtime / «кто думает»). */

export const SHELL_RUNTIMES = [
  "claude",
  "codex",
  "cursor",
  "openclaw",
  "hermes",
  "agent-zero",
  "qwenpaw"
];

/** Подключено в Shell (маршрутизация + настройки). */
export const SHELL_RUNTIME_IMPLEMENTED = new Set(SHELL_RUNTIMES);

const LEGACY_TARGET_MAP = {
  cms: "qwenpaw",
  "qwenpaw-log": "qwenpaw",
  agentzero: "agent-zero",
  "agent-zero": "agent-zero"
};

export const SHELL_RUNTIME_LABELS = {
  claude: "Claude",
  codex: "Codex (ChatGPT)",
  cursor: "Cursor",
  openclaw: "OpenClaw",
  hermes: "Hermes Agent",
  "agent-zero": "Agent Zero",
  qwenpaw: "QwenPaw"
};

/** Короткая подсказка под select (1 строка). */
export const SHELL_RUNTIME_HINTS = {
  claude: "Anthropic Claude — облачная модель, API key в bridge-панели.",
  codex: "OpenAI Codex / ChatGPT — облако OpenAI, ключ OPENAI_API_KEY.",
  cursor: "Cursor Agent — IDE/cloud, OpenAI-compatible endpoint.",
  openclaw: "OpenClaw Gateway — локальный агент, :18789, heartbeat и каналы.",
  hermes: "Hermes Agent — Nous Research, профили, API :8642/v1.",
  "agent-zero": "Agent Zero — автономный агент, gateway :42617, bearer token.",
  qwenpaw: "QwenPaw — локальный агент :8088, чаты и MCP к Agent CMS."
};

/** Развёрнутое описание runtime для панели маршрута. */
export const SHELL_RUNTIME_DESCRIPTIONS = {
  claude: `Claude (Anthropic) — облачный LLM-агент для рассуждений, кода и длинного контекста.
Подключение: Anthropic Messages API. Укажите API key и модель (например claude-sonnet).
Shell отправляет текст → Claude отвечает → Shell озвучивает и показывает ответ.`,

  codex: `Codex / ChatGPT (OpenAI) — агент OpenAI для кода, анализа и диалога.
Подключение: OpenAI API (https://api.openai.com/v1). Ключ OPENAI_API_KEY, модель gpt-4o / o-series.
Удобен как универсальный «мозг» без локального сервера.`,

  cursor: `Cursor — агент из экосистемы Cursor IDE (локально или cloud).
Подключение: OpenAI-compatible endpoint (если у вас поднят Cursor agent / proxy).
Shell не запускает Cursor — только шлёт сообщения на настроенный URL.`,

  openclaw: `OpenClaw — локальный gateway-агент (мульти-канал, heartbeat, инструменты).
Подключение: Gateway :18789, OpenAI /v1/chat/completions, token gateway, agent id → модель openclaw/<agent>.
Хорош для always-on агента на своей машине.`,

  hermes: `Hermes Agent (Nous Research) — профильный агент с gateway и API server.
Подключение: API server :8642/v1, Bearer API_SERVER_KEY, опционально профиль /p/<name>/v1.
Поддерживает сессии (X-Hermes-Session-Id) и OpenAI-совместимый чат.`,

  "agent-zero": `Agent Zero — фреймворк автономного агента (инструменты, память, MCP, проекты).
Подключение: \`agentzero gateway\` → :42617, POST /v1/chat/completions, bearer после /pair.
Agent CMS подключается к Agent Zero по MCP отдельно; здесь только голосовой маршрут.`,

  qwenpaw: `QwenPaw — локальный агент Agent CMS (:8088): чаты, streaming, инструменты.
Подключение: URL, agent id, session — в панели ниже. MCP к workspace Agent CMS настраивается в QwenPaw.
Рекомендуется, если нужны чаты Shell и связка с CMS из коробки.`
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
  },
  "agent-zero": {
    baseUrl: "http://127.0.0.1:42617",
    model: "agent-zero",
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
  const id = normalizeMessageRuntime(runtime);
  return id !== "qwenpaw";
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
