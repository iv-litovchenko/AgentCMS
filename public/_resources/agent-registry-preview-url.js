/**
 * Registry workspace avatar URLs — same rules as Editor landing Orbit (media/file preferred, stable t=).
 */
const MEDIA_THUMB_MAX_AVATAR = 720;

export function resolveAgentPreviewCacheToken(agentOrId) {
  if (!agentOrId) return "0";
  if (typeof agentOrId === "object" && agentOrId !== null) {
    return String(agentOrId.previewCacheToken || agentOrId.id || "0");
  }
  return String(agentOrId || "0");
}

export function isWorkspaceAgentPreviewApiUrl(url) {
  return String(url || "").includes("/api/agents/workspace-preview");
}

function appendAgentToApiUrl(url, agentId) {
  const raw = String(url || "").trim();
  if (!raw.startsWith("/api/") || !agentId) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    parsed.searchParams.set("agent", String(agentId));
    parsed.searchParams.set("workspace", String(agentId));
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return raw;
  }
}

function appendCacheBuster(url, token) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    parsed.searchParams.set("t", String(token ?? "0"));
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    const joiner = raw.includes("?") ? "&" : "?";
    return `${raw}${joiner}t=${encodeURIComponent(String(token ?? "0"))}`;
  }
}

function stripMediaThumbFromApiUrl(url) {
  try {
    const parsed = new URL(String(url || ""), window.location.origin);
    parsed.searchParams.delete("thumb");
    parsed.searchParams.delete("max");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url || "");
  }
}

function appendMediaThumbToApiUrl(url, max = MEDIA_THUMB_MAX_AVATAR) {
  const raw = String(url || "").trim();
  if (!raw || /[?&]thumb=1(?:&|$)/.test(raw)) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (
      !pathname.endsWith("/api/media/file") &&
      !pathname.endsWith("/api/preview/image") &&
      !pathname.endsWith("/api/agents/workspace-preview")
    ) {
      return appendAgentToApiUrl(raw);
    }
    parsed.searchParams.set("thumb", "1");
    parsed.searchParams.set("max", String(max));
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    const joiner = raw.includes("?") ? "&" : "?";
    return `${raw}${joiner}thumb=1&max=${encodeURIComponent(String(max))}`;
  }
}

export function finalizeRegistryAgentPreviewUrl(url, agent) {
  if (!url || !agent?.id) return url;
  let withAgent = appendAgentToApiUrl(url, agent.id);
  const isDirectMediaFile =
    withAgent.includes("/api/media/file") && !/[?&]thumb=1(?:&|$)/.test(withAgent);
  if (isDirectMediaFile || isWorkspaceAgentPreviewApiUrl(withAgent)) {
    if (isWorkspaceAgentPreviewApiUrl(withAgent)) {
      withAgent = stripMediaThumbFromApiUrl(withAgent);
    }
  } else {
    withAgent = appendMediaThumbToApiUrl(withAgent, MEDIA_THUMB_MAX_AVATAR);
  }
  return appendCacheBuster(withAgent, resolveAgentPreviewCacheToken(agent));
}

export function getRegistryAgentPreviewUrl(agent) {
  if (!agent?.path && !agent?.id) return null;
  if (
    agent.previewUrl?.startsWith("/api/preview/image") ||
    agent.previewUrl?.startsWith("/api/media/file")
  ) {
    if (agent.hasPreview === false) return null;
    return finalizeRegistryAgentPreviewUrl(agent.previewUrl, agent);
  }
  if (agent.hasPreview || agent.previewUrl?.startsWith("/api/agents/workspace-preview")) {
    const url = agent.previewUrl?.startsWith("/api/agents/workspace-preview")
      ? agent.previewUrl
      : agent.path
        ? `/api/agents/workspace-preview?path=${encodeURIComponent(agent.path)}`
        : null;
    if (!url) return null;
    return finalizeRegistryAgentPreviewUrl(url, agent);
  }
  return null;
}
