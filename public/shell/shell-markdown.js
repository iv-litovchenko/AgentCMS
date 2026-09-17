import { cleanReplyTextSegment, stripHtmlComments } from "@shell/reply";
import { createVoiceEndMarkerElement, splitVoiceEndReply } from "@shell/voice-end-format";

let shellMarkdownIt = null;
let markdownLibsPromise = null;
let highlightLibsPromise = null;
let mermaidLibsPromise = null;
let mathLibsPromise = null;

const SHELL_HLJS_STYLE = "/vendor/vditor/js/highlight.js/styles/androidstudio.min.css";
const SHELL_MERMAID_SRC = "/vendor/mermaid.min.js";
const SHELL_KATEX_CSS = "/vendor/vditor/js/katex/katex.min.css";
const SHELL_KATEX_JS = "/vendor/vditor/js/katex/katex.min.js";
const SHELL_KATEX_MHCHEM = "/vendor/vditor/js/katex/mhchem.min.js";

const HIGHLIGHT_TONES = new Set(["yellow", "red", "green", "blue", "gray", "orange", "purple"]);

const MERMAID_BASE_CONFIG = {
  startOnLoad: false,
  securityLevel: "loose",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};

const MERMAID_SOURCE_START_RE =
  /^(?:graph\s+(?:TD|TB|BT|RL|LR|DT)|flowchart\s+(?:TD|TB|BT|RL|LR|DT)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie(?:\s|$)|mindmap|timeline|gitGraph|journey|quadrantChart|xychart(?:-beta)?|block(?:-beta)?|sankey(?:-beta)?|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/im;

function getPreBlockSourceText(pre) {
  const code = pre?.querySelector?.("code");
  return String(code?.textContent ?? pre?.textContent ?? "").trim();
}

function getPreBlockLanguage(pre) {
  const code = pre?.querySelector?.("code");
  if (!code) return "";
  for (const cls of code.classList) {
    const match = cls.match(/^language-(.+)$/);
    if (match) return String(match[1] || "").trim().toLowerCase();
  }
  return "";
}

function looksLikeMermaidSource(text) {
  const source = String(text || "").trim();
  if (!source) return false;
  if (MERMAID_SOURCE_START_RE.test(source)) return true;
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() || "";
  if (/^graph\s+\w+/i.test(firstLine) || /^flowchart\s+\w+/i.test(firstLine)) return true;
  if (/(?:-->|==>|---|\|\|)/.test(source) && /\[.+]|\{.+\}|\(\(.+\)\)/.test(source)) {
    return /^(?:graph|flowchart|subgraph)\b/im.test(source);
  }
  return false;
}

function shouldPromotePreToMermaid(pre) {
  if (!pre || pre.classList.contains("mermaid")) return false;
  const lang = getPreBlockLanguage(pre);
  const source = getPreBlockSourceText(pre);
  if (!source) return false;
  if (lang === "mermaid") return true;
  if (lang && !["", "text", "plaintext", "txt"].includes(lang)) return false;
  return looksLikeMermaidSource(source);
}

function promotePreToMermaid(pre) {
  const source = getPreBlockSourceText(pre);
  if (!source) return;
  pre.classList.add("mermaid");
  pre.setAttribute("data-mermaid-source", encodeURIComponent(source));
  pre.textContent = source;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHELL_MARKER_INLINE_RE = /(\[(?:tts-break|/?stt)\]|\{\{(?:tpl:[a-z0-9_-]+|shell:voice-end)\}\})/gi;

export function renderUserMessageBody(element, text) {
  if (!element) return;
  const raw = String(text || "");
  element.replaceChildren();
  element.classList.add("shell-user-msg-body");
  if (!raw) return;
  const parts = raw.split(SHELL_MARKER_INLINE_RE);
  for (const part of parts) {
    if (!part) continue;
    if (/^\{\{(?:tpl:|shell:)/i.test(part) || /^\[(?:tts-break|/?stt)\]$/i.test(part)) {
      const code = document.createElement("code");
      code.className = "shell-compose-templates-marker";
      code.textContent = part;
      element.appendChild(code);
    } else {
      element.appendChild(document.createTextNode(part));
    }
  }
}

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

export function ensureShellMarkdownReady() {
  return ensureShellMarkdownLibs().then(() => {
    getShellMarkdownIt();
  });
}

function markPendingMarkdown(element, source) {
  if (!element) return;
  element.dataset.shellMdPending = "1";
  element.dataset.shellMdSource = source;
}

function clearPendingMarkdown(element) {
  if (!element) return;
  delete element.dataset.shellMdPending;
  delete element.dataset.shellMdSource;
}

function looksLikeMarkdownSource(source) {
  const text = String(source || "").trim();
  if (!text) return false;
  return /(?:^|\n)\s{0,3}#{1,6}\s|(?:^|\n)\s{0,3}[-*+]\s|(?:^|\n)\s{0,3}\d+\.\s|\*\*[^*\n]|__[^_\n]|!\[[^\]]*\]\(|`[^`]+`|```|\[[^\]]+\]\([^)]+\)/m.test(
    text
  );
}

export function rehydrateShellMarkdownIn(root) {
  const scope = root instanceof Element ? root : root ? document.querySelector(String(root)) : null;
  if (!scope) return;

  scope.querySelectorAll('[data-shell-md-pending="1"]').forEach((element) => {
    const source = element.dataset.shellMdSource || element.textContent || "";
    renderShellReplyMarkdown(element, source);
  });

  scope.querySelectorAll(".shell-reply-segment:not(.shell-md)").forEach((element) => {
    const source = element.dataset.shellMdSource || element.textContent || "";
    if (!source.trim() || !looksLikeMarkdownSource(source)) return;
    renderShellReplyMarkdown(element, source);
  });

  scope.querySelectorAll(".shell-chat-msg--agent:not(.shell-reply-body-formatted)").forEach((element) => {
    if (element.querySelector(".shell-reply-segment, p, ul, ol, h1, h2, h3, pre")) return;
    const source = element.dataset.shellMdSource || element.textContent || "";
    if (!source.trim() || !looksLikeMarkdownSource(source)) return;
    renderShellReplyMarkdown(element, source);
  });

  wrapShellMarkdownTables(scope);
}

export function preloadShellMarkdown() {
  void ensureShellMarkdownReady().then(() => {
    rehydrateShellMarkdownIn(document.getElementById("shell-dialog-thread"));
    rehydrateShellMarkdownIn(document.getElementById("shell-last-reply"));
    rehydrateShellMarkdownIn(document.getElementById("shell-compact-qa"));
  });
  void ensureShellHighlightLibs();
  void ensureShellMermaidLibs();
}

const mermaidTypesetRoots = new Set();
let mermaidTypesetTimer = 0;
let mermaidTypesetRunning = false;
let mermaidTypesetQueued = false;
let mermaidLightboxNode = null;
const mermaidTypesetRetryCounts = new WeakMap();
const MERMAID_TYPESET_MAX_RETRIES = 16;

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

function ensureShellMermaidLibs() {
  if (typeof window.mermaid?.render === "function") return Promise.resolve();
  if (!mermaidLibsPromise) {
    mermaidLibsPromise = loadScriptOnce(SHELL_MERMAID_SRC).catch((error) => {
      mermaidLibsPromise = null;
      throw error;
    });
  }
  return mermaidLibsPromise;
}

function ensureShellMathLibs() {
  if (typeof window.katex?.renderToString === "function") return Promise.resolve();
  if (!mathLibsPromise) {
    mathLibsPromise = Promise.all([
      loadStylesheetOnce(SHELL_KATEX_CSS),
      loadScriptOnce(SHELL_KATEX_JS),
      loadScriptOnce(SHELL_KATEX_MHCHEM)
    ]).catch((error) => {
      mathLibsPromise = null;
      throw error;
    });
  }
  return mathLibsPromise;
}

function ensureShellMarkdownLibs() {
  if (typeof window.markdownit === "function") return Promise.resolve();
  if (!markdownLibsPromise) {
    markdownLibsPromise = Promise.all([
      loadScriptOnce("/vendor/markdown-it.min.js"),
      loadScriptOnce("/markdown-github-alerts.js"),
      loadScriptOnce("/markdown-it-task-lists.js"),
      loadScriptOnce("/markdown-it-footnote.min.js")
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
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x3d /* = */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x3d) return false;

    const match = state.src.slice(start).match(/^==(?:\{([a-z]+)\})?([^=\n][^=]*?)==/i);
    if (!match) return false;

    if (!silent) {
      const token = state.push("shell_mark", "", 0);
      token.content = match[2];
      token.meta = { tone: String(match[1] || "yellow").toLowerCase() };
    }

    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.shell_mark = (tokens, idx) => {
    const token = tokens[idx];
    const tone = String(token.meta?.tone || "yellow").toLowerCase();
    const toneClass = HIGHLIGHT_TONES.has(tone) ? tone : "yellow";
    return `<mark class="md-highlight md-highlight--${toneClass}">${escapeHtml(token.content)}</mark>`;
  };
}

function applyShellDisplayMath(md) {
  md.block.ruler.before("fence", "shell_math_display", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const line = state.src.slice(start, max).trim();

    if (!line.startsWith("$$")) return false;

    let content = "";
    let end = startLine;

    if (line.length > 4 && line.endsWith("$$") && line.lastIndexOf("$$") === line.length - 2) {
      content = line.slice(2, -2).trim();
      end = startLine;
    } else if (line === "$$") {
      let found = false;
      for (let next = startLine + 1; next < endLine; next += 1) {
        const lineStart = state.bMarks[next] + state.tShift[next];
        const lineMax = state.eMarks[next];
        const nextLine = state.src.slice(lineStart, lineMax).trim();
        if (nextLine === "$$") {
          found = true;
          end = next;
          break;
        }
      }
      if (!found) return false;

      const lines = [];
      for (let i = startLine + 1; i < end; i += 1) {
        lines.push(state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]));
      }
      content = lines.join("\n").trim();
    } else {
      return false;
    }

    if (!content) return false;

    if (!silent) {
      const token = state.push("shell_math_display", "div", 0);
      token.content = content;
      token.map = [startLine, end];
      token.markup = "$$";
    }

    state.line = end + 1;
    return true;
  });

  md.inline.ruler.before("shell_math_inline", "shell_math_display_inline", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x24) return false;

    const match = state.src.slice(start).match(/^\$\$([\s\S]+?)\$\$/);
    if (!match || !String(match[1] || "").trim()) return false;

    if (!silent) {
      const token = state.push("shell_math_display_inline", "", 0);
      token.content = match[1].trim();
    }

    state.pos += match[0].length;
    return true;
  });

  const renderDisplayMath = (content) =>
    `<div class="shell-md-math-block shell-md-math-display"><code class="language-math">${escapeHtml(content)}</code></div>`;

  md.renderer.rules.shell_math_display = (tokens, idx) => renderDisplayMath(tokens[idx].content || "");
  md.renderer.rules.shell_math_display_inline = (tokens, idx) => renderDisplayMath(tokens[idx].content || "");
}

