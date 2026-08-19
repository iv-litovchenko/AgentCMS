/**
 * Правая панель CMS — встроенный Agent CMS Voice (iframe).
 */
(function initDiscussPanel() {
  const STORAGE_WIDTH_KEY = "agent-cms-discuss-width";

  const discussAsideNode = document.getElementById("discuss-aside");
  const discussResizerNode = document.getElementById("discuss-aside-resizer");
  const discussShellIframeNode = document.getElementById("discuss-shell-iframe");
  const workspacePaneNode = document.querySelector(".workspace-pane");
  const discussAsideHeightMq = window.matchMedia("(max-width: 960px)");

  if (!discussAsideNode) return;

  discussAsideNode.setAttribute("data-active-tab", "shell");

  function readDefaultPanelWidth() {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim();
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } catch {
      // ignore
    }
    return 280;
  }

  let panelWidth = clamp(readNumber(STORAGE_WIDTH_KEY, readDefaultPanelWidth()), 280, 520);
  let shellIframeAgentId = "";

  function readNumber(key, fallback) {
    try {
      const n = Number(localStorage.getItem(key));
      if (Number.isFinite(n)) return n;
    } catch {
      // ignore
    }
    return fallback;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  const CHPU_RESERVED_ROOT_SEGMENTS = new Set(["api", "shell", "vendor", "a", "shared", "cms"]);

  function getActiveAgentIdFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("agent");
      if (fromQuery) return fromQuery;
      const parts = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (!parts.length) return "";
      if (parts[0] === "a" && parts[1]) return decodeURIComponent(parts[1]);
      const first = parts[0];
      if (first && !CHPU_RESERVED_ROOT_SEGMENTS.has(first.toLowerCase()) && !first.includes(".")) {
        return decodeURIComponent(first);
      }
    } catch {
      // ignore
    }
    return "";
  }

  function resolveVoiceShellBaseUrl() {
    try {
      const explicit = String(window.__AGENT_CMS_VOICE_URL__ || "").trim();
      if (explicit) return explicit.replace(/\/+$/, "");
    } catch {
      // ignore
    }
    const { protocol, hostname, port } = window.location;
    const isHttps = protocol === "https:";
    if (port === "3088" || port === "3488") return window.location.origin;
    const voicePort = isHttps ? "3488" : "3088";
    const host = hostname || "127.0.0.1";
    return `${protocol}//${host}:${voicePort}`;
  }

  function buildShellIframeUrl(agentId) {
    const base = resolveVoiceShellBaseUrl();
    const id = String(agentId || "").trim();
    const path = id ? `/${encodeURIComponent(id)}/` : "/";
    const url = new URL(path, `${base}/`);
    url.searchParams.set("embed", "1");
    url.searchParams.set("host", window.desktopApp?.isDesktop ? "desktop-cms" : "browser-embed");
    return url.toString();
  }

  function ensureShellIframeLoaded(agentId) {
    if (!discussShellIframeNode) return;
    const nextAgentId = agentId || "default";
    const nextUrl = buildShellIframeUrl(nextAgentId);
    const currentSrc = discussShellIframeNode.getAttribute("src") || "";
    if (!currentSrc) {
      discussShellIframeNode.src = nextUrl;
      shellIframeAgentId = nextAgentId;
      return;
    }
    if (shellIframeAgentId !== nextAgentId) {
      discussShellIframeNode.src = nextUrl;
      shellIframeAgentId = nextAgentId;
    }
  }

  function syncDiscussAsideHeight() {
    if (!discussAsideNode) return;
    if (discussAsideHeightMq.matches) {
      discussAsideNode.style.height = "";
      discussAsideNode.style.maxHeight = "";
      return;
    }
    const paneHeight = workspacePaneNode?.clientHeight || 0;
    if (paneHeight <= 0) return;
    discussAsideNode.style.height = `${paneHeight}px`;
    discussAsideNode.style.maxHeight = `${paneHeight}px`;
  }

  function bindDiscussAsideHeightSync() {
    syncDiscussAsideHeight();
    window.addEventListener("resize", syncDiscussAsideHeight);
    discussAsideHeightMq.addEventListener("change", syncDiscussAsideHeight);
    if (workspacePaneNode && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => syncDiscussAsideHeight());
      observer.observe(workspacePaneNode);
    }
  }

  function applyPanelWidth() {
    document.documentElement.style.setProperty("--discuss-panel-width", `${panelWidth}px`);
  }

  function bindResize() {
    if (!discussResizerNode || discussResizerNode.dataset.bound === "1") return;
    discussResizerNode.dataset.bound = "1";

    let dragging = false;
    let startX = 0;
    let startWidth = panelWidth;

    const onMove = (event) => {
      if (!dragging) return;
      const dx = startX - event.clientX;
      panelWidth = clamp(startWidth + dx, 280, 520);
      applyPanelWidth();
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("is-discuss-resizing");
      try {
        localStorage.setItem(STORAGE_WIDTH_KEY, String(panelWidth));
      } catch {
        // ignore
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    discussResizerNode.addEventListener("pointerdown", (event) => {
      dragging = true;
      startX = event.clientX;
      startWidth = panelWidth;
      document.body.classList.add("is-discuss-resizing");
      discussResizerNode.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  function syncFromApp() {
    const agentId = getActiveAgentIdFromUrl();
    ensureShellIframeLoaded(agentId);
  }

  bindResize();
  bindDiscussAsideHeightSync();
  applyPanelWidth();
  ensureShellIframeLoaded(getActiveAgentIdFromUrl());

  window.AgentDiscussPanel = {
    sync: syncFromApp
  };
})();
