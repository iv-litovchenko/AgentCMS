/**
 * Page picker — ссылки, картинки, поля форм: URL на сайтах, workspace-путь в Agent CMS.
 */
(function initPagePickerExtract(global) {
  function normalizePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  }

  function isAgentCmsHost() {
    const port = String(location.port || "");
    if (port === "3443" || port === "3000") return true;
    return Boolean(document.getElementById("discuss-aside") || document.getElementById("app-root"));
  }

  function resolveAbsoluteUrl(raw, base = location.href) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      return new URL(value, base).href;
    } catch {
      return value;
    }
  }

  function extractApiFilePath(raw) {
    try {
      const url = new URL(String(raw || "").trim(), location.origin);
      if (!/\/api\/file\b/i.test(url.pathname)) return "";
      return normalizePath(url.searchParams.get("path") || url.searchParams.get("file") || "");
    } catch {
      return "";
    }
  }

  function joinWorkspaceRelativePath(baseRel, hrefRel) {
    const stack = baseRel ? normalizePath(baseRel).split("/").filter(Boolean) : [];
    if (stack.length && /\.md$/i.test(stack[stack.length - 1])) stack.pop();
    for (const part of String(hrefRel || "").split("/")) {
      if (part === "..") stack.pop();
      else if (part && part !== ".") stack.push(part);
    }
    return stack.join("/");
  }

  function readLinkBasePath(el) {
    const host = el?.closest?.("[data-link-base-path]");
    return normalizePath(host?.dataset?.linkBasePath || "");
  }

  function extractCmsLinkValue(anchor) {
    const nodePath = normalizePath(anchor.dataset?.nodePath || "");
    if (nodePath) return nodePath;

    const mdHref = String(anchor.dataset?.mdHref || "").trim();
    if (mdHref) {
      if (/^https?:\/\//i.test(mdHref)) {
        const apiPath = extractApiFilePath(mdHref);
        if (apiPath) return apiPath;
        try {
          const url = new URL(mdHref);
          if (url.origin === location.origin) return normalizePath(url.pathname.replace(/^\/+/, ""));
        } catch {
          // ignore
        }
        return mdHref;
      }
      if (mdHref.startsWith("/api/")) {
        const apiPath = extractApiFilePath(mdHref);
        if (apiPath) return apiPath;
      }
      return joinWorkspaceRelativePath(readLinkBasePath(anchor), mdHref) || normalizePath(mdHref);
    }

    const href = String(anchor.getAttribute("href") || "").trim();
    if (!href || href === "#") return "";

    if (/^https?:\/\//i.test(href)) {
      const apiPath = extractApiFilePath(href);
      if (apiPath) return apiPath;
      return href;
    }

    if (href.startsWith("/api/")) {
      const apiPath = extractApiFilePath(href);
      if (apiPath) return apiPath;
    }

    if (href.startsWith("/")) {
      return normalizePath(href);
    }

    return joinWorkspaceRelativePath(readLinkBasePath(anchor), href) || normalizePath(href);
  }

  function extractExternalLinkValue(anchor) {
    const href = String(anchor.getAttribute("href") || anchor.dataset?.mdHref || "").trim();
    if (!href || href === "#") return "";
    return resolveAbsoluteUrl(href);
  }

  function extractLinkValue(anchor) {
    if (!anchor) return "";
    if (isAgentCmsHost()) return extractCmsLinkValue(anchor);
    return extractExternalLinkValue(anchor);
  }

  function extractCmsImageValue(img) {
    const original = normalizePath(img.dataset?.originalSrc || "");
    if (original) {
      if (/^https?:\/\//i.test(original)) {
        const apiPath = extractApiFilePath(original);
        return apiPath || original;
      }
      if (original.startsWith("/api/")) {
        const apiPath = extractApiFilePath(original);
        if (apiPath) return apiPath;
      }
      const base = readLinkBasePath(img);
      return joinWorkspaceRelativePath(base, original) || original;
    }

    const src = String(img.currentSrc || img.getAttribute("src") || "").trim();
    if (!src) return "";

    const apiPath = extractApiFilePath(src);
    if (apiPath) return apiPath;

    if (/^https?:\/\//i.test(src) && !src.startsWith(location.origin)) return src;

    if (src.startsWith("/")) return normalizePath(src.replace(location.origin, ""));

    return normalizePath(src);
  }

  function extractExternalImageValue(img) {
    const src = String(
      img.dataset?.originalSrc || img.currentSrc || img.getAttribute("src") || ""
    ).trim();
    if (!src) return "";
    return resolveAbsoluteUrl(src);
  }

  function extractImageValue(img) {
    if (!img) return "";
    if (isAgentCmsHost()) return extractCmsImageValue(img);
    return extractExternalImageValue(img);
  }

  function extractCmsNodeValue(el) {
    if (el.matches?.(".system-file-item[data-system-file]")) {
      return normalizePath(el.dataset.systemFile || "");
    }
    if (el.matches?.(".menu-item[data-path], .menu-folder[data-path], .menu-card-body[data-path]")) {
      return normalizePath(el.dataset.path || "");
    }
    if (el.matches?.(".nav-book-toc-link[data-rail-file-path]")) {
      return normalizePath(el.dataset.railFilePath || "");
    }
    return "";
  }

  const FORM_FIELD_SELECTOR =
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="file"]), textarea, select';

  function isFormField(el) {
    if (!el?.matches) return false;
    return el.matches(FORM_FIELD_SELECTOR);
  }

  function escapeMarkdownLabel(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
  }

  function formatMarkdownLink(label, url) {
    const href = String(url || "").trim();
    if (!href) return "";
    const text = escapeMarkdownLabel(String(label || href).trim() || href);
    return `[${text}](${href})`;
  }

  function formatMarkdownImage(alt, url) {
    const src = String(url || "").trim();
    if (!src) return "";
    const label = escapeMarkdownLabel(String(alt || "").trim());
    return `![${label}](${src})`;
  }

  function readLinkLabel(anchor) {
    const text = String(anchor.innerText || anchor.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return text;
    const title = String(anchor.getAttribute("title") || anchor.getAttribute("aria-label") || "").trim();
    if (title) return title;
    return extractLinkValue(anchor);
  }

  function readImageAlt(img) {
    const alt = String(img.getAttribute("alt") || "").trim();
    if (alt) return alt;
    const title = String(img.getAttribute("title") || "").trim();
    if (title) return title;
    const src = extractImageValue(img);
    if (!src) return "";
    try {
      const name = decodeURIComponent(String(src).split("/").pop()?.split("?")[0] || "");
      return name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
    } catch {
      return "";
    }
  }

  function extractFormFieldValue(el) {
    if (!isFormField(el)) return "";

    const tag = el.tagName;
    if (tag === "TEXTAREA") {
      return String(el.value ?? "").trim();
    }

    if (tag === "SELECT") {
      if (el.multiple) {
        return Array.from(el.selectedOptions || [])
          .map((opt) => String(opt.value || opt.textContent || "").trim())
          .filter(Boolean)
          .join("\n");
      }
      const opt = el.selectedOptions?.[0];
      if (opt) return String(opt.value || opt.textContent || "").trim();
      return String(el.value ?? "").trim();
    }

    if (tag === "INPUT") {
      const type = String(el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") {
        if (!el.checked) return "";
        return String(el.value || "on").trim();
      }
      if (type === "radio") {
        return String(el.value ?? "").trim();
      }
      return String(el.value ?? "").trim();
    }

    return "";
  }

  function extractPickerInsertValue(el) {
    if (!el) return "";
    if (el.tagName === "IMG") {
      const imageValue = extractImageValue(el);
      if (imageValue) return formatMarkdownImage(readImageAlt(el), imageValue);
    }
    if (el.tagName === "A") {
      const linkValue = extractLinkValue(el);
      if (linkValue) return formatMarkdownLink(readLinkLabel(el), linkValue);
    }
    if (isFormField(el)) {
      return extractFormFieldValue(el);
    }
    if (isAgentCmsHost()) {
      const cmsValue = extractCmsNodeValue(el);
      if (cmsValue) return cmsValue;
    }
    return "";
  }

  function findPickerPriorityElement(raw, isExcluded) {
    if (!raw || isExcluded?.(raw)) return null;

    const img = raw.closest?.("img");
    if (img && !isExcluded?.(img)) return img;

    const link = raw.closest?.('a[href], a[data-node-path], a[data-md-href], a.wikilink');
    if (link && !isExcluded?.(link)) return link;

    const formField = raw.matches?.(FORM_FIELD_SELECTOR)
      ? raw
      : raw.closest?.(FORM_FIELD_SELECTOR);
    if (formField && !isExcluded?.(formField)) return formField;

    const labeledControl = raw.closest?.("label")?.control;
    if (isFormField(labeledControl) && !isExcluded?.(labeledControl)) return labeledControl;

    if (isAgentCmsHost()) {
      const cmsNode = raw.closest?.(
        ".menu-item[data-path], .menu-folder[data-path], .menu-card-body[data-path], .system-file-item[data-system-file], .nav-book-toc-link[data-rail-file-path]"
      );
      if (cmsNode && !isExcluded?.(cmsNode)) return cmsNode;
    }

    return null;
  }

  const DEFAULT_PICKER_BLOCK_SELECTOR = [
    "section",
    "article",
    "nav",
    "aside",
    "main",
    "p",
    "li",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "details",
    "summary",
    "figure",
    "figcaption",
    "dl",
    "dt",
    "dd",
    "caption",
    "div",
    "span",
    "[role='paragraph']",
    "[role='heading']",
    "[role='listitem']",
    "[role='article']",
    "[contenteditable='true']",
    "button",
    "a",
    "img",
    "label",
    "input",
    "textarea",
    "select"
  ].join(", ");

  const INLINE_TAGS = new Set([
    "SPAN",
    "B",
    "I",
    "EM",
    "STRONG",
    "SMALL",
    "SUB",
    "SUP",
    "CODE",
    "MARK",
    "U",
    "TIME",
    "ABBR",
    "CITE",
    "Q",
    "FONT"
  ]);

  function deepElementFromPoint(x, y, root) {
    const scope = root || document;
    if (!scope?.elementFromPoint) return null;

    let el = scope.elementFromPoint(x, y);
    if (!el) return null;

    if (el.shadowRoot) {
      const inner = deepElementFromPoint(x, y, el.shadowRoot);
      if (inner) return inner;
    }

    return el;
  }

  function describePickerElement(el) {
    if (!el?.tagName) return "";

    if (el.matches?.(".system-file-item[data-system-file]")) return ".system-file-item";
    if (el.matches?.(".menu-item[data-path]")) return ".menu-item";
    if (el.matches?.(".menu-folder[data-path]")) return ".menu-folder";
    if (el.matches?.(".menu-card-body[data-path]")) return ".menu-card-body";
    if (el.matches?.(".nav-book-toc-link[data-rail-file-path]")) return ".nav-book-toc-link";

    let label = el.tagName.toLowerCase();

    if (label === "input") {
      const type = String(el.getAttribute("type") || "text").toLowerCase();
      label = `input[type=${type}]`;
    }

    const role = String(el.getAttribute("role") || "").trim().toLowerCase();
    if (role && role !== "presentation" && role !== "none") {
      label += `[role=${role}]`;
    }

    const id = String(el.id || "").trim();
    if (id && id.length <= 40 && /^[a-zA-Z][\w-]*$/.test(id)) {
      return `${label}#${id}`;
    }

    const className = Array.from(el.classList || []).find(
      (name) => name && !/^(cms-|is-)/.test(name) && name.length <= 32
    );
    if (className) label += `.${className}`;

    return label;
  }

  function resolveTextBlockTarget(raw, { isExcluded, extractText, isFormField: isField, blockSelector } = {}) {
    if (!raw || isExcluded?.(raw)) return null;

    const priority = findPickerPriorityElement(raw, isExcluded);
    if (priority) return priority;

    const selector = String(blockSelector || DEFAULT_PICKER_BLOCK_SELECTOR).trim();

    let el = raw;
    while (el && el !== document.body && !isExcluded?.(el)) {
      const text = extractText?.(el) || "";
      if (text.length >= 1 || isField?.(el)) break;
      el = el.parentElement;
    }
    if (!el || isExcluded?.(el)) return null;
    if (isField?.(el)) return el;

    let blockMatch = null;
    let cursor = el;
    while (cursor && cursor !== document.body && !isExcluded?.(cursor)) {
      if (
        cursor.matches?.(selector) &&
        !INLINE_TAGS.has(cursor.tagName) &&
        (extractText?.(cursor) || "").length >= 1
      ) {
        blockMatch = cursor;
        break;
      }
      cursor = cursor.parentElement;
    }
    if (!blockMatch) {
      blockMatch = el.closest?.(selector);
    }
    if (blockMatch && !isExcluded?.(blockMatch) && (extractText?.(blockMatch) || "").length >= 1) {
      el = blockMatch;
    }

    while (el.parentElement && !isExcluded?.(el.parentElement)) {
      const parent = el.parentElement;
      const parentText = extractText?.(parent) || "";
      const elText = extractText?.(el) || "";
      if (parentText && parentText === elText) {
        el = parent;
        continue;
      }
      break;
    }

    if (INLINE_TAGS.has(el.tagName)) {
      const block = el.closest?.(selector);
      if (block && !isExcluded?.(block)) {
        const blockText = extractText?.(block) || "";
        const inlineText = extractText?.(el) || "";
        if (blockText && inlineText && blockText.includes(inlineText)) {
          el = block;
        }
      }
    }

    return (extractText?.(el) || "").length >= 1 ? el : null;
  }

  global.PagePickerExtract = {
    isAgentCmsHost,
    isFormField,
    extractPickerInsertValue,
    findPickerPriorityElement,
    deepElementFromPoint,
    describePickerElement,
    resolveTextBlockTarget,
    DEFAULT_PICKER_BLOCK_SELECTOR
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
