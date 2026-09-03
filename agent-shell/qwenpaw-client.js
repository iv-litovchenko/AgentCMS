const DEFAULT_BASE_URL = "http://127.0.0.1:8088";
const DEFAULT_TIMEOUT_MS = 300000;

function normalizeBaseUrl(raw) {
  const value = String(raw || DEFAULT_BASE_URL).trim();
  return value.replace(/\/+$/, "");
}

function extractAssistantText(event) {
  if (!event || typeof event !== "object") return "";

  if (String(event.object || "") === "response" && String(event.status || "") === "completed") {
    return extractFromResponseOutput(event.output);
  }

  if (String(event.object || "") === "message" && String(event.type || "") === "message") {
    return extractFromContentParts(event.content);
  }

  const output = Array.isArray(event.output) ? event.output : [];
  if (output.length) return extractFromResponseOutput(output);

  return "";
}

function extractFromResponseOutput(output) {
  const chunks = [];
  for (const item of Array.isArray(output) ? output : []) {
    if (String(item?.type || "").toLowerCase() !== "message") continue;
    const text = extractFromContentParts(item.content);
    if (text) chunks.push(text);
  }
  return chunks.join("\n").trim();
}

function extractFromContentParts(content) {
  const chunks = [];
  for (const part of Array.isArray(content) ? content : []) {
    if (String(part?.type || "").toLowerCase() !== "text") continue;
    if (typeof part.text !== "string") continue;
    const text = part.text.trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n").trim();
}

function extractToolName(event) {
  const dataObj = event?.data && typeof event.data === "object" ? event.data : null;
  const direct = [
    dataObj?.name,
    event?.name,
    event?.tool_name,
    event?.tool?.name,
    event?.function?.name,
    event?.function_call?.name,
    event?.call?.name
  ];
  for (const value of direct) {
    const name = String(value || "").trim();
    if (name && name !== "assistant") return name;
  }
  for (const part of Array.isArray(event?.content) ? event.content : []) {
    const name = String(part?.name || part?.tool_name || part?.function?.name || "").trim();
    if (name) return name;
    const type = String(part?.type || "").toLowerCase();
    if ((type.includes("tool") || type.includes("function")) && part?.id) {
      return String(part.id).trim();
    }
  }
  return "";
}

function extractActivityFromEvent(event) {
  if (!event || typeof event !== "object") return null;

  const object = String(event.object || "");
  const status = String(event.status || "").toLowerCase();
  const type = String(event.type || "").toLowerCase();

  if (object === "response") {
    if (status === "created") {
      return { kind: "run", phase: "start", priority: 10, phrase: "Запускаю…" };
    }
    if (status === "in_progress") {
      return { kind: "run", phase: "progress", priority: 20, phrase: "Работаю…" };
    }
    if (status === "failed") {
      return { kind: "run", phase: "failed", priority: 60, phrase: "Ошибка агента" };
    }
    return null;
  }

  if (object === "message") {
    if (type === "reasoning") {
      return { kind: "reasoning", phase: "start", priority: 30, phrase: "Размышляю…" };
    }
    if (
      type === "plugin_call" ||
      type === "function_call" ||
      type === "tool_call" ||
      type === "tool_use" ||
      type === "function"
    ) {
      const tool = extractToolName(event);
      return {
        kind: "tool",
        phase: "start",
        priority: 40,
        tool: tool || "tool",
        phrase: tool ? `🔧 ${tool}…` : "🔧 Инструмент…"
      };
    }
    if (
      type === "plugin_call_output" ||
      type === "function_call_output" ||
      type === "tool_result" ||
      type === "tool_output"
    ) {
      const tool = extractToolName(event);
      return { kind: "tool", phase: "end", priority: 35, tool: tool || undefined };
    }
  }

  if (object === "content") {
    if (
      type === "data" ||
      type === "tool_use" ||
      type === "function_call" ||
      type === "tool_call" ||
      type === "function" ||
      type === "mcp_call"
    ) {
      const tool = extractToolName(event);
      if (tool) {
        return { kind: "tool", phase: "start", priority: 40, tool, phrase: `🔧 ${tool}…` };
      }
    }
  }

  return null;
}

function parseSseBuffer(buffer) {
  const events = [];
  const blocks = buffer.split("\n\n");
  for (const block of blocks) {
    const lines = block.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        events.push(JSON.parse(payload));
      } catch {
        // ignore malformed chunks
      }
    }
  }
  return events;
}

