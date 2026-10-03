/** «Файлообменник» — выдача из .agent-cms/state/file-hub-queue.json; загрузка в inbox — локальный mock. */

import { bindShellHintsIn } from "@shell/hints";
import { parseVoiceShellPath } from "@shell/voice-chpu";
import { clearFileHubQueue, fetchFileHubQueue, removeFileFromFileHub } from "@js/file-hub-queue";

const FILE_HUB_TOPICS = {
  inbox: { topic: "Inbox", place: "inbox/загрузки/" },
  legal: { topic: "Договоры", place: "workspace/Юридическое/" },
  screenshots: { topic: "Скриншоты", place: "inbox/скриншоты/" },
  marketing: { topic: "Маркетинг", place: "workspace/Маркетинг/" },
  media: { topic: "Медиа", place: "workspace/Медиа/" }
};

const FILE_HUB_TOPIC_LIST = Object.entries(FILE_HUB_TOPICS).map(([key, value]) => ({
  key,
  topic: value.topic,
  place: value.place,
  label: `${value.topic} · ${value.place}`
}));

function formatFileSizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_HUB_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"]);

function isFileHubImagePath(filePath) {
  const name = String(filePath || "");
  const dot = name.lastIndexOf(".");
  if (dot === -1) return false;
  return FILE_HUB_IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

function buildWorkspaceFilePreviewUrl(fileRel, options = {}) {
  const params = new URLSearchParams({
    file: String(fileRel || "").replace(/\\/g, "/")
  });
  if (options.thumb) {
    params.set("thumb", "1");
    params.set("max", String(options.max || 96));
  }
  const agent = getShellAgentId();
  if (agent) params.set("agent", agent);
  return `/api/workspace/folder/file?${params.toString()}`;
}

function fillFileHubItemVisual(container, file) {
  if (!container) return;
  const filePath = String(file?.path || "");
  const fileName = String(file?.name || filePath);
  const icons = globalThis.MaterialFileIcons;

  const showThumb = isFileHubImagePath(fileName) && filePath.includes("/");
  if (showThumb) {
    const img = document.createElement("img");
    img.className = "shell-file-hub-item-thumb";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = buildWorkspaceFilePreviewUrl(filePath, { thumb: true, max: 96 });
    img.addEventListener("error", () => {
      container.classList.add("shell-file-hub-item-visual--icon");
      container.replaceChildren();
      if (icons?.fillInlineFileIcon) {
        icons.fillInlineFileIcon(container, fileName, "🖼", {
          className: "shell-file-hub-item-icon",
          width: 28,
          height: 28
        });
      } else {
        container.textContent = "🖼";
      }
    });
    container.appendChild(img);
    return;
  }

  container.classList.add("shell-file-hub-item-visual--icon");
  if (icons?.fillInlineFileIcon) {
    icons.fillInlineFileIcon(container, fileName, "📎", {
      className: "shell-file-hub-item-icon",
      width: 28,
      height: 28
    });
  } else {
    container.textContent = "📎";
  }
}

function mountFileHubRoot(root, mainView) {
  const host = mainView || document.getElementById("shell-main-view");
  if (!root || !host || root.parentElement === host) return;
  host.appendChild(root);
}

function getShellAgentId() {
  try {
    const fromQuery = new URLSearchParams(location.search).get("agent");
    if (fromQuery) return fromQuery.trim();
    const { agentId } = parseVoiceShellPath(location.pathname);
    if (agentId) return agentId;
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "shell" && parts[1]) return decodeURIComponent(parts[1]);
  } catch {
    // ignore
  }
  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function filterTopicOptions(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return FILE_HUB_TOPIC_LIST;
  return FILE_HUB_TOPIC_LIST.filter((item) =>
    [item.label, item.topic, item.place, item.key].some((part) => String(part).toLowerCase().includes(q))
  );
}

function basenameFromPath(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

function normalizeSuggestOption(option) {
  const meta = String(
    option.meta || option.locationHint || option.filePath || option.path || option.folderPath || ""
  ).trim();
  let label = String(option.label || option.displayName || option.name || option.title || "").trim();
  if (!label) label = basenameFromPath(meta);
  if (!label) return null;
  return { ...option, label, meta };
}

async function fetchWorkspaceSearch(query) {
  const q = String(query || "").trim();
  const agentId = getShellAgentId();
  if (!q || q.length < 2 || !agentId) return [];
  try {
    const url = new URL("/api/search", window.location.origin);
    url.searchParams.set("agent", agentId);
    url.searchParams.set("q", q);
    url.searchParams.set("scope", "filename");
    url.searchParams.set("limit", "12");
    const response = await fetch(url.toString(), { credentials: "same-origin" });
    if (!response.ok) return [];
    const data = await response.json();
    return (Array.isArray(data.results) ? data.results : [])
      .map((row) =>
        normalizeSuggestOption({
          kind: "workspace",
          label: row.displayName,
          meta: row.locationHint || row.filePath,
          filePath: row.filePath,
          query: q
        })
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function bindInteractiveSearch({
  input,
  suggestEl,
  getOptions,
  onPick,
  onInput,
  fetchRemote,
  debounceMs = 280
}) {
  if (!input || !suggestEl) return;

  let activeIndex = -1;
  let remoteTimer = null;
  let remoteOptions = [];
  let visibleOptions = [];

  const hideSuggest = () => {
    suggestEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const renderSuggest = () => {
    const local = getOptions(input.value)
      .map((row) => normalizeSuggestOption(row))
      .filter(Boolean);
    const merged = [...local, ...remoteOptions];
    visibleOptions = merged;
    suggestEl.replaceChildren();
    if (!merged.length) {
      hideSuggest();
      return;
    }
    merged.forEach((option, index) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shell-file-hub-suggest-item";
      btn.setAttribute("role", "option");
      btn.dataset.index = String(index);
      btn.innerHTML = `
        <span class="shell-file-hub-suggest-item-label">${escapeHtml(option.label)}</span>
        ${option.meta ? `<span class="shell-file-hub-suggest-item-meta">${escapeHtml(option.meta)}</span>` : ""}
      `;
      btn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        onPick(option, input);
        hideSuggest();
      });
      li.appendChild(btn);
      suggestEl.appendChild(li);
    });
    suggestEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlightActive();
  };

  const highlightActive = () => {
    const buttons = suggestEl.querySelectorAll(".shell-file-hub-suggest-item");
    buttons.forEach((btn, index) => {
      btn.classList.toggle("is-active", index === activeIndex);
    });
  };

  const scheduleRemote = () => {
    if (!fetchRemote) return;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => {
      void fetchRemote(input.value).then((rows) => {
        remoteOptions = rows;
        renderSuggest();
      });
    }, debounceMs);
  };

  input.addEventListener("input", () => {
    remoteOptions = [];
    onInput?.(input.value);
    renderSuggest();
    scheduleRemote();
  });

  input.addEventListener("focus", () => {
    renderSuggest();
    scheduleRemote();
  });

  input.addEventListener("blur", () => {
    window.setTimeout(hideSuggest, 120);
  });

  input.addEventListener("keydown", (event) => {
    if (suggestEl.hidden) return;
    const max = visibleOptions.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = activeIndex >= max ? 0 : activeIndex + 1;
      highlightActive();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? max : activeIndex - 1;
      highlightActive();
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) onPick(option, input);
      hideSuggest();
    } else if (event.key === "Escape") {
      hideSuggest();
    }
  });

  return {
    refresh: renderSuggest,
    hide: hideSuggest
  };
}

