import {
  splitReplyDisplayParts,
  cleanReplyTextSegment,
  hasReplyTtsBlocks,
  stripHtmlComments
} from "@shell/reply";

let shellMarkdownIt = null;
let markdownLibsPromise = null;
let highlightLibsPromise = null;

const SHELL_HLJS_STYLE = "/vendor/vditor/js/highlight.js/styles/androidstudio.min.css";

function loadStylesheetOnce(href) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[data-shell-md="${href}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.shellMd = href;
    link.addEventListener("load", () => {
      link.dataset.loaded = "1";
      resolve();
    }, { once: true });
    link.addEventListener("error", () => reject(new Error(`Не удалось загрузить ${href}`)), { once: true });
    document.head.appendChild(link);
  });
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-shell-md="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.shellMd = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Не удалось загрузить ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export function preloadShellMarkdown() {
  void ensureShellMarkdownLibs();
  void ensureShellHighlightLibs();
}

function ensureShellHighlightLibs() {
  if (typeof window.hljs?.highlightElement === "function") return Promise.resolve();
  if (!highlightLibsPromise) {
    highlightLibsPromise = Promise.all([
      loadScriptOnce("/vendor/highlight.min.js"),
      loadStylesheetOnce(SHELL_HLJS_STYLE)
    ]).catch((error) => {
      highlightLibsPromise = null;
      throw error;
    });
  }
  return highlightLibsPromise;
}

function ensureShellMarkdownLibs() {
  if (typeof window.markdownit === "function") return Promise.resolve();
  if (!markdownLibsPromise) {
    markdownLibsPromise = Promise.all([
      loadScriptOnce("/vendor/markdown-it.min.js"),
      loadScriptOnce("/markdown-github-alerts.js"),
      loadScriptOnce("/markdown-it-task-lists.js")
    ]).catch((error) => {
      markdownLibsPromise = null;
      throw error;
    });
  }
  return markdownLibsPromise;
}

function sanitizeRenderedShellHtml(html) {
  const raw = String(html || "");
  if (!raw || typeof DOMParser === "undefined") return raw;

  const blockedTags = new Set(["script", "iframe", "object", "embed", "form", "base", "link", "meta", "style"]);
  const doc = new DOMParser().parseFromString(raw, "text/html");

  doc.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (blockedTags.has(tag)) {
      el.remove();
      return;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}

function applyShellMarkHighlight(md) {
  md.inline.ruler.before("emphasis", "shell_mark", (state, silent) => {
    const marker = "==";
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== marker) return false;

    const match = state.src.slice(start).match(/^==([^=\n]+?)==/);
    if (!match) return false;

    if (!silent) {
      const tokenOpen = state.push("shell_mark_open", "mark", 1);
      tokenOpen.markup = marker;
      const tokenText = state.push("text", "", 0);
      tokenText.content = match[1];
      const tokenClose = state.push("shell_mark_close", "mark", -1);
      tokenClose.markup = marker;
    }

    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.shell_mark_open = () => '<mark class="md-highlight">';
  md.renderer.rules.shell_mark_close = () => "</mark>";
}

function isShellCodeLabel(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 48 || !value.endsWith(":")) return false;
  if (value.includes("\n")) return false;
  return /^[\p{L}\d][\p{L}\d\s./#+\-_()]*:$/u.test(value);
}

async function copyShellCodeText(text, button) {
  const value = String(text || "");
  if (!value) return;

  const markCopied = () => {
    button.classList.add("is-copied");
    button.title = "Скопировано";
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.title = "Копировать код";
    }, 1200);
  };

  try {
    await navigator.clipboard.writeText(value);
    markCopied();
    return;
  } catch {
    /* fallback below */
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    markCopied();
  } catch {
    /* ignore */
  } finally {
    textarea.remove();
  }
}

function ensurePreCodeElement(pre) {
  let code = pre.querySelector("code");
  if (code) return code;

  code = document.createElement("code");
  code.textContent = pre.textContent;
  pre.textContent = "";
  pre.append(code);
  return code;
}

function enhanceShellMarkdownBlocks(root) {
  if (!root) return;

  root.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".shell-md-code-block")) return;

    let labelEl = null;
    const prev = pre.previousElementSibling;
    if (prev?.matches("p") && isShellCodeLabel(prev.textContent)) {
      labelEl = document.createElement("div");
      labelEl.className = "shell-md-code-label";
      labelEl.textContent = prev.textContent.trim().replace(/:$/, "");
      prev.remove();
    }

    const block = document.createElement("div");
    block.className = "shell-md-code-block";
    pre.parentNode.insertBefore(block, pre);
    block.append(pre);

    const code = ensurePreCodeElement(pre);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "shell-md-code-copy";
    copyBtn.title = "Копировать код";
    copyBtn.setAttribute("aria-label", "Копировать код");
    copyBtn.textContent = "⎘";
    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void copyShellCodeText(code.textContent, copyBtn);
    });
    block.append(copyBtn);

    if (labelEl) {
      const group = document.createElement("div");
      group.className = "shell-md-code-group";
      block.parentNode.insertBefore(group, block);
      group.append(labelEl, block);
    }
  });

  void ensureShellHighlightLibs()
    .then(() => {
      if (!root.isConnected || typeof window.hljs?.highlightElement !== "function") return;
      root.querySelectorAll(".shell-md-code-block pre code").forEach((code) => {
        window.hljs.highlightElement(code);
      });
    })
    .catch(() => {});
}

