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
        delta: String(event?.object || "") === "content" && Boolean(event?.delta)
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

function buildNewShellSessionId(agentId) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `shell-${String(agentId || "default")}-${stamp}-${rand}`;
}

module.exports = {
  DEFAULT_BASE_URL,
  normalizeBaseUrl,
  checkQwenPawHealth,
  chatWithQwenPaw,
  listQwenPawChats,
  createQwenPawChat,
  buildNewShellSessionId,
  extractAssistantText
};
