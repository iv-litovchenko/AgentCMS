/** ES module — те же endpoint'ы, что FileHubQueueClient (CMS script). */

import { parseVoiceShellPath } from "/shell/voice-chpu.js?v=209";

export const QUEUE_API_PATH = "/api/workspace/file-hub/queue";
export const ADD_API_PATH = "/api/workspace/file-hub/add";
export const REMOVE_API_PATH = "/api/workspace/file-hub/remove";
export const CLEAR_API_PATH = "/api/workspace/file-hub/clear";

function resolveAgentId(agentId) {
  const explicit = String(agentId || "").trim();
  if (explicit) return explicit;
  try {
    const fromQuery = new URLSearchParams(location.search).get("agent");
    if (fromQuery) return fromQuery.trim();
    const { agentId: fromVoicePath } = parseVoiceShellPath(location.pathname);
    if (fromVoicePath) return fromVoicePath;
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "shell" && parts[1]) return decodeURIComponent(parts[1]);
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

export async function addFileToFileHub(payload, agentId) {
  const response = await fetch(buildUrl(ADD_API_PATH, agentId), {
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

/** @deprecated use addFileToFileHub */
export const sendFileToFileHub = addFileToFileHub;

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

export async function clearFileHubQueue(agentId) {
  const response = await fetch(buildUrl(CLEAR_API_PATH, agentId), {
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