function getShellMarkdownIt() {
  if (shellMarkdownIt) return shellMarkdownIt;
  if (typeof window.markdownit !== "function") return null;

  shellMarkdownIt = window.markdownit({
    html: true,
    linkify: true,
    breaks: true,
    typographer: false
  });

  if (typeof window.markdownItGitHubAlerts === "function") {
    shellMarkdownIt.use(window.markdownItGitHubAlerts, { markers: "*" });
  }

  if (typeof window.markdownItTaskLists === "function") {
    shellMarkdownIt.use(window.markdownItTaskLists);
  }

  applyShellMarkHighlight(shellMarkdownIt);

  const defaultLinkOpen =
    shellMarkdownIt.renderer.rules.link_open ||
    function renderLinkOpen(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  shellMarkdownIt.renderer.rules.link_open = function renderExternalLinkOpen(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIdx = token.attrIndex("href");
    if (hrefIdx >= 0) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultTableOpen =
    shellMarkdownIt.renderer.rules.table_open ||
    function renderTableOpen(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
  const defaultTableClose =
    shellMarkdownIt.renderer.rules.table_close ||
    function renderTableClose(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  shellMarkdownIt.renderer.rules.table_open = function renderWrappedTableOpen(tokens, idx, options, env, self) {
    return `<div class="shell-md-table-wrap">${defaultTableOpen(tokens, idx, options, env, self)}`;
  };
  shellMarkdownIt.renderer.rules.table_close = function renderWrappedTableClose(tokens, idx, options, env, self) {
    return `${defaultTableClose(tokens, idx, options, env, self)}</div>`;
  };

  const defaultImage =
    shellMarkdownIt.renderer.rules.image ||
    function renderImage(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  shellMarkdownIt.renderer.rules.image = function renderShellImage(tokens, idx, options, env, self) {
    const token = tokens[idx];
    token.attrSet("loading", "lazy");
    token.attrSet("referrerpolicy", "no-referrer");
    token.attrSet("decoding", "async");
    return defaultImage(tokens, idx, options, env, self);
  };

  return shellMarkdownIt;
}

export function renderShellReplyMarkdown(element, markdown) {
  if (!element) return;
  const source = stripHtmlComments(String(markdown || "").trim());
  element.classList.remove("shell-md");

  if (!source || source === "—") {
    element.innerHTML = "";
    element.textContent = "—";
    return;
  }

  const md = getShellMarkdownIt();
  if (!md) {
    element.textContent = source;
    void ensureShellMarkdownLibs()
      .then(() => {
        if (element.isConnected) renderShellReplyMarkdown(element, markdown);
      })
      .catch(() => {});
    return;
  }

  try {
    element.classList.add("shell-md");
    element.innerHTML = sanitizeRenderedShellHtml(md.render(source));
    enhanceShellMarkdownBlocks(element);
  } catch {
    element.textContent = source;
  }
}

function prependTtsDisplayBlock(container, text, { open = false } = {}) {
  const aside = document.createElement("aside");
  aside.className = "shell-reply-tts-block";
  if (open) aside.classList.add("shell-reply-tts-block--open");

  const label = document.createElement("div");
  label.className = "shell-reply-tts-block-label";
  label.textContent = open ? "Озвучка · печатает…" : "Озвучка";

  const content = document.createElement("div");
  content.className = "shell-reply-tts-block-text shell-md";
  renderShellReplyMarkdown(content, text);

  aside.append(label, content);
  container.prepend(aside);
}

function appendTtsDisplayBlock(container, text, { open = false } = {}) {
  const aside = document.createElement("aside");
  aside.className = "shell-reply-tts-block";
  if (open) aside.classList.add("shell-reply-tts-block--open");

  const label = document.createElement("div");
  label.className = "shell-reply-tts-block-label";
  label.textContent = open ? "Озвучка · печатает…" : "Озвучка";

  const content = document.createElement("div");
  content.className = "shell-reply-tts-block-text shell-md";
  renderShellReplyMarkdown(content, text);

  aside.append(label, content);
  container.append(aside);
}

function resolveSpokenDisplayText(spokenParts = [], spokenText = "") {
  const parts = (Array.isArray(spokenParts) ? spokenParts : [])
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n\n") : String(spokenText || "").trim();
}

function renderReplyBodySegment(container, text) {
  const segment = document.createElement("div");
  segment.className = "shell-reply-segment shell-md";
  renderShellReplyMarkdown(segment, text);
  container.append(segment);
}

export function renderShellReplyBody(element, rawBody, { spokenParts = [], spokenText = "" } = {}) {
  if (!element) return;
  const source = String(rawBody || "").trim();
  const spoken = resolveSpokenDisplayText(spokenParts, spokenText);

  element.classList.remove("shell-reply-text--stub");
  element.dataset.replyKind = "message";

  if (!source || source === "—") {
    if (spoken) {
      element.innerHTML = "";
      element.classList.add("shell-md", "shell-reply-body-formatted");
      prependTtsDisplayBlock(element, spoken);
      renderReplyBodySegment(element, "—");
    } else {
      renderShellReplyMarkdown(element, "—");
    }
    return;
  }

  if (!hasReplyTtsBlocks(source)) {
    const bodyText = cleanReplyTextSegment(source);
    element.innerHTML = "";
    element.classList.add("shell-md", "shell-reply-body-formatted");
    if (spoken) prependTtsDisplayBlock(element, spoken);
    if (bodyText) renderReplyBodySegment(element, bodyText);
    return;
  }

  const parts = splitReplyDisplayParts(source);
  element.innerHTML = "";
  element.classList.add("shell-md", "shell-reply-body-formatted");

  for (const part of parts) {
    if (part.kind === "tts") {
      appendTtsDisplayBlock(element, part.text, { open: Boolean(part.open) });
      continue;
    }
    renderReplyBodySegment(element, part.text);
  }
}
