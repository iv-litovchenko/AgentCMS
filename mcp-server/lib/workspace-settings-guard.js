import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assertMcpToolAllowed } = require("../../lib/workspace/workspace-agent-settings.js");

const settingsCache = new Map();
const CACHE_TTL_MS = 30_000;

function cacheKey(agentId) {
  return String(agentId || "").trim();
}

export function clearWorkspaceSettingsCache(agentId = "") {
  const key = cacheKey(agentId);
  if (!key) {
    settingsCache.clear();
    return;
  }
  settingsCache.delete(key);
}

export async function loadWorkspaceAgentSettings(client, agentId) {
  const key = cacheKey(agentId);
  if (!key) return {};
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.settings;

  const payload = await client.get("/api/agent/workspace-settings", {}, { agentId });
  const settings =
    payload?.platform && typeof payload.platform === "object"
      ? payload.platform
      : payload?.settings && typeof payload.settings === "object"
        ? payload.settings
        : {};
  settingsCache.set(key, { settings, expiresAt: Date.now() + CACHE_TTL_MS });
  return settings;
}

export async function loadWorkspaceStorageSettings(client, agentId) {
  const key = cacheKey(agentId);
  if (!key) return {};
  const payload = await client.get("/api/agent/workspace-settings", {}, { agentId });
  return payload?.workspace && typeof payload.workspace === "object" ? payload.workspace : {};
}

export async function assertWorkspaceMcpToolAllowed(client, agentId, toolName, args = {}) {
  const settings = await loadWorkspaceAgentSettings(client, agentId);
  return assertMcpToolAllowed(toolName, settings, args);
}
