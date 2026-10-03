(function initFileHubQueueClient(global) {
  "use strict";

  const QUEUE_API_PATH = "/api/workspace/file-hub/queue";
  const ADD_API_PATH = "/api/workspace/file-hub/add";
  const REMOVE_API_PATH = "/api/workspace/file-hub/remove";

  function resolveAgentId(agentId, getAgentId) {
    const id = String(agentId || (typeof getAgentId === "function" ? getAgentId() : "") || "main").trim();
    return id || "main";
  }

  function buildUrl(apiPath, agentId, getAgentId) {
    const id = resolveAgentId(agentId, getAgentId);
    return `${apiPath}?agent=${encodeURIComponent(id)}`;
  }

  async function fetchQueue(agentId, getAgentId) {
    const response = await fetch(buildUrl(QUEUE_API_PATH, agentId, getAgentId), { credentials: "same-origin" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const items = Array.isArray(data?.queue?.items) ? data.queue.items : [];
    return { ...data, items };
  }

  async function addToFileHub(payload, agentId, getAgentId) {
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

  async function removeFromFileHub(payload, agentId, getAgentId) {
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

  function normalizeQueuePath(raw) {
    return String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  }

  function queuePathsMatch(left, right) {
    const a = normalizeQueuePath(left);
    const b = normalizeQueuePath(right);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.endsWith(`/${b}`) || b.endsWith(`/${a}`)) return true;
    return false;
  }

  function isPathQueued(items, filePath) {
    const normalized = normalizeQueuePath(filePath);
    if (!normalized) return false;
    return (Array.isArray(items) ? items : []).some((item) =>
      queuePathsMatch(item?.path, normalized)
    );
  }

  global.FileHubQueueClient = {
    QUEUE_API_PATH,
    ADD_API_PATH,
    REMOVE_API_PATH,
    fetchQueue,
    addToFileHub,
    /** @deprecated use addToFileHub */
    sendToFileHub: addToFileHub,
    removeFromFileHub,
    isPathQueued,
    buildUrl
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
