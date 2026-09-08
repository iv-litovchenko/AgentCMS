/** Куда Shell отправляет сообщения (runtime / «кто думает»). */

/** Группы runtime в select (optgroup). */
export const SHELL_RUNTIME_GROUPS = [
  {
    id: "cli",
    label: "CLI в терминале",
    hint: "Claude / Codex — cwd: workspaces/cli-sandbox/ (общая песочница, не хранилище).",
    runtimes: ["claude", "codex"]
  },
  {
    id: "agents",
    label: "Агентские системы",
    hint: "Серверы и gateway — QwenPaw, OpenClaw, Hermes и др.; HTTP/API или свой runtime.",
    runtimes: ["qwenpaw", "cursor", "openclaw", "hermes", "agent-zero"]
  }
];

/** CLI runtimes в терминале (claude, codex). */
export const SHELL_CLI_RUNTIMES = SHELL_RUNTIME_GROUPS.find((group) => group.id === "cli")?.runtimes || [
  "claude",
  "codex"
];

/** Плоский список (порядок = группы). */
export const SHELL_RUNTIMES = SHELL_RUNTIME_GROUPS.flatMap((group) => group.runtimes);

/** Подключено в Shell (маршрутизация + настройки). */
export const SHELL_RUNTIME_IMPLEMENTED = new Set(["qwenpaw", "claude", "codex"]);

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

export const SHELL_RUNTIME_EMOJIS = {
  claude: "🟠",
  codex: "💬",
  cursor: "⌨️",
  openclaw: "🦞",
  hermes: "⚡",
  "agent-zero": "🕳️",
  qwenpaw: "🐾"
};

export function resolveRuntimeConnectionState(runtime, status, { implemented = true } = {}) {
  const id = normalizeMessageRuntime(runtime);
  if (!implemented) return "soon";
  if (!status) return "unknown";
  if (status.ok) return "live";
  // CLI: version from probe survives even if lightweight SSE status sent ok:false
  if (runtimeUsesCli(id) && status.installed !== false && String(status.version || "").trim()) {
    if (!String(status.error || "").trim()) return "live";
  }
  if (status.installed === false || status.configured === false) return "unconfigured";
  return "error";
}

/** Команды установки CLI-runtime в терминале. */
export const SHELL_RUNTIME_CLI_SETUP = {
  claude: {
    install: "npm i -g @anthropic-ai/claude-code",
    auth: "claude login",
    check: "claude auth status"
  },
  codex: {
    install: "npm i -g @openai/codex",
    auth: "codex login",
    check: "codex --version"
  }
};

/** Runtime с блоком подсказок на вкладке «Маршрут». */
export const SHELL_ROUTE_NOTE_RUNTIMES = ["claude", "codex", "qwenpaw"];

export const CLI_SANDBOX_REL = "workspaces/cli-sandbox";

/** Краткое пояснение над инструкцией для каждого runtime. */
export const SHELL_RUNTIME_ROUTE_INTROS = {
  claude:
    "Локальный CLI Claude. Shell запускает claude в общей песочнице workspaces/cli-sandbox/ — не в корне workspace и не в awn-container/. К CMS — через MCP.",
  codex:
    "Локальный CLI Codex. Shell запускает codex exec в workspaces/cli-sandbox/ — не в хранилище workspace. К CMS — через MCP.",
  qwenpaw: "HTTP-агент QwenPaw. Shell отправляет сообщения на сервер и стримит ответ через SSE."
};

export function formatCliSandboxCwdLine(absolutePath = "") {
  const abs = String(absolutePath || "").trim();
  if (abs) {
    return `Каталог запуска (cwd): ${abs}`;
  }
  return `Каталог запуска (cwd): ${CLI_SANDBOX_REL}/ — общая песочница проекта YamlCMS.`;
}

export function runtimeShowsRouteNote(runtime) {
  return SHELL_ROUTE_NOTE_RUNTIMES.includes(normalizeMessageRuntime(runtime));
}

export function formatQwenpawRuntimeRouteNote(status = null) {
  const lines = [
    "URL и agentId — в полях ниже.",
    "Проверка: статус в списке runtime (🟢 / ⚪ / 🔴)."
  ];
  const err = String(status?.error || "").trim();
  if (err) lines.push(`Сейчас: ${err}`);
  else if (status?.version) lines.push(`Найдено: ${formatShortCliVersion(status.version)}`);
  else if (status?.ok) lines.push("Подключение: OK");
  return lines.join("\n");
}

export function formatRuntimeRouteNote(runtime, status = null, { cliSandboxPath = "" } = {}) {
  const id = normalizeMessageRuntime(runtime);
  if (id === "claude" || id === "codex") return formatCliRuntimeRouteNote(id, status, { cliSandboxPath });
  if (id === "qwenpaw") return formatQwenpawRuntimeRouteNote(status);
  return "";
}