function bindFileHubConfirm(root) {
  const layer = root?.querySelector("[data-file-hub-confirm]");
  const titleEl = root?.querySelector("[data-file-hub-confirm-title]");
  const messageEl = root?.querySelector("[data-file-hub-confirm-message]");
  const okBtn = root?.querySelector("[data-file-hub-confirm-ok]");
  const cancelBtn = root?.querySelector("[data-file-hub-confirm-cancel]");
  if (!layer || !titleEl || !messageEl || !okBtn || !cancelBtn) {
    return async () => false;
  }

  let settle = null;

  const close = (value) => {
    layer.hidden = true;
    const done = settle;
    settle = null;
    done?.(value);
  };

  okBtn.addEventListener("click", () => close(true));
  cancelBtn.addEventListener("click", () => close(false));
  layer.addEventListener("keydown", (event) => {
    if (layer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(false);
    }
  });

  return ({ title, message, confirmLabel = "Убрать", danger = true } = {}) =>
    new Promise((resolve) => {
      if (settle) {
        settle(false);
      }
      settle = resolve;
      titleEl.textContent = String(title || "Подтвердите действие");
      messageEl.textContent = String(message || "");
      okBtn.textContent = String(confirmLabel || "Убрать");
      okBtn.classList.toggle("is-danger", Boolean(danger));
      layer.hidden = false;
      cancelBtn.focus();
    });
}