class QwenPawStreamParser {
  constructor() {
    this.messageTypes = new Map();
    this.messageText = new Map();
    this.completedText = "";
    this.failedError = "";
  }

  push(event) {
    const object = String(event?.object || "");
    const status = String(event?.status || "").toLowerCase();

    if (object === "message" && event.id) {
      this.messageTypes.set(String(event.id), String(event.type || ""));
      if (String(event.type || "") === "message") {
        const text = extractFromContentParts(event.content);
        if (text) this.messageText.set(String(event.id), text);
      }
    }

    if (object === "content" && event.msg_id && typeof event.text === "string") {
      const msgId = String(event.msg_id);
      if (this.messageTypes.get(msgId) === "message") {
        if (event.delta) {
          const prev = this.messageText.get(msgId) || "";
          this.messageText.set(msgId, `${prev}${event.text}`);
        } else if (event.text.trim()) {
          this.messageText.set(msgId, event.text.trim());
        }
      }
    }

    if (object === "response" && status === "completed") {
      const text = extractAssistantText(event);
      if (text) this.completedText = text;
    }

    if (status === "failed") {
      this.failedError =
        String(event?.error?.message || event?.error || "").trim() ||
        "QwenPaw run failed";
    }
  }

  latestAssistantText() {
    if (this.completedText) return this.completedText.trim();
    return [...this.messageText.values()].map((item) => item.trim()).filter(Boolean).join("\n").trim();
  }
}

async function checkQwenPawHealth(baseUrl, timeoutMs = 4000) {
  const root = normalizeBaseUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/api/version`, {
      method: "GET",
      signal: controller.signal
    });
    if (!response.ok) {
      return { ok: false, baseUrl: root, status: response.status };
    }
    const data = await response.json().catch(() => ({}));
    return { ok: true, baseUrl: root, version: data?.version || null };
  } catch (error) {
    return {
      ok: false,
      baseUrl: root,
      error: String(error?.message || error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function listQwenPawAgents({ baseUrl, timeoutMs = 4000 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/api/agents`, {
      method: "GET",
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`QwenPaw HTTP ${response.status}${details ? `: ${details.slice(0, 180)}` : ""}`);
    }
    const data = await response.json().catch(() => ({}));
    const agents = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : [];
    return agents
      .map((item) => ({
        id: String(item?.id || "").trim(),
        name: String(item?.name || item?.id || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false
      }))
      .filter((item) => item.id);
  } finally {
    clearTimeout(timer);
  }
}

