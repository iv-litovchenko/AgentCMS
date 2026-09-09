const DEFAULT_TIMEOUT_MS = 300000;

const CLAUDE_PERMISSION_MODES = new Set(["bypassPermissions", "dontAsk", "auto", "manual", "plan"]);

function normalizeClaudePermissionMode(value) {
  const mode = String(value || "").trim();
  return CLAUDE_PERMISSION_MODES.has(mode) ? mode : "";
}

function extractUserPrompt(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role === "user")
    .map((item) => String(item.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function extractSystemPrompt(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role === "system")
    .map((item) => String(item.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function claudeStreamError(event) {
  if (!event || typeof event !== "object") return "";
  if (event.is_error !== true && event.subtype !== "error_during_execution") return "";
  if (Array.isArray(event.errors)) {
    const joined = event.errors
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("\n");
    if (joined) return joined;
  }
  if (typeof event.error === "string" && event.error.trim()) return event.error.trim();
  if (typeof event.result === "string" && event.result.trim()) return event.result.trim();
  return "Claude CLI вернул ошибку";
}

function extractClaudeAssistantDelta(event) {
  if (!event || typeof event !== "object" || event.is_error) return "";
  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
    return String(event.delta.text || "");
  }
  if (event.type === "assistant") {
    const content = event.message?.content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block && block.type === "text")
        .map((block) => String(block.text || ""))
        .join("");
    }
    if (typeof content === "string") return content;
  }
  return "";
}

function extractClaudeResultText(event) {
  if (!event || typeof event !== "object" || event.is_error) return "";
  if (event.type === "result" && typeof event.result === "string") return event.result;
  return "";
}

function looksLikeJsonObject(text) {
  const value = String(text || "").trim();
  return value.startsWith("{") && value.endsWith("}");
}

function looksLikeCliError(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (/^error:/i.test(value)) return true;
  if (/thread\/resume failed/i.test(value)) return true;
  if (/no rollout found/i.test(value)) return true;
  return false;
}

function extractCodexThreadId(event) {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  if (type === "thread.started") {
    return String(event.thread_id || event.threadId || "").trim();
  }
  const thread = event.thread && typeof event.thread === "object" ? event.thread : null;
  if (thread?.id) return String(thread.id).trim();
  return "";
}

function extractCodexJsonText(event, previous = "") {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  if (type === "error" || type === "turn.failed" || type.endsWith(".failed")) return "";

  const item = event.item && typeof event.item === "object" ? event.item : null;
  const itemType = String(item?.type || "").toLowerCase();
  if (itemType === "agent_message" && typeof item.text === "string" && item.text.trim()) {
    return item.text.startsWith(previous) ? item.text.slice(previous.length) : item.text;
  }
  if (type.includes("agent_message") && typeof event.message === "string" && event.message.trim()) {
    return event.message.startsWith(previous) ? event.message.slice(previous.length) : event.message;
  }
  return "";
}

function codexStreamError(event) {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  if (type !== "error" && type !== "turn.failed" && !type.endsWith(".failed")) return "";
  const nested = event.error && typeof event.error === "object" ? event.error : null;
  const message =
    (typeof event.message === "string" && event.message.trim()) ||
    (typeof event.error === "string" && event.error.trim()) ||
    (typeof nested?.message === "string" && nested.message.trim()) ||
    (typeof event.text === "string" && event.text.trim()) ||
    "";
  return message || "Codex CLI вернул ошибку";
}

function firstErrorLine(text) {
  return (
    String(text || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

function consumeJsonLinesFromBuffer(buffer, onEvent) {
  const parts = buffer.split("\n");
  const rest = parts.pop() || "";
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      onEvent(JSON.parse(trimmed));
    } catch {
      // ignore malformed chunks
    }
  }
  return rest;
}

function isSessionInUseError(message) {
  return /session id .* is already in use/i.test(String(message || ""));
}

function isResumeUnavailableError(message) {
  return /no rollout|thread\/resume failed|session not found|invalid session/i.test(String(message || ""));
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  CLAUDE_PERMISSION_MODES,
  normalizeClaudePermissionMode,
  extractUserPrompt,
  extractSystemPrompt,
  claudeStreamError,
  extractClaudeAssistantDelta,
  extractClaudeResultText,
  looksLikeJsonObject,
  looksLikeCliError,
  extractCodexThreadId,
  extractCodexJsonText,
  codexStreamError,
  firstErrorLine,
  consumeJsonLinesFromBuffer,
  isSessionInUseError,
  isResumeUnavailableError
};
