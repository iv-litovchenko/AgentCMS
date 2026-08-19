/**
 * Контракт Agent Shell API — общий для web (`shell-client.js`) и iOS (`mobile/iphone-shell/`).
 * При изменении API обновляйте и Swift-клиент.
 */
export const SHELL_API = {
  status: "/api/shell/status",
  settings: "/api/shell/settings",
  message: "/api/shell/message",
  stopTts: "/api/shell/stop-tts",
  ttsSynthesize: "/api/shell/tts/synthesize",
  stream: "/api/shell/stream",
  agents: "/api/agents",
  agentGroups: "/api/agents/groups"
};

export const SHELL_SSE = {
  status: "status",
  state: "state",
  assistantMessage: "assistant_message",
  assistantDelta: "assistant_delta",
  agentActivity: "agent_activity",
  settings: "settings",
  error: "error"
};

export const SHELL_PHASE = {
  waiting: "waiting",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  disabled: "disabled"
};

export const SHELL_PHASE_LABELS = {
  waiting: "🟡 Ожидаю",
  listening: "🔴 Слушаю",
  thinking: "🟢 Думаю",
  speaking: "🔊 Говорю",
  disabled: "⏸️ Отключено"
};

export const SHELL_ROUTE_LABELS = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  openclaw: "OpenClaw",
  hermes: "Hermes",
  "agent-zero": "Agent Zero",
  qwenpaw: "QwenPaw"
};

export function shellPhaseLabel(phase) {
  return SHELL_PHASE_LABELS[phase] || SHELL_PHASE_LABELS.waiting;
}

export function shellRouteLabel(target) {
  return SHELL_ROUTE_LABELS[target] || target || "—";
}

export function unwrapShellState(entry) {
  if (!entry || typeof entry !== "object") {
    return { phase: SHELL_PHASE.waiting, phrase: "" };
  }
  if (entry.payload && typeof entry.payload === "object") {
    return entry.payload;
  }
  return entry;
}

export function unwrapAssistantMessage(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return payload.message || payload.payload || payload;
}

export function pickShellReply(status) {
  if (!status || typeof status !== "object") return "";
  const fromState = String(status.state?.lastShellReply || "").trim();
  if (fromState) return fromState;
  const fromField = String(status.shellReply || "").trim();
  if (fromField) return fromField;
  return String(status.latestAgent?.body || "").trim();
}
