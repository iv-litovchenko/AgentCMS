(function initWorkspaceIndexPanel() {
  const summaryStatsNode = document.getElementById("menu-workspace-index-stats");
  const semanticStatusNode = document.getElementById("menu-semantic-index-status");
  const semanticRebuildBtn = document.getElementById("menu-semantic-index-rebuild-btn");
  const semanticShowBtn = document.getElementById("menu-semantic-index-show-btn");
  const storageStatusNode = document.getElementById("menu-storage-index-status");
  const storageRebuildBtn = document.getElementById("menu-storage-index-rebuild-btn");
  const storageShowBtn = document.getElementById("menu-storage-index-show-btn");
  const monitorSummaryNode = document.getElementById("menu-workspace-index-monitor-summary");
  const monitorGridNode = document.getElementById("menu-workspace-index-monitor-grid");
  if (
    !summaryStatsNode ||
    !semanticStatusNode ||
    !semanticRebuildBtn ||
    !storageStatusNode ||
    !storageRebuildBtn
  ) {
    return;
  }

  const ACTIVE_AGENT_STORAGE_KEY = "agentcms.activeAgent.v1";
  const catalogModal = document.getElementById("workspace-index-catalog-modal");
  const catalogTitle = document.getElementById("workspace-index-catalog-title");
  const catalogSubtitle = document.getElementById("workspace-index-catalog-subtitle");
  const catalogQ = document.getElementById("workspace-index-catalog-q");
  const catalogPrefix = document.getElementById("workspace-index-catalog-prefix");
  const catalogField = document.getElementById("workspace-index-catalog-field");
  const catalogMeta = document.getElementById("workspace-index-catalog-meta");
  const catalogList = document.getElementById("workspace-index-catalog-list");
  const catalogPage = document.getElementById("workspace-index-catalog-page");
  const catalogPrevBtn = document.getElementById("workspace-index-catalog-prev-btn");
  const catalogNextBtn = document.getElementById("workspace-index-catalog-next-btn");
  const catalogCloseBtn = document.getElementById("workspace-index-catalog-close-btn");
  const catalogRefreshBtn = document.getElementById("workspace-index-catalog-refresh-btn");

  const catalogState = {
    mode: "vector",
    offset: 0,
    limit: 30,
    loading: false
  };

  function getActiveAgentId() {
    const urlAgent = new URLSearchParams(window.location.search).get("agent");
    if (urlAgent) return urlAgent;
    try {
      return localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY) || "main";
    } catch {
      return "main";
    }
  }

  function buildApiUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("agent", getActiveAgentId());
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function healthLabel(health) {
    if (health === "ok") return "ok";
    if (health === "stale") return "stale";
    if (health === "partial") return "partial";
    return "empty";
  }

  function formatLayerStatus(layer, data) {
    if (!data?.ready) return data?.hint || "Не построен";
    const parts = [];
    if (layer === "semantic") {
      parts.push(`${data.fileCount || 0} файлов · ${data.chunkCount || 0} фрагм.`);
    } else {
      parts.push(`${data.recordCount || 0} записей · ${data.fieldCount || 0} полей`);
    }
    parts.push(data.builtAge || "—");
    if (data.indexSizeLabel) parts.push(data.indexSizeLabel);
    if (data.lastRebuildLabel) parts.push(`сборка ${data.lastRebuildLabel}`);
    if ((data.staleCount || 0) > 0) parts.push(`устарело ${data.staleCount}`);
    if ((data.newFilesCount || 0) > 0) parts.push(`новых ${data.newFilesCount}`);
    return parts.join(" · ");
  }

  function renderMonitorCard(title, layer) {
    if (!layer) return "";
    const badge = healthLabel(layer.health);
    const lines = [];
    if (!layer.ready) {
      lines.push(layer.hint || "Индекс не построен");
    } else {
      if (title.startsWith("Смысл")) {
        lines.push(`${layer.fileCount || 0} файлов · ${layer.chunkCount || 0} фрагментов`);
      } else {
        lines.push(`${layer.recordCount || 0} записей · ${layer.fieldCount || 0} полей`);
      }
      lines.push(`обновлён ${layer.builtAge || "—"} · ${layer.indexSizeLabel || "—"}`);
      if (layer.lastRebuildLabel) lines.push(`полная сборка: ${layer.lastRebuildLabel}`);
      if ((layer.staleCount || 0) > 0) lines.push(`устарело: ${layer.staleCount} файл(ов)`);
      if ((layer.newFilesCount || 0) > 0) lines.push(`не в индексе: ${layer.newFilesCount} новых`);
      if ((layer.missingCount || 0) > 0) lines.push(`в индексе, но удалены: ${layer.missingCount}`);
      if (Array.isArray(layer.staleSamples) && layer.staleSamples.length) {
        lines.push(`пример: ${layer.staleSamples.slice(0, 2).join(", ")}`);
      }
    }
    return `<article class="menu-index-monitor-card">
      <div class="menu-index-monitor-card-head">
        <span class="menu-index-monitor-card-title">${escapeHtml(title)}</span>
        <span class="menu-index-monitor-badge is-${escapeHtml(badge)}">${escapeHtml(badge)}</span>
      </div>
      <ul class="menu-index-monitor-lines">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
    </article>`;
  }

  function renderMonitor(monitor) {
    if (monitorSummaryNode) {
      const health = healthLabel(monitor?.summary?.health);
      monitorSummaryNode.textContent = monitor?.summary?.message || "—";
      monitorSummaryNode.className = `menu-index-monitor-summary is-${health}`;
    }
    if (monitorGridNode) {
      monitorGridNode.innerHTML = [
        renderMonitorCard("Смысл (RAG)", monitor?.semantic),
        renderMonitorCard("Поля (SQL-like)", monitor?.storage)
      ].join("");
    }
  }

  function updateSummaryFromMonitor(monitor) {
    const semantic = monitor?.semantic;
    const storage = monitor?.storage;
    const parts = [];
    if (semantic?.ready) {
      const mark = semantic.health === "stale" ? "!" : "";
      parts.push(`смысл ${semantic.chunkCount || 0}${mark}`);
    }
    if (storage?.ready) {
      const mark = storage.health === "stale" ? "!" : "";
      parts.push(`поля ${storage.recordCount || 0}${mark}`);
    }
    summaryStatsNode.textContent = parts.length ? parts.join(" · ") : "нет индексов";
    summaryStatsNode.classList.toggle("is-empty", !parts.length);
    summaryStatsNode.classList.remove("is-error");
    if (monitor?.summary?.health === "stale") {
      summaryStatsNode.classList.add("is-error");
    }
  }

  async function refreshStatus() {
    try {
      const monitorRes = await fetch(buildApiUrl("/api/workspace-index/monitor"));
      const monitor = await monitorRes.json();
      if (!monitorRes.ok) throw new Error(monitor.error || monitorRes.statusText);

      semanticStatusNode.textContent = formatLayerStatus("semantic", monitor.semantic);
      storageStatusNode.textContent = formatLayerStatus("storage", monitor.storage);
      renderMonitor(monitor);
      updateSummaryFromMonitor(monitor);
    } catch (error) {
      summaryStatsNode.textContent = "ошибка";
      summaryStatsNode.classList.add("is-error");
      if (monitorSummaryNode) {
        monitorSummaryNode.textContent = String(error.message || error);
        monitorSummaryNode.className = "menu-index-monitor-summary is-error";
      }
      semanticStatusNode.textContent = String(error.message || error);
    }
  }

  async function runRebuild(url, statusNode, okLabel) {
    statusNode.textContent = "Сборка…";
    const response = await fetch(buildApiUrl(url), { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.details || response.statusText);
    statusNode.textContent = okLabel(data);
    await refreshStatus();
  }

  function renderVectorItems(items) {
    if (!items.length) {
      return '<p class="workspace-index-catalog-empty">Нет фрагментов по текущему фильтру.</p>';
    }
    return items
      .map((item) => {
        const head = Array.isArray(item.vector?.head) ? item.vector.head.join(", ") : "—";
        return `<article class="workspace-index-catalog-item">
          <div class="workspace-index-catalog-item-head">
            <code>${escapeHtml(item.path)}</code>
            <span class="workspace-index-catalog-badge">#${escapeHtml(item.chunkIndex)}</span>
          </div>
          <p class="workspace-index-catalog-preview">${escapeHtml(item.preview || "")}</p>
          <div class="workspace-index-catalog-vector">
            dims ${escapeHtml(item.vector?.dims ?? 0)} · norm ${escapeHtml(item.vector?.norm ?? "—")} · head [${escapeHtml(head)}]
          </div>
        </article>`;
      })
      .join("");
  }

  function renderFieldItems(items) {
    if (!items.length) {
      return '<p class="workspace-index-catalog-empty">Нет записей по текущему фильтру.</p>';
    }
    return items
      .map((item) => {
        const fields = Object.entries(item.fields || {})
          .map(
            ([key, value]) =>
              `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`
          )
          .join("");
        return `<article class="workspace-index-catalog-item">
          <div class="workspace-index-catalog-item-head"><code>${escapeHtml(item.path)}</code></div>
          <table class="workspace-index-catalog-fields"><tbody>${fields || "<tr><td>—</td></tr>"}</tbody></table>
        </article>`;
      })
      .join("");
  }

  function populateFieldSelect(fieldCatalog, selected) {
    if (!catalogField) return;
    const current = selected || catalogField.value || "";
    catalogField.innerHTML = '<option value="">Все поля</option>';
    for (const name of fieldCatalog || []) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      catalogField.appendChild(option);
    }
    catalogField.value = current;
  }

  async function loadCatalogPage() {
    if (!catalogModal || catalogState.loading) return;
    catalogState.loading = true;
    catalogList.innerHTML = '<p class="workspace-index-catalog-empty">Загрузка…</p>';

    const params = {
      limit: catalogState.limit,
      offset: catalogState.offset,
      q: catalogQ?.value?.trim() || "",
      pathPrefix: catalogPrefix?.value?.trim() || ""
    };

    const endpoint =
      catalogState.mode === "vector" ? "/api/search/semantic/catalog" : "/api/storage-index/catalog";
    if (catalogState.mode === "fields" && catalogField?.value) {
      params.field = catalogField.value;
    }

    try {
      const response = await fetch(buildApiUrl(endpoint, params));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);

      if (catalogState.mode === "vector") {
        catalogTitle.textContent = "~show-vector";
        catalogSubtitle.textContent = data.ready
          ? `${data.model || "hash-tfidf"} · ${data.chunkCount || 0} фрагм. · offline`
          : data.hint || "Индекс не построен";
        catalogMeta.textContent = data.ready
          ? `Показано ${data.items.length} из ${data.total} · обновлён ${
              data.builtAt ? new Date(data.builtAt).toLocaleString("ru-RU") : "—"
            }`
          : "";
        catalogList.innerHTML = renderVectorItems(data.items || []);
        catalogField?.classList.add("hidden");
      } else {
        catalogTitle.textContent = "~show-fields";
        catalogSubtitle.textContent = data.ready
          ? `${data.recordCount || 0} записей · ${data.fieldCount || 0} полей · SQL-like каталог`
          : data.hint || "Каталог не построен";
        populateFieldSelect(data.fieldCatalog, catalogField?.value);
        catalogField?.classList.remove("hidden");
        const catalogSample = Array.isArray(data.fieldCatalog)
          ? data.fieldCatalog.slice(0, 12).join(", ")
          : "";
        catalogMeta.textContent = data.ready
          ? `Показано ${data.items.length} из ${data.total}${
              catalogSample ? ` · поля: ${catalogSample}${data.fieldCount > 12 ? "…" : ""}` : ""
            }`
          : "";
        catalogList.innerHTML = renderFieldItems(data.items || []);
      }

      const pageStart = data.total ? data.offset + 1 : 0;
      const pageEnd = Math.min(data.offset + (data.items?.length || 0), data.total || 0);
      catalogPage.textContent = `${pageStart}–${pageEnd} / ${data.total || 0}`;
      catalogPrevBtn.disabled = catalogState.offset <= 0;
      catalogNextBtn.disabled = data.offset + (data.items?.length || 0) >= (data.total || 0);
    } catch (error) {
      catalogList.innerHTML = `<p class="workspace-index-catalog-empty is-error">${escapeHtml(
        error.message || error
      )}</p>`;
      catalogMeta.textContent = "";
      catalogPage.textContent = "";
      catalogPrevBtn.disabled = true;
      catalogNextBtn.disabled = true;
    } finally {
      catalogState.loading = false;
    }
  }

  function openCatalog(mode) {
    if (!catalogModal) return;
    catalogState.mode = mode === "fields" ? "fields" : "vector";
    catalogState.offset = 0;
    catalogModal.classList.remove("hidden");
    loadCatalogPage();
  }

  function closeCatalog() {
    catalogModal?.classList.add("hidden");
  }

  semanticRebuildBtn.addEventListener("click", async () => {
    semanticRebuildBtn.disabled = true;
    semanticRebuildBtn.classList.add("is-loading");
    try {
      await runRebuild("/api/search/semantic/reindex", semanticStatusNode, (data) =>
        `Смысл: ${data.fileCount} файлов, ${data.chunkCount} фрагментов.`
      );
    } catch (error) {
      semanticStatusNode.textContent = String(error.message || error);
    } finally {
      semanticRebuildBtn.disabled = false;
      semanticRebuildBtn.classList.remove("is-loading");
    }
  });

  storageRebuildBtn.addEventListener("click", async () => {
    storageRebuildBtn.disabled = true;
    storageRebuildBtn.classList.add("is-loading");
    try {
      await runRebuild("/api/storage-index/reindex", storageStatusNode, (data) =>
        `Поля: ${data.recordCount} записей, ${data.fieldCount} уникальных полей.`
      );
    } catch (error) {
      storageStatusNode.textContent = String(error.message || error);
    } finally {
      storageRebuildBtn.disabled = false;
      storageRebuildBtn.classList.remove("is-loading");
    }
  });

  semanticShowBtn?.addEventListener("click", () => openCatalog("vector"));
  storageShowBtn?.addEventListener("click", () => openCatalog("fields"));

  catalogCloseBtn?.addEventListener("click", closeCatalog);
  catalogModal?.addEventListener("click", (event) => {
    if (event.target === catalogModal) closeCatalog();
  });
  catalogRefreshBtn?.addEventListener("click", () => {
    catalogState.offset = 0;
    loadCatalogPage();
  });
  catalogPrevBtn?.addEventListener("click", () => {
    catalogState.offset = Math.max(catalogState.offset - catalogState.limit, 0);
    loadCatalogPage();
  });
  catalogNextBtn?.addEventListener("click", () => {
    catalogState.offset += catalogState.limit;
    loadCatalogPage();
  });
  catalogQ?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      catalogState.offset = 0;
      loadCatalogPage();
    }
  });
  catalogField?.addEventListener("change", () => {
    catalogState.offset = 0;
    loadCatalogPage();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && catalogModal && !catalogModal.classList.contains("hidden")) {
      closeCatalog();
    }
  });

  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (hash === "show-vector" || hash === "~show-vector") {
    openCatalog("vector");
  } else if (hash === "show-fields" || hash === "~show-fields") {
    openCatalog("fields");
  }

  let refreshTimer = null;
  window.addEventListener("workspace-index-file-saved", () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refreshStatus(), 600);
  });

  refreshStatus();
})();
