const { joinTextContentBlocks } = require("./runtime-cli-shared");

const DEFAULT_TIMEOUT_MS = 300000;
const ANTHROPIC_VERSION = "2023-06-01";

function normalizeBaseUrl(raw) {
  return String(raw || "https://api.anthropic.com").trim().replace(/\/+$/, "");
}

function extractAnthropicText(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return joinTextContentBlocks(
    blocks.map((part) =>
      String(part?.type || "") === "text" && typeof part.text === "string" ? part.text : ""
    )
  ).trim();
}

function extractAnthropicDelta(event) {
  if (String(event?.type || "") !== "content_block_delta") return "";
  const delta = event?.delta;
  if (String(delta?.type || "") === "text_delta" && typeof delta.text === "string") return delta.text;
  return "";
}

async function checkAnthropicRuntimeHealth({ baseUrl, apiKey = "", timeoutMs = 4000 } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const key = String(apiKey || "").trim();
  if (!key) {
    return { ok: false, baseUrl: root, error: "API key не задан" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      }),
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, baseUrl: root, status: response.status, error: "Неверный API key" };
    }
    if (response.ok || response.status === 400 || response.status === 429) {
      return { ok: true, baseUrl: root, status: response.status };
    }
    const details = await response.text().catch(() => "");
    return {
      ok: false,
      baseUrl: root,
      status: response.status,
      error: details ? details.slice(0, 180) : `HTTP ${response.status}`
    };
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

async function chatAnthropicMessages({
  baseUrl,
  apiKey = "",
  model,
  messages,
  stream = true,
  onDelta,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  system = ""
} = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const key = String(apiKey || "").trim();
  if (!key) throw new Error("Claude API key не задан");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort, { once: true });
  }

  const anthropicMessages = (Array.isArray(messages) ? messages : [])
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: String(item.content || "")
    }));

  try {
    const response = await fetch(`${root}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: String(model || "claude-sonnet-4-20250514"),
        max_tokens: 8192,
        system: String(system || "").trim() || undefined,
        messages: anthropicMessages,
        stream: Boolean(stream)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(details);
        message = String(parsed?.error?.message || parsed?.message || message);
      } catch {
        if (details) message = details.slice(0, 240);
      }
      throw new Error(message);
    }

    if (!stream) {
      const payload = await response.json();
      const text = extractAnthropicText(payload);
      if (typeof onDelta === "function" && text) onDelta(text);
      return { text, raw: payload };
    }

    if (!response.body) {
      const payload = await response.json();
      return { text: extractAnthropicText(payload), raw: payload };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload);
            const delta = extractAnthropicDelta(event);
            if (delta) {
              text += delta;
              if (typeof onDelta === "function") onDelta(text);
            }
            if (String(event?.type || "") === "message_stop" && !text) {
              text = extractAnthropicText(event?.message || event);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }

    return { text: text.trim(), raw: null };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", abort);
  }
}

module.exports = {
  checkAnthropicRuntimeHealth,
  chatAnthropicMessages
};
