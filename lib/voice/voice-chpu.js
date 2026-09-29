/** ЧПУ Agent CMS Voice: /\<agent-id>/ или /\<agent-id>/\<surface-host>/ */

const VOICE_SHELL_HOSTS = [
  "desktop-cms",
  "desktop-shell",
  "browser-embed",
  "browser-tab",
  "mobile-native",
  "mobile-web",
  "extension"
];

const VOICE_EMBEDDED_HOSTS = new Set(["browser-embed", "desktop-cms", "extension"]);
const VOICE_DEFAULT_HOST = "browser-tab";

function normalizePathname(pathname) {
  return String(pathname || "/").replace(/\/+$/, "") || "/";
}

function isVoiceShellHostSegment(segment) {
  return VOICE_SHELL_HOSTS.includes(String(segment || "").trim());
}

function parseVoiceShellPath(pathname) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") {
    return { agentId: "", surfaceHost: VOICE_DEFAULT_HOST, extraSegments: [] };
  }

  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) {
    return { agentId: "", surfaceHost: VOICE_DEFAULT_HOST, extraSegments: [] };
  }

  const agentId = decodeURIComponent(parts[0]);
  if (parts.length === 1) {
    return { agentId, surfaceHost: VOICE_DEFAULT_HOST, extraSegments: [] };
  }

  const second = decodeURIComponent(parts[1]);
  if (isVoiceShellHostSegment(second)) {
    return {
      agentId,
      surfaceHost: second,
      extraSegments: parts.length > 2 ? parts.slice(2) : []
    };
  }

  return { agentId, surfaceHost: VOICE_DEFAULT_HOST, extraSegments: parts.slice(1) };
}

function buildVoiceShellPath(agentId, surfaceHost) {
  const id = String(agentId || "").trim();
  const host = String(surfaceHost || "").trim() || VOICE_DEFAULT_HOST;
  if (!id) return "/";
  const encoded = encodeURIComponent(id);
  if (host === VOICE_DEFAULT_HOST || !isVoiceShellHostSegment(host)) {
    return `/${encoded}/`;
  }
  return `/${encoded}/${host}/`;
}

function isEmbeddedVoiceHost(surfaceHost) {
  return VOICE_EMBEDDED_HOSTS.has(String(surfaceHost || "").trim());
}

function isVoiceAgentSpaPath(pathname, isKnownAgentId) {
  const parsed = parseVoiceShellPath(pathname);
  if (!parsed.agentId) return normalizePathname(pathname) === "/";
  if (parsed.agentId.includes(".")) return false;
  if (parsed.extraSegments.length > 0) return false;

  const hasExplicitHost = parsed.surfaceHost !== VOICE_DEFAULT_HOST;
  if (hasExplicitHost) {
    return isVoiceShellHostSegment(parsed.surfaceHost);
  }

  if (typeof isKnownAgentId === "function" && !isKnownAgentId(parsed.agentId)) return false;
  return true;
}

module.exports = {
  VOICE_SHELL_HOSTS,
  VOICE_EMBEDDED_HOSTS,
  VOICE_DEFAULT_HOST,
  normalizePathname,
  isVoiceShellHostSegment,
  parseVoiceShellPath,
  buildVoiceShellPath,
  isEmbeddedVoiceHost,
  isVoiceAgentSpaPath
};