function applyShellInlineMath(md) {
  md.inline.ruler.before("emphasis", "shell_math_inline", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (state.src.charCodeAt(start + 1) === 0x24) return false;

    const match = state.src.slice(start).match(/^\$([^$\n]+?)\$/);
    if (!match) return false;

    if (!silent) {
      const token = state.push("shell_math_inline", "", 0);
      token.content = match[1];
    }

    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.shell_math_inline = (tokens, idx) => {
    const content = escapeHtml(tokens[idx].content || "");
    return `<code class="language-math shell-md-math-inline">${content}</code>`;
  };
}

function applyShellSupSub(md) {
  md.inline.ruler.before("emphasis", "shell_sup", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x5e /* ^ */) return false;

    const match = state.src.slice(start).match(/^\^([^\^\n]+?)\^/);
    if (!match) return false;

    if (!silent) {
      state.push("shell_sup_open", "sup", 1);
      state.push("text", "", 0).content = match[1];
      state.push("shell_sup_close", "sup", -1);
    }

    state.pos += match[0].length;
    return true;
  });

  md.inline.ruler.before("emphasis", "shell_sub", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x7e /* ~ */) return false;
    if (state.src.charCodeAt(start + 1) === 0x7e) return false;

    const match = state.src.slice(start).match(/^~([^~\n]+?)~/);
    if (!match) return false;

    if (!silent) {
      state.push("shell_sub_open", "sub", 1);
      state.push("text", "", 0).content = match[1];
      state.push("shell_sub_close", "sub", -1);
    }

    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.shell_sup_open = () => "<sup>";
  md.renderer.rules.shell_sup_close = () => "</sup>";
  md.renderer.rules.shell_sub_open = () => "<sub>";
  md.renderer.rules.shell_sub_close = () => "</sub>";
}

