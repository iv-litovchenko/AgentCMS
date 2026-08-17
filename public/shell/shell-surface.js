/** Read-only surface indicator — host (where UI runs) + backend badge. */

export const SHELL_HOSTS = [
  "desktop-cms",
  "desktop-shell",
  "browser-embed",
  "browser-tab",
  "mobile-native",
  "mobile-web",
  "extension"
];

export const SHELL_BACKENDS = ["local", "server"];

const HOST_META = {
  "desktop-shell": { icon: "🖥", short: "Shell", hint: "Agent Shell.app" },
  "desktop-cms": { icon: "🖥", short: "CMS", hint: "Agent CMS.app · панель" },
  "browser-embed": { icon: "🌐", short: "Embed", hint: "Панель в Agent CMS" },
  "browser-tab": { icon: "🌐", short: "Tab", hint: "Вкладка браузера · /shell" },
  "mobile-native": { icon: "📱", short: "iOS", hint: "iOS app (SwiftUI)" },
  "mobile-web": { icon: "📱", short: "Mobile", hint: "Safari / PWA · /shell" },
  extension: { icon: "🧩", short: "Companion", hint: "Companion · расширение Chrome" }
};

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

function isParentDesktopCms() {
  try {
    return window.parent !== window && Boolean(window.parent.desktopApp?.isDesktop);
  } catch {
    return false;
  }
}

function isExtensionContext() {
  if (readHostQuery() === "extension") return true;
  try {
    if (new URLSearchParams(window.location.search).get("companion") === "1") return true;
  } catch {
    // ignore
  }
  return Boolean(window.shellCompanion?.isCompanion);
}

function isMobileNativeContext() {
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
  const queryHost = readHostQuery();
  const mobileWebPath = isMobileWebShellPath() && isMobileWebUserAgent();

  if (isExtensionContext()) {
    return {
      host: "extension",
      hint: HOST_META.extension.hint,
      embedded: true,
      backend: detectShellBackend()
    };
  }

  if (queryHost) {
    const meta = HOST_META[queryHost];
    return {
      host: queryHost,
      hint: meta?.hint || queryHost,
      embedded: queryHost === "browser-embed" || queryHost === "desktop-cms" || isShellEmbedQuery(),
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

function syncIndicator(track, indicator, activeTab) {
  if (!track || !indicator || !activeTab) return;
  indicator.style.width = `${activeTab.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
}

/**
 * @param {{ rootEl?: HTMLElement | null, hintEl?: HTMLElement | null, onSurface?: (surface: ReturnType<typeof detectShellSurface>) => void }} options
 */
export function initShellSurfaceSwitcher(options = {}) {
  const rootEl = options.rootEl || document.getElementById("shell-surface-switcher");
  const hintEl = options.hintEl || document.getElementById("shell-surface-hint");
  const track = rootEl?.querySelector(".shell-surface-switcher-track");
  const indicator = rootEl?.querySelector(".shell-surface-switcher-indicator");
  const hostTabs = rootEl ? [...rootEl.querySelectorAll("[data-host]")] : [];
  const backendTabs = rootEl ? [...rootEl.querySelectorAll("[data-backend]")] : [];

  activeSurface = detectShellSurface();
  if (!rootEl || !track || !indicator || !hostTabs.length) {
    options.onSurface?.(activeSurface);
    return activeSurface;
  }

  const apply = (surface, { syncOnly = false } = {}) => {
    activeSurface = surface;
    rootEl.dataset.host = surface.host;
    rootEl.dataset.backend = surface.backend.id;
    if (hintEl) hintEl.textContent = surface.hint;

    let activeHostTab = null;
    hostTabs.forEach((tab) => {
      const hostId = tab.getAttribute("data-host");
      const isActive = hostId === surface.host;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) activeHostTab = tab;
    });

    backendTabs.forEach((tab) => {
      const backendId = tab.getAttribute("data-backend");
      const isActive = backendId === surface.backend.id;
      const isDisabled = backendId === "server" && surface.backend.disabled;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      tab.toggleAttribute("disabled", isDisabled);
    });

    syncIndicator(track, indicator, activeHostTab);
    if (!syncOnly) options.onSurface?.(surface);
  };

  const onResize = () => apply(getShellSurface(), { syncOnly: true });
  window.addEventListener("resize", onResize, { passive: true });

  apply(activeSurface);
  requestAnimationFrame(() => apply(getShellSurface(), { syncOnly: true }));

  return activeSurface;
}

export function renderShellSurfaceSwitcherMarkup() {
  const hostTabs = SHELL_HOSTS.map((host) => {
    const meta = HOST_META[host];
    return `<span class="shell-surface-tab" role="tab" data-host="${host}" aria-selected="false" tabindex="-1" title="${meta.hint}">
      <span class="surf-ico" aria-hidden="true">${meta.icon}</span>
      <span class="surf-label">${meta.short}</span>
    </span>`;
  }).join("");

  const backendTabs = SHELL_BACKENDS.map((backend) => {
    const disabled = backend === "server";
    return `<span class="shell-surface-backend-tab" role="tab" data-backend="${backend}" aria-selected="false"${
      disabled ? ' aria-disabled="true" disabled tabindex="-1" title="Server — скоро"' : ' tabindex="-1"'
    }>${backend}</span>`;
  }).join("");

  return `<div class="shell-surface-switcher-head">
    <span class="shell-surface-switcher-kicker">Host</span>
    <span class="shell-surface-switcher-hint" id="shell-surface-hint"></span>
    <div class="shell-surface-backend" role="tablist" aria-label="Backend">${backendTabs}</div>
  </div>
  <div class="shell-surface-switcher-track" role="tablist" aria-label="Shell host">
    <span class="shell-surface-switcher-indicator" aria-hidden="true"></span>
    ${hostTabs}
  </div>`;
}