export function initShellFileHub({ shellApp, nodes, embedMode = false } = {}) {
  const root = nodes?.fileHub || document.getElementById("shell-file-hub");
  const openBtn = nodes?.fileHubOpen || document.getElementById("shell-file-hub-open");
  const dropZone = root?.querySelector("[data-file-hub-drop]");
  const searchInput = root?.querySelector("[data-file-hub-search]");
  const searchSuggest = root?.querySelector("[data-file-hub-search-suggest]");
  const topicInput = root?.querySelector("[data-file-hub-topic-search]");
  const topicHidden = root?.querySelector("[data-file-hub-topic]");
  const topicSuggest = root?.querySelector("[data-file-hub-topic-suggest]");
  const listEl = root?.querySelector("[data-file-hub-list]");
  const emptyEl = root?.querySelector("[data-file-hub-empty]");
  const exportRefreshBtn = root?.querySelector("[data-file-hub-export-refresh]");
  const exportClearBtn = root?.querySelector("[data-file-hub-export-clear]");
  const confirmLayer = root?.querySelector("[data-file-hub-confirm]");
  const app = nodes?.shellApp || document.getElementById("shell-app");
  const mainView = nodes?.mainView || document.getElementById("shell-main-view");

  if (!root) return {};

  mountFileHubRoot(root, mainView);
  bindShellHintsIn(root);
  const confirmFileHubAction = bindFileHubConfirm(root);

  let files = [];
  let query = "";
  let open = false;
  let queueLoading = false;

  function syncExportToolbarUi() {
    const busy = queueLoading;
    if (exportRefreshBtn) {
      exportRefreshBtn.disabled = busy;
      exportRefreshBtn.classList.toggle("is-loading", busy);
      exportRefreshBtn.setAttribute("aria-busy", busy ? "true" : "false");
    }
    if (exportClearBtn) {
      exportClearBtn.disabled = busy || files.length === 0;
    }
  }

  async function reloadExportQueue() {
    if (queueLoading) return;
    queueLoading = true;
    syncExportToolbarUi();
    try {
      const data = await fetchFileHubQueue(getShellAgentId());
      files = (Array.isArray(data.items) ? data.items : []).map((item) => ({ ...item }));
    } catch (error) {
      files = [];
      console.warn("[file-hub] export queue load failed", error);
    } finally {
      queueLoading = false;
      syncExportToolbarUi();
      renderList();
    }
  }

  async function clearExportQueue() {
    if (!files.length || queueLoading) return;
    const confirmed = await confirmFileHubAction({
      title: "Очистить список?",
      message: "Все файлы исчезнут из очереди выдачи. Сами файлы в workspace не удалятся.",
      confirmLabel: "Очистить",
      danger: true
    });
    if (!confirmed) return;
    queueLoading = true;
    syncExportToolbarUi();
    try {
      await clearFileHubQueue(getShellAgentId());
      files = [];
    } catch (error) {
      console.warn("[file-hub] export queue clear failed", error);
      await reloadExportQueue();
      return;
    } finally {
      queueLoading = false;
      syncExportToolbarUi();
      renderList();
    }
  }

  function setTopicSelection(key) {
    const item = FILE_HUB_TOPIC_LIST.find((entry) => entry.key === key) || FILE_HUB_TOPIC_LIST[0];
    if (topicHidden) topicHidden.value = item.key;
    if (topicInput) topicInput.value = item.label;
  }

  setTopicSelection("inbox");

  function filteredFiles() {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((file) =>
      [file.name, file.topic, file.place].some((part) => String(part || "").toLowerCase().includes(q))
    );
  }

  function renderList() {
    if (!listEl) return;
    const items = filteredFiles();
    listEl.replaceChildren();
    if (emptyEl) emptyEl.hidden = items.length > 0;
    syncExportToolbarUi();
    for (const file of items) {
      const row = document.createElement("li");
      row.className = "shell-file-hub-item";
      row.draggable = false;
      row.dataset.fileId = file.id;
      const sizeLabel = formatFileSizeLabel(file.size);

      const grip = document.createElement("span");
      grip.className = "shell-file-hub-item-grip";
      grip.setAttribute("aria-hidden", "true");
      grip.title = "Перетащите за ручку в другое окно";
      grip.textContent = "⠿";

      const visual = document.createElement("span");
      visual.className = "shell-file-hub-item-visual";
      fillFileHubItemVisual(visual, file);

      const main = document.createElement("span");
      main.className = "shell-file-hub-item-main";
      main.innerHTML = `
        <span class="shell-file-hub-item-name">${escapeHtml(file.name)}</span>
        <span class="shell-file-hub-item-meta">${escapeHtml(file.topic)} · ${escapeHtml(file.place)}</span>
      `;

      const trailing = document.createElement("div");
      trailing.className = "shell-file-hub-item-trailing";
      if (sizeLabel) {
        const sizeEl = document.createElement("span");
        sizeEl.className = "shell-file-hub-item-size";
        sizeEl.title = "Размер файла";
        sizeEl.textContent = sizeLabel;
        trailing.appendChild(sizeEl);
      }
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "shell-file-hub-item-remove";
      removeBtn.title = "Убрать из списка";
      removeBtn.setAttribute("aria-label", "Убрать из списка");
      trailing.appendChild(removeBtn);

      row.append(grip, visual, main, trailing);
      removeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void (async () => {
          const confirmed = await confirmFileHubAction({
            title: `Убрать «${file.name}»?`,
            message: "Файл пропадёт из очереди выдачи. В workspace он останется.",
            confirmLabel: "Убрать",
            danger: true
          });
          if (!confirmed) return;
          try {
            await removeFileFromFileHub({ id: file.id, path: file.path }, getShellAgentId());
            files = files.filter((entry) => entry.id !== file.id);
            renderList();
          } catch (error) {
            console.warn("[file-hub] remove item failed", error);
            await reloadExportQueue();
          }
        })();
      });
      grip?.addEventListener("pointerdown", () => {
        row.draggable = true;
      });
      row.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", file.name);
        event.dataTransfer?.setData("application/x-shell-file-hub", JSON.stringify(file));
        event.dataTransfer.effectAllowed = "copy";
        row.classList.add("is-dragging");
      });
      row.addEventListener("dragend", (event) => {
        row.classList.remove("is-dragging");
        row.draggable = false;
        const dropEffect = String(event.dataTransfer?.dropEffect || "").toLowerCase();
        if (!dropEffect || dropEffect === "none") return;
        void (async () => {
          try {
            await removeFileFromFileHub({ id: file.id, path: file.path }, getShellAgentId());
            files = files.filter((entry) => entry.id !== file.id);
            renderList();
          } catch {
            await reloadExportQueue();
          }
        })();
      });
      listEl.appendChild(row);
    }
  }

  function readUploadTopic() {
    const key = String(topicHidden?.value || "inbox").trim();
    return FILE_HUB_TOPICS[key] || FILE_HUB_TOPICS.inbox;
  }

  function ingestFileList(fileList) {
    if (!fileList?.length) return;
    const { topic, place } = readUploadTopic();
    for (const file of fileList) {
      files.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        topic,
        place,
        size: file.size
      });
    }
    renderList();
  }

  bindInteractiveSearch({
    input: topicInput,
    suggestEl: topicSuggest,
    getOptions: (value) =>
      filterTopicOptions(value).map((item) => ({
        kind: "topic",
        key: item.key,
        label: item.topic,
        meta: item.place
      })),
    onPick: (option) => {
      if (option.key) setTopicSelection(option.key);
    },
    onInput: (value) => {
      const matches = filterTopicOptions(value);
      if (matches.length === 1 && matches[0].label.toLowerCase() === String(value).trim().toLowerCase()) {
        setTopicSelection(matches[0].key);
      }
    }
  });

  bindInteractiveSearch({
    input: searchInput,
    suggestEl: searchSuggest,
    getOptions: (value) => {
      const q = String(value || "").trim().toLowerCase();
      if (!q) return [];
      const fromFiles = files
        .filter((file) =>
          [file.name, file.topic, file.place].some((part) => String(part || "").toLowerCase().includes(q))
        )
        .slice(0, 8)
        .map((file) => ({
          kind: "buffer",
          label: file.name,
          meta: `${file.topic} · ${file.place}`,
          query: file.name
        }));
      const fromTopics = filterTopicOptions(value)
        .slice(0, 5)
        .map((item) => ({
          kind: "topic",
          label: item.topic,
          meta: item.place,
          query: item.topic
        }));
      return [...fromFiles, ...fromTopics];
    },
    onPick: (option, inputEl) => {
      inputEl.value = option.query || option.label || "";
      query = inputEl.value;
      renderList();
    },
    onInput: (value) => {
      query = value;
      renderList();
    },
    fetchRemote: fetchWorkspaceSearch
  });

  function setOpen(next) {
    open = Boolean(next);
    if (open) mountFileHubRoot(root, mainView);
    if (app) app.dataset.fileHub = open ? "1" : "0";
    document.body.classList.toggle("shell-file-hub-open", open);
    root.hidden = !open;
    openBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      void reloadExportQueue();
      searchInput?.focus({ preventScroll: true });
    }
    if (shellApp) {
      shellApp.fileHubOpen = open;
    }
    if (embedMode) {
      try {
        window.parent.postMessage({ type: "agent-cms-voice:file-hub-state", open }, "*");
      } catch {
        // ignore
      }
    }
  }

  function toggleOpen() {
    setOpen(!open);
  }

  openBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    toggleOpen();
  });

  exportRefreshBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void reloadExportQueue();
  });

  exportClearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void clearExportQueue();
  });

  for (const closeEl of root.querySelectorAll("[data-file-hub-close]")) {
    closeEl.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(false);
    });
  }

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (confirmLayer && !confirmLayer.hidden) return;
    const suggestOpen =
      (searchSuggest && !searchSuggest.hidden) || (topicSuggest && !topicSuggest.hidden);
    if (suggestOpen) {
      if (searchSuggest) searchSuggest.hidden = true;
      if (topicSuggest) topicSuggest.hidden = true;
      searchInput?.setAttribute("aria-expanded", "false");
      topicInput?.setAttribute("aria-expanded", "false");
      return;
    }
    event.preventDefault();
    setOpen(false);
  });

  for (const zone of [dropZone, root.querySelector("[data-file-hub-drop-inner]")].filter(Boolean)) {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone?.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", () => dropZone?.classList.remove("is-dragover"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone?.classList.remove("is-dragover");
      ingestFileList(event.dataTransfer?.files);
    });
  }

  renderList();
  setOpen(false);

  return {
    isOpen: () => open,
    setOpen,
    toggleOpen,
    open: () => setOpen(true),
    close: () => setOpen(false)
  };
}

export function bindShellFileHubBridge(fileHub, { embedMode = false } = {}) {
  if (!fileHub?.setOpen) return;
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:file-hub") return;
    if (embedMode && event.source !== window.parent) return;
    const action = String(data.action || "toggle").trim();
    if (action === "open") fileHub.setOpen(true);
    else if (action === "close") fileHub.setOpen(false);
    else fileHub.toggleOpen();
  });
}