function normalizeShellImageSrc(src) {
  const url = String(src || "").trim();
  if (!url) return url;

  try {
    const parsed = new URL(url, "https://local.invalid");
    if (/via\.placeholder\.com$/i.test(parsed.hostname)) {
      const size = parsed.pathname.replace(/\D/g, "") || "150";
      return `https://placehold.co/${size}x${size}/1e1b4b/a78bfa?text=Img`;
    }
  } catch {
    /* ignore */
  }

  return url;
}

const SHELL_IMAGE_FALLBACK = "https://placehold.co/150x150/1e1b4b/a78bfa?text=Image";

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

function initShellMermaid(theme = "neutral") {
  if (typeof window.mermaid?.initialize !== "function") return false;
  window.mermaid.initialize({
    ...MERMAID_BASE_CONFIG,
    theme: theme === "dark" ? "dark" : "neutral"
  });
  return true;
}

function getMermaidBlockSource(block) {
  if (!block) return "";
  const stored = block.getAttribute("data-mermaid-source");
  if (stored) {
    try {
      return decodeURIComponent(stored).trim();
    } catch {
      /* fall through */
    }
  }
  const text = String(block.textContent || "").trim();
  if (!text || text.startsWith("#mermaid-")) return "";
  return text;
}

function mermaidBlockHasRenderedDiagram(block) {
  const g = block?.querySelector("svg g");
  return Boolean(g?.innerHTML?.trim());
}

