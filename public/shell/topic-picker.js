function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").trim();
}

function basenameFromPath(value) {
  const path = normalizePath(value);
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

function matchesQuery(...parts) {
  return (query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return parts.some((part) => String(part || "").toLowerCase().includes(q));
  };
}

function filterMenuNode(node, query) {
  if (!node) return null;
  const q = String(query || "").trim();
  if (!q) return node;

  const filteredSections = (node.sections || [])
    .map((section) => filterMenuNode(section, q))
    .filter(Boolean);

  const filteredItems = (node.items || []).filter((item) =>
    matchesQuery(item.label, item.path)(q)
  );

  const selfMatch = matchesQuery(node.title, node.indexPath)(q);

  if (selfMatch || filteredSections.length > 0 || filteredItems.length > 0) {
    return {
      ...node,
      sections: filteredSections,
      items: filteredItems
    };
  }

  return null;
}

function findMenuLabel(menu, targetPath, cache = new Map()) {
  const path = normalizePath(targetPath);
  if (!path) return "";
  if (cache.has(path)) return cache.get(path);

  let found = "";

  const walk = (node, prefix = "") => {
    if (!node || found) return;
    const indexPath = normalizePath(node.indexPath);
    if (indexPath === path) {
      found = node.title || basenameFromPath(path);
      return;
    }
    for (const item of node.items || []) {
      const itemPath = normalizePath(item.path);
      cache.set(itemPath, item.label || basenameFromPath(itemPath));
      if (itemPath === path) {
        found = item.label || basenameFromPath(itemPath);
        return;
      }
    }
    for (const section of node.sections || []) {
      walk(section, prefix);
      if (found) return;
    }
  };

  walk({ ...menu, sections: menu.sections || [], items: menu.items || [] });
  if (menu.serviceTree) walk(menu.serviceTree);
  if (menu.containerTree) walk(menu.containerTree);
  if (!found) found = basenameFromPath(path).replace(/\.md$/i, "");
  cache.set(path, found);
  return found;
}

export function createTopicPicker({
  rootEl,
  triggerEl,
  labelEl,
  pathEl,
  popoverEl,
  searchEl,
  treeEl,
  hiddenInputEl,
  getAgentId,
  onChange
}) {
  let menuCache = null;
  let menuAgentId = "";
  let selectedPath = "";
  let open = false;
  let searchQuery = "";
  let searchTimer = null;
  let searchResults = [];
  const collapsed = new Set();

  function apiUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    const agentId = getAgentId?.();
    if (agentId) url.searchParams.set("agent", agentId);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  function setOpen(next) {
    open = Boolean(next);
    popoverEl?.classList.toggle("hidden", !open);
    triggerEl?.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      void refresh().then(() => {
        searchEl?.focus();
        renderTree();
      });
    }
  }

  function updateTrigger() {
    const path = normalizePath(selectedPath || hiddenInputEl?.value || "");
    const label = menuCache ? findMenuLabel(menuCache, path) : basenameFromPath(path);
    if (labelEl) labelEl.textContent = label || "Выберите тему";
    if (pathEl) pathEl.textContent = path || "manifest.md не выбран";
    if (hiddenInputEl) hiddenInputEl.value = path;
    triggerEl?.classList.toggle("is-empty", !path);
  }

  function selectPath(path) {
    selectedPath = normalizePath(path);
    updateTrigger();
    setOpen(false);
    if (typeof onChange === "function") onChange(selectedPath);
  }

  async function fetchMenu(agentId) {
    const response = await fetch(apiUrl("/api/menu", { maxDepth: "10" }));
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchMenuBranch(folderPath) {
    const response = await fetch(
      apiUrl("/api/menu/branch", {
        folderPath,
        maxDepth: "10",
        branchDepth: "4"
      })
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchSearch(query) {
    const response = await fetch(apiUrl("/api/search", { q: query, scope: "filename", limit: "20" }));
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  }

  async function refresh() {
    const agentId = getAgentId?.() || "";
    if (!agentId) {
      menuCache = null;
      menuAgentId = "";
      return;
    }
    if (menuCache && menuAgentId === agentId) return;
    menuCache = await fetchMenu(agentId);
    menuAgentId = agentId;
    updateTrigger();
  }

  function folderKey(node, depth) {
    return normalizePath(node?.folderPath || node?.indexPath || node?.title || `depth-${depth}`);
  }

  function hasChildren(node) {
    return Boolean(
      (node?.sections || []).length ||
      (node?.items || []).length ||
      node?.serviceTree ||
      node?.containerTree ||
      node?.menuDepthLimited
    );
  }

  function createToggle(isExpanded, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shell-topic-tree-toggle";
    btn.textContent = isExpanded ? "▾" : "▸";
    btn.setAttribute("aria-label", isExpanded ? "Свернуть" : "Развернуть");
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return btn;
  }

  function createTopicButton({ label, path, meta = "" }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shell-topic-tree-item";
    if (normalizePath(path) === normalizePath(selectedPath)) btn.classList.add("is-selected");

    const title = document.createElement("span");
    title.className = "shell-topic-tree-item-label";
    title.textContent = label || basenameFromPath(path);

    const sub = document.createElement("span");
    sub.className = "shell-topic-tree-item-path";
    sub.textContent = meta || path;

    btn.append(title, sub);
    btn.addEventListener("click", () => selectPath(path));
    return btn;
  }

  function renderSearchResults(container) {
    if (!searchQuery.trim() || searchResults.length === 0) return;
    const block = document.createElement("div");
    block.className = "shell-topic-search-results";

    const title = document.createElement("div");
    title.className = "shell-topic-tree-section-label";
    title.textContent = "Результаты поиска";
    block.appendChild(title);

    for (const item of searchResults) {
      const path = normalizePath(item.nodePath || item.filePath);
      if (!path) continue;
      block.appendChild(
        createTopicButton({
          label: item.title || basenameFromPath(path),
          path,
          meta: path
        })
      );
    }

    container.appendChild(block);
  }

  async function ensureBranchLoaded(node, folderPath) {
    if (!node?.menuDepthLimited || node.__branchLoaded) return;
    const branch = await fetchMenuBranch(folderPath);
    Object.assign(node, branch, { menuDepthLimited: false, __branchLoaded: true });
  }

  function renderNode(node, container, depth = 0) {
    if (!node) return;

    const section = document.createElement("div");
    section.className = "shell-topic-tree-section";
    section.style.setProperty("--depth", String(depth));

    const header = document.createElement("div");
    header.className = "shell-topic-tree-section-head";

    const key = folderKey(node, depth);
    const expanded = searchQuery.trim() ? true : !collapsed.has(key);
    const canExpand = hasChildren(node);

    if (canExpand) {
      header.appendChild(
        createToggle(expanded, () => {
          if (collapsed.has(key)) collapsed.delete(key);
          else collapsed.add(key);
          renderTree();
        })
      );
    } else {
      const spacer = document.createElement("span");
      spacer.className = "shell-topic-tree-toggle shell-topic-tree-toggle--spacer";
      header.appendChild(spacer);
    }

    if (node.indexPath) {
      const areaBtn = createTopicButton({
        label: node.title || basenameFromPath(node.indexPath),
        path: node.indexPath
      });
      areaBtn.classList.add("shell-topic-tree-folder");
      header.appendChild(areaBtn);
    } else if (node.title) {
      const title = document.createElement("span");
      title.className = "shell-topic-tree-section-title";
      title.textContent = node.title;
      header.appendChild(title);
    }

    section.appendChild(header);

    if (!expanded) {
      container.appendChild(section);
      return;
    }

    const body = document.createElement("div");
    body.className = "shell-topic-tree-section-body";

    for (const item of node.items || []) {
      if (!item?.path) continue;
      body.appendChild(
        createTopicButton({
          label: item.label || basenameFromPath(item.path),
          path: item.path
        })
      );
    }

    for (const child of node.sections || []) {
      renderNode(child, body, depth + 1);
    }

    if (node.menuDepthLimited && !node.__branchLoaded) {
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "shell-topic-tree-load";
      loadBtn.textContent = "Загрузить вложенные темы…";
      loadBtn.addEventListener("click", async () => {
        loadBtn.disabled = true;
        loadBtn.textContent = "Загрузка…";
        try {
          await ensureBranchLoaded(node, normalizePath(node.folderPath || node.indexPath || "."));
          renderTree();
        } catch (error) {
          loadBtn.textContent = error.message || "Ошибка загрузки";
          loadBtn.disabled = false;
        }
      });
      body.appendChild(loadBtn);
    }

    section.appendChild(body);
    container.appendChild(section);
  }

  function renderTree() {
    if (!treeEl) return;
    treeEl.innerHTML = "";

    if (!menuCache) {
      treeEl.innerHTML = '<div class="shell-topic-empty">Загрузка дерева…</div>';
      return;
    }

    renderSearchResults(treeEl);

    const q = searchQuery.trim();
    const workspace = filterMenuNode(
      {
        title: menuCache.title || "Workspaces",
        sections: menuCache.sections || [],
        items: menuCache.items || [],
        indexPath: menuCache.indexPath || null,
        folderPath: "."
      },
      q
    );

    if (menuCache.serviceTree) {
      const service = filterMenuNode(
        { title: "Агент и пользователи", ...(menuCache.serviceTree || {}) },
        q
      );
      if (service) renderNode(service, treeEl, 0);
    }

    if (menuCache.containerTree) {
      const container = filterMenuNode(
        { title: "Контейнер", ...(menuCache.containerTree || {}) },
        q
      );
      if (container) renderNode(container, treeEl, 0);
    }

    if (workspace) {
      renderNode(workspace, treeEl, 0);
    } else if (!searchResults.length) {
      treeEl.insertAdjacentHTML("beforeend", '<div class="shell-topic-empty">Ничего не найдено</div>');
    }
  }

  function scheduleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      searchQuery = String(searchEl?.value || "").trim();
      if (searchQuery.length >= 2) {
        try {
          searchResults = await fetchSearch(searchQuery);
        } catch {
          searchResults = [];
        }
      } else {
        searchResults = [];
      }
      renderTree();
    }, 220);
  }

  triggerEl?.addEventListener("click", () => setOpen(!open));

  searchEl?.addEventListener("input", scheduleSearch);

  document.addEventListener("click", (event) => {
    if (!open || !rootEl) return;
    if (rootEl.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) setOpen(false);
  });

  return {
    setValue(path) {
      selectedPath = normalizePath(path);
      updateTrigger();
    },
    getValue() {
      return normalizePath(selectedPath || hiddenInputEl?.value || "");
    },
    async refresh() {
      menuAgentId = "";
      await refresh();
      renderTree();
    },
    setVisible(visible) {
      rootEl && (rootEl.style.display = visible ? "" : "none");
    }
  };
}
