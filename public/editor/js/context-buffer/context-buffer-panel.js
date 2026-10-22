(function initContextBufferPanel(global) {
  "use strict";

  const TYPE_ICONS = {
    page: "📄",
    content: "📝",
    file: "🖼️",
    slot: "📁",
    link: "🔗",
    text: "💬"
  };

  const COLLAPSED_STORAGE_KEY = "agentcms.contextBufferBand.collapsed.v1";
  let getActiveAgentId = () => "main";
  let showToast = null;
  let getCurrentPageItem = null;
  let bandNode = null;
  let toggleBtn = null;

  function isContextBufferBandCollapsed() {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function syncContextBufferBandCollapsed(collapsed = isContextBufferBandCollapsed()) {
    if (!bandNode) return;
    bandNode.classList.toggle("is-collapsed", collapsed);
    toggleBtn?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggleBtn?.setAttribute(
      "title",
      collapsed ? "Развернуть буфер контекста" : "Свернуть буфер контекста"
    );
  }

  function setContextBufferBandCollapsed(collapsed) {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
    syncContextBufferBandCollapsed(collapsed);
  }

  function expandContextBufferBand() {
    if (!bandNode?.classList.contains("is-collapsed")) return;
    setContextBufferBandCollapsed(false);
  }

  function hasBufferDragPayload(dataTransfer) {
    if (global.AgentCmsLinkDrag?.hasMenuLink) {
      return global.AgentCmsLinkDrag.hasMenuLink(dataTransfer);
    }
    if (!dataTransfer?.types) return false;
    const types = [...dataTransfer.types];
    if (types.includes("Files")) return false;
    return types.includes("application/x-awn-menu-link") || types.includes("text/plain");
  }

  function extractBufferDragPayload(dataTransfer) {
    if (global.AgentCmsLinkDrag?.extract) {
      return global.AgentCmsLinkDrag.extract(dataTransfer);
    }
    return null;
  }

  function dragPayloadToBufferItem(payload) {
    if (!payload || typeof payload !== "object") return null;
    let ref = String(payload.path || payload.folderPath || payload.href || "").trim();
    const title = String(payload.label || payload.title || ref || payload.text || "").trim();
    if (!ref && title) {
      const wiki = title.match(/^\[\[([^\]|#]+)/);
      if (wiki) ref = wiki[1].trim();
    }
    if (!ref && !title) return null;
    const source = String(payload.source || "").trim();
    let type = "link";
    if (source === "workspace-counter" || source === "rail-slot") type = "slot";
    else if (source === "media-card" || source === "attachment") type = "file";
    else if (source === "nav-book-toc" || source === "overview-thumb") type = "content";
    else if (ref && !ref.includes("/")) type = "page";
    return {
      type,
      ref: ref || title,
      title: title || ref,
      meta: {
        source,
        markdownLink: payload.markdownLink || payload.voiceMarkdownLink || null
      }
    };
  }

  function renderItems(listNode, items) {
    if (!listNode) return;
    listNode.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "context-buffer-empty";
      empty.textContent = "Пусто — перетащите сюда или «+ текущая»";
      listNode.appendChild(empty);
      return;
    }
    for (const item of items) {
      const chip = document.createElement("div");
      chip.className = "context-buffer-chip";
      chip.dataset.bufferId = item.id || "";
      const icon = document.createElement("span");
      icon.className = "context-buffer-chip-icon";
      icon.textContent = item.icon || TYPE_ICONS[item.type] || TYPE_ICONS.link;
      icon.setAttribute("aria-hidden", "true");
      const body = document.createElement("div");
      body.className = "context-buffer-chip-body";
      const title = document.createElement("span");
      title.className = "context-buffer-chip-title";
      title.textContent = item.title || item.ref;
      title.title = item.ref || "";
      const ref = document.createElement("span");
      ref.className = "context-buffer-chip-ref";
      ref.textContent = item.ref || "";
      body.append(title, ref);
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "context-buffer-chip-remove";
      removeBtn.title = "Убрать из буфера";
      removeBtn.setAttribute("aria-label", "Убрать из буфера");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        void removeItem(item);
      });
      chip.append(icon, body, removeBtn);
      listNode.appendChild(chip);
    }
  }

  async function refresh() {
    const listNode = document.getElementById("context-buffer-list");
    const countNode = document.getElementById("context-buffer-count");
    if (!listNode) return;
    try {
      const data = await global.ContextBufferClient.fetchBuffer(null, getActiveAgentId);
      const items = data.items || [];
      renderItems(listNode, items);
      if (countNode) countNode.textContent = String(items.length);
    } catch {
      renderItems(listNode, []);
      if (countNode) countNode.textContent = "0";
    }
  }

  async function appendItem(payload) {
    await global.ContextBufferClient.appendToBuffer(payload, null, getActiveAgentId);
    expandContextBufferBand();
    await refresh();
    if (typeof showToast === "function") showToast("Добавлено в буфер контекста", "success");
  }

  async function removeItem(item) {
    try {
      await global.ContextBufferClient.removeFromBuffer(
        { id: item?.id, ref: item?.ref },
        null,
        getActiveAgentId
      );
      await refresh();
    } catch (error) {
      if (typeof showToast === "function") showToast(String(error.message || error), "error");
    }
  }

  async function clearAll() {
    try {
      await global.ContextBufferClient.clearBuffer(null, getActiveAgentId);
      await refresh();
      if (typeof showToast === "function") showToast("Буфер контекста очищен", "success");
    } catch (error) {
      if (typeof showToast === "function") showToast(String(error.message || error), "error");
    }
  }

  function setupDropZone(band) {
    if (!band || band.dataset.contextBufferDropBound === "1") return;
    band.dataset.contextBufferDropBound = "1";

    const dropOverlay = document.createElement("div");
    dropOverlay.className = "context-buffer-dropzone";
    dropOverlay.setAttribute("aria-hidden", "true");
    dropOverlay.textContent = "Отпустите для добавления в буфер";
    band.appendChild(dropOverlay);

    let dropDepth = 0;

    const setDropTarget = (active) => {
      band.classList.toggle("is-drag-over", active);
      dropOverlay.classList.toggle("is-active", active);
    };

    const onDragEnter = (event) => {
      if (!hasBufferDragPayload(event.dataTransfer)) return;
      event.preventDefault();
      dropDepth += 1;
      setDropTarget(true);
    };

    const onDragOver = (event) => {
      if (!hasBufferDragPayload(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDropTarget(true);
    };

    const onDragLeave = (event) => {
      if (band.contains(event.relatedTarget)) return;
      dropDepth = Math.max(0, dropDepth - 1);
      if (dropDepth === 0) setDropTarget(false);
    };

    const onDrop = (event) => {
      dropDepth = 0;
      setDropTarget(false);
      if (!hasBufferDragPayload(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      const payload = extractBufferDragPayload(event.dataTransfer);
      const item = dragPayloadToBufferItem(payload);
      if (!item) {
        if (typeof showToast === "function") showToast("Не удалось прочитать перетаскивание", "error");
        return;
      }
      void appendItem(item).catch((error) => {
        if (typeof showToast === "function") showToast(String(error.message || error), "error");
      });
    };

    band.addEventListener("dragenter", onDragEnter, true);
    band.addEventListener("dragover", onDragOver, true);
    band.addEventListener("dragleave", onDragLeave, true);
    band.addEventListener("drop", onDrop, true);
  }

  function resolveContextBufferMountParent() {
    const app = document.getElementById("app-root");
    if (!app || !bandNode) return null;
    if (app.classList.contains("not-found-view")) return null;
    if (app.classList.contains("app-landing-view")) {
      return document.getElementById("app-landing-stack");
    }
    if (app.classList.contains("home-view")) {
      return document.getElementById("agent-canvas-stack");
    }
    return document.getElementById("workspace-main-stack");
  }

  function syncContextBufferBandLandingDisabled(disabled) {
    if (!bandNode) return;
    bandNode.classList.toggle("is-disabled", disabled);
    bandNode.setAttribute("aria-disabled", disabled ? "true" : "false");
    for (const btn of bandNode.querySelectorAll("button")) {
      btn.disabled = disabled;
    }
  }

  function syncContextBufferMount() {
    if (!bandNode) return;
    const parent = resolveContextBufferMountParent();
    if (!parent) {
      bandNode.hidden = true;
      syncContextBufferBandLandingDisabled(false);
      return;
    }
    bandNode.hidden = false;
    if (bandNode.parentElement !== parent) {
      parent.appendChild(bandNode);
    }
    syncContextBufferBandLandingDisabled(parent.id === "app-landing-stack");
    global.FileHubBandPanel?.syncMount?.();
  }

  function init(options = {}) {
    getActiveAgentId = typeof options.getActiveAgentId === "function" ? options.getActiveAgentId : getActiveAgentId;
    showToast = options.showToast || null;
    getCurrentPageItem =
      typeof options.getCurrentPageItem === "function" ? options.getCurrentPageItem : getCurrentPageItem;

    bandNode = document.getElementById("context-buffer-band");
    toggleBtn = document.getElementById("context-buffer-toggle-btn");
    const addCurrentBtn = document.getElementById("context-buffer-add-current-btn");
    const clearBtn = document.getElementById("context-buffer-clear-btn");
    const refreshBtn = document.getElementById("context-buffer-refresh-btn");

    syncContextBufferBandCollapsed();
    setupDropZone(bandNode);

    toggleBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      setContextBufferBandCollapsed(!isContextBufferBandCollapsed());
    });

    addCurrentBtn?.addEventListener("click", () => {
      const item = getCurrentPageItem ? getCurrentPageItem() : null;
      if (!item?.ref) {
        if (typeof showToast === "function") showToast("Нет открытой страницы", "error");
        return;
      }
      void appendItem(item);
    });

    clearBtn?.addEventListener("click", () => void clearAll());
    refreshBtn?.addEventListener("click", () => void refresh());

    syncContextBufferMount();
    void refresh();
  }

  global.ContextBufferPanel = {
    init,
    refresh,
    syncMount: syncContextBufferMount,
    dragPayloadToBufferItem
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