function ensureMermaidDiagramFrame(block) {
  const existing = block.closest(".mermaid-diagram-frame");
  if (existing) return existing;

  const frame = document.createElement("div");
  frame.className = "mermaid-diagram-frame is-dark";
  frame.dataset.mermaidTheme = "dark";
  block.parentNode?.insertBefore(frame, block);
  frame.appendChild(block);
  return frame;
}

function syncMermaidThemeToggleUi(frame) {
  const btn = frame.querySelector(".mermaid-diagram-theme-btn");
  if (!btn) return;
  const isDark = frame.dataset.mermaidTheme === "dark";
  btn.classList.toggle("is-dark-active", isDark);
  btn.title = isDark ? "Светлый фон" : "Тёмный фон";
  btn.setAttribute("aria-label", btn.title);
  btn.setAttribute("aria-pressed", isDark ? "true" : "false");
}

function ensureMermaidCopyButton(frame, block) {
  let btn = frame.querySelector(".mermaid-diagram-copy-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mermaid-diagram-copy-btn";
    btn.title = "Копировать код";
    btn.setAttribute("aria-label", "Копировать код Mermaid");
    btn.textContent = "⎘";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyShellCodeText(getMermaidBlockSource(block), btn);
    });
    frame.appendChild(btn);
  }
  return btn;
}

function ensureMermaidExpandButton(frame, block) {
  let btn = frame.querySelector(".mermaid-diagram-expand-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mermaid-diagram-expand-btn";
    btn.title = "На весь экран";
    btn.setAttribute("aria-label", "Развернуть диаграмму");
    btn.textContent = "⛶";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openMermaidLightbox(frame, block);
    });
    frame.appendChild(btn);
  }
  return btn;
}

function ensureMermaidLightbox() {
  if (mermaidLightboxNode) return mermaidLightboxNode;

  const overlay = document.createElement("div");
  overlay.className = "shell-mermaid-lightbox hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Диаграмма");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "shell-mermaid-lightbox-close";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.textContent = "×";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "shell-mermaid-lightbox-copy";
  copyBtn.title = "Копировать код";
  copyBtn.setAttribute("aria-label", "Копировать код Mermaid");
  copyBtn.textContent = "⎘";

  const stage = document.createElement("div");
  stage.className = "shell-mermaid-lightbox-stage";

  overlay.append(closeBtn, copyBtn, stage);
  document.body.appendChild(overlay);

  const close = () => overlay.classList.add("hidden");
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  stage.addEventListener("click", (event) => event.stopPropagation());
  copyBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    void copyShellCodeText(overlay.dataset.mermaidSource || "", copyBtn);
  });
  document.addEventListener("keydown", (event) => {
    if (overlay.classList.contains("hidden")) return;
    if (event.key === "Escape") close();
  });

  mermaidLightboxNode = overlay;
  return overlay;
}

