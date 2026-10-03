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

const FILE_HUB_DRAG_MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".php": "application/x-php",
  ".html": "text/html",
  ".htm": "text/html"
};

function guessFileHubMimeType(fileName) {
  const name = String(fileName || "");
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return FILE_HUB_DRAG_MIME_BY_EXT[name.slice(dot).toLowerCase()] || "application/octet-stream";
}

function sanitizeFileHubDragFileName(fileName) {
  return String(fileName || "file").replace(/[:]/g, "_").replace(/[\r\n]/g, "").trim() || "file";
}

function buildFileHubDownloadUrlDragPayload(file) {
  const path = String(file?.path || "").trim();
  if (!path) return "";
  const name = sanitizeFileHubDragFileName(file?.name || basenameFromPath(path));
  const mime = guessFileHubMimeType(name);
  const fileUrl = new URL(buildWorkspaceFilePreviewUrl(path), window.location.origin).href;
  return `${mime}:${name}:${fileUrl}`;
}

function isFileHubCompanionPanel() {
  return Boolean(window.shellCompanion?.isCompanion || window.shellCompanion?.surface === "side-panel");
}

const FILE_HUB_ATTACH_MAX_BYTES = 25 * 1024 * 1024;

async function requestFileHubAttachToCompanionTab(file) {
  const path = String(file?.path || "").trim();
  if (!path) throw new Error("Нет пути к файлу");
  const name = sanitizeFileHubDragFileName(file?.name || basenameFromPath(path));
  const response = await fetch(buildWorkspaceFilePreviewUrl(path), { credentials: "same-origin" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.size > FILE_HUB_ATTACH_MAX_BYTES) {
    throw new Error(`Файл больше ${Math.round(FILE_HUB_ATTACH_MAX_BYTES / (1024 * 1024))} МБ`);
  }
  const buffer = await blob.arrayBuffer();
  const requestId =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onResult);
      reject(new Error("Таймаут прикрепления"));
    }, 30_000);

    function onResult(event) {
      const data = event?.data;
      if (!data || data.type !== "agent-cms-voice:file-hub-attach-result") return;
      if (String(data.requestId || "") !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onResult);
      if (data.ok) resolve(data);
      else reject(new Error(String(data.error || "Не удалось прикрепить")));
    }

    window.addEventListener("message", onResult);
    window.parent.postMessage(
      {
        type: "agent-cms-voice:file-hub-attach-tab",
        requestId,
        filename: name,
        mime: blob.type || guessFileHubMimeType(name),
        buffer
      },
      "*"
    );
  });
}

/** Chromium: DownloadURL — без text/uri-list (иначе открывается ссылка вместо вложения). */
function applyFileHubGripDragDataTransfer(dt, file, { readyFile = null, companion = false } = {}) {
  if (!dt || !file) return false;
  const path = String(file.path || "").trim();
  if (!path) return false;
  const name = sanitizeFileHubDragFileName(file.name || basenameFromPath(path));
  const downloadPayload = buildFileHubDownloadUrlDragPayload(file);

  dt.effectAllowed = "copy";
  if (downloadPayload) {
    try {
      dt.setData("DownloadURL", downloadPayload);
    } catch {
      // не Chromium
    }
  }
  try {
    dt.setData("text/plain", name);
  } catch {
    // ignore
  }
  if (!companion) {
    if (readyFile && typeof dt.items?.add === "function") {
      try {
        dt.items.add(readyFile);
      } catch {
        // ignore
      }
    }
    try {
      dt.setData("application/x-shell-file-hub", JSON.stringify(file));
    } catch {
      // ignore
    }
  }
  return true;
}

const FILE_HUB_SITE_USAGE_STORAGE = "shell-file-hub-site-usage";

function normalizeFileHubSiteKey(hostnameOrUrl) {
  try {
    const host = String(hostnameOrUrl || "").includes("://")
      ? new URL(hostnameOrUrl).hostname
      : String(hostnameOrUrl || "");
    return host.replace(/^www\./i, "").trim().toLowerCase();
  } catch {
    return String(hostnameOrUrl || "").trim().toLowerCase();
  }
}

function fileHubSiteHighlightColors(siteKey) {
  const key = String(siteKey || "site");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    border: `hsla(${hue}, 72%, 52%, 0.7)`,
    background: `hsla(${hue}, 38%, 22%, 0.5)`,
    accent: `hsl(${hue}, 72%, 58%)`
  };
}

