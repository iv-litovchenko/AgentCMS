/** Серверная конфигурация runtime — держите поля в sync с public/shell/shell-runtimes.js */

const RUNTIME_TRANSPORT = {
  qwenpaw: "qwenpaw",
  hermes: "openai",
  openclaw: "openai",
  cursor: "openai",
  codex: "cli",
  claude: "cli",
  "agent-zero": "openai",
  cli: "cli"
};

const RUNTIME_DEFAULTS = {
  qwenpaw: {
    baseUrl: "http://127.0.0.1:8088",
    model: "",
    profile: "",
    agentId: "default"
  },
  hermes: {
    baseUrl: "http://127.0.0.1:8642",
    model: "hermes-agent",
    profile: "",
    sessionId: "agent-shell"
  },
  openclaw: {
    baseUrl: "http://127.0.0.1:18789",
    model: "openclaw/default",
    profile: "",
    sessionId: "agent-shell"
  },
  cursor: {
    baseUrl: "http://127.0.0.1:3210",
    model: "default",
    profile: "",
    sessionId: "agent-shell"
  },
  codex: {
    cliPath: "codex",
    model: "",
    profile: "",
    sessionId: ""
  },
  claude: {
    cliPath: "claude",
    model: "",
    profile: "",
    sessionId: ""
  },
  "agent-zero": {
    baseUrl: "http://127.0.0.1:42617",
    model: "agent-zero",
    profile: "",
    sessionId: "agent-shell"
  }
};

function runtimeField(runtime, suffix) {
  return `${runtime}${suffix}`;
}

function readRuntimeString(settings, runtime, suffix, fallback = "") {
  const key = runtimeField(runtime, suffix);
  const value = String(settings?.[key] ?? "").trim();
  if (value) return value;
  return String(fallback || "").trim();
}

function buildHermesBaseUrl(root, profile) {
  const base = String(root || RUNTIME_DEFAULTS.hermes.baseUrl).trim().replace(/\/+$/, "");
  const cleanProfile = String(profile || "").trim();
  if (!cleanProfile) return `${base}/v1`;
  if (base.includes("/p/")) return base.endsWith("/v1") ? base : `${base}/v1`;
  return `${base}/p/${encodeURIComponent(cleanProfile)}/v1`;
}

function resolveRuntimeEndpoint(settings, runtime) {
  const id = String(runtime || "qwenpaw").trim();
  const defaults = RUNTIME_DEFAULTS[id] || RUNTIME_DEFAULTS.qwenpaw;
  const profile = readRuntimeString(settings, id, "Profile", defaults.profile);
  const agentId = readRuntimeString(settings, id, "AgentId", defaults.agentId || "");
  let baseUrl = readRuntimeString(settings, id, "BaseUrl", defaults.baseUrl);

  if (id === "hermes") {
    return {
      transport: RUNTIME_TRANSPORT.hermes,
      baseUrl: buildHermesBaseUrl(baseUrl, profile),
      apiKey: readRuntimeString(settings, id, "ApiKey"),
      model: readRuntimeString(settings, id, "Model", defaults.model),
      profile,
      agentId,
      sessionId: readRuntimeString(settings, id, "SessionId", defaults.sessionId)
    };
  }

  if (id === "openclaw") {
    const root = baseUrl.replace(/\/+$/, "");
    return {
      transport: RUNTIME_TRANSPORT.openclaw,
      baseUrl: root.endsWith("/v1") ? root : `${root}/v1`,
      apiKey: readRuntimeString(settings, id, "ApiKey"),
      model: readRuntimeString(settings, id, "Model", agentId ? `openclaw/${agentId}` : defaults.model),
      profile,
      agentId,
      sessionId: readRuntimeString(settings, id, "SessionId", defaults.sessionId)
    };
  }

  if (id === "claude" || id === "codex") {
    const cliPath = readRuntimeString(settings, id, "CliPath", defaults.cliPath || id);
    return {
      transport: RUNTIME_TRANSPORT.cli,
      runtime: id,
      cliPath: /^https?:\/\//i.test(cliPath) ? defaults.cliPath || id : cliPath,
      model: readRuntimeString(settings, id, "Model", defaults.model),
      profile,
      agentId,
      sessionId: readRuntimeString(settings, id, "SessionId", defaults.sessionId)
    };
  }

  const root = baseUrl.replace(/\/+$/, "");
  return {
    transport: RUNTIME_TRANSPORT[id] || "openai",
    baseUrl: root.endsWith("/v1") ? root : `${root}/v1`,
    apiKey: readRuntimeString(settings, id, "ApiKey"),
    model: readRuntimeString(settings, id, "Model", defaults.model),
    profile,
    agentId,
    sessionId: readRuntimeString(settings, id, "SessionId", defaults.sessionId)
  };
}

function buildRuntimeSettingsPatch(runtime) {
  const id = String(runtime || "").trim();
  const defaults = RUNTIME_DEFAULTS[id];
  if (!defaults) return {};
  if (id === "claude" || id === "codex") {
    return {
      [runtimeField(id, "CliPath")]: defaults.cliPath || id,
      [runtimeField(id, "Model")]: defaults.model || "",
      [runtimeField(id, "SessionId")]: defaults.sessionId || ""
    };
  }
  return {
    [runtimeField(id, "BaseUrl")]: defaults.baseUrl,
    [runtimeField(id, "ApiKey")]: "",
    [runtimeField(id, "Model")]: defaults.model,
    [runtimeField(id, "Profile")]: defaults.profile || "",
    [runtimeField(id, "AgentId")]: defaults.agentId || "",
    [runtimeField(id, "SessionId")]: defaults.sessionId || "agent-shell"
  };
}

function buildDefaultRuntimeSettings() {
  const patch = {};
  for (const runtime of Object.keys(RUNTIME_DEFAULTS)) {
    if (runtime === "qwenpaw") continue;
    Object.assign(patch, buildRuntimeSettingsPatch(runtime));
  }
  return patch;
}

function buildRuntimeExtraHeaders(runtime, endpoint) {
  const headers = {};
  if (runtime === "hermes" && endpoint.sessionId) {
    headers["X-Hermes-Session-Id"] = endpoint.sessionId;
  }
  if (runtime === "openclaw" && endpoint.agentId) {
    headers["x-openclaw-agent"] = endpoint.agentId;
  }
  return headers;
}

function runtimeHealthPath(runtime) {
  if (runtime === "hermes" || runtime === "agent-zero") return "/health";
  return "/v1/models";
}

module.exports = {
  RUNTIME_TRANSPORT,
  RUNTIME_DEFAULTS,
  runtimeField,
  resolveRuntimeEndpoint,
  buildDefaultRuntimeSettings,
  buildRuntimeExtraHeaders,
  runtimeHealthPath
};