async function getQwenPawAgent({ baseUrl, agentId, timeoutMs = 4000 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const id = String(agentId || "default").trim() || "default";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/api/agents/${encodeURIComponent(id)}`, {
      method: "GET",
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(details);
        message = String(parsed?.detail || parsed?.error || message);
      } catch {
        if (details) message = details.slice(0, 180);
      }
      throw new Error(message);
    }
    const data = await response.json().catch(() => ({}));
    return {
      id: String(data?.id || id),
      name: String(data?.name || id),
      approvalLevel: String(data?.approval_level || "AUTO").trim() || "AUTO",
      enabled: data?.enabled !== false
    };
  } finally {
    clearTimeout(timer);
  }
}

async function updateQwenPawAgentApproval({ baseUrl, agentId, approvalLevel, timeoutMs = 8000 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const id = String(agentId || "default").trim() || "default";
  const level = String(approvalLevel || "AUTO").trim().toUpperCase() || "AUTO";
  const profile = await getQwenPawAgent({ baseUrl: root, agentId: id, timeoutMs });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/api/agents/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: profile.id,
        name: profile.name,
        approval_level: level
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(details);
        message = String(parsed?.detail || parsed?.error || message);
      } catch {
        if (details) message = details.slice(0, 180);
      }
      throw new Error(message);
    }
    const data = await response.json().catch(() => ({}));
    return {
      agentId: id,
      approvalLevel: String(data?.approval_level || level).trim() || level
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkQwenPawAgent({ baseUrl, agentId, timeoutMs = 4000 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const id = String(agentId || "default").trim() || "default";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/api/agents/${encodeURIComponent(id)}`, {
      method: "GET",
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(details);
        message = String(parsed?.detail || parsed?.error || message);
      } catch {
        if (details) message = details.slice(0, 180);
      }
      return { ok: false, agentId: id, error: message };
    }
    const data = await response.json().catch(() => ({}));
    if (data?.enabled === false) {
      return {
        ok: false,
        agentId: id,
        name: String(data?.name || id),
        error: `Агент «${data?.name || id}» отключён`
      };
    }
    return {
      ok: true,
      agentId: id,
      name: String(data?.name || id),
      approvalLevel: String(data?.approval_level || "AUTO").trim() || "AUTO",
      enabled: data?.enabled !== false
    };
  } catch (error) {
    return {
      ok: false,
      agentId: id,
      error: String(error?.message || error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function chatWithQwenPaw({
  baseUrl,
  agentId = "default",
  sessionId = "agent-shell",
  userId = "shell",
  text,
  onEvent,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const root = normalizeBaseUrl(baseUrl);
  const message = String(text || "").trim();
  if (!message) throw new Error("Message body is required");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromOutside = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abortFromOutside, { once: true });
  }

  let response;
  try {
    response = await fetch(`${root}/api/console/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Id": String(agentId || "default")
      },
      body: JSON.stringify({
        input: [
          {
            role: "user",
            content: [{ type: "text", text: message }]
          }
        ],
        session_id: String(sessionId || "agent-shell"),
        user_id: String(userId || "shell"),
        channel: "console"
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", abortFromOutside);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `QwenPaw HTTP ${response.status}${details ? `: ${details.slice(0, 240)}` : ""}`
    );
  }

  if (!response.body) {
    throw new Error("QwenPaw returned an empty response body");
  }

  const parser = new QwenPawStreamParser();
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  function notifyEvent(event) {
    if (typeof onEvent !== "function") return;
    try {
      onEvent({
        event,
        text: parser.latestAssistantText(),
        delta: String(event?.object || "") === "content" && Boolean(event?.delta),
        activity: extractActivityFromEvent(event)
      });
    } catch {
      // ignore listener errors
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const block of parts) {
      for (const event of parseSseBuffer(`${block}\n\n`)) {
        parser.push(event);
        notifyEvent(event);
      }
    }
  }

  if (buffer.trim()) {
    for (const event of parseSseBuffer(`${buffer}\n\n`)) {
      parser.push(event);
      notifyEvent(event);
    }
  }

  if (parser.failedError) throw new Error(parser.failedError);

  const replyText = parser.latestAssistantText();
  if (!replyText) throw new Error("QwenPaw returned no assistant text");

  return { text: replyText, baseUrl: root, agentId, sessionId };
}

async function qwenpawRequest({
  baseUrl,
  agentId = "default",
  path,
  method = "GET",
  query = {},
  body = null
}) {
  const root = normalizeBaseUrl(baseUrl);
  const url = new URL(`${root}/api${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Id": String(agentId || "default")
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `QwenPaw HTTP ${response.status}${details ? `: ${details.slice(0, 240)}` : ""}`
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

async function listQwenPawChats({
  baseUrl,
  agentId = "default",
  userId = "shell",
  channel = "console"
}) {
  const data = await qwenpawRequest({
    baseUrl,
    agentId,
    path: "/chats",
    query: { user_id: userId, channel }
  });
  return Array.isArray(data) ? data : [];
}

async function fetchQwenPawChat({
  baseUrl,
  agentId = "default",
  chatId
}) {
  const id = String(chatId || "").trim();
  if (!id) throw new Error("chatId is required");
  return qwenpawRequest({
    baseUrl,
    agentId,
    path: `/chats/${encodeURIComponent(id)}`
  });
}

async function findQwenPawChatBySessionId({
  baseUrl,
  agentId = "default",
  userId = "shell",
  channel = "console",
  sessionId
}) {
  const targetSessionId = String(sessionId || "").trim();
  if (!targetSessionId) return null;
  const chats = await listQwenPawChats({ baseUrl, agentId, userId, channel });
  return chats.find((chat) => String(chat?.session_id || "") === targetSessionId) || null;
}

function extractMessageText(message) {
  if (!message || typeof message !== "object") return "";
  if (Array.isArray(message.content)) {
    return extractFromContentParts(message.content);
  }
  return extractAssistantText(message);
}

function stripShellOutboundSuffix(text) {
  const raw = String(text || "").trim();
  const marker = "\n\n---\n";
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw;
  return raw.slice(0, idx).trim();
}

function mapQwenPawMessagesToDialogHistory(messages, { limit = 25 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const mapped = [];
  for (const item of Array.isArray(messages) ? messages : []) {
    const roleRaw = String(item?.role || "").toLowerCase();
    const role = roleRaw === "assistant" || roleRaw === "agent" ? "agent" : "user";
    let body = String(extractMessageText(item) || "").trim();
    if (!body) continue;
    if (role === "user") body = stripShellOutboundSuffix(body);
    if (!body) continue;
    const created = String(item.created_at || item.updated_at || "");
    const at = Date.parse(created) || Date.now();
    mapped.push({
      id: String(item.id || ""),
      role,
      author: role === "agent" ? "AI" : "Human",
      label: role === "agent" ? "AI" : "Human (человек)",
      body,
      at,
      runtime: "qwenpaw",
      source: "qwenpaw"
    });
  }
  return mapped.slice(-safeLimit);
}

async function fetchQwenPawChatHistory({
  baseUrl,
  agentId = "default",
  userId = "shell",
  channel = "console",
  sessionId,
  limit = 25
} = {}) {
  const chat = await findQwenPawChatBySessionId({
    baseUrl,
    agentId,
    userId,
    channel,
    sessionId
  });
  if (!chat?.id) return [];
  const detail = await fetchQwenPawChat({ baseUrl, agentId, chatId: chat.id });
  return mapQwenPawMessagesToDialogHistory(detail?.messages, { limit });
}

function findLatestAssistantMessage(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    const role = String(item?.role || "").toLowerCase();
    if (role !== "assistant") continue;
    const body = String(extractMessageText(item) || "").trim();
    if (!body) continue;
    return {
      id: String(item.id || `qwenpaw-${i}`),
      body,
      role: "agent",
      author: "qwenpaw",
      created: String(item.created_at || item.updated_at || new Date().toISOString())
    };
  }
  return null;
}

async function createQwenPawChat({
  baseUrl,
  agentId = "default",
  sessionId,
  userId = "shell",
  channel = "console",
  name = "Agent Shell"
}) {
  return qwenpawRequest({
    baseUrl,
    agentId,
    path: "/chats",
    method: "POST",
    body: {
      id: "",
      name,
      session_id: sessionId,
      user_id: userId,
      channel,
      meta: { source: "agent-shell" }
    }
  });
}

async function updateQwenPawChat({
  baseUrl,
  agentId = "default",
  chatId,
  name,
  sessionId,
  userId = "shell",
  channel = "console"
}) {
  const id = String(chatId || "").trim();
  if (!id) throw new Error("chatId is required");
  const nextName = String(name || "").trim();
  if (!nextName) throw new Error("Chat name is required");

  return qwenpawRequest({
    baseUrl,
    agentId,
    path: `/chats/${encodeURIComponent(id)}`,
    method: "PUT",
    body: { name: nextName }
  });
}

function buildNewShellSessionId(agentId) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `shell-${String(agentId || "default")}-${stamp}-${rand}`;
}

module.exports = {
  DEFAULT_BASE_URL,
  normalizeBaseUrl,
  checkQwenPawHealth,
  checkQwenPawAgent,
  getQwenPawAgent,
  updateQwenPawAgentApproval,
  listQwenPawAgents,
  chatWithQwenPaw,
  listQwenPawChats,
  fetchQwenPawChat,
  findQwenPawChatBySessionId,
  findLatestAssistantMessage,
  extractMessageText,
  stripShellOutboundSuffix,
  mapQwenPawMessagesToDialogHistory,
  fetchQwenPawChatHistory,
  createQwenPawChat,
  updateQwenPawChat,
  buildNewShellSessionId,
  extractAssistantText,
  extractActivityFromEvent,
  extractToolName
};