export function formatCliRuntimeRouteNote(runtime, status = null, { cliSandboxPath = "" } = {}) {
  const id = normalizeMessageRuntime(runtime);
  if (!runtimeUsesCli(id)) return "";
  const setup = SHELL_RUNTIME_CLI_SETUP[id];
  if (!setup) return "";
  const lines = [
    formatCliSandboxCwdLine(cliSandboxPath),
    "Workspace агента (хранилище CMS) сюда не монтируется — только MCP-инструменты.",
    `Установка: ${setup.install}`,
    `Вход: ${setup.auth}`,
    `Проверка: ${setup.check}`
  ];
  const err = String(status?.error || "").trim();
  if (err) lines.push(`Сейчас: ${err}`);
  else if (status?.version) lines.push(`Найдено: ${formatShortCliVersion(status.version)}`);
  if (id === "claude" || id === "codex") {
    lines.push(
      "Инструменты CLI: в Shell нет окна подтверждения — включите переключатель ниже и сохраните настройки."
    );
  }
  return lines.join("\n");
}

export function formatRuntimeStatusEmoji(conn) {
  switch (conn) {
    case "live":
      return "🟢";
    case "connecting":
      return "🟡";
    case "unknown":
      return "⚪";
    case "unconfigured":
      return "⚪";
    case "error":
      return "🔴";
    case "soon":
      return "⏸";
    default:
      return "⚪";
  }
}

export function runtimeShowsCliVersion(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return id === "claude" || id === "codex" || id === "qwenpaw";
}

/** Короткая версия из вывода `claude --version` / `codex --version` / `qwen --version`. */
export function formatShortCliVersion(raw) {
  const line = String(raw || "")
    .trim()
    .split(/\r?\n/)[0]
    .trim();
  if (!line) return "";
  const leading = line.match(/^(\d+\.\d+\.\d+(?:[-+][\w.]*)?)/);
  if (leading) return leading[1];
  const embedded = line.match(/(\d+\.\d+\.\d+(?:[-+][\w.]*)?)/);
  if (embedded) return embedded[1];
  return line.length <= 20 ? line : `${line.slice(0, 18)}…`;
}

export function formatRuntimeCliVersion(runtime, status) {
  if (!runtimeShowsCliVersion(runtime)) return "";
  return formatShortCliVersion(status?.version);
}

export function formatRuntimeSelectLabel(
  runtime,
  { implemented = true, status = null, conn = null, showVersion = false } = {}
) {
  const id = String(runtime || "").trim();
  const label = SHELL_RUNTIME_LABELS[id] || id;
  const connection = conn || resolveRuntimeConnectionState(id, status, { implemented });
  const emoji = formatRuntimeStatusEmoji(connection);
  if (!implemented) return `${emoji} ${label} — скоро`;
  const ver = showVersion ? formatRuntimeCliVersion(id, status) : "";
  return ver ? `${emoji} ${label} · ${ver}` : `${emoji} ${label}`;
}

export function formatRuntimeStatusTitle(runtime, status, { implemented = true } = {}) {
  const id = String(runtime || "").trim();
  const label = SHELL_RUNTIME_LABELS[id] || id;
  const conn = resolveRuntimeConnectionState(id, status, { implemented });
  const verRaw = String(status?.version || "").trim();
  const verShort = formatRuntimeCliVersion(id, status);
  const verDetail = verRaw && verRaw !== verShort ? ` (${verRaw})` : "";
  const versionSuffix = verShort ? ` · v${verShort}${verDetail}` : "";
  if (!implemented) return `${label} — скоро`;
  if (conn === "live") return `${label}${versionSuffix} · на связи`;
  if (conn === "connecting") return `${label}${versionSuffix} · проверка…`;
  if (conn === "unknown") return verShort ? `${label} · v${verShort}` : label;
  if (conn === "unconfigured") {
    return verShort ? `${label} · v${verShort} · CLI не установлен` : `${label} · CLI не установлен`;
  }
  if (conn === "soon") return `${label} — скоро`;
  const detail = String(status?.error || "").trim();
  return detail ? `${label}${versionSuffix} · ${detail}` : `${label}${versionSuffix} · недоступен`;
}

/** Короткая подсказка под select (1 строка). */
export const SHELL_RUNTIME_HINTS = {
  claude: "Claude Code CLI — npm i -g @anthropic-ai/claude-code, auth через claude login.",
  codex: "Codex CLI — npm i -g @openai/codex, auth через codex login.",
  cursor: "Cursor Agent — IDE/cloud, OpenAI-compatible endpoint.",
  openclaw: "OpenClaw Gateway — локальный агент, :18789, heartbeat и каналы.",
  hermes: "Hermes Agent — Nous Research, профили, API :8642/v1.",
  "agent-zero": "Agent Zero — автономный агент, gateway :42617, bearer token.",
  qwenpaw: "QwenPaw — qwen CLI в PATH (qwen --version), сервер :8088, чаты и MCP к Agent CMS."
};

