/**
 * Select Element — выбор блока на странице CMS для вставки текста в Agent CMS Voice.
 */
(function initCmsPagePicker() {
  const MESSAGE_SET = "agent-cms-voice:page-picker-set";
  const MESSAGE_STATE = "agent-cms-voice:page-picker-state";
  const MESSAGE_INSERT = "agent-cms-voice:compose-insert";
  const MESSAGE_SNAPSHOT_REQUEST = "agent-cms-voice:page-snapshot-request";
  const MESSAGE_SNAPSHOT_RESPONSE = "agent-cms-voice:page-snapshot-response";
  const MAX_TEXT_LENGTH = 12000;

  const CMS_PICKER_BLOCK_SELECTOR = [
    window.PagePickerExtract?.DEFAULT_PICKER_BLOCK_SELECTOR || "",
    ".menu-item",
    ".menu-folder",
    ".nav-book-toc-link",
    ".nav-book-toc-folder-head",
    ".node-navigation-memory-card",
    ".node-navigation-panel",
    ".node-navigation-hero",
    ".doc-body-main",
    ".editor-surface",
    ".file-content-input",
    ".node-overview-content"
  ]
    .filter(Boolean)
    .join(", ");

  const discussShellIframeNode = document.getElementById("discuss-shell-iframe");

  let active = false;
  let rootNode = null;
  let highlightNode = null;
  let hintNode = null;
  let highlightTagNode = null;
  let hoveredTarget = null;

  function getVoicePostMessageOrigin() {
    const src = discussShellIframeNode?.getAttribute("src") || discussShellIframeNode?.src || "";
    if (!src) return "*";
    try {
      return new URL(src, window.location.href).origin;
    } catch {
      return "*";
    }
  }

  function isVoiceIframeMessage(event) {
    const iframe = discussShellIframeNode;
    return Boolean(iframe?.contentWindow && event.source === iframe.contentWindow);
  }

  function postToVoiceIframe(message) {
    if (!discussShellIframeNode?.contentWindow) return;
    discussShellIframeNode.contentWindow.postMessage(message, getVoicePostMessageOrigin());
  }

  function insertIntoVoiceCompose(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return false;
    const payload = { type: MESSAGE_INSERT, text: trimmed, join: "newline" };
    if (window.AgentDiscussPanel?.insertIntoCompose) {
      return window.AgentDiscussPanel.insertIntoCompose(trimmed, { join: "newline" });
    }
    postToVoiceIframe(payload);
    return true;
  }

  function syncPickerState(nextActive) {
    active = Boolean(nextActive);
    document.body.classList.toggle("is-cms-page-picker-active", active);
    rootNode?.classList.toggle("is-active", active);
    if (!active) {
      hoveredTarget = null;
      hideHighlight();
    }
    postToVoiceIframe({ type: MESSAGE_STATE, active });
  }

  function isPickerExcluded(el) {
    if (!el) return true;
    if (el.closest("#discuss-aside, .cms-page-picker-root, script, style, noscript, iframe")) {
      return true;
    }
    return false;
  }

  function normalizePickerText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePickerTextPreservingLines(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractPickerText(el) {
    if (!el) return "";
    let text = "";
    try {
      text = el.innerText || el.textContent || "";
    } catch {
      text = el.textContent || "";
    }
    text = normalizePickerTextPreservingLines(text);
    if (!text) return "";
    if (text.length > MAX_TEXT_LENGTH) {
      return `${text.slice(0, MAX_TEXT_LENGTH).trimEnd()}…`;
    }
    return text;
  }

  function elementAtPoint(x, y) {
    return (
      window.PagePickerExtract?.deepElementFromPoint?.(x, y) ||
      document.elementFromPoint(x, y)
    );
  }

  function resolvePickerTarget(raw) {
    return (
      window.PagePickerExtract?.resolveTextBlockTarget?.(raw, {
        isExcluded: isPickerExcluded,
        extractText: extractPickerText,
        isFormField: (el) => window.PagePickerExtract?.isFormField?.(el),
        blockSelector: CMS_PICKER_BLOCK_SELECTOR
      }) || null
    );
  }

  function extractPickerPayload(el) {
    const special = window.PagePickerExtract?.extractPickerInsertValue?.(el);
    if (special) return special;
    return extractPickerText(el);
  }

  function describePickerElement(el) {
    return window.PagePickerExtract?.describePickerElement?.(el) || "";
  }

  function hideHighlight() {
    if (!highlightNode) return;
    highlightNode.style.display = "none";
    if (highlightTagNode) {
      highlightTagNode.hidden = true;
      highlightTagNode.textContent = "";
    }
  }

  function showHighlight(target) {
    if (!highlightNode || !target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      hideHighlight();
      return;
    }
    highlightNode.style.display = "block";
    highlightNode.style.top = `${Math.max(0, rect.top)}px`;
    highlightNode.style.left = `${Math.max(0, rect.left)}px`;
    highlightNode.style.width = `${Math.max(0, rect.width)}px`;
    highlightNode.style.height = `${Math.max(0, rect.height)}px`;

    const label = describePickerElement(target);
    if (highlightTagNode) {
      if (label) {
        highlightTagNode.textContent = label;
        highlightTagNode.hidden = false;
      } else {
        highlightTagNode.hidden = true;
        highlightTagNode.textContent = "";
      }
    }
  }

  function onPointerMove(event) {
    if (!active) return;
    const raw = elementAtPoint(event.clientX, event.clientY);
    const target = resolvePickerTarget(raw);
    if (target === hoveredTarget) return;
    hoveredTarget = target;
    if (target) showHighlight(target);
    else hideHighlight();
  }

  function onPointerDown(event) {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onClick(event) {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();

    const raw = elementAtPoint(event.clientX, event.clientY);
    const target = resolvePickerTarget(raw);
    const text = extractPickerPayload(target);
    if (text) insertIntoVoiceCompose(text);
  }

  function onKeyDown(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      syncPickerState(false);
    }
  }

  function ensureDom() {
    if (rootNode) return;
    rootNode = document.createElement("div");
    rootNode.className = "cms-page-picker-root";
    rootNode.setAttribute("aria-hidden", "true");

    hintNode = document.createElement("div");
    hintNode.className = "cms-page-picker-hint";
    hintNode.textContent = "Наведите на текст, ссылку или картинку · Esc или ⌖ — выключить";

    highlightNode = document.createElement("div");
    highlightNode.className = "cms-page-picker-highlight";

    highlightTagNode = document.createElement("span");
    highlightTagNode.className = "cms-page-picker-highlight-tag";
    highlightTagNode.hidden = true;
    highlightNode.append(highlightTagNode);

    rootNode.append(hintNode, highlightNode);
    document.body.appendChild(rootNode);
  }

  function collectHostPageSnapshotInline() {
    if (window.PageSnapshot?.collect) return window.PageSnapshot.collect();

    function readMeta(name) {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return String(el?.getAttribute("content") || "").trim();
    }
    function readFaviconHref() {
      const icon = document.querySelector(
        'link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]'
      );
      if (!icon) return null;
      try {
        return new URL(icon.getAttribute("href") || "", location.href).href;
      } catch {
        return String(icon.getAttribute("href") || "").trim();
      }
    }
    function readCanonicalHref() {
      const link = document.querySelector('link[rel="canonical"][href]');
      if (!link) return "";
      try {
        return new URL(link.getAttribute("href") || "", location.href).href;
      } catch {
        return "";
      }
    }

    let url = location.href;
    let hostname = "";
    let pathname = "";
    try {
      const parsed = new URL(url);
      url = parsed.href;
      hostname = parsed.hostname;
      pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      // ignore
    }

    const title = String(document.title || "").trim();
    const description =
      readMeta("og:description") || readMeta("description") || readMeta("twitter:description");
    const siteName = readMeta("og:site_name") || hostname;
    const imageUrl = readMeta("og:image") || readMeta("twitter:image");
    const isCms = Boolean(
      document.getElementById("discuss-aside") ||
        document.getElementById("app-root") ||
        location.port === "3443" ||
        location.port === "3000"
    );

    return {
      url,
      hostname,
      pathname,
      title: title || hostname || url,
      description,
      siteName,
      faviconUrl: readFaviconHref() || "",
      canonicalUrl: readCanonicalHref() || url,
      imageUrl,
      source: isCms ? "agent-cms" : "host-document"
    };
  }

  function bindPicker() {
    ensureDom();
    document.addEventListener("mousemove", onPointerMove, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    window.addEventListener("message", (event) => {
      if (!isVoiceIframeMessage(event)) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === MESSAGE_SNAPSHOT_REQUEST) {
        const requestId = String(data.requestId || "").trim();
        if (!requestId) return;
        const snapshot = collectHostPageSnapshotInline();
        postToVoiceIframe({
          type: MESSAGE_SNAPSHOT_RESPONSE,
          requestId,
          ok: Boolean(snapshot),
          snapshot
        });
        return;
      }
      if (data.type !== MESSAGE_SET) return;
      syncPickerState(Boolean(data.active));
    });
  }

  bindPicker();

  window.AgentCmsPagePicker = {
    setActive: syncPickerState,
    isActive: () => active
  };
})();
