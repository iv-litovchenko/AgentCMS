const DEFAULT_TIMEOUT_MS = 300000;

function normalizeBaseUrl(raw, { stripV1 = false } = {}) {
  let value = String(raw || "").trim().replace(/\/+$/, "");
  if (stripV1 && value.endsWith("/v1")) value = value.slice(0, -3).replace(/\/+$/, "");
  return value;
}

function extractOpenAiDeltaText(chunk) {
  const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null;
  const delta = choice?.delta?.content;
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta
      .map((part) => (typeof part?.text === "string" ? part.text : typeof part === "string" ? part : ""))
      .join("");
  }
  const message = choice?.message?.content;
  if (typeof message === "string") return message;
  return "";
}

function extractOpenAiFinalText(payload) {
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
  const message = choice?.message?.content;
  if (typeof message === "string") return message.trim();
  if (Array.isArray(message)) {
    return message
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return String(payload?.output_text || payload?.reply || "").trim();
}

function buildAuthHeaders(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

async function checkOpenAiRuntimeHealth({ baseUrl, apiKey = "", path = "/v1/models", timeoutMs = 4000, extraHeaders = {} } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${root}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "GET",
      headers: {
        ...buildAuthHeaders(apiKey),
        ...extraHeaders
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return {
        ok: false,
        baseUrl: root,
        status: response.status,
        error: details ? details.slice(0, 180) : `HTTP ${response.status}`
      };
    }
    return { ok: true, baseUrl: root, status: response.status };
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

async function chatOpenAiCompletions({
  baseUrl,
  apiKey = "",
  model,
  messages,
  stream = true,
  onDelta,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  extraHeaders = {},
  path = "/v1/chat/completions"
} = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort, { once: true });
  }

  try {
    const response = await fetch(`${root}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(apiKey),
        ...extraHeaders
      },
      body: JSON.stringify({
        model: String(model || "default"),
        messages: Array.isArray(messages) ? messages : [],
        stream: Boolean(stream)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(details);
        message = String(parsed?.error?.message || parsed?.detail || parsed?.message || message);
      } catch {
        if (details) message = details.slice(0, 240);
      }
      throw new Error(message);
    }

    if (!stream) {
      const payload = await response.json();
      const text = extractOpenAiFinalText(payload);
      if (typeof onDelta === "function" && text) onDelta(text);
      return { text, raw: payload };
    }

    if (!response.body) {
      const payload = await response.json();
      const text = extractOpenAiFinalText(payload);
      return { text, raw: payload };
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
            const chunk = JSON.parse(payload);
            const delta = extractOpenAiDeltaText(chunk);
            if (delta) {
              text += delta;
              if (typeof onDelta === "function") onDelta(text);
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
  normalizeBaseUrl,
  checkOpenAiRuntimeHealth,
  chatOpenAiCompletions
};