/** Развёрнутое описание runtime для панели маршрута. */
export const SHELL_RUNTIME_DESCRIPTIONS = {
  claude: `Claude Code (@anthropic-ai/claude-code) — локальный CLI-агент Anthropic.
Подключение: бинарь claude в PATH (npm i -g @anthropic-ai/claude-code), авторизация claude login.
Shell запускает claude -p … с cwd workspaces/cli-sandbox/ → ответ стримится в диалог.`,

  codex: `Codex CLI (@openai/codex) — локальный CLI-агент OpenAI.
Подключение: бинарь codex в PATH (npm i -g @openai/codex), авторизация codex login.
Shell запускает codex exec … с cwd workspaces/cli-sandbox/ — сессии через Session ID.`,

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
    cliPath: "codex",
    model: "",
    sessionId: "",
    permissionMode: ""
  },
  claude: {
    cliPath: "claude",
    model: "",
    sessionId: "",
    permissionMode: ""
  },
  "agent-zero": {
    baseUrl: "http://127.0.0.1:42617",
    model: "agent-zero",
    sessionId: "agent-shell"
  }
};

/** Пресеты для select Model (пустое value = дефолт runtime / CLI). */
export const RUNTIME_MODEL_PRESETS = {
  claude: [
    { value: "", label: "По умолчанию из CLI" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" }
  ],
  codex: [
    { value: "", label: "По умолчанию из CLI" },
    { value: "o3", label: "o3" },
    { value: "o4-mini", label: "o4-mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" }
  ],
  cursor: [
    { value: "", label: "По умолчанию endpoint" },
    { value: "default", label: "default" },
    { value: "gpt-4o", label: "gpt-4o" },
    { value: "claude-sonnet-4-20250514", label: "claude-sonnet-4" }
  ],
  openclaw: [
    { value: "", label: "По умолчанию gateway" },
    { value: "openclaw/default", label: "openclaw/default" }
  ],
  hermes: [
    { value: "", label: "По умолчанию API" },
    { value: "hermes-agent", label: "hermes-agent" }
  ],
  "agent-zero": [
    { value: "", label: "По умолчанию gateway" },
    { value: "agent-zero", label: "agent-zero" }
  ]
};

export function runtimeModelPresets(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return RUNTIME_MODEL_PRESETS[id] || [{ value: "", label: "По умолчанию" }];
}

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
    cliPath: "CliPath",
    apiKey: "ApiKey",
    model: "Model",
    profile: "Profile",
    agentId: "AgentId",
    sessionId: "SessionId",
    permissionMode: "PermissionMode"
  };
  return runtimeField(id, map[field] || field);
}

export function runtimeUsesCli(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return id === "claude" || id === "codex";
}

export function runtimeShowsPermissionMode(runtime) {
  return runtimeUsesCli(normalizeMessageRuntime(runtime));
}

export function runtimeQwenpawPermissionModeCopy() {
  return {
    emoji: "🔓",
    title: "Разрешить инструменты без подтверждения",
    desc: "(bash, файлы, MCP и другие — без окна «Разрешить?»)",
    titleAttr: "QwenPaw — approval_level OFF, guard инструментов отключён",
    ariaLabel: "Разрешить QwenPaw выполнять инструменты без подтверждения"
  };
}

export function runtimePermissionModeCopy(runtime) {
  const id = normalizeMessageRuntime(runtime);
  if (id === "codex") {
    return {
      emoji: "⚡",
      title: "Разрешить команды без подтверждения",
      desc: "(shell, правки файлов и др. — без окна «Разрешить?»)",
      titleAttr: "Codex CLI — без подтверждения команд и sandbox-запросов",
      ariaLabel: "Разрешить Codex выполнять команды без подтверждения"
    };
  }
  return {
    emoji: "🔓",
    title: "Разрешить инструменты без подтверждения",
    desc: "(WebSearch, Bash и другие — без окна «Разрешить?»)",
    titleAttr: "Claude CLI — WebSearch, Bash и другие инструменты без подтверждения",
    ariaLabel: "Разрешить Claude использовать инструменты без подтверждения"
  };
}

export function runtimeShowsModel(runtime) {
  return runtimeUsesCli(runtime);
}

/** Подпись поля «профиль / агент» для HTTP-runtime (не QwenPaw). */
export function runtimeAgentFieldLabel(runtime) {
  const id = normalizeMessageRuntime(runtime);
  if (id === "hermes") return "Профиль";
  if (id === "openclaw") return "Агент";
  return "Профиль / агент";
}

/** Одно поле «профиль / агент» для HTTP-runtime (не QwenPaw, не CLI). */
export function runtimeShowsAgentMeta(runtime) {
  const id = normalizeMessageRuntime(runtime);
  if (runtimeUsesCli(id) || runtimeUsesQwenPaw(id)) return false;
  return id === "hermes" || id === "openclaw" || id === "cursor" || id === "agent-zero";
}

/** Ключ в settings для поля профиль/агент. */
export function runtimeAgentMetaKey(runtime) {
  return normalizeMessageRuntime(runtime) === "openclaw" ? "agentId" : "profile";
}

export function runtimeShowsApiKey(runtime) {
  return !runtimeUsesQwenPaw(runtime) && !runtimeUsesCli(runtime);
}

export function runtimeShowsBaseUrl(runtime) {
  return runtimeUsesBridge(runtime) && !runtimeUsesCli(runtime);
}
