/** Read-only surface indicator — where Agent CMS Voice UI runs. */

import {
  VOICE_DEFAULT_HOST,
  isEmbeddedVoiceHost,
  isVoiceStandaloneAppLocation,
  readVoiceSurfaceHostFromLocation
} from "@shell/voice-chpu";

/** Legacy path segments (URL) → canonical surface id. */
export const SURFACE_PATH_SEGMENTS = {
  "browser-tab": "browser-tab",
  "browser-embed": "cms-dialog",
  "desktop-cms": "cms-dialog",
  extension: "chrome-panel",
  "desktop-shell": "electron-app",
  "mobile-native": "mobile",
  "mobile-web": "mobile"
};

/** Canonical surfaces shown in header chip (5 modes). */
export const SHELL_SURFACES = ["electron-app", "chrome-panel", "cms-dialog", "mobile", "browser-tab"];

const SURFACE_META = {
  "electron-app": {
    icon: "🎙️",
    label: "Голосовой ассистент",
    hint: "Agent CMS Voice · приложение на компьютере"
  },
  "chrome-panel": {
    icon: "📌",
    label: "Панель в браузере",
    hint: "Chrome · боковая панель Companion"
  },
  "cms-dialog": {
    icon: "🏠",
    label: "Диалог в Agent CMS",
    hint: "Встроенная панель в Agent CMS"
  },
  mobile: {
    icon: "📲",
    label: "Мобильное устройство",
    hint: "Телефон или планшет"
  },
  "browser-tab": {
    icon: "🌐",
    label: "Вкладка браузера",
    hint: "Отдельная вкладка браузера"
  }
};

/** @deprecated use SHELL_SURFACES */
export const SHELL_HOSTS = Object.keys(SURFACE_PATH_SEGMENTS);

let trustedSurfaceHost = "";
let surfaceRefreshHandler = null;

function normalizePathSegment(segment) {
  const raw = String(segment || "").trim();
  return SURFACE_PATH_SEGMENTS[raw] || "";
}

function readPathSurfaceId() {
  if (!isVoiceStandaloneAppLocation()) return "";
  const legacy = readVoiceSurfaceHostFromLocation();
  if (!legacy || legacy === VOICE_DEFAULT_HOST) return "";
  return normalizePathSegment(legacy) || "";
}

function isChromeExtensionOrigin(origin) {
  return /^chrome-extension:\/\//i.test(String(origin || ""));
}

function isSameSiteOrigin(origin) {
  try {
    return String(origin || "") === window.location.origin;
  } catch {
    return false;
  }
}

export function noteShellSurfaceHost(message, origin = "") {
  const host = String(message?.host || message?.surface || "").trim();
  if (!host) return;

  if (host === "chrome-side-panel" || host === "chrome-panel") {
    if (isChromeExtensionOrigin(origin)) {
      trustedSurfaceHost = "chrome-panel";
      window.shellCompanion = { isCompanion: true, surface: "side-panel" };
    }
    return;
  }

  if (host === "cms-dialog") {
    if (isSameSiteOrigin(origin) || isChromeExtensionOrigin(origin)) {
      trustedSurfaceHost = "cms-dialog";
      window.shellCmsEmbed = {
        isEmbed: true,
        desktop: Boolean(message?.desktop)
      };
    }
  }
}

function bindShellSurfaceMessages() {
  if (bindShellSurfaceMessages.bound) return;
  bindShellSurfaceMessages.bound = true;
  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:surface-host") return;
    const prev = trustedSurfaceHost;
    noteShellSurfaceHost(data, event.origin);
    if (trustedSurfaceHost && trustedSurfaceHost !== prev) {
      activeSurface = detectShellSurface();
      surfaceRefreshHandler?.(activeSurface);
    }
  });
}

export function getShellHostLabel(surfaceId) {
  const id = normalizeSurfaceId(surfaceId);
  return SURFACE_META[id]?.hint || surfaceId || "—";
}

