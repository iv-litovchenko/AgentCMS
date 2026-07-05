import {
  splitReplyDisplayParts,
  cleanReplyTextSegment,
  hasReplyTtsBlocks
} from "./shell-reply.js?v=12";

let shellMarkdownIt = null;

function getShellMarkdownIt() {
  if (shellMarkdownIt) return shellMarkdownIt;
  if (typeof window.markdownit !== "function") return null;

  shellMarkdownIt = window.markdownit({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false
  });

  if (typeof window.markdownItGitHubAlerts === "function") {
    shellMarkdownIt.use(window.markdownItGitHubAlerts, { markers: "*" });
  }

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

  return shellMarkdownIt;
}

export function renderShellReplyMarkdown(element, markdown) {
  if (!element) return;
  const source = String(markdown || "").trim();
  element.classList.remove("shell-md");

  if (!source || source === "—") {
    element.innerHTML = "";
    element.textContent = "—";
    return;
  }

  const md = getShellMarkdownIt();
  if (!md) {
    element.textContent = source;
    return;
  }

  try {
    element.classList.add("shell-md");
    element.innerHTML = md.render(source);
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
