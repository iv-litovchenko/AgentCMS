/** ЧПУ Agent CMS Voice: /\<agent-id>/ или /\<agent-id>/\<surface-host>/ */

export const VOICE_SHELL_HOSTS = [
  "desktop-cms",
  "desktop-shell",
  "browser-embed",
  "browser-tab",
  "mobile-native",
  "mobile-web",
  "extension"
];

const VOICE_EMBEDDED_HOSTS = new Set(["browser-embed", "desktop-cms", "extension"]);
export const VOICE_DEFAULT_HOST = "browser-tab";

function normalizePathname(pathname) {
  return String(pathname || "/").replace(/\/+$/, "") || "/";
}

export function isVoiceShellHostSegment(segment) {
  return VOICE_SHELL_HOSTS.includes(String(segment || "").trim());
}

export function parseVoiceShellPath(pathname) {
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

export function buildVoiceShellPath(agentId, surfaceHost) {
  const id = String(agentId || "").trim();
  const host = String(surfaceHost || "").trim() || VOICE_DEFAULT_HOST;
  if (!id) return "/";
  const encoded = encodeURIComponent(id);
  if (host === VOICE_DEFAULT_HOST || !isVoiceShellHostSegment(host)) {
    return `/${encoded}/`;
  }
  return `/${encoded}/${host}/`;
}

export function isEmbeddedVoiceHost(surfaceHost) {
  return VOICE_EMBEDDED_HOSTS.has(String(surfaceHost || "").trim());
}

export function isVoiceStandaloneAppLocation() {
  try {
    if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return true;
    return !window.location.pathname.startsWith("/shell");
  } catch {
    return false;
  }
}

function isVoiceAgentSpaPath(pathname) {
  const parsed = parseVoiceShellPath(pathname);
  if (!parsed.agentId) return normalizePathname(pathname) === "/";
  if (parsed.agentId.includes(".")) return false;
  if (parsed.extraSegments.length > 0) return false;
  if (parsed.surfaceHost !== VOICE_DEFAULT_HOST) {
    return isVoiceShellHostSegment(parsed.surfaceHost);
  }
  return true;
}

export function isVoiceAgentLocationPath(pathname = "") {
  if (!isVoiceStandaloneAppLocation()) return false;
  return isVoiceAgentSpaPath(pathname || window.location.pathname);
}

export function migrateVoiceHostQueryToPath() {
  try {
    if (!isVoiceStandaloneAppLocation()) return;

    const params = new URLSearchParams(window.location.search);
    const queryHost = String(params.get("host") || "").trim();
    const embed = params.get("embed") === "1";
    if (!queryHost && !embed) return;

    let host = isVoiceShellHostSegment(queryHost) ? queryHost : "";
    if (!host && embed) {
      try {
        host =
          window.parent !== window && Boolean(window.parent.desktopApp?.isDesktop)
            ? "desktop-cms"
            : "browser-embed";
      } catch {
        host = "browser-embed";
      }
    }
    if (!host) return;

    const { agentId } = parseVoiceShellPath(window.location.pathname);
    if (!agentId) return;

    const desired = buildVoiceShellPath(agentId, host);
    const url = new URL(window.location.href);
    const current = normalizePathname(url.pathname);
    const target = normalizePathname(desired);
    if (current !== target) url.pathname = desired;
    url.searchParams.delete("embed");
    url.searchParams.delete("host");
    if (url.searchParams.get("agent") === agentId) url.searchParams.delete("agent");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // ignore
  }
}

export function readVoiceSurfaceHostFromLocation() {
  if (!isVoiceStandaloneAppLocation()) return "";
  const { surfaceHost } = parseVoiceShellPath(window.location.pathname);
  return surfaceHost || VOICE_DEFAULT_HOST;
}