async function openMermaidLightbox(frame, block) {
  const source = getMermaidBlockSource(block);
  if (!source) return;

  if (!block.querySelector("svg")?.querySelector("g")) {
    const theme = frame?.dataset.mermaidTheme === "light" ? "light" : "dark";
    await renderMermaidBlock(block, theme);
  }

  const overlay = ensureMermaidLightbox();
  const stage = overlay.querySelector(".shell-mermaid-lightbox-stage");
  const svg = block.querySelector("svg");
  if (!stage || !svg) return;

  overlay.dataset.mermaidSource = source;
  stage.replaceChildren();
  const clone = svg.cloneNode(true);
  clone.removeAttribute("style");
  stage.appendChild(clone);
  overlay.classList.toggle("is-dark", frame?.classList.contains("is-dark") !== false);
  overlay.classList.remove("hidden");
}

function ensureMermaidThemeToggle(frame, block) {
  let btn = frame.querySelector(".mermaid-diagram-theme-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mermaid-diagram-theme-btn";
    btn.innerHTML =
      '<svg class="mermaid-diagram-theme-icon mermaid-diagram-theme-icon--moon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 1.8a5.2 5.2 0 1 0 4.7 4.7 4.1 4.1 0 0 1-4.7-4.7z"/></svg>' +
      '<svg class="mermaid-diagram-theme-icon mermaid-diagram-theme-icon--sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="3.1"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.3 3.3l1.3 1.3M11.4 11.4l1.3 1.3M3.3 12.7l1.3-1.3M11.4 4.6l1.3-1.3"/></svg>';
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleMermaidDiagramTheme(frame, block);
    });
    frame.appendChild(btn);
  }
  syncMermaidThemeToggleUi(frame);
  return btn;
}