export function getShellHostShortLabel(surfaceId) {
  const id = normalizeSurfaceId(surfaceId);
  return SURFACE_META[id]?.label || surfaceId || "—";
}

export function normalizeSurfaceId(surfaceId) {
  const raw = String(surfaceId || "").trim();
  if (SHELL_SURFACES.includes(raw)) return raw;
  return normalizePathSegment(raw) || raw;
}

/** Header chip: emoji + short label. */
export function getShellHostHeaderLabel(surfaceId) {
  const id = normalizeSurfaceId(surfaceId);
  const meta = SURFACE_META[id];
  if (!meta) return `📍 ${id || "—"}`;
  return `${meta.icon} ${meta.label}`;
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

function isParentDesktopCms() {
  try {
    return window.parent !== window && Boolean(window.parent.desktopApp?.isDesktop);
  } catch {
    return false;
  }
}

function isMobileNativeContext() {
  if (readVoiceSurfaceHostFromLocation() === "mobile-native") {
    return true;
  }
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

function detectCmsDialog(inIframe) {
  if (trustedSurfaceHost === "cms-dialog") return true;
  if (window.shellCmsEmbed?.isEmbed) return true;
  const pathId = readPathSurfaceId();
  if (pathId === "cms-dialog") return true;
  if (!inIframe && !isShellEmbedQuery()) return false;
  if (isParentDesktopCms()) return true;
  if (inIframe || isShellEmbedQuery()) return true;
  return false;
}

function isCompanionSidePanelLocation() {
  try {
    return new URLSearchParams(window.location.search).get("side_panel") === "1";
  } catch {
    return false;
  }
}

function detectChromePanel(inIframe) {
  if (trustedSurfaceHost === "chrome-panel") return true;
  if (window.shellCompanion?.isCompanion) return true;
  if (readPathSurfaceId() === "chrome-panel") return true;
  if (!inIframe && isCompanionSidePanelLocation()) return true;
  return inIframe && readVoiceSurfaceHostFromLocation() === "extension";
}

/** @returns {{ host: string, hint: string, embedded: boolean, backend: ReturnType<typeof detectShellBackend> }} */
export function detectShellSurface() {
  bindShellSurfaceMessages();
  const inIframe = window.parent !== window;
  const backend = detectShellBackend();

  if (Boolean(window.shellApp?.isShellDesktop) || readPathSurfaceId() === "electron-app") {
    const host = "electron-app";
    return { host, hint: SURFACE_META[host].hint, embedded: false, backend };
  }

  if (detectChromePanel(inIframe)) {
    const host = "chrome-panel";
    return { host, hint: SURFACE_META[host].hint, embedded: true, backend };
  }

  if (detectCmsDialog(inIframe)) {
    const host = "cms-dialog";
    return { host, hint: SURFACE_META[host].hint, embedded: true, backend };
  }

  if (
    isMobileNativeContext() ||
    readPathSurfaceId() === "mobile" ||
    (isMobileWebShellPath() && isMobileWebUserAgent() && !inIframe && !isShellEmbedQuery())
  ) {
    const host = "mobile";
    return { host, hint: SURFACE_META[host].hint, embedded: inIframe, backend };
  }

  const host = "browser-tab";
  return { host, hint: SURFACE_META[host].hint, embedded: false, backend };
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
  bindShellSurfaceMessages();
  surfaceRefreshHandler = options.onSurface || null;
  activeSurface = detectShellSurface();
  if (activeSurface.host === "chrome-panel") {
    document.body.classList.add("shell-surface-extension");
  }
  options.onSurface?.(activeSurface);
  return activeSurface;
}

/** Legacy helper — embedded Voice in CMS / Chrome. */
export function isEmbeddedSurfaceHost(hostId) {
  const id = normalizeSurfaceId(hostId);
  return id === "cms-dialog" || id === "chrome-panel" || isEmbeddedVoiceHost(hostId);
}
