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
