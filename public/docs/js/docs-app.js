(function initAgentCmsDocsApp() {
  "use strict";

  const DEFAULT_DOC_VERSION = "0.0.2";
  const DOC_VERSION_IDS = new Set(["0.0.0", "0.0.1", "0.0.2"]);
  const DOC_VERSION_STORAGE_KEY = "yamlcms.docVersion";
  const USER_GUIDE_STORAGE_KEY = "yamlcms.userGuidePath";

  const views = {
    guides: document.getElementById("view-guides"),
    api: document.getElementById("view-api"),
    mcp: document.getElementById("view-mcp")
  };
  const navButtons = document.querySelectorAll(".docs-app-nav-btn");
  const versionSelect = document.getElementById("docs-version-select");
  const statusNode = document.getElementById("docs-status");

  let docsMetaCache = null;
  let apiDocsCacheByVersion = Object.create(null);
  let mcpDocsCacheByVersion = Object.create(null);
  let userDocsIndexCache = null;
  let currentView = "guides";
  let apiVersion = DEFAULT_DOC_VERSION;
  let mcpVersion = DEFAULT_DOC_VERSION;
  let selectedGuidePath = "";

  function buildMarkdownIt() {
    if (typeof window.markdownit !== "function") return null;
    const instance = window.markdownit({
      html: false,
      linkify: true,
      breaks: true,
      typographer: true,
      highlight(source, language) {
        const code = String(source || "");
        if (language && typeof window.hljs?.highlight === "function") {
          try {
            if (!window.hljs.getLanguage(language)) {
              return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
            }
            return `<pre class="hljs"><code>${window.hljs.highlight(code, { language }).value}</code></pre>`;
          } catch {
            /* fall through */
          }
        }
        return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
      }
    });
    if (typeof window.markdownItGitHubAlerts === "function") {
      instance.use(window.markdownItGitHubAlerts, { markers: "*" });
    }
    if (typeof window.markdownItTaskLists === "function") {
      instance.use(window.markdownItTaskLists);
    }
    window.UserDocsMarkdownPreview?.applyGuideMarkdownPlugins?.(instance);
    window.UserDocsMarkdownPreview?.configureMarkdownIt?.(instance, "");
    return instance;
  }

  let md = buildMarkdownIt();

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeDocVersion(version, fallback = DEFAULT_DOC_VERSION) {
    const value = String(version || "").trim();
    return DOC_VERSION_IDS.has(value) ? value : fallback;
  }

  function readQueryView() {
    try {
      const params = new URLSearchParams(window.location.search);
      const view = String(params.get("view") || "guides").trim().toLowerCase();
      if (view === "api" || view === "mcp" || view === "guides") return view;
    } catch {
      /* ignore */
    }
    return "guides";
  }

  function setQueryView(view) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
  }

  function showStatus(message) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.toggle("hidden", !message);
  }

  function setupDocsSearch({ searchInput, content, emptyHint }) {
    if (!searchInput || !content) return;
    function filterDocs() {
      const q = String(searchInput.value || "").trim().toLowerCase();
      let visibleEndpoints = 0;
      content.querySelectorAll(".docs-accordion").forEach((accordion) => {
        let groupVisible = 0;
        accordion.querySelectorAll(".docs-endpoint").forEach((endpoint) => {
          const hay = String(endpoint.dataset.docsSearch || endpoint.textContent || "").toLowerCase();
          const groupHay = String(accordion.dataset.docsGroup || "").toLowerCase();
          const match = !q || hay.includes(q) || groupHay.includes(q);
          endpoint.classList.toggle("hidden", !match);
          endpoint.hidden = !match;
          if (match) groupVisible += 1;
        });
        const showGroup = groupVisible > 0;
        accordion.classList.toggle("hidden", !showGroup);
        accordion.hidden = !showGroup;
        if (showGroup && q) accordion.open = true;
        visibleEndpoints += groupVisible;
      });
      if (emptyHint) {
        const showEmpty = Boolean(q) && visibleEndpoints === 0;
        emptyHint.classList.toggle("hidden", !showEmpty);
        emptyHint.hidden = !showEmpty;
      }
    }
    searchInput.addEventListener("input", filterDocs);
    return () => {
      searchInput.value = "";
      filterDocs();
    };
  }

  const resetApiSearch = setupDocsSearch({
    searchInput: document.getElementById("api-docs-search"),
    content: document.getElementById("api-docs-content"),
    emptyHint: document.getElementById("api-docs-search-empty")
  });

  const resetMcpSearch = setupDocsSearch({
    searchInput: document.getElementById("mcp-docs-search"),
    content: document.getElementById("mcp-docs-content"),
    emptyHint: document.getElementById("mcp-docs-search-empty")
  });

  async function fetchDocsMeta(force = false) {
    if (docsMetaCache && !force) return docsMetaCache;
    const response = await fetch("/api/docs-meta", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    docsMetaCache = await response.json();
    return docsMetaCache;
  }

  function fillVersionSelect(selectedVersion, countKind) {
    if (!versionSelect) return;
    const version = normalizeDocVersion(selectedVersion);
    versionSelect.replaceChildren();
    const meta = docsMetaCache;
    if (!meta?.versions?.length) {
      versionSelect.classList.add("hidden");
      return;
    }
    versionSelect.classList.remove("hidden");
    for (const item of meta.versions) {
      const option = document.createElement("option");
      option.value = item.id;
      let label = item.label;
      if (countKind === "api" && Number.isFinite(item.apiEndpointCount)) {
        label += ` — ${item.apiEndpointCount} методов`;
      } else if (countKind === "mcp" && Number.isFinite(item.mcpToolCount)) {
        label += ` — ${item.mcpToolCount} tools`;
      }
      option.textContent = label;
      if (item.id === version) option.selected = true;
      versionSelect.appendChild(option);
    }
  }

  function createApiEndpointNode(endpoint) {
    const node = document.createElement("article");
    node.className = "docs-endpoint";
    const method = String(endpoint.method || "GET").toUpperCase();
    const headNode = document.createElement("div");
    headNode.className = "docs-endpoint-head";
    const methodNode = document.createElement("span");
    methodNode.className = `docs-method docs-method-${method.toLowerCase()}`;
    methodNode.textContent = method;
    const pathNode = document.createElement("code");
    pathNode.className = "docs-path";
    pathNode.textContent = endpoint.path || "";
    headNode.append(methodNode, pathNode);
    const descNode = document.createElement("p");
    descNode.className = "docs-desc";
    descNode.textContent = endpoint.description || "";
    const metaNode = document.createElement("div");
    metaNode.className = "docs-meta";
    if (endpoint.query?.length) {
      metaNode.innerHTML += `<div><strong>Query:</strong> <code>${escapeHtml(endpoint.query.join(", "))}</code></div>`;
    }
    if (endpoint.body) {
      metaNode.innerHTML += `<div><strong>Body:</strong> <code>${escapeHtml(String(endpoint.body))}</code></div>`;
    }
    if (endpoint.response) {
      metaNode.innerHTML += `<div><strong>Response:</strong> <code>${escapeHtml(String(endpoint.response))}</code></div>`;
    }
    node.append(headNode, descNode, metaNode);
    node.dataset.docsSearch = [method, endpoint.path, endpoint.description, endpoint.query, endpoint.body, endpoint.response]
      .flat()
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return node;
  }

  function createMcpToolNode(tool) {
    const node = document.createElement("article");
    node.className = "docs-endpoint";
    const headNode = document.createElement("div");
    headNode.className = "docs-endpoint-head";
    const badgeNode = document.createElement("span");
    badgeNode.className = "docs-method docs-method-mcp";
    badgeNode.textContent = "TOOL";
    const nameNode = document.createElement("code");
    nameNode.className = "docs-path";
    nameNode.textContent = tool.name || "";
    headNode.append(badgeNode, nameNode);
    const descNode = document.createElement("p");
    descNode.className = "docs-desc";
    descNode.textContent = tool.description || "";
    const metaNode = document.createElement("div");
    metaNode.className = "docs-meta";
    const paramsRow = document.createElement("div");
    paramsRow.innerHTML = "<strong>Parameters:</strong> ";
    const paramsCode = document.createElement("code");
    paramsCode.textContent = tool.parameters || "—";
    paramsRow.appendChild(paramsCode);
    metaNode.appendChild(paramsRow);
    if (tool.http) {
      const httpRow = document.createElement("div");
      httpRow.innerHTML = "<strong>HTTP:</strong> ";
      const httpCode = document.createElement("code");
      httpCode.textContent = tool.http;
      httpRow.appendChild(httpCode);
      metaNode.appendChild(httpRow);
    }
    node.append(headNode, descNode, metaNode);
    node.dataset.docsSearch = [tool.name, tool.description, tool.parameters, tool.http].filter(Boolean).join(" ").toLowerCase();
    return node;
  }

  async function fetchApiDocs(version, force = false) {
    const v = normalizeDocVersion(version);
    if (force) delete apiDocsCacheByVersion[v];
    if (!apiDocsCacheByVersion[v]) {
      const response = await fetch(`/api/docs?version=${encodeURIComponent(v)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      apiDocsCacheByVersion[v] = await response.json();
    }
    return apiDocsCacheByVersion[v];
  }

  async function fetchMcpDocs(version, force = false) {
    const v = normalizeDocVersion(version);
    if (force) delete mcpDocsCacheByVersion[v];
    if (!mcpDocsCacheByVersion[v]) {
      const response = await fetch(`/api/mcp-docs?version=${encodeURIComponent(v)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mcpDocsCacheByVersion[v] = await response.json();
    }
    return mcpDocsCacheByVersion[v];
  }

  function renderApiDocs(data) {
    const subtitle = document.getElementById("api-docs-subtitle");
    const notes = document.getElementById("api-docs-notes");
    const content = document.getElementById("api-docs-content");
    if (subtitle) {
      const ver = data.version || apiVersion;
      const label = data.versionLabel ? ` · ${data.versionLabel}` : "";
      subtitle.textContent = `${data.baseUrl || "/api"} · v${ver}${label} · ${(data.groups || []).length} разделов`;
    }
    if (notes) notes.innerHTML = (data.notes || []).map((note) => `<p>${escapeHtml(note)}</p>`).join("");
    if (!content) return;
    content.replaceChildren();
    for (const group of data.groups || []) {
      const endpoints = group.endpoints || [];
      const accordion = document.createElement("details");
      accordion.className = "docs-accordion";
      accordion.dataset.docsGroup = String(group.title || "").toLowerCase();
      const summary = document.createElement("summary");
      summary.className = "docs-accordion-summary";
      summary.innerHTML = `<span>${escapeHtml(group.title || "")}</span><span class="docs-accordion-count">${endpoints.length}</span>`;
      const body = document.createElement("div");
      body.className = "docs-accordion-body";
      for (const endpoint of endpoints) body.appendChild(createApiEndpointNode(endpoint));
      accordion.append(summary, body);
      content.appendChild(accordion);
    }
    resetApiSearch?.();
  }

  function renderMcpDocs(data) {
    const subtitle = document.getElementById("mcp-docs-subtitle");
    const notes = document.getElementById("mcp-docs-notes");
    const config = document.getElementById("mcp-docs-config");
    const content = document.getElementById("mcp-docs-content");
    if (subtitle) {
      const ver = data.version || mcpVersion;
      const label = data.versionLabel ? ` · ${data.versionLabel}` : "";
      const parts = [`v${ver}${label}`, data.subtitle, data.packagePath].filter(Boolean);
      subtitle.textContent = parts.join(" · ");
    }
    if (notes) notes.innerHTML = (data.notes || []).map((note) => `<p>${escapeHtml(note)}</p>`).join("");
    if (config) {
      let handoff = String(data.configHandoff || "").trim();
      if (!handoff && data.cursorConfig) {
        const example = data.cursorConfigExample || { mcpServers: { "agent-cms": data.cursorConfig } };
        handoff = JSON.stringify(example, null, 2);
      }
      if (handoff) {
        config.textContent = handoff;
        config.classList.remove("hidden");
      } else {
        config.classList.add("hidden");
      }
    }
    if (!content) return;
    content.replaceChildren();
    for (const group of data.groups || []) {
      const tools = group.tools || [];
      const accordion = document.createElement("details");
      accordion.className = "docs-accordion";
      accordion.dataset.docsGroup = String(group.title || "").toLowerCase();
      const summary = document.createElement("summary");
      summary.className = "docs-accordion-summary";
      summary.innerHTML = `<span>${escapeHtml(group.title || "")}</span><span class="docs-accordion-count">${tools.length}</span>`;
      const body = document.createElement("div");
      body.className = "docs-accordion-body";
      for (const tool of tools) body.appendChild(createMcpToolNode(tool));
      accordion.append(summary, body);
      content.appendChild(accordion);
    }
    resetMcpSearch?.();
  }

  async function fetchUserDocsIndex(force = false) {
    if (userDocsIndexCache && !force) return userDocsIndexCache;
    const response = await fetch("/api/user-docs-index", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    userDocsIndexCache = await response.json();
    return userDocsIndexCache;
  }

  async function fetchUserGuideMarkdown(path) {
    const response = await fetch(`/api/user-docs?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  function renderMarkdown(container, markdown, guideRelPath = "") {
    if (!container) return;
    if (md) {
      if (window.UserDocsMarkdownPreview?.configureMarkdownIt) {
        window.UserDocsMarkdownPreview.configureMarkdownIt(md, guideRelPath);
      }
      container.innerHTML = md.render(String(markdown || ""), {
        nodePath: window.UserDocsMarkdownPreview?.resolveGuideNodePath?.(guideRelPath) || "",
        useImageThumbs: true
      });
      window.UserDocsMarkdownPreview?.hydrateGuideMarkdownRoot?.(container, guideRelPath);
      container.querySelectorAll("a[href^='http']").forEach((link) => {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
      if (typeof window.hljs?.highlightElement === "function") {
        container.querySelectorAll("pre code").forEach((block) => {
          if (block.closest("pre.hljs")) return;
          try {
            window.hljs.highlightElement(block);
          } catch {
            /* ignore */
          }
        });
      }
      return;
    }
    container.innerHTML = `<pre>${escapeHtml(markdown)}</pre>`;
  }

  async function loadGuide(path) {
    selectedGuidePath = path;
    try {
      localStorage.setItem(USER_GUIDE_STORAGE_KEY, path);
    } catch {
      /* ignore */
    }
    const content = document.getElementById("docs-guides-content");
    content.innerHTML = "<p>Загрузка…</p>";
    const markdown = await fetchUserGuideMarkdown(path);
    renderMarkdown(content, markdown, path);
    document.querySelectorAll(".docs-guides-list button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.path === path);
    });
  }

  async function renderGuidesList() {
    const list = document.getElementById("docs-guides-list");
    if (!list) return;
    const index = await fetchUserDocsIndex();
    list.replaceChildren();
    const guides = index.guides || [];
    let path =
      selectedGuidePath ||
      (() => {
        try {
          return localStorage.getItem(USER_GUIDE_STORAGE_KEY) || "";
        } catch {
          return "";
        }
      })() ||
      index.defaultPath ||
      guides[0]?.path ||
      "";
    if (!guides.some((g) => g.path === path)) path = index.defaultPath || guides[0]?.path || "";
    for (const guide of guides) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.path = guide.path;
      btn.textContent = guide.label || guide.awnName || guide.path;
      btn.addEventListener("click", () => void loadGuide(guide.path).catch((e) => showStatus(e.message)));
      li.appendChild(btn);
      list.appendChild(li);
    }
    if (path) await loadGuide(path);
  }

  function initMcpHelpToggle() {
    const helpBtn = document.getElementById("mcp-docs-help-btn");
    const helpPanel = document.getElementById("mcp-docs-help-panel");
    const toolsWrap = document.getElementById("mcp-docs-tools-wrap");
    const config = document.getElementById("mcp-docs-config");
    const notes = document.getElementById("mcp-docs-notes");
    if (!helpBtn || !helpPanel || !toolsWrap) return;
    let helpOpen = false;
    function setHelpOpen(open) {
      helpOpen = Boolean(open);
      helpPanel.hidden = !helpOpen;
      helpPanel.classList.toggle("hidden", !helpOpen);
      toolsWrap.classList.toggle("hidden", helpOpen);
      toolsWrap.hidden = helpOpen;
      if (config) config.classList.toggle("hidden", helpOpen || !String(config.textContent || "").trim());
      if (notes) notes.classList.toggle("hidden", helpOpen);
      helpBtn.textContent = helpOpen ? "Список tools" : "Помощь MCP";
      helpBtn.setAttribute("aria-expanded", helpOpen ? "true" : "false");
    }
    helpBtn.addEventListener("click", () => setHelpOpen(!helpOpen));
    setHelpOpen(false);
  }

  async function loadApiView() {
    try {
      const stored = localStorage.getItem(DOC_VERSION_STORAGE_KEY);
      apiVersion = normalizeDocVersion(stored || DEFAULT_DOC_VERSION);
    } catch {
      apiVersion = DEFAULT_DOC_VERSION;
    }
    await fetchDocsMeta();
    fillVersionSelect(apiVersion, "api");
    renderApiDocs(await fetchApiDocs(apiVersion));
  }

  async function loadMcpView() {
    try {
      const stored = localStorage.getItem(DOC_VERSION_STORAGE_KEY);
      mcpVersion = normalizeDocVersion(stored || DEFAULT_DOC_VERSION);
    } catch {
      mcpVersion = DEFAULT_DOC_VERSION;
    }
    await fetchDocsMeta();
    fillVersionSelect(mcpVersion, "mcp");
    renderMcpDocs(await fetchMcpDocs(mcpVersion));
  }

  async function activateView(view) {
    currentView = view;
    setQueryView(view);
    showStatus("");
    navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === view));
    Object.entries(views).forEach(([key, node]) => {
      if (!node) return;
      node.classList.toggle("hidden", key !== view);
    });
    if (versionSelect) versionSelect.classList.toggle("hidden", view === "guides");

    try {
      if (view === "guides") await renderGuidesList();
      else if (view === "api") await loadApiView();
      else if (view === "mcp") await loadMcpView();
    } catch (error) {
      showStatus(String(error?.message || error));
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => void activateView(btn.dataset.view || "guides"));
  });

  versionSelect?.addEventListener("change", () => {
    const version = normalizeDocVersion(versionSelect.value);
    try {
      localStorage.setItem(DOC_VERSION_STORAGE_KEY, version);
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        if (currentView === "api") {
          apiVersion = version;
          renderApiDocs(await fetchApiDocs(version, true));
        } else if (currentView === "mcp") {
          mcpVersion = version;
          renderMcpDocs(await fetchMcpDocs(version, true));
        }
      } catch (error) {
        showStatus(String(error?.message || error));
      }
    })();
  });

  initMcpHelpToggle();
  void activateView(readQueryView());
})();