function loadFileHubSiteUsage(agentId) {
  const id = String(agentId || "main").trim() || "main";
  try {
    const raw = sessionStorage.getItem(`${FILE_HUB_SITE_USAGE_STORAGE}:${id}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFileHubSiteUsage(agentId, store) {
  const id = String(agentId || "main").trim() || "main";
  sessionStorage.setItem(`${FILE_HUB_SITE_USAGE_STORAGE}:${id}`, JSON.stringify(store || {}));
}

function markFileHubUsedOnSite(agentId, siteKey, fileId) {
  const key = normalizeFileHubSiteKey(siteKey);
  const fid = String(fileId || "").trim();
  if (!key || !fid) return;
  const store = loadFileHubSiteUsage(agentId);
  const prev = Array.isArray(store[key]) ? store[key] : [];
  if (prev.includes(fid)) return;
  store[key] = [...prev, fid];
  saveFileHubSiteUsage(agentId, store);
}

function isFileHubUsedOnSite(store, siteKey, fileId) {
  const key = normalizeFileHubSiteKey(siteKey);
  const fid = String(fileId || "").trim();
  if (!key || !fid) return false;
  const list = store?.[key];
  return Array.isArray(list) && list.includes(fid);
}

function showFileHubAttachToast(exportPane, message, kind = "info") {
  if (!exportPane || !message) return;
  let toast = exportPane.querySelector("[data-file-hub-attach-toast]");
  if (!toast) {
    toast = document.createElement("p");
    toast.className = "shell-file-hub-attach-toast";
    toast.dataset.fileHubAttachToast = "";
    exportPane.appendChild(toast);
  }
  toast.classList.toggle("is-error", kind === "error");
  toast.classList.toggle("is-success", kind === "success");
  toast.textContent = String(message);
  toast.hidden = false;
  window.clearTimeout(showFileHubAttachToast._timer);
  showFileHubAttachToast._timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 5200);
}

function ensureFileHubCompanionSiteUi(exportPane) {
  if (!exportPane || !isFileHubCompanionPanel()) return;
  if (!exportPane.querySelector("[data-file-hub-site-chip]")) {
    const chip = document.createElement("p");
    chip.className = "shell-file-hub-site-chip";
    chip.dataset.fileHubSiteChip = "";
    chip.hidden = true;
    const searchWrap = exportPane.querySelector(".shell-file-hub-search-wrap");
    if (searchWrap) exportPane.insertBefore(chip, searchWrap);
    else exportPane.prepend(chip);
  }
  if (!exportPane.querySelector("[data-file-hub-companion-notice]")) {
    const notice = document.createElement("p");
    notice.className = "shell-file-hub-companion-notice";
    notice.dataset.fileHubCompanionNotice = "";
    notice.textContent =
      "Кнопка 📎 — прикрепить файл на открытую вкладку (mail.ru: сначала «Прикрепить» в письме). Подсветка — уже переданные на этот сайт.";
    const chip = exportPane.querySelector("[data-file-hub-site-chip]");
    if (chip?.nextSibling) exportPane.insertBefore(notice, chip.nextSibling);
    else exportPane.prepend(notice);
  }
}

function updateFileHubSiteChip(exportPane, siteKey, siteLabel) {
  const chip = exportPane?.querySelector("[data-file-hub-site-chip]");
  if (!chip) return;
  const key = normalizeFileHubSiteKey(siteKey);
  if (!key || !isFileHubCompanionPanel()) {
    chip.hidden = true;
    return;
  }
  const colors = fileHubSiteHighlightColors(key);
  chip.hidden = false;
  chip.style.setProperty("--file-hub-site-accent", colors.accent);
  chip.style.borderColor = colors.border;
  chip.innerHTML = `<span class="shell-file-hub-site-chip-dot" aria-hidden="true"></span> Сайт: <strong>${escapeHtml(
    siteLabel || key
  )}</strong> — цвет подсветки для переданных файлов`;
}

async function fetchWorkspaceFileForDrag(meta) {
  const path = String(meta?.path || "").trim();
  const name = String(meta?.name || basenameFromPath(path) || "file").trim();
  if (!path) throw new Error("missing workspace path");
  const response = await fetch(buildWorkspaceFilePreviewUrl(path), { credentials: "same-origin" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const type =
    blob.type && blob.type !== "application/octet-stream" ? blob.type : guessFileHubMimeType(name);
  return new File([blob], name, { type, lastModified: Date.now() });
}

function fillFileHubItemVisual(container, file, iconSize = 28) {
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
          width: iconSize,
          height: iconSize
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
      width: iconSize,
      height: iconSize
    });
  } else {
    container.textContent = "📎";
  }
}

function fillFileHubSuggestVisual(container, option) {
  if (!container) return;
  const kind = String(option?.kind || "");
  if (kind === "topic") {
    container.classList.add("shell-file-hub-item-visual--icon");
    container.textContent = "📁";
    container.setAttribute("aria-hidden", "true");
    return;
  }
  const filePath = String(option.filePath || option.path || "").trim();
  const fileName = String(option.label || basenameFromPath(filePath) || "").trim();
  fillFileHubItemVisual(container, { path: filePath, name: fileName }, 22);
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
  debounceMs = 280,
  withFileVisual = false
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
      if (withFileVisual) {
        const visual = document.createElement("span");
        visual.className = "shell-file-hub-item-visual shell-file-hub-suggest-item-visual";
        fillFileHubSuggestVisual(visual, option);
        const body = document.createElement("span");
        body.className = "shell-file-hub-suggest-item-body";
        body.innerHTML = `
          <span class="shell-file-hub-suggest-item-label">${escapeHtml(option.label)}</span>
          ${option.meta ? `<span class="shell-file-hub-suggest-item-meta">${escapeHtml(option.meta)}</span>` : ""}
        `;
        btn.append(visual, body);
      } else {
        btn.innerHTML = `
          <span class="shell-file-hub-suggest-item-label">${escapeHtml(option.label)}</span>
          ${option.meta ? `<span class="shell-file-hub-suggest-item-meta">${escapeHtml(option.meta)}</span>` : ""}
        `;
      }
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
  const exportPane = root?.querySelector(".shell-file-hub-pane--export");
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
  ensureFileHubCompanionSiteUi(exportPane);
  const confirmFileHubAction = bindFileHubConfirm(root);

  let files = [];
  let query = "";
  let open = false;
  let queueLoading = false;
  let activeSiteKey = "";
  let activeSiteLabel = "";
  let siteUsageStore = loadFileHubSiteUsage(getShellAgentId());

  function setActiveCompanionSite(payload = {}) {
    activeSiteKey = normalizeFileHubSiteKey(payload.hostname || payload.url || "");
    activeSiteLabel = String(payload.title || payload.hostname || activeSiteKey || "").trim();
    updateFileHubSiteChip(exportPane, activeSiteKey, activeSiteLabel);
    if (open) renderList();
  }

  if (!window.__shellFileHubSiteMessageBound) {
    window.__shellFileHubSiteMessageBound = true;
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "agent-cms-voice:companion-active-tab") return;
      if (!isFileHubCompanionPanel()) return;
      setActiveCompanionSite(data);
    });
  }
  /** @type {Map<string, File | Promise<File | null>>} */
  const dragFileById = new Map();

  function getResolvedDragFile(fileId) {
    const value = dragFileById.get(String(fileId || ""));
    return value instanceof File ? value : null;
  }

  function prefetchDragFiles(fileItems) {
    const keep = new Set();
    for (const file of fileItems) {
      const id = String(file?.id || "").trim();
      if (!id) continue;
      keep.add(id);
      if (dragFileById.get(id) instanceof File) continue;
      if (dragFileById.has(id)) continue;
      const promise = fetchWorkspaceFileForDrag(file)
        .then((ready) => {
          dragFileById.set(id, ready);
          return ready;
        })
        .catch((error) => {
          dragFileById.delete(id);
          console.warn("[file-hub] drag prefetch failed", file?.name, error);
          return null;
        });
      dragFileById.set(id, promise);
    }
    for (const id of dragFileById.keys()) {
      if (!keep.has(id)) dragFileById.delete(id);
    }
  }

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
      prefetchDragFiles(files);
    } catch (error) {
      files = [];
      dragFileById.clear();
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
      dragFileById.clear();
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
      grip.draggable = true;
      grip.dataset.downloadurl = buildFileHubDownloadUrlDragPayload(file);
      grip.title = "Перетащите за ручку в окно открытого сайта (почта, форма, чат)";
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
      if (isFileHubCompanionPanel()) {
        const attachBtn = document.createElement("button");
        attachBtn.type = "button";
        attachBtn.className = "shell-file-hub-item-attach";
        attachBtn.title = "Прикрепить на открытую вкладку (mail.ru и др.)";
        attachBtn.setAttribute("aria-label", "Прикрепить на открытую вкладку");
        attachBtn.textContent = "📎";
        attachBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          attachBtn.disabled = true;
          void requestFileHubAttachToCompanionTab(file)
            .then(() => {
              const siteKey = activeSiteKey;
              if (siteKey) {
                markFileHubUsedOnSite(getShellAgentId(), siteKey, file.id);
                siteUsageStore = loadFileHubSiteUsage(getShellAgentId());
              }
              renderList();
              attachBtn.title = "Прикреплено на страницу";
              showFileHubAttachToast(exportPane, `«${file.name}» отправлен на вкладку`, "success");
            })
            .catch((error) => {
              console.warn("[file-hub] attach to tab failed", error);
              const msg = String(error?.message || error);
              attachBtn.title = msg;
              showFileHubAttachToast(exportPane, msg, "error");
            })
            .finally(() => {
              attachBtn.disabled = false;
            });
        });
        trailing.appendChild(attachBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "shell-file-hub-item-remove";
      removeBtn.title = "Убрать из списка";
      removeBtn.setAttribute("aria-label", "Убрать из списка");
      trailing.appendChild(removeBtn);

      const siteKey = activeSiteKey || normalizeFileHubSiteKey(window.location.hostname);
      if (siteKey && isFileHubUsedOnSite(siteUsageStore, siteKey, file.id)) {
        row.classList.add("shell-file-hub-item--used-on-site");
        const colors = fileHubSiteHighlightColors(siteKey);
        row.style.setProperty("--file-hub-site-border", colors.border);
        row.style.setProperty("--file-hub-site-bg", colors.background);
        row.title = `Уже передавали на ${activeSiteLabel || siteKey}`;
      }

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
      grip.addEventListener("pointerdown", () => {
        grip.dataset.downloadurl = buildFileHubDownloadUrlDragPayload(file);
        prefetchDragFiles([file]);
      });
      removeBtn.addEventListener("dragstart", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      grip.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        const dt = event.dataTransfer;
        if (!dt) return;
        const ready = getResolvedDragFile(file.id);
        const ok = applyFileHubGripDragDataTransfer(dt, file, {
          readyFile: ready,
          companion: isFileHubCompanionPanel()
        });
        if (!ok) {
          event.preventDefault();
          grip.title = "Нет пути к файлу — обновите список";
          return;
        }
        row.classList.add("is-dragging");
      });
      grip.addEventListener("dragend", (event) => {
        row.classList.remove("is-dragging");
        const dropEffect = String(event.dataTransfer?.dropEffect || "").toLowerCase();
        if (!dropEffect || dropEffect === "none") return;
        const siteKey =
          activeSiteKey || (isFileHubCompanionPanel() ? "" : normalizeFileHubSiteKey(window.location.hostname));
        if (!siteKey) return;
        markFileHubUsedOnSite(getShellAgentId(), siteKey, file.id);
        siteUsageStore = loadFileHubSiteUsage(getShellAgentId());
        renderList();
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
          filePath: file.path,
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
    fetchRemote: fetchWorkspaceSearch,
    withFileVisual: true
  });

  function setOpen(next) {
    open = Boolean(next);
    if (open) mountFileHubRoot(root, mainView);
    if (app) app.dataset.fileHub = open ? "1" : "0";
    document.body.classList.toggle("shell-file-hub-open", open);
    root.hidden = !open;
    openBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      ensureFileHubCompanionSiteUi(exportPane);
      updateFileHubSiteChip(exportPane, activeSiteKey, activeSiteLabel);
      siteUsageStore = loadFileHubSiteUsage(getShellAgentId());
      void reloadExportQueue();
      searchInput?.focus({ preventScroll: true });
    }
    if (shellApp) {
      shellApp.fileHubOpen = open;
    }
    if (embedMode || isFileHubCompanionPanel()) {
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
