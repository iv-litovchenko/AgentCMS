/** ES module — те же endpoint'ы, что FileHubQueueClient (CMS script). */

export const QUEUE_API_PATH = "/api/workspace/file-hub/queue";
export const SEND_API_PATH = "/api/workspace/file-hub/send";
export const REMOVE_API_PATH = "/api/workspace/file-hub/remove";

function resolveAgentId(agentId) {
  const id = String(agentId || "").trim();
  if (id) return id;
  try {
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "shell" && parts[1]) return decodeURIComponent(parts[1]);
    const fromQuery = new URLSearchParams(location.search).get("agent");
    if (fromQuery) return fromQuery.trim();
  } catch {
    // ignore
  }
  return "main";
}

function buildUrl(apiPath, agentId) {
  const id = resolveAgentId(agentId);
  return `${apiPath}?agent=${encodeURIComponent(id)}`;
}

export async function fetchFileHubQueue(agentId) {
  const response = await fetch(buildUrl(QUEUE_API_PATH, agentId), { credentials: "same-origin" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const items = Array.isArray(data?.queue?.items) ? data.queue.items : [];
  return { ...data, items };
}

export async function sendFileToFileHub(payload, agentId) {
  const response = await fetch(buildUrl(SEND_API_PATH, agentId), {
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

export async function removeFileFromFileHub(payload, agentId) {
  const response = await fetch(buildUrl(REMOVE_API_PATH, agentId), {
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