async function renderMermaidBlock(block, theme = "dark") {
  const source = getMermaidBlockSource(block);
  if (!source) return false;

  const frame = ensureMermaidDiagramFrame(block);
  frame.dataset.mermaidTheme = theme;
  frame.classList.toggle("is-dark", theme === "dark");
  ensureMermaidThemeToggle(frame, block);
  ensureMermaidCopyButton(frame, block);
  ensureMermaidExpandButton(frame, block);

  block.dataset.mermaidSource = source;
  block.removeAttribute("data-processed");
  block.dataset.mermaidRendered = "0";

  if (!initShellMermaid(theme === "dark" ? "dark" : "neutral")) return false;

  try {
    const renderId = `shell-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { svg, bindFunctions } = await window.mermaid.render(renderId, source);
    block.innerHTML = svg;
    bindFunctions?.(block);
    block.dataset.mermaidRendered = "1";
    block.setAttribute("data-processed", "true");
    return true;
  } catch (error) {
    console.warn("Shell mermaid render failed:", error);
    block.textContent = "";
    block.dataset.mermaidRendered = "error";
    return false;
  }
}

async function toggleMermaidDiagramTheme(frame, block) {
  const nextTheme = frame.dataset.mermaidTheme === "dark" ? "light" : "dark";
  block.dataset.mermaidRendered = "0";
  await renderMermaidBlock(block, nextTheme);
}

async function typesetShellMermaidDiagrams(root) {
  if (!root?.isConnected) return;
  const blocks = [...root.querySelectorAll("pre.mermaid")].filter((block) => {
    if (block.dataset.mermaidRendered === "1" && mermaidBlockHasRenderedDiagram(block)) return false;
    return Boolean(getMermaidBlockSource(block));
  });
  if (!blocks.length) return;

  let libsReady = true;
  try {
    await ensureShellMermaidLibs();
  } catch (error) {
    libsReady = false;
    console.warn("Shell mermaid libs failed to load:", error);
  }

  let pending = 0;
  for (const block of blocks) {
    if (!root.isConnected || !block.isConnected) continue;
    const frame = ensureMermaidDiagramFrame(block);
    ensureMermaidCopyButton(frame, block);
    ensureMermaidExpandButton(frame, block);
    if (!libsReady) {
      pending += 1;
      continue;
    }
    const theme = frame?.dataset.mermaidTheme === "light" ? "light" : "dark";
    const ok = await renderMermaidBlock(block, theme);
    if (!ok) pending += 1;
  }

  if (pending > 0 && root.isConnected) {
    const retries = (mermaidTypesetRetryCounts.get(root) || 0) + 1;
    mermaidTypesetRetryCounts.set(root, retries);
    if (retries <= MERMAID_TYPESET_MAX_RETRIES) {
      window.setTimeout(() => scheduleShellMermaidTypeset(root), Math.min(1200, 80 * retries));
    } else {
      for (const block of blocks) {
        if (block.dataset.mermaidRendered === "1") continue;
        block.dataset.mermaidRendered = "error";
      }
    }
  } else {
    mermaidTypesetRetryCounts.delete(root);
  }
}

export function scheduleShellMermaidTypeset(root) {
  if (root?.isConnected) mermaidTypesetRoots.add(root);
  if (mermaidTypesetTimer) window.clearTimeout(mermaidTypesetTimer);
  mermaidTypesetTimer = window.setTimeout(() => {
    mermaidTypesetTimer = 0;
    void flushScheduledShellMermaidTypeset();
  }, 32);
}

async function flushScheduledShellMermaidTypeset() {
  if (mermaidTypesetRunning) {
    mermaidTypesetQueued = true;
    return;
  }
  mermaidTypesetRunning = true;
  try {
    do {
      mermaidTypesetQueued = false;
      const roots = [...mermaidTypesetRoots];
      mermaidTypesetRoots.clear();
      for (const root of roots) {
        if (root?.isConnected) await typesetShellMermaidDiagrams(root);
      }
    } while (mermaidTypesetQueued || mermaidTypesetRoots.size > 0);
  } finally {
    mermaidTypesetRunning = false;
  }
}

function renderShellMathElement(element) {
  if (!element || element.dataset.mathRendered === "1") return;
  const math = String(element.textContent || "").replace(/\u00a0/g, " ").trim();
  if (!math || typeof window.katex?.renderToString !== "function") return;

  const displayMode =
    element.classList.contains("shell-md-math-display") ||
    element.closest(".shell-md-math-display") ||
    element.classList.contains("shell-md-math-block") ||
    element.closest(".shell-md-math-block") ||
    element.tagName === "PRE";

  try {
    element.innerHTML = window.katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      output: "html"
    });
    element.dataset.mathRendered = "1";
    element.classList.remove("shell-md-math-error");
  } catch (error) {
    element.classList.add("shell-md-math-error");
    element.textContent = math;
    console.warn("Shell katex render failed:", error);
  }
}

async function typesetShellMath(root) {
  if (!root?.isConnected) return;
  const elements = [...root.querySelectorAll(".language-math")].filter((el) => el.dataset.mathRendered !== "1");
  if (!elements.length) return;

  try {
    await ensureShellMathLibs();
  } catch {
    return;
  }

  if (!root.isConnected) return;
  for (const element of elements) {
    renderShellMathElement(element);
  }
}

function replaceLinkWithShellMedia(link, html) {
  const wrap = document.createElement("div");
  wrap.className = "shell-md-embed";
  wrap.innerHTML = html;
  const media = wrap.firstElementChild;
  if (!media) return;
  link.replaceWith(media);
}

function getUrlSearchParam(rawUrl, key) {
  const url = String(rawUrl || "");
  try {
    const parsed = new URL(url, "https://local.invalid");
    return parsed.searchParams.get(key) || "";
  } catch {
    const match = url.match(new RegExp(`[?&]${key}=([^&#]+)`));
    return match ? decodeURIComponent(match[1]) : "";
  }
}

function shellEmbedIframe(src, title = "Embedded media") {
  return `<iframe class="shell-md-embed-iframe" src="${escapeHtml(src)}" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

function buildShellEmbedMediaHtml(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  if (/^.+\.(mp4|m4v|ogg|ogv|webm)(\?|#|$)/i.test(url)) {
    return `<video class="shell-md-embed-video" controls playsinline preload="metadata" src="${escapeHtml(url)}"></video>`;
  }

  if (/^.+\.(mp3|wav|flac)(\?|#|$)/i.test(url)) {
    return `<audio class="shell-md-embed-audio" controls preload="metadata" src="${escapeHtml(url)}"></audio>`;
  }

  const youtubeMatch = url.match(
    /\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w|-]{11})(?:(?:[\?&]t=)([^&\s]+))?/
  );
  if (youtubeMatch?.[1]) {
    const start = youtubeMatch[2] ? `?start=${encodeURIComponent(youtubeMatch[2])}` : "";
    return shellEmbedIframe(
      `https://www.youtube.com/embed/${encodeURIComponent(youtubeMatch[1])}${start}`,
      "YouTube video"
    );
  }

  const vimeoMatch = url.match(/\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) {
    return shellEmbedIframe(
      `https://player.vimeo.com/video/${encodeURIComponent(vimeoMatch[1])}`,
      "Vimeo video"
    );
  }

  const youkuMatch = url.match(/\/\/v\.youku\.com\/v_show\/id_(\w+)=*\.html/);
  if (youkuMatch?.[1]) {
    return shellEmbedIframe(`https://player.youku.com/embed/${encodeURIComponent(youkuMatch[1])}`, "Youku video");
  }

  const qqMatch = url.match(/\/\/v\.qq\.com\/x\/cover\/.*\/([^/]+)\.html/i);
  if (qqMatch?.[1]) {
    return shellEmbedIframe(
      `https://v.qq.com/txp/iframe/player.html?vid=${encodeURIComponent(qqMatch[1])}`,
      "QQ video"
    );
  }

  const coubMatch = url.match(/(?:www\.|\/)coub\.com\/view\/(\w+)/i);
  if (coubMatch?.[1]) {
    return shellEmbedIframe(
      `https://coub.com/embed/${encodeURIComponent(coubMatch[1])}?muted=false&autostart=false&originalSize=true&startWithHD=true`,
      "Coub video"
    );
  }

  const facebookMatch = url.match(/(?:www\.|\/)facebook\.com\/([^/]+)\/videos\/(\d+)/i);
  if (facebookMatch?.[0]) {
    return shellEmbedIframe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(facebookMatch[0])}`,
      "Facebook video"
    );
  }

  const dailymotionMatch = url.match(/dailymotion\.com\/(?:video|hub)\/(\w+)/i);
  if (dailymotionMatch?.[1]) {
    return shellEmbedIframe(
      `https://www.dailymotion.com/embed/video/${encodeURIComponent(dailymotionMatch[1])}`,
      "Dailymotion video"
    );
  }

  const bilibiliMatch = url.match(/(?:www\.|\/)bilibili\.com\/video\/(\w+)/i);
  if (/bilibili\.com/i.test(url) && (url.includes("bvid=") || bilibiliMatch?.[1])) {
    const params = new URLSearchParams({
      bvid: getUrlSearchParam(url, "bvid") || bilibiliMatch?.[1] || "",
      page: getUrlSearchParam(url, "page") || "1",
      high_quality: "1",
      as_wide: "1",
      allowfullscreen: "true",
      autoplay: "0"
    });
    return shellEmbedIframe(`https://player.bilibili.com/player.html?${params.toString()}`, "Bilibili video");
  }

  const tedMatch = url.match(/(?:www\.|\/)ted\.com\/talks\/([\w-]+)/i);
  if (tedMatch?.[1]) {
    return shellEmbedIframe(`https://embed.ted.com/talks/${encodeURIComponent(tedMatch[1])}`, "TED talk");
  }

  return "";
}

