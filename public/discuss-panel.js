/**
 * Discuss Panel — постоянная колонка справа от workspace (контекст + чат).
 */
(function initDiscussPanel() {
  const MENU_LINK_DRAG_MIME = "application/x-awn-menu-link";
  const STORAGE_WIDTH_KEY = "agent-cms-discuss-width";
  const STORAGE_TAB_KEY = "agent-cms-discuss-tab";
  const storageDataKey = (agentId) => `agent-cms-discuss-data:${agentId || "default"}`;

  const discussAsideNode = document.getElementById("discuss-aside");
  const discussResizerNode = document.getElementById("discuss-aside-resizer");
  const discussTabDiscussBtn = document.getElementById("discuss-tab-discuss");
  const discussTabShellBtn = document.getElementById("discuss-tab-shell");
  const discussTabShellMobileBtn = document.getElementById("discuss-tab-shell-mobile");
  const discussPanelDiscussNode = document.getElementById("discuss-panel-discuss");
  const discussPanelShellNode = document.getElementById("discuss-panel-shell");
  const discussPanelShellMobileNode = document.getElementById("discuss-panel-shell-mobile");
  const discussShellIframeNode = document.getElementById("discuss-shell-iframe");
  const discussShellMobileIframeNode = document.getElementById("discuss-shell-mobile-iframe");
  const DISCUSS_TABS = ["discuss", "shell", "shell-mobile"];
  const discussContextListNode = document.getElementById("discuss-context-list");
  const discussContextHintNode = document.getElementById("discuss-context-hint");
  const discussContextDropzoneNode = document.getElementById("discuss-context-dropzone");
  const discussAddCurrentBtn = document.getElementById("discuss-add-current-btn");
  const discussMessagesListNode = document.getElementById("discuss-messages-list");
  const discussMessagesWrapNode = document.getElementById("discuss-messages-wrap");
  const discussMessagesScrollTopBtn = document.getElementById("discuss-messages-scroll-top-btn");
  const discussMessagesScrollProgressNode = document.getElementById("discuss-messages-scroll-progress");
  const discussMessagesScrollDepthNode = document.getElementById("discuss-messages-scroll-depth");
  const discussMessagesEmptyNode = document.getElementById("discuss-messages-empty");
  const workspacePaneNode = document.querySelector(".workspace-pane");
  const discussAsideHeightMq = window.matchMedia("(max-width: 960px)");
  const discussComposerInputNode = document.getElementById("discuss-composer-input");
  const discussSendBtn = document.getElementById("discuss-send-btn");
  const discussClearBtn = document.getElementById("discuss-clear-btn");

  if (!discussAsideNode) return;

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
  let activeTab = readStoredTab();
  let shellIframeAgentId = "";
  let shellMobileIframeAgentId = "";
  let currentAgentId = null;
  let session = { context: [], messages: [] };
  let dropHighlight = 0;

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getActiveAgentIdFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("agent");
      if (fromQuery) return fromQuery;
      const parts = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts[0] === "a" && parts[1]) return decodeURIComponent(parts[1]);
    } catch {
      // ignore
    }
    return "";
  }

  function readStoredTab() {
    try {
      const tab = localStorage.getItem(STORAGE_TAB_KEY);
      if (DISCUSS_TABS.includes(tab)) return tab;
    } catch {
      // ignore
    }
    return "discuss";
  }

  function buildShellIframeUrl(agentId) {
    const url = new URL("/shell/", window.location.origin);
    url.searchParams.set("embed", "1");
    if (agentId) url.searchParams.set("agent", agentId);
    return url.toString();
  }

  function buildShellMobileIframeUrl(agentId) {
    const url = new URL("/shell/mobile/", window.location.origin);
    url.searchParams.set("embed", "1");
    if (agentId) url.searchParams.set("agent", agentId);
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

  function ensureShellMobileIframeLoaded(agentId) {
    if (!discussShellMobileIframeNode) return;
    const nextAgentId = agentId || "default";
    const nextUrl = buildShellMobileIframeUrl(nextAgentId);
    const currentSrc = discussShellMobileIframeNode.getAttribute("src") || "";
    if (!currentSrc) {
      discussShellMobileIframeNode.src = nextUrl;
      shellMobileIframeAgentId = nextAgentId;
      return;
    }
    if (shellMobileIframeAgentId !== nextAgentId) {
      discussShellMobileIframeNode.src = nextUrl;
      shellMobileIframeAgentId = nextAgentId;
    }
  }

  function setActiveTab(tab) {
    const nextTab = DISCUSS_TABS.includes(tab) ? tab : "discuss";
    activeTab = nextTab;
    discussAsideNode?.setAttribute("data-active-tab", nextTab);

    const isDiscuss = nextTab === "discuss";
    const isShell = nextTab === "shell";
    const isShellMobile = nextTab === "shell-mobile";
    const tabButtons = [
      { node: discussTabDiscussBtn, active: isDiscuss },
      { node: discussTabShellBtn, active: isShell },
      { node: discussTabShellMobileBtn, active: isShellMobile }
    ];

    tabButtons.forEach(({ node, active }) => {
      node?.classList.toggle("is-active", active);
      node?.setAttribute("aria-selected", active ? "true" : "false");
      node?.setAttribute("tabindex", active ? "0" : "-1");
    });

    discussPanelDiscussNode?.classList.toggle("is-active", isDiscuss);
    discussPanelShellNode?.classList.toggle("is-active", isShell);
    discussPanelShellMobileNode?.classList.toggle("is-active", isShellMobile);
    if (discussPanelDiscussNode) discussPanelDiscussNode.hidden = !isDiscuss;
    if (discussPanelShellNode) discussPanelShellNode.hidden = !isShell;
    if (discussPanelShellMobileNode) discussPanelShellMobileNode.hidden = !isShellMobile;

    const agentId = currentAgentId || getActiveAgentIdFromUrl();
    if (isShell) ensureShellIframeLoaded(agentId);
    if (isShellMobile) ensureShellMobileIframeLoaded(agentId);

    try {
      localStorage.setItem(STORAGE_TAB_KEY, nextTab);
    } catch {
      // ignore
    }
  }

  function bindTabs() {
    discussTabDiscussBtn?.addEventListener("click", () => {
      setActiveTab("discuss");
    });
    discussTabShellBtn?.addEventListener("click", () => {
      setActiveTab("shell");
    });
    discussTabShellMobileBtn?.addEventListener("click", () => {
      setActiveTab("shell-mobile");
    });
  }

  function loadSession(agentId) {
    currentAgentId = agentId || "default";
    try {
      const raw = localStorage.getItem(storageDataKey(currentAgentId));
      if (!raw) {
        session = { context: [], messages: [] };
        return;
      }
      const parsed = JSON.parse(raw);
      session = {
        context: Array.isArray(parsed.context) ? parsed.context : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : []
      };
    } catch {
      session = { context: [], messages: [] };
    }
  }

  function saveSession() {
    if (!currentAgentId) return;
    try {
      localStorage.setItem(storageDataKey(currentAgentId), JSON.stringify(session));
    } catch {
      // ignore quota
    }
  }

  function inferContextType(path) {
    const normalized = String(path || "").replace(/\\/g, "/");
    const base = normalized.split("/").pop() || "";
    if (/_registration\.md$/i.test(base)) return "awn.area";
    if (/\.sidecar\.md$/i.test(base)) return "awn.sidecar";
    if (/\/content\//i.test(normalized) && /\.md$/i.test(base)) return "awn.record";
    if (/\.md$/i.test(base)) return "awn.topic";
    return "awn.file";
  }

  function contextIcon(type) {
    if (type === "awn.area") return "📁";
    if (type === "awn.topic") return "📄";
    if (type === "awn.record") return "📝";
    if (type === "awn.sidecar") return "🖼";
    return "📎";
  }

  function normalizeContextItem(payload) {
    const path = String(payload?.path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
    if (!path) return null;
    const label = String(payload?.label || path.split("/").pop() || path).trim();
    const type = String(payload?.type || inferContextType(path)).trim();
    return { path, label, type, addedAt: new Date().toISOString() };
  }

  function contextKey(item) {
    return `${item.type}:${item.path}`;
  }

  function addContextItem(payload) {
    const item = normalizeContextItem(payload);
    if (!item) return false;
    const exists = session.context.some((c) => contextKey(c) === contextKey(item));
    if (exists) return false;
    session.context.push(item);
    saveSession();
    renderAll();
    return true;
  }

  function removeContextItem(index) {
    if (index < 0 || index >= session.context.length) return;
    session.context.splice(index, 1);
    saveSession();
    renderAll();
  }

  function addCurrentDocument() {
    const path = getActivePathFromDom();
    if (!path) {
      toast("Нет открытого документа", "error");
      return;
    }
    const label = getActiveLabelFromDom() || path.split("/").pop() || path;
    if (addContextItem({ path, label })) {
      toast("Добавлено в контекст", "");
    } else {
      toast("Уже в контексте", "");
    }
  }

  function getActivePathFromDom() {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("path");
      if (fromUrl) return fromUrl.replace(/\\/g, "/").replace(/^\/+/, "");
    } catch {
      // ignore
    }
    const menuActive = document.querySelector(".menu-link.is-active[data-path], .menu-sort-row.is-active[data-path]");
    if (menuActive?.dataset?.path) {
      return menuActive.dataset.path.replace(/\\/g, "/").replace(/^\/+/, "");
    }
    return "";
  }

  function getActiveLabelFromDom() {
    const menuActive = document.querySelector(".menu-link.is-active[data-path]");
    if (menuActive) {
      const text = menuActive.querySelector(".menu-link-label")?.textContent?.trim();
      if (text) return text;
    }
    return "";
  }

  async function openContextPath(path) {
    if (typeof window.openWorkspaceInspectorPath === "function") {
      await window.openWorkspaceInspectorPath(path);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("path", path);
    window.location.href = url.toString();
  }

  function renderContext() {
    if (!discussContextListNode) return;
    discussContextListNode.replaceChildren();
    session.context.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "discuss-context-chip";
      li.dataset.index = String(index);

      const mainBtn = document.createElement("button");
      mainBtn.type = "button";
      mainBtn.className = "discuss-context-chip-main";
      mainBtn.title = item.path;
      mainBtn.innerHTML = `<span class="discuss-context-chip-icon" aria-hidden="true">${contextIcon(item.type)}</span><span class="discuss-context-chip-label">${escapeHtml(item.label)}</span>`;
      mainBtn.addEventListener("click", () => {
        void openContextPath(item.path);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "discuss-context-chip-remove";
      removeBtn.title = "Убрать из контекста";
      removeBtn.setAttribute("aria-label", "Убрать из контекста");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeContextItem(index);
      });

      li.append(mainBtn, removeBtn);
      discussContextListNode.appendChild(li);
    });

    const hasContext = session.context.length > 0;
    discussContextHintNode?.classList.toggle("hidden", hasContext);
  }

  function renderMessages() {
    if (!discussMessagesListNode) return;
    discussMessagesListNode.replaceChildren();
    const hasMessages = session.messages.length > 0;
    discussMessagesEmptyNode?.classList.toggle("hidden", hasMessages);

    session.messages.forEach((msg) => {
      const li = document.createElement("li");
      li.className = `discuss-message discuss-message--${msg.role || "user"}`;

      const head = document.createElement("div");
      head.className = "discuss-message-head";
      const who = msg.role === "assistant" ? "🤖 Агент" : msg.role === "system" ? "⚙ Система" : "👤 Вы";
      const time = msg.at ? new Date(msg.at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
      head.textContent = `${who}${time ? ` · ${time}` : ""}`;

      const body = document.createElement("div");
      body.className = "discuss-message-body";
      body.textContent = msg.body || "";

      li.append(head, body);
      discussMessagesListNode.appendChild(li);
    });

    if (hasMessages) {
      requestAnimationFrame(() => {
        scrollMessagesToBottom();
        syncDiscussMessagesScrollChrome();
      });
    } else {
      syncDiscussMessagesScrollChrome();
    }
  }

  function getDiscussScrollMetrics() {
    if (!discussMessagesWrapNode) {
      return { scrollTop: 0, maxScroll: 0, percent: 0, screens: 0, scrollable: false };
    }
    const scrollTop = Math.max(0, discussMessagesWrapNode.scrollTop || 0);
    const maxScroll = Math.max(0, discussMessagesWrapNode.scrollHeight - discussMessagesWrapNode.clientHeight);
    const percent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
    const screens = discussMessagesWrapNode.clientHeight > 0 ? scrollTop / discussMessagesWrapNode.clientHeight : 0;
    return {
      scrollTop,
      maxScroll,
      percent,
      screens,
      scrollable: maxScroll > 8
    };
  }

  function formatDiscussScrollDepth(metrics) {
    if (!metrics.scrollable || metrics.percent <= 0) return "";
    const screensLabel = metrics.screens >= 0.15 ? `${metrics.screens.toFixed(1)} экр.` : "";
    return screensLabel ? `${metrics.percent}% · ${screensLabel}` : `${metrics.percent}%`;
  }

  function syncDiscussMessagesScrollChrome() {
    if (!discussMessagesWrapNode) return;
    const metrics = getDiscussScrollMetrics();
    const depthLabel = formatDiscussScrollDepth(metrics);
    const showTop = metrics.scrollable && metrics.scrollTop > 48;

    discussMessagesScrollTopBtn?.classList.toggle("is-visible", showTop);
    if (discussMessagesScrollTopBtn) {
      discussMessagesScrollTopBtn.setAttribute("aria-hidden", showTop ? "false" : "true");
      discussMessagesScrollTopBtn.tabIndex = showTop ? 0 : -1;
    }
    if (discussMessagesScrollProgressNode) {
      discussMessagesScrollProgressNode.style.width = `${metrics.percent}%`;
    }
    if (discussMessagesScrollDepthNode) {
      discussMessagesScrollDepthNode.textContent = depthLabel;
      discussMessagesScrollDepthNode.classList.toggle("hidden", !depthLabel);
    }
  }

  function bindDiscussMessagesScrollChrome() {
    if (!discussMessagesWrapNode) return;
    discussMessagesWrapNode.addEventListener("scroll", syncDiscussMessagesScrollChrome, { passive: true });
    discussMessagesScrollTopBtn?.addEventListener("click", () => {
      discussMessagesWrapNode.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => syncDiscussMessagesScrollChrome());
      observer.observe(discussMessagesWrapNode);
    }
    syncDiscussMessagesScrollChrome();
  }

  function scrollMessagesToBottom() {
    if (!discussMessagesWrapNode) return;
    discussMessagesWrapNode.scrollTop = discussMessagesWrapNode.scrollHeight;
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

  function renderAll() {
    renderContext();
    renderMessages();
  }

  function applyPanelWidth() {
    document.documentElement.style.setProperty("--discuss-panel-width", `${panelWidth}px`);
  }

  function extractMenuLinkFromDataTransfer(dataTransfer) {
    if (!dataTransfer) return null;
    const raw = dataTransfer.getData(MENU_LINK_DRAG_MIME);
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        if (payload?.path) return payload;
      } catch {
        // ignore
      }
    }
    const plain = String(dataTransfer.getData("text/plain") || "").trim();
    const wiki = plain.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/);
    if (wiki) {
      return { path: wiki[1].trim(), label: (wiki[2] || wiki[1]).trim(), wikilink: plain };
    }
    if (plain && /\.md$/i.test(plain)) {
      return { path: plain, label: plain.split("/").pop() || plain };
    }
    return null;
  }

  function dataTransferHasMenuLink(dataTransfer) {
    if (!dataTransfer?.types) return false;
    const types = [...dataTransfer.types];
    if (types.includes("Files")) return false;
    return types.includes(MENU_LINK_DRAG_MIME) || types.includes("text/plain");
  }

  function bindDropZone(node) {
    if (!node || node.dataset.discussDropBound === "1") return;
    node.dataset.discussDropBound = "1";

    node.addEventListener("dragenter", (event) => {
      if (!dataTransferHasMenuLink(event.dataTransfer)) return;
      event.preventDefault();
      dropHighlight += 1;
      node.classList.add("is-drop-target");
    });

    node.addEventListener("dragleave", () => {
      dropHighlight = Math.max(0, dropHighlight - 1);
      if (dropHighlight === 0) node.classList.remove("is-drop-target");
    });

    node.addEventListener("dragover", (event) => {
      if (!dataTransferHasMenuLink(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });

    node.addEventListener("drop", (event) => {
      dropHighlight = 0;
      node.classList.remove("is-drop-target");
      if (!dataTransferHasMenuLink(event.dataTransfer)) return;
      event.preventDefault();
      const payload = extractMenuLinkFromDataTransfer(event.dataTransfer);
      if (!payload) return;
      if (addContextItem(payload)) {
        toast("Добавлено в контекст", "");
      } else {
        toast("Уже в контексте", "");
      }
    });
  }

  function sendMessage() {
    const body = String(discussComposerInputNode?.value || "").trim();
    if (!body) return;
    session.messages.push({
      id: `msg-${Date.now()}`,
      role: "user",
      body,
      at: new Date().toISOString()
    });
    saveSession();
    if (discussComposerInputNode) discussComposerInputNode.value = "";
    renderMessages();
  }

  function clearChat() {
    if (!session.messages.length) return;
    if (!window.confirm("Очистить все сообщения в обсуждении?")) return;
    session.messages = [];
    saveSession();
    renderMessages();
  }

  function toast(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type || "");
      return;
    }
    console.log(message);
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
    if (agentId !== currentAgentId) {
      loadSession(agentId);
      renderAll();
    }
    if (activeTab === "shell") {
      ensureShellIframeLoaded(agentId || currentAgentId);
    }
    if (activeTab === "shell-mobile") {
      ensureShellMobileIframeLoaded(agentId || currentAgentId);
    }
    discussAddCurrentBtn?.toggleAttribute("disabled", !getActivePathFromDom());
  }

  discussAddCurrentBtn?.addEventListener("click", () => {
    addCurrentDocument();
  });

  discussSendBtn?.addEventListener("click", () => {
    sendMessage();
  });

  discussClearBtn?.addEventListener("click", () => {
    clearChat();
  });

  discussComposerInputNode?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      sendMessage();
    }
  });

  bindDropZone(discussContextDropzoneNode);
  bindDropZone(discussComposerInputNode?.closest(".discuss-composer") || discussComposerInputNode);

  bindTabs();
  bindResize();
  bindDiscussAsideHeightSync();
  bindDiscussMessagesScrollChrome();
  loadSession(getActiveAgentIdFromUrl());
  applyPanelWidth();
  renderAll();
  setActiveTab(activeTab);

  window.AgentDiscussPanel = {
    sync: syncFromApp,
    addContext: addContextItem,
    setTab: setActiveTab
  };
})();
