/** Read-only surface indicator — host (where UI runs) + backend badge. */

import {
  VOICE_DEFAULT_HOST,
  isEmbeddedVoiceHost,
  isVoiceStandaloneAppLocation,
  readVoiceSurfaceHostFromLocation
} from "@shell/voice-chpu";

export const SHELL_HOSTS = [
  "desktop-cms",
  "desktop-shell",
  "browser-embed",
  "browser-tab",
  "mobile-native",
  "mobile-web",
  "extension"
];

const HOST_META = {
  "desktop-shell": { icon: "🖥", short: "Shell", hint: "Agent Shell.app" },
  "desktop-cms": { icon: "🖥", short: "CMS", hint: "Agent CMS.app · панель" },
  "browser-embed": { icon: "🌐", short: "Embed", hint: "Панель в Agent CMS" },
  "browser-tab": { icon: "🌐", short: "Tab", hint: "Вкладка браузера" },
  "mobile-native": { icon: "📱", short: "iOS", hint: "iOS app (SwiftUI)" },
  "mobile-web": { icon: "📱", short: "Mobile", hint: "Safari / PWA" },
  extension: { icon: "🧩", short: "Companion", hint: "Companion · Chrome" }
};

export function getShellHostLabel(hostId) {
  const meta = HOST_META[String(hostId || "").trim()];
  return meta?.hint || hostId || "—";
}

export function getShellHostShortLabel(hostId) {
  const meta = HOST_META[String(hostId || "").trim()];
  return meta?.short || hostId || "—";
}

/** Короткая подпись для шапки Shell — с emoji из HOST_META. */
export function getShellHostHeaderLabel(hostId) {
  const id = String(hostId || "").trim();
  const meta = HOST_META[id];
  const labels = {
    "browser-embed": "Панель CMS",
    "browser-tab": "Вкладка",
    "desktop-cms": "CMS.app",
    "desktop-shell": "Shell.app",
    "mobile-native": "iOS",
    "mobile-web": "Mobile",
    extension: "Companion"
  };
  const text = labels[id] || getShellHostLabel(id);
  const icon = meta?.icon || "📍";
  return `${icon} ${text}`;
}

let activeSurface = null;

function isMobileWebShellPath() {
  try {
    const path = window.location.pathname.replace(/\/+$/, "");
    return path.endsWith("/shell") || path.endsWith("/shell/index.html");
  } catch {
    return false;
  }
}

function isMobileWebUserAgent() {
  try {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
    if (window.matchMedia("(max-width: 768px)").matches && "ontouchstart" in window) return true;
  } catch {
    // ignore
  }
  return false;
}

function isShellEmbedQuery() {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
}

function readHostQuery() {
  try {
    const host = String(new URLSearchParams(window.location.search).get("host") || "").trim();
    return SHELL_HOSTS.includes(host) ? host : "";
  } catch {
    return "";
  }
}

function readSurfaceHost() {
  if (isVoiceStandaloneAppLocation()) {
    return readVoiceSurfaceHostFromLocation();
  }
  const fromQuery = readHostQuery();
  return fromQuery || "";
}

function isParentDesktopCms() {
  try {
    return window.parent !== window && Boolean(window.parent.desktopApp?.isDesktop);
  } catch {
    return false;
  }
}

function isExtensionContext() {
  if (readSurfaceHost() === "extension") return true;
  if (readHostQuery() === "extension") return true;
  try {
    if (new URLSearchParams(window.location.search).get("companion") === "1") return true;
  } catch {
    // ignore
  }
  return Boolean(window.shellCompanion?.isCompanion);
}

function isMobileNativeContext() {
  if (readSurfaceHost() === "mobile-native") return true;
  if (readHostQuery() === "mobile-native") return true;
  if (Boolean(window.shellNative?.isNative)) return true;
  try {
    return /AgentShell-iOS/i.test(navigator.userAgent || "");
  } catch {
    return false;
  }
}

function isLocalBackendHostname(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return true;
  if (host.endsWith(".local")) return true;
  return false;
}

/** @returns {{ id: "local" | "server", label: string, disabled: boolean }} */
export function detectShellBackend() {
  let hostname = "";
  try {
    hostname = window.location.hostname;
  } catch {
    // ignore
  }
  const isLocal = isLocalBackendHostname(hostname);
  if (isLocal) {
    return { id: "local", label: "local", disabled: false };
  }
  return { id: "server", label: "server", disabled: true };
}

/** @returns {{ host: string, hint: string, embedded: boolean, backend: ReturnType<typeof detectShellBackend> }} */
export function detectShellSurface() {
  const inIframe = window.parent !== window;
  const pathHost = isVoiceStandaloneAppLocation() ? readVoiceSurfaceHostFromLocation() : "";
  const queryHost = readHostQuery();
  const surfaceHost = pathHost || queryHost;
  const mobileWebPath = isMobileWebShellPath() && isMobileWebUserAgent();

  if (isExtensionContext()) {
    return {
      host: "extension",
      hint: HOST_META.extension.hint,
      embedded: true,
      backend: detectShellBackend()
    };
  }

  if (surfaceHost) {
    const meta = HOST_META[surfaceHost];
    return {
      host: surfaceHost,
      hint: meta?.hint || surfaceHost,
      embedded: isEmbeddedVoiceHost(surfaceHost) || (!pathHost && isShellEmbedQuery()),
      backend: detectShellBackend()
    };
  }

  if (isMobileNativeContext()) {
    return {
      host: "mobile-native",
      hint: HOST_META["mobile-native"].hint,
      embedded: inIframe || isShellEmbedQuery(),
      backend: detectShellBackend()
    };
  }

  if (mobileWebPath && !inIframe && !isShellEmbedQuery()) {
    return {
      host: "mobile-web",
      hint: HOST_META["mobile-web"].hint,
      embedded: false,
      backend: detectShellBackend()
    };
  }

  if (Boolean(window.shellApp?.isShellDesktop)) {
    return {
      host: "desktop-shell",
      hint: HOST_META["desktop-shell"].hint,
      embedded: false,
      backend: detectShellBackend()
    };
  }

  if (inIframe || isShellEmbedQuery()) {
    const host = isParentDesktopCms() ? "desktop-cms" : "browser-embed";
    return {
      host,
      hint: HOST_META[host].hint,
      embedded: true,
      backend: detectShellBackend()
    };
  }

  return {
    host: "browser-tab",
    hint: HOST_META["browser-tab"].hint,
    embedded: false,
    backend: detectShellBackend()
  };
}

export function getShellSurface() {
  return activeSurface || detectShellSurface();
}

export function getShellSurfacePayload() {
  const surface = getShellSurface();
  return {
    surfaceHost: surface.host,
    surfaceHint: surface.hint,
    surfaceEmbedded: surface.embedded,
    surfaceBackend: surface.backend.id
  };
}

/**
 * @param {{ onSurface?: (surface: ReturnType<typeof detectShellSurface>) => void }} options
 */
export function initShellSurface(options = {}) {
  activeSurface = detectShellSurface();
  if (activeSurface.host === "extension") {
    document.body.classList.add("shell-surface-extension");
  }
  options.onSurface?.(activeSurface);
  return activeSurface;
}
