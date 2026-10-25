(function initContextBufferClient(global) {
  "use strict";

  const QUEUE_API_PATH = "/api/workspace/context-buffer";
  const ADD_API_PATH = "/api/workspace/context-buffer/add";
  const REMOVE_API_PATH = "/api/workspace/context-buffer/remove";
  const CLEAR_API_PATH = "/api/workspace/context-buffer/clear";
  const TEXT_API_PATH = "/api/workspace/context-buffer/text";

  function resolveAgentId(agentId, getAgentId) {
    const id = String(agentId || (typeof getAgentId === "function" ? getAgentId() : "") || "main").trim();
    return id || "main";
  }

  function buildUrl(apiPath, agentId, getAgentId) {
    const id = resolveAgentId(agentId, getAgentId);
    return `${apiPath}?agent=${encodeURIComponent(id)}`;
  }

  async function fetchBuffer(agentId, getAgentId) {
    const response = await fetch(buildUrl(QUEUE_API_PATH, agentId, getAgentId), { credentials: "same-origin" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const items = Array.isArray(data?.buffer?.items) ? data.buffer.items : [];
    return { ...data, items };
  }

  async function appendToBuffer(payload, agentId, getAgentId) {
    const response = await fetch(buildUrl(ADD_API_PATH, agentId, getAgentId), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}`);
    }
    return data;
  }

  async function removeFromBuffer(payload, agentId, getAgentId) {
    const response = await fetch(buildUrl(REMOVE_API_PATH, agentId, getAgentId), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}`);
    }
    return data;
  }

  async function clearBuffer(agentId, getAgentId) {
    const response = await fetch(buildUrl(CLEAR_API_PATH, agentId, getAgentId), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}`);
    }
    return data;
  }

  async function fetchBufferText(agentId, getAgentId) {
    const response = await fetch(buildUrl(TEXT_API_PATH, agentId, getAgentId), { credentials: "same-origin" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async function saveBufferText(content, agentId, getAgentId, options = {}) {
    const mode = options.mode === "append" ? "append" : "replace";
    const response = await fetch(buildUrl(TEXT_API_PATH, agentId, getAgentId), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: String(content ?? ""), mode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}`);
    }
    return data;
  }

  global.ContextBufferClient = {
    fetchBuffer,
    fetchBufferText,
    saveBufferText,
    appendToBuffer,
    removeFromBuffer,
    clearBuffer
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