function embedShellMediaLink(link) {
  const url = String(link.getAttribute("href") || "").trim();
  if (!url) return;

  const html = buildShellEmbedMediaHtml(url);
  if (html) replaceLinkWithShellMedia(link, html);
}

function embedShellMediaLinks(root) {
  if (!root) return;
  root.querySelectorAll("a[href]").forEach((link) => {
    if (link.closest(".shell-md-code-block, .shell-reply-tts-block, .footnotes")) return;
    embedShellMediaLink(link);
  });
}

function wrapShellMarkdownTables(root) {
  if (!root) return;
  root.querySelectorAll("table").forEach((table) => {
    if (table.closest(".shell-md-table-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "shell-md-table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.append(table);
  });
}

function enhanceShellMarkdownBlocks(root) {
  if (!root) return;

  wrapShellMarkdownTables(root);

  root.querySelectorAll("pre").forEach((pre) => {
    if (pre.classList.contains("mermaid") || pre.querySelector("code.language-math")) return;
    if (pre.closest(".shell-md-code-block")) return;
    if (shouldPromotePreToMermaid(pre)) promotePreToMermaid(pre);
  });

  root.querySelectorAll("pre").forEach((pre) => {
    if (pre.classList.contains("mermaid") || pre.querySelector("code.language-math")) return;
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

  root.querySelectorAll("img").forEach((img) => {
    const normalized = normalizeShellImageSrc(img.getAttribute("src"));
    if (normalized && normalized !== img.getAttribute("src")) {
      img.setAttribute("src", normalized);
    }
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.shellImgFallback) return;
        img.dataset.shellImgFallback = "1";
        img.src = SHELL_IMAGE_FALLBACK;
      },
      { once: true }
    );
  });

  embedShellMediaLinks(root);
  void typesetShellMath(root);
  scheduleShellMermaidTypeset(root);
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

  if (typeof window.markdownitFootnote === "function") {
    shellMarkdownIt.use(window.markdownitFootnote);
  }

  applyShellMarkHighlight(shellMarkdownIt);
  applyShellDisplayMath(shellMarkdownIt);
  applyShellInlineMath(shellMarkdownIt);
  applyShellSupSub(shellMarkdownIt);

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

  const defaultFence =
    shellMarkdownIt.renderer.rules.fence ||
    function renderFence(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  shellMarkdownIt.renderer.rules.fence = function renderShellFence(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const language = (token.info || "").trim().split(/\s+/g)[0].toLowerCase();
    const source = token.content.trimEnd();

    if (language === "mermaid") {
      const encodedSource = encodeURIComponent(source);
      return `<pre class="mermaid" data-mermaid-source="${encodedSource}">${escapeHtml(source)}</pre>\n`;
    }

    if (language === "math") {
      return `<pre class="shell-md-math-block"><code class="language-math">${escapeHtml(source)}</code></pre>\n`;
    }

    return defaultFence(tokens, idx, options, env, self);
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
    const srcIdx = token.attrIndex("src");
    if (srcIdx >= 0) {
      const attrs = token.attrs[srcIdx];
      attrs[1] = normalizeShellImageSrc(attrs[1]);
    }
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
    markPendingMarkdown(element, source);
    element.textContent = source;
    void ensureShellMarkdownReady()
      .then(() => {
        if (element.isConnected) renderShellReplyMarkdown(element, markdown);
        rehydrateShellMarkdownIn(element.closest("#shell-dialog-thread, #shell-last-reply, #shell-compact-qa"));
      })
      .catch((error) => {
        console.warn("[shell-markdown] libs failed to load", error);
      });
    return;
  }

  try {
    element.classList.add("shell-md");
    element.innerHTML = sanitizeRenderedShellHtml(md.render(source));
    enhanceShellMarkdownBlocks(element);
    clearPendingMarkdown(element);
  } catch (error) {
    markPendingMarkdown(element, source);
    element.textContent = source;
    console.warn("[shell-markdown] render failed", error);
  }
}

function prependTtsDisplayBlock(container, text) {
  const aside = document.createElement("aside");
  aside.className = "shell-reply-tts-block";

  const label = document.createElement("div");
  label.className = "shell-reply-tts-block-label";
  label.textContent = "Озвучка";

  const content = document.createElement("div");
  content.className = "shell-reply-tts-block-text shell-md";
  renderShellReplyMarkdown(content, text);

  aside.append(label, content);
  container.prepend(aside);
}

function renderReplyBodySegment(container, text) {
  const segment = document.createElement("div");
  segment.className = "shell-reply-segment shell-md";
  renderShellReplyMarkdown(segment, text);
  container.append(segment);
}

function resolveSpokenDisplayText(spokenParts = [], spokenText = "") {
  const parts = (Array.isArray(spokenParts) ? spokenParts : [])
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n\n") : String(spokenText || "").trim();
}

export function renderShellReplyBody(element, rawBody, { spokenParts = [], spokenText = "" } = {}) {
  if (!element) return;
  const source = String(rawBody || "").trim();
  const externalSpoken = resolveSpokenDisplayText(spokenParts, spokenText);
  const voiceSplit = splitVoiceEndReply(source);
  const displaySpoken = externalSpoken || (voiceSplit?.spoken ? cleanReplyTextSegment(voiceSplit.spoken) : "");
  const displayBody = cleanReplyTextSegment(voiceSplit?.body ?? source);

  element.classList.remove("shell-reply-text--stub");
  element.dataset.replyKind = "message";

  if (!displaySpoken && (!displayBody || displayBody === "—")) {
    renderShellReplyMarkdown(element, displayBody || "—");
    return;
  }

  element.innerHTML = "";
  element.classList.add("shell-md", "shell-reply-body-formatted");

  if (displaySpoken) prependTtsDisplayBlock(element, displaySpoken);
  if (voiceSplit && (displaySpoken || displayBody)) {
    element.appendChild(createVoiceEndMarkerElement(voiceSplit.marker));
  }
  if (displayBody && displayBody !== "—") {
    renderReplyBodySegment(element, displayBody);
  } else if (!displaySpoken) {
    renderReplyBodySegment(element, "—");
  }
  scheduleShellMermaidTypeset(element);
}
