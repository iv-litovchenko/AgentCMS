/** «Файлообменник» — выдача из .agent-cms/state/file-hub-queue.json; загрузка в inbox — локальный mock. */

import { bindShellHintsIn } from "@shell/hints";
import { fetchFileHubQueue, removeFileFromFileHub } from "@js/file-hub-queue";

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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mountFileHubRoot(root, mainView) {
  const host = mainView || document.getElementById("shell-main-view");
  if (!root || !host || root.parentElement === host) return;
  host.appendChild(root);
}

function getShellAgentId() {
  try {
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "shell" && parts[1]) return decodeURIComponent(parts[1]);
    const fromQuery = new URLSearchParams(location.search).get("agent");
    if (fromQuery) return fromQuery.trim();
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
    const response = await fetch(url.toString());
    if (!response.ok) return [];
    const data = await response.json();
    return (Array.isArray(data.results) ? data.results : []).map((row) => ({
      kind: "workspace",
      label: String(row.name || row.title || row.path || "").trim(),
      meta: String(row.path || row.folderPath || "").trim(),
      query: q
    }));
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
    const local = getOptions(input.value);
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
  const app = nodes?.shellApp || document.getElementById("shell-app");
  const mainView = nodes?.mainView || document.getElementById("shell-main-view");

  if (!root) return {};

  mountFileHubRoot(root, mainView);
  bindShellHintsIn(root);

  let files = [];
  let query = "";
  let open = false;
  let queueLoading = false;

  async function reloadExportQueue() {
    if (queueLoading) return;
    queueLoading = true;
    try {
      const data = await fetchFileHubQueue(getShellAgentId());
      files = (Array.isArray(data.items) ? data.items : []).map((item) => ({ ...item }));
    } catch {
      files = [];
    } finally {
      queueLoading = false;
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
    for (const file of items) {
      const row = document.createElement("li");
      row.className = "shell-file-hub-item";
      row.draggable = true;
      row.dataset.fileId = file.id;
      row.innerHTML = `
        <span class="shell-file-hub-item-grip" aria-hidden="true">⠿</span>
        <span class="shell-file-hub-item-main">
          <span class="shell-file-hub-item-name">${escapeHtml(file.name)}</span>
          <span class="shell-file-hub-item-meta">${escapeHtml(file.topic)} · ${escapeHtml(file.place)}</span>
        </span>
        <span class="shell-file-hub-item-size">${escapeHtml(formatFileSize(file.size))}</span>
      `;
      row.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", file.name);
        event.dataTransfer?.setData("application/x-shell-file-hub", JSON.stringify(file));
        event.dataTransfer.effectAllowed = "copyMove";
        row.classList.add("is-dragging");
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("is-dragging");
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

  for (const closeEl of root.querySelectorAll("[data-file-hub-close]")) {
    closeEl.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(false);
    });
  }

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
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
