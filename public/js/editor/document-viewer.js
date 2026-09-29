(function initDocumentViewer(global) {
  const PREVIEW_HANDLERS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".xls": "xlsx",
    ".xlsx": "xlsx",
    ".txt": "text",
    ".md": "text"
  };

  const FALLBACK_EXTENSIONS = new Set([".doc", ".ppt", ".pptx"]);

  let modalNode = null;
  let titleNode = null;
  let metaNode = null;
  let loadingNode = null;
  let iframeNode = null;
  let contentNode = null;
  let fallbackNode = null;
  let externalBtn = null;
  let closeBtn = null;

  let currentState = null;
  let blobUrl = null;
  let escapeHandler = null;

  function getExtension(fileName) {
    const value = String(fileName || "").trim().toLowerCase();
    const dot = value.lastIndexOf(".");
    return dot >= 0 ? value.slice(dot) : "";
  }

  function isPreviewSupported(fileName) {
    const ext = getExtension(fileName);
    return Boolean(PREVIEW_HANDLERS[ext]);
  }

  function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function revokeBlobUrl() {
    if (!blobUrl) return;
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }

  function resetViewerBody() {
    revokeBlobUrl();
    if (loadingNode) loadingNode.classList.remove("hidden");
    if (iframeNode) {
      iframeNode.classList.add("hidden");
      iframeNode.removeAttribute("src");
    }
    if (contentNode) {
      contentNode.classList.add("hidden");
      contentNode.innerHTML = "";
      contentNode.className = "document-viewer-content hidden";
    }
    if (fallbackNode) {
      fallbackNode.classList.add("hidden");
      fallbackNode.innerHTML = "";
    }
  }

  function showFallback(message, details = "") {
    if (loadingNode) loadingNode.classList.add("hidden");
    if (fallbackNode) {
      fallbackNode.classList.remove("hidden");
      fallbackNode.innerHTML = "";
      const lead = document.createElement("p");
      lead.className = "document-viewer-fallback-lead";
      lead.textContent = message;
      fallbackNode.appendChild(lead);
      if (details) {
        const note = document.createElement("p");
        note.className = "document-viewer-fallback-note";
        note.textContent = details;
        fallbackNode.appendChild(note);
      }
      const action = document.createElement("button");
      action.type = "button";
      action.className = "ghost-btn document-viewer-fallback-btn";
      action.textContent = "Открыть в новой вкладке";
      action.addEventListener("click", () => {
        if (currentState?.onExternal) currentState.onExternal();
      });
      fallbackNode.appendChild(action);
    }
  }

  async function fetchAssetBuffer(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Не удалось загрузить файл (HTTP ${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    const sizeHeader = response.headers.get("content-length");
    return {
      buffer,
      size: sizeHeader ? Number(sizeHeader) : buffer.byteLength
    };
  }

  function renderPdf(buffer) {
    blobUrl = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
    if (loadingNode) loadingNode.classList.add("hidden");
    if (iframeNode) {
      iframeNode.src = blobUrl;
      iframeNode.classList.remove("hidden");
    }
  }

  async function renderDocx(buffer) {
    if (typeof global.mammoth === "undefined") {
      throw new Error("Библиотека mammoth не загружена");
    }
    const result = await global.mammoth.convertToHtml({ arrayBuffer: buffer });
    if (loadingNode) loadingNode.classList.add("hidden");
    if (contentNode) {
      contentNode.className = "document-viewer-content document-viewer-content--docx file-content-preview";
      contentNode.innerHTML = result.value || "<p><em>Документ пуст</em></p>";
      contentNode.classList.remove("hidden");
    }
    if (result.messages?.length) {
      console.info("mammoth:", result.messages);
    }
  }

  function renderSpreadsheet(buffer) {
    if (typeof global.XLSX === "undefined") {
      throw new Error("Библиотека xlsx не загружена");
    }
    const workbook = global.XLSX.read(buffer, { type: "array" });
    const sheetNames = workbook.SheetNames || [];
    if (!sheetNames.length) {
      throw new Error("В таблице нет листов");
    }

    if (loadingNode) loadingNode.classList.add("hidden");
    if (!contentNode) return;

    contentNode.className = "document-viewer-content document-viewer-content--sheet";
    contentNode.innerHTML = "";
    contentNode.classList.remove("hidden");

    if (sheetNames.length > 1) {
      const tabs = document.createElement("div");
      tabs.className = "document-viewer-sheet-tabs";
      tabs.setAttribute("role", "tablist");
      contentNode.appendChild(tabs);

      const panels = document.createElement("div");
      panels.className = "document-viewer-sheet-panels";
      contentNode.appendChild(panels);

      sheetNames.forEach((sheetName, index) => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = `document-viewer-sheet-tab${index === 0 ? " is-active" : ""}`;
        tab.textContent = sheetName;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
        tabs.appendChild(tab);

        const panel = document.createElement("div");
        panel.className = `document-viewer-sheet-panel${index === 0 ? "" : " hidden"}`;
        panel.setAttribute("role", "tabpanel");
        const wrap = document.createElement("div");
        wrap.className = "document-viewer-sheet-wrap";
        wrap.innerHTML = global.XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], { editable: false });
        panel.appendChild(wrap);
        panels.appendChild(panel);

        tab.addEventListener("click", () => {
          for (const btn of tabs.querySelectorAll(".document-viewer-sheet-tab")) {
            btn.classList.remove("is-active");
            btn.setAttribute("aria-selected", "false");
          }
          tab.classList.add("is-active");
          tab.setAttribute("aria-selected", "true");
          for (const item of panels.querySelectorAll(".document-viewer-sheet-panel")) {
            item.classList.add("hidden");
          }
          panel.classList.remove("hidden");
        });
      });
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "document-viewer-sheet-wrap";
    wrap.innerHTML = global.XLSX.utils.sheet_to_html(workbook.Sheets[sheetNames[0]], { editable: false });
    contentNode.appendChild(wrap);
  }

  function renderText(buffer) {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const text = decoder.decode(buffer);
    if (loadingNode) loadingNode.classList.add("hidden");
    if (contentNode) {
      contentNode.className = "document-viewer-content document-viewer-content--text";
      const pre = document.createElement("pre");
      pre.className = "document-viewer-text";
      pre.textContent = text;
      contentNode.innerHTML = "";
      contentNode.appendChild(pre);
      contentNode.classList.remove("hidden");
    }
  }

  async function renderPreview(fileName, url) {
    const ext = getExtension(fileName);
    const handler = PREVIEW_HANDLERS[ext];

    if (FALLBACK_EXTENSIONS.has(ext)) {
      showFallback(
        "Встроенный просмотр для этого формата пока недоступен.",
        "Откройте файл в новой вкладке или в системном приложении."
      );
      return;
    }

    if (!handler) {
      showFallback(
        "Просмотр этого типа файла не поддерживается.",
        "Используйте кнопку «В новой вкладке»."
      );
      return;
    }

    const { buffer, size } = await fetchAssetBuffer(url);
    if (metaNode && size) {
      metaNode.textContent = formatFileSize(size);
    }

    if (handler === "pdf") {
      renderPdf(buffer);
      return;
    }
    if (handler === "docx") {
      await renderDocx(buffer);
      return;
    }
    if (handler === "xlsx") {
      renderSpreadsheet(buffer);
      return;
    }
    if (handler === "text") {
      renderText(buffer);
    }
  }

  function close() {
    if (!modalNode) return;
    modalNode.classList.add("hidden");
    document.body.classList.remove("document-viewer-open");
    resetViewerBody();
    currentState = null;
    if (escapeHandler) {
      document.removeEventListener("keydown", escapeHandler);
      escapeHandler = null;
    }
  }

  function bindUi() {
    modalNode = document.getElementById("document-viewer-modal");
    titleNode = document.getElementById("document-viewer-title");
    metaNode = document.getElementById("document-viewer-meta");
    loadingNode = document.getElementById("document-viewer-loading");
    iframeNode = document.getElementById("document-viewer-iframe");
    contentNode = document.getElementById("document-viewer-content");
    fallbackNode = document.getElementById("document-viewer-fallback");
    externalBtn = document.getElementById("document-viewer-external-btn");
    closeBtn = document.getElementById("document-viewer-close-btn");

    closeBtn?.addEventListener("click", close);
    externalBtn?.addEventListener("click", () => {
      if (currentState?.onExternal) currentState.onExternal();
    });
    modalNode?.addEventListener("click", (event) => {
      if (event.target === modalNode) close();
    });
  }

  async function open(options = {}) {
    const url = String(options.url || "").trim();
    const fileName = String(options.fileName || "").trim() || "Документ";
    if (!url) return false;

    if (!modalNode) bindUi();
    if (!modalNode) return false;

    currentState = {
      url,
      fileName,
      onExternal: typeof options.onExternal === "function" ? options.onExternal : null
    };

    resetViewerBody();
    if (titleNode) titleNode.textContent = fileName;
    if (metaNode) metaNode.textContent = getExtension(fileName).replace(".", "").toUpperCase() || "FILE";
    modalNode.classList.remove("hidden");
    document.body.classList.add("document-viewer-open");

    escapeHandler = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", escapeHandler);

    try {
      await renderPreview(fileName, url);
    } catch (error) {
      console.error("document-viewer:", error);
      showFallback(
        "Не удалось отобразить документ.",
        String(error?.message || error || "Неизвестная ошибка")
      );
    }

    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }

  global.DocumentViewer = {
    open,
    close,
    isPreviewSupported,
    getExtension
  };
})(window);
