/**
 * User guides markdown preview (app-docs) — image URLs like editor documentation modals.
 */
(function initUserDocsMarkdownPreview(global) {
  const DOCS_AGENT_ID = "0-ws-core";
  const DOCS_TOPIC_DIR = "awn-topics/dokumentatsii";
  const DOCS_MAIN_SLOT = "awn-storage/main";
  const PLATFORM_GLOBAL_PREFIX = "platform-global:";
  const THUMB_MAX = 720;

  function buildDocsApiUrl(apiPath, params = {}) {
    const search = new URLSearchParams({ agent: DOCS_AGENT_ID, workspace: DOCS_AGENT_ID });
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") search.set(key, String(value));
    }
    const path = String(apiPath || "").trim();
    return `${path}?${search.toString()}`;
  }

  function resolveGuideNodePath(guideRelPath = "") {
    const rel = String(guideRelPath || "").trim().replace(/\\/g, "/");
    if (rel.startsWith(PLATFORM_GLOBAL_PREFIX)) {
      return `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}/opisanie-sistemy-agent-cms.md`;
    }
    if (rel.startsWith(`${DOCS_TOPIC_DIR}/`)) return rel;
    if (rel) return `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}/${rel.replace(/^\/+/, "")}`;
    return `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}/opisanie-sistemy-agent-cms.md`;
  }

  function resolveGuideManifestPath(guideRelPath = "") {
    const nodePath = resolveGuideNodePath(guideRelPath);
    const normalized = nodePath.replace(/\\/g, "/");
    const marker = "/awn-storage/";
    const idx = normalized.toLowerCase().indexOf(marker);
    if (idx >= 0) return `${normalized.slice(0, idx)}/manifest.md`;
    return `${DOCS_TOPIC_DIR}/manifest.md`;
  }

  function normalizeFileRef(fileRef) {
    const raw = String(fileRef || "").trim().replace(/\\/g, "/");
    if (!raw) return "";
    const stack = [];
    for (const part of raw.split("/")) {
      if (part === "..") stack.pop();
      else if (part && part !== ".") stack.push(part);
    }
    return stack.join("/");
  }

  function appendAgentToApiUrl(url) {
    const raw = String(url || "").trim();
    if (!raw.startsWith("/api/")) return raw;
    try {
      const parsed = new URL(raw, global.location?.origin || "http://localhost");
      parsed.searchParams.set("agent", DOCS_AGENT_ID);
      parsed.searchParams.set("workspace", DOCS_AGENT_ID);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return raw;
    }
  }

  function appendThumbToApiUrl(url, max = THUMB_MAX) {
    const raw = String(url || "").trim();
    if (!raw || /[?&]thumb=1(?:&|$)/.test(raw)) return raw;
    try {
      const parsed = new URL(raw, global.location?.origin || "http://localhost");
      const pathname = parsed.pathname.replace(/\/+$/, "");
      if (
        !pathname.endsWith("/api/media/file") &&
        !pathname.endsWith("/api/preview/image") &&
        !pathname.endsWith("/api/public/images/file")
      ) {
        return appendAgentToApiUrl(raw);
      }
      parsed.searchParams.set("thumb", "1");
      parsed.searchParams.set("max", String(max));
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      const joiner = raw.includes("?") ? "&" : "?";
      return `${appendAgentToApiUrl(raw)}${joiner}thumb=1&max=${encodeURIComponent(String(max))}`;
    }
  }

  function resolveGuideImageSrc(src, guideRelPath = "") {
    const raw = String(src || "").trim();
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
    if (raw.startsWith("/api/")) return appendAgentToApiUrl(raw);

    const manifestPath = resolveGuideManifestPath(guideRelPath);
    let file = normalizeFileRef(raw.replace(/^\/+/, ""));

    if (/^assets\//i.test(file) || /^(pasted|preview|attachments)\//i.test(file)) {
      return appendAgentToApiUrl(
        buildDocsApiUrl("/api/media/file", { path: manifestPath, file, contextPath: manifestPath })
      );
    }

    if (/^awn-storage\//i.test(file)) {
      const parts = file.split("/");
      if (parts.length >= 3) file = parts.slice(2).join("/");
    }

    if (file && !file.includes("..")) {
      return appendAgentToApiUrl(
        buildDocsApiUrl("/api/media/file", { path: manifestPath, file, contextPath: manifestPath })
      );
    }

    return raw;
  }

  const HIGHLIGHT_TONES = new Set(["yellow", "red", "green", "blue", "gray", "orange", "purple"]);

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applyGuideMarkdownPlugins(md) {
    if (!md?.inline?.ruler) return md;
    md.inline.ruler.before("emphasis", "guide_shell_mark", (state, silent) => {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x3d /* = */) return false;
      if (state.src.charCodeAt(start + 1) !== 0x3d) return false;
      const match = state.src.slice(start).match(/^==(?:\{([a-z]+)\})?([^=\n][^=]*?)==/i);
      if (!match) return false;
      if (!silent) {
        const token = state.push("guide_shell_mark", "", 0);
        token.content = match[2];
        token.meta = { tone: String(match[1] || "yellow").toLowerCase() };
      }
      state.pos += match[0].length;
      return true;
    });
    md.renderer.rules.guide_shell_mark = (tokens, idx) => {
      const token = tokens[idx];
      const tone = String(token.meta?.tone || "yellow").toLowerCase();
      const toneClass = HIGHLIGHT_TONES.has(tone) ? tone : "yellow";
      return `<mark class="md-highlight md-highlight--${toneClass}">${escapeHtml(token.content)}</mark>`;
    };
    return md;
  }

  function configureMarkdownIt(md, guideRelPath = "") {
    if (!md?.renderer?.rules) return md;
    const defaultImage =
      md.renderer.rules.image ||
      function renderDefaultImage(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    md.renderer.rules.image = function renderGuideImage(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex("src");
      if (srcIndex >= 0) {
        const rawSrc = token.attrs[srcIndex][1];
        const resolved = resolveGuideImageSrc(rawSrc, guideRelPath);
        token.attrSet("data-original-src", rawSrc);
        if (resolved.startsWith("/api/")) {
          token.attrSet("data-full-src", appendAgentToApiUrl(stripThumb(resolved)));
          token.attrs[srcIndex][1] = appendThumbToApiUrl(resolved);
          token.attrJoin("class", "img-style-lightbox");
        } else if (resolved) {
          token.attrs[srcIndex][1] = resolved;
        }
      }
      return defaultImage(tokens, idx, options, env, self);
    };
    return md;
  }

  function stripThumb(url) {
    try {
      const parsed = new URL(String(url || ""), global.location?.origin || "http://localhost");
      parsed.searchParams.delete("thumb");
      parsed.searchParams.delete("max");
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return String(url || "");
    }
  }

  function wrapGuidePreviewImage(img, { index = 1, total = 1 } = {}) {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.closest(".markdown-preview-image-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "markdown-preview-image-wrap";
    const bar = document.createElement("div");
    bar.className = "markdown-preview-image-actions";
    if (total > 1) {
      const counter = document.createElement("span");
      counter.className = "markdown-preview-image-counter";
      counter.textContent = `${index} / ${total}`;
      bar.appendChild(counter);
    }
    const zoomBtn = document.createElement("button");
    zoomBtn.type = "button";
    zoomBtn.className = "markdown-preview-image-action-btn";
    zoomBtn.textContent = "Открыть";
    zoomBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const full = appendAgentToApiUrl(img.dataset.fullSrc || img.src || "");
      if (full) global.open(full, "_blank", "noopener,noreferrer");
    });
    bar.appendChild(zoomBtn);

    const parent = img.parentElement;
    if (parent?.tagName === "P") {
      const onlyImage = [...parent.childNodes].every(
        (node) =>
          node === img || (node.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim())
      );
      if (onlyImage) {
        parent.replaceWith(wrap);
        wrap.append(img, bar);
        return;
      }
    }
    img.replaceWith(wrap);
    wrap.append(img, bar);
  }

  function hydrateGuideMarkdownRoot(root, guideRelPath = "") {
    if (!root) return;
    const nodePath = resolveGuideNodePath(guideRelPath);
    root.dataset.linkBasePath = nodePath;
    root.classList.add("docs-markdown", "file-content-preview");

    const images = [...root.querySelectorAll("img")].filter(
      (img) => !img.closest(".markdown-preview-image-wrap")
    );
    images.forEach((img, index) => {
      img.loading = "lazy";
      img.addEventListener(
        "error",
        () => {
          img.classList.add("markdown-image-missing");
        },
        { once: true }
      );
      wrapGuidePreviewImage(img, { index: index + 1, total: images.length });
    });

    if (root.dataset.guideLightboxBound === "1") return;
    root.dataset.guideLightboxBound = "1";
    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!target.classList.contains("img-style-lightbox")) return;
      event.preventDefault();
      const full = appendAgentToApiUrl(target.dataset.fullSrc || target.currentSrc || target.src || "");
      if (full) global.open(full, "_blank", "noopener,noreferrer");
    });
  }

  global.UserDocsMarkdownPreview = {
    DOCS_AGENT_ID,
    buildDocsApiUrl,
    resolveGuideNodePath,
    resolveGuideImageSrc,
    applyGuideMarkdownPlugins,
    configureMarkdownIt,
    hydrateGuideMarkdownRoot
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
