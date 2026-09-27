/** Заглушка «Файлообменник» — локальный буфер файлов (mock). */

const MOCK_SEED = [
  { id: "1", name: "dogovor-2026.pdf", topic: "Договоры", place: "workspace/Юридическое/" },
  { id: "2", name: "screenshot-price.png", topic: "Скриншоты", place: "inbox/загрузки/" },
  { id: "3", name: "presentation-draft.pptx", topic: "Презентации", place: "workspace/Маркетинг/" }
];

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

export function initShellFileHub({ shellApp, nodes, embedMode = false } = {}) {
  const root = nodes?.fileHub || document.getElementById("shell-file-hub");
  const openBtn = nodes?.fileHubOpen || document.getElementById("shell-file-hub-open");
  const dropZone = root?.querySelector("[data-file-hub-drop]");
  const searchInput = root?.querySelector("[data-file-hub-search]");
  const listEl = root?.querySelector("[data-file-hub-list]");
  const emptyEl = root?.querySelector("[data-file-hub-empty]");
  const app = nodes?.shellApp || document.getElementById("shell-app");
  const mainView = nodes?.mainView || document.getElementById("shell-main-view");

  if (!root) return {};

  mountFileHubRoot(root, mainView);

  let files = MOCK_SEED.map((item) => ({ ...item }));
  let query = "";
  let open = false;

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
      row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
      listEl.appendChild(row);
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ingestFileList(fileList) {
    if (!fileList?.length) return;
    for (const file of fileList) {
      files.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        topic: "Inbox",
        place: "файлообменник/сейчас",
        size: file.size
      });
    }
    renderList();
  }

  function setOpen(next) {
    open = Boolean(next);
    if (open) mountFileHubRoot(root, mainView);
    if (app) app.dataset.fileHub = open ? "1" : "0";
    document.body.classList.toggle("shell-file-hub-open", open);
    root.hidden = !open;
    openBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
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
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  });

  searchInput?.addEventListener("input", () => {
    query = searchInput.value;
    renderList();
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
