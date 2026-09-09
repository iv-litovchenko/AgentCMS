/**
 * Правая панель CMS — встроенный Agent CMS Voice (iframe).
 */
(function initDiscussPanel() {
  const SHELL_PRESENCE_ENABLED = false;
  const STORAGE_WIDTH_KEY = "agent-cms-discuss-width";
  const STORAGE_HIDDEN_KEY = "agent-cms-discuss-collapsed";

  const discussAsideNode = document.getElementById("discuss-aside");
  const discussResizerNode = document.getElementById("discuss-aside-resizer");
  const discussPanelToggleBtnNode = document.getElementById("discuss-panel-toggle-btn");
  const discussPanelShellNode = document.getElementById("discuss-panel-shell");
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
  let panelHidden = readHiddenState();
  let presencePollTimer = 0;
  let lastPresence = null;

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

  function readHiddenState() {
    try {
      return localStorage.getItem(STORAGE_HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  }

  function formatPresenceSummary(presence) {
    if (!presence || !presence.clientCount) return "";
    const hint = String(presence.primarySurfaceHint || presence.primarySurfaceHost || "").trim();
    const count = Number(presence.clientCount) || 0;
    if (!hint) return count > 1 ? `${count} клиента Shell` : "Shell на связи";
    return count > 1 ? `${hint} · primary (${count})` : hint;
  }

  function applyPresenceToChatButton(presence) {
    if (!discussPanelToggleBtnNode) return;
    if (presence) lastPresence = presence;
    const summary = formatPresenceSummary(presence || lastPresence);
    const baseTitle = panelHidden ? "Открыть чат Agent CMS Voice" : "Скрыть чат Agent CMS Voice";
    discussPanelToggleBtnNode.title = summary ? `${baseTitle} · ${summary}` : baseTitle;
    const active = presence || lastPresence;
    discussPanelToggleBtnNode.dataset.shellClients = String(active?.clientCount || 0);
    discussPanelToggleBtnNode.dataset.shellPrimaryHost = String(active?.primarySurfaceHost || "");
  }

  async function refreshShellPresence() {
    if (!SHELL_PRESENCE_ENABLED) {
      lastPresence = null;
      applyPresenceToChatButton(null);
      return null;
    }
    const agentId = getActiveAgentIdFromUrl();
    if (!agentId) {
      lastPresence = null;
      applyPresenceToChatButton(null);
      return null;
    }
    try {
      const url = new URL("/api/shell/presence", window.location.origin);
      url.searchParams.set("agent", agentId);
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      applyPresenceToChatButton(data);
      return data;
    } catch {
      applyPresenceToChatButton(lastPresence);
      return lastPresence;
    }
  }

  function bindPresencePolling() {
    if (!SHELL_PRESENCE_ENABLED) return;
    void refreshShellPresence();
    presencePollTimer = window.setInterval(() => {
      void refreshShellPresence();
    }, 12000);
    window.addEventListener("focus", () => {
      void refreshShellPresence();
    });
  }

  function updatePanelUi() {
    if (!discussAsideNode) return;
    discussAsideNode.classList.toggle("is-hidden", panelHidden);
    discussPanelToggleBtnNode?.classList.toggle("is-active", !panelHidden);
    discussPanelToggleBtnNode?.setAttribute("aria-expanded", panelHidden ? "false" : "true");
    applyPresenceToChatButton(lastPresence);
  }

  function setPanelHidden(next) {
    panelHidden = Boolean(next);
    updatePanelUi();
    try {
      localStorage.setItem(STORAGE_HIDDEN_KEY, panelHidden ? "1" : "0");
    } catch {
      // ignore
    }
    if (!panelHidden) ensureShellIframeLoaded(getActiveAgentIdFromUrl());
  }

  function bindHeaderToggle() {
    if (!discussPanelToggleBtnNode || discussPanelToggleBtnNode.dataset.bound === "1") return;
    discussPanelToggleBtnNode.dataset.bound = "1";
    discussPanelToggleBtnNode.addEventListener("click", () => {
      setPanelHidden(!panelHidden);
    });
  }

  const CHPU_RESERVED_ROOT_SEGMENTS = new Set([
    "api",
    "shell",
    "vendor",
    "a",
    "shared",
    "cms",
    "index.html"
  ]);

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

  function getVoiceBaseUrl() {
    const injected = String(window.__AGENT_CMS_VOICE_URL__ || "").trim();
    if (!injected) return "";
    try {
      const voiceUrl = new URL(injected);
      const pageHost = String(window.location.hostname || "").trim();
      if (pageHost && pageHost !== "0.0.0.0") voiceUrl.hostname = pageHost;
      return voiceUrl.toString().replace(/\/+$/, "");
    } catch {
      return injected.replace(/\/+$/, "");
    }
  }

  function buildShellIframeUrl(agentId) {
    const id = String(agentId || "").trim();
    const host = window.desktopApp?.isDesktop ? "desktop-cms" : "browser-embed";
    const voicePath = id ? `/${encodeURIComponent(id)}/${host}/` : "/";
    const voiceBase = getVoiceBaseUrl();
    if (voiceBase) {
      return new URL(voicePath, `${voiceBase}/`).toString();
    }
    // Без Voice URL никогда не грузим CMS `/` — `/shell/` это Voice (или редирект на него).
    const fallbackPath = id ? voicePath : "/shell/";
    return new URL(fallbackPath, window.location.origin).toString();
  }

  function shellIframeLocationKey(urlValue) {
    try {
      const url = new URL(urlValue, window.location.origin);
      return `${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}`;
    } catch {
      return String(urlValue || "");
    }
  }

  function shouldReloadShellIframe(currentSrc, nextUrl, nextAgentId) {
    if (!currentSrc) return true;
    if (shellIframeAgentId !== nextAgentId) return true;
    return shellIframeLocationKey(currentSrc) !== shellIframeLocationKey(nextUrl);
  }

  function announceShellSurfaceHost() {
    if (!discussShellIframeNode?.contentWindow) return;
    try {
      discussShellIframeNode.contentWindow.postMessage(
        {
          type: "agent-cms-voice:surface-host",
          host: "cms-dialog",
          desktop: Boolean(window.desktopApp?.isDesktop)
        },
        "*"
      );
    } catch {
      // ignore
    }
  }

  function ensureShellIframeLoaded(agentId) {
    if (!discussShellIframeNode) return;
    const nextAgentId = String(agentId || "").trim();
    const nextUrl = buildShellIframeUrl(nextAgentId);
    const currentSrc = discussShellIframeNode.getAttribute("src") || "";
    if (shouldReloadShellIframe(currentSrc, nextUrl, nextAgentId)) {
      discussShellIframeNode.src = nextUrl;
      shellIframeAgentId = nextAgentId;
    }
  }

  function syncDiscussAsideHeight() {
    if (!discussAsideNode || panelHidden) return;
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

  function getVoicePostMessageOrigin() {
    const src = discussShellIframeNode?.getAttribute("src") || discussShellIframeNode?.src || "";
    if (!src) return "*";
    try {
      return new URL(src, window.location.href).origin;
    } catch {
      return "*";
    }
  }

  function hasVoiceChatDrag(dataTransfer) {
    return Boolean(window.AgentCmsLinkDrag?.has(dataTransfer));
  }

  function extractVoiceChatDrag(dataTransfer) {
    return window.AgentCmsLinkDrag?.extract(dataTransfer) || null;
  }

  function insertIntoVoiceCompose(text, options = {}) {
    const trimmed = String(text || "").trim();
    if (!trimmed || !discussShellIframeNode?.contentWindow) return false;
    discussShellIframeNode.contentWindow.postMessage(
      {
        type: "agent-cms-voice:compose-insert",
        text: trimmed,
        join: options.join || "space"
      },
      getVoicePostMessageOrigin()
    );
    return true;
  }

  function bindVoiceChatDropZone() {
    if (!discussPanelShellNode || discussPanelShellNode.dataset.voiceChatDropBound === "1") return;
    discussPanelShellNode.dataset.voiceChatDropBound = "1";

    const dropOverlay = document.createElement("div");
    dropOverlay.className = "discuss-voice-chat-dropzone";
    dropOverlay.setAttribute("aria-hidden", "true");
    dropOverlay.textContent = "Отпустите для вставки в чат";
    discussPanelShellNode.appendChild(dropOverlay);

    let dropDepth = 0;

    const setDropTarget = (active) => {
      dropOverlay.classList.toggle("is-active", active);
      discussAsideNode?.classList.toggle("is-voice-chat-drop-target", active);
    };

    const maybeOpenPanelForDrop = () => {
      if (!panelHidden) return;
      setPanelHidden(false);
    };

    const onDragEnter = (event) => {
      if (!hasVoiceChatDrag(event.dataTransfer)) return;
      event.preventDefault();
      dropDepth += 1;
      setDropTarget(true);
      maybeOpenPanelForDrop();
    };

    const onDragOver = (event) => {
      if (!hasVoiceChatDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDropTarget(true);
    };

    const onDragLeave = () => {
      dropDepth = Math.max(0, dropDepth - 1);
      if (dropDepth === 0) setDropTarget(false);
    };

    const onDrop = (event) => {
      if (!hasVoiceChatDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      dropDepth = 0;
      setDropTarget(false);
      document.body.classList.remove("is-voice-chat-drop-active");
      const payload = extractVoiceChatDrag(event.dataTransfer);
      const text =
        window.AgentCmsLinkDrag?.resolveInsertText(payload) ||
        payload?.voiceMarkdownLink ||
        payload?.markdownLink ||
        payload?.wikilink ||
        payload?.text;
      if (text) insertIntoVoiceCompose(text);
    };

    for (const target of [dropOverlay, discussAsideNode, discussPanelShellNode]) {
      if (!target) continue;
      target.addEventListener("dragenter", onDragEnter);
      target.addEventListener("dragover", onDragOver);
      target.addEventListener("dragleave", onDragLeave);
      target.addEventListener("drop", onDrop);
    }

    window.addEventListener("dragover", (event) => {
      if (!document.body.classList.contains("is-voice-chat-drop-active")) return;
      if (!hasVoiceChatDrag(event.dataTransfer)) return;
      if (panelHidden && event.clientX > window.innerWidth - 96) {
        maybeOpenPanelForDrop();
      }
    });
  }

  function syncFromApp() {
    const agentId = getActiveAgentIdFromUrl();
    ensureShellIframeLoaded(agentId);
    void refreshShellPresence();
  }

  if (discussShellIframeNode && discussShellIframeNode.dataset.shellSurfaceBound !== "1") {
    discussShellIframeNode.dataset.shellSurfaceBound = "1";
    discussShellIframeNode.addEventListener("load", announceShellSurfaceHost);
  }

  bindResize();
  bindHeaderToggle();
  bindDiscussAsideHeightSync();
  bindVoiceChatDropZone();
  bindPresencePolling();
  applyPanelWidth();
  updatePanelUi();
  window.addEventListener("popstate", syncFromApp);
  ensureShellIframeLoaded(getActiveAgentIdFromUrl());

  window.AgentDiscussPanel = {
    sync: syncFromApp,
    isHidden: () => panelHidden,
    setHidden: (next) => setPanelHidden(next),
    toggle: () => setPanelHidden(!panelHidden),
    isCollapsed: () => panelHidden,
    setCollapsed: (next) => setPanelHidden(next),
    getPresence: refreshShellPresence,
    insertIntoCompose: insertIntoVoiceCompose
  };
})();
