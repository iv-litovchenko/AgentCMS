(function initWorkspaceIndexPanel() {
  const summaryStatsNode = document.getElementById("menu-workspace-index-stats");
  const ocrStatusNode = document.getElementById("menu-ocr-index-status");
  const ocrRunBtn = document.getElementById("menu-ocr-index-run-btn");
  const ocrForceBtn = document.getElementById("menu-ocr-index-force-btn");
  const fulltextStatusNode = document.getElementById("menu-fulltext-index-status");
  const fulltextRebuildBtn = document.getElementById("menu-fulltext-index-rebuild-btn");
  const semanticStatusNode = document.getElementById("menu-semantic-index-status");
  const semanticRebuildBtn = document.getElementById("menu-semantic-index-rebuild-btn");
  const semanticShowBtn = document.getElementById("menu-semantic-index-show-btn");
  const storageStatusNode = document.getElementById("menu-storage-index-status");
  const storageRebuildBtn = document.getElementById("menu-storage-index-rebuild-btn");
  const storageShowBtn = document.getElementById("menu-storage-index-show-btn");
  const pipelineBtn = document.getElementById("menu-workspace-index-pipeline-btn");
  const pipelineStatusNode = document.getElementById("menu-workspace-index-pipeline-status");
  const monitorSummaryNode = document.getElementById("menu-workspace-index-monitor-summary");
  const monitorGridNode = document.getElementById("menu-workspace-index-monitor-grid");
  if (
    !summaryStatsNode ||
    !ocrStatusNode ||
    !ocrRunBtn ||
    !fulltextStatusNode ||
    !fulltextRebuildBtn ||
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

  function formatOcrStatus(layer) {
    if (!layer) return "—";
    const parts = [];
    if ((layer.candidateCount || 0) > 0) {
      parts.push(`${layer.processedCount || 0}/${layer.candidateCount || 0} вложений`);
    } else {
      parts.push(layer.hint || "Нет вложений");
    }
    if ((layer.pendingCount || 0) > 0) parts.push(`ожидает ${layer.pendingCount}`);
    if (layer.builtAge && layer.builtAge !== "—") parts.push(layer.builtAge);
    if (layer.lastRebuildLabel) parts.push(`прогон ${layer.lastRebuildLabel}`);
    return parts.join(" · ");
  }

  function formatFulltextStatus(layer) {
    if (!layer?.ready) return layer?.hint || "Не построен";
    const parts = [
      `${layer.fileCount || 0} файлов · ${layer.termCount || 0} термов`,
      layer.builtAge || "—"
    ];
    if (layer.lastRebuildLabel) parts.push(`сборка ${layer.lastRebuildLabel}`);
    if ((layer.staleCount || 0) > 0) parts.push(`устарело ${layer.staleCount}`);
    if ((layer.newFilesCount || 0) > 0) parts.push(`новых ${layer.newFilesCount}`);
    return parts.join(" · ");
  }

  function formatSemanticStatus(layer) {
    if (!layer?.ready) return layer?.hint || "Не построен";
    const parts = [
      `${layer.fileCount || 0} файлов · ${layer.chunkCount || 0} фрагм.`,
      layer.builtAge || "—"
    ];
    if (layer.lastRebuildLabel) parts.push(`сборка ${layer.lastRebuildLabel}`);
    if ((layer.staleCount || 0) > 0) parts.push(`устарело ${layer.staleCount}`);
    if ((layer.newFilesCount || 0) > 0) parts.push(`новых ${layer.newFilesCount}`);
    return parts.join(" · ");
  }

  function formatStorageStatus(layer) {
    if (!layer?.ready) return layer?.hint || "Не построен";
    const parts = [
      `${layer.recordCount || 0} записей · ${layer.fieldCount || 0} полей`,
      layer.builtAge || "—"
    ];
    if (layer.lastRebuildLabel) parts.push(`сборка ${layer.lastRebuildLabel}`);
    if ((layer.staleCount || 0) > 0) parts.push(`устарело ${layer.staleCount}`);
    if ((layer.newFilesCount || 0) > 0) parts.push(`новых ${layer.newFilesCount}`);
    return parts.join(" · ");
  }

  function renderMonitorCard(title, layer) {
    if (!layer) return "";
    const badge = healthLabel(layer.health);
    const lines = [];
    if (!layer.ready) {
      lines.push(layer.hint || "Не построен");
    } else if (layer.layer === "ocr") {
      lines.push(`${layer.processedCount || 0}/${layer.candidateCount || 0} вложений`);
      if ((layer.pendingCount || 0) > 0) lines.push(`ожидает OCR: ${layer.pendingCount}`);
      if (layer.builtAge && layer.builtAge !== "—") lines.push(`последний прогон: ${layer.builtAge}`);
    } else if (layer.layer === "fulltext") {
      lines.push(`${layer.fileCount || 0} файлов · ${layer.termCount || 0} термов`);
      lines.push(`обновлён ${layer.builtAge || "—"}`);
    } else if (layer.layer === "semantic") {
      lines.push(`${layer.fileCount || 0} файлов · ${layer.chunkCount || 0} фрагментов`);
      lines.push(`обновлён ${layer.builtAge || "—"}`);
    } else {
      lines.push(`${layer.recordCount || 0} записей · ${layer.fieldCount || 0} полей`);
      lines.push(`обновлён ${layer.builtAge || "—"}`);
    }
    if (layer.lastRebuildLabel) lines.push(`длительность: ${layer.lastRebuildLabel}`);
    if ((layer.staleCount || 0) > 0) lines.push(`устарело: ${layer.staleCount}`);
    if ((layer.newFilesCount || 0) > 0) lines.push(`новых: ${layer.newFilesCount}`);
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
        renderMonitorCard("OCR", monitor?.ocr),
        renderMonitorCard("Слова", monitor?.fulltext),
        renderMonitorCard("Смысл", monitor?.semantic),
        renderMonitorCard("Поля", monitor?.storage)
      ].join("");
    }
  }

  function updateSummaryFromMonitor(monitor) {
    const parts = [];
    const ocr = monitor?.ocr;
    const fulltext = monitor?.fulltext;
    const semantic = monitor?.semantic;
    const storage = monitor?.storage;
    if (ocr && (ocr.candidateCount || 0) > 0) {
      const mark = (ocr.pendingCount || 0) > 0 ? "!" : "";
      parts.push(`ocr ${ocr.processedCount || 0}/${ocr.candidateCount || 0}${mark}`);
    }
    if (fulltext?.ready) {
      const mark = fulltext.health === "stale" ? "!" : "";
      parts.push(`слова ${fulltext.fileCount || 0}${mark}`);
    }
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
    if (monitor?.summary?.health === "stale" || monitor?.summary?.health === "partial") {
      summaryStatsNode.classList.add("is-error");
    }
  }

  async function refreshStatus() {
    try {
      const monitorRes = await fetch(buildApiUrl("/api/workspace-index/monitor"));
      const monitor = await monitorRes.json();
      if (!monitorRes.ok) throw new Error(monitor.error || monitorRes.statusText);

      ocrStatusNode.textContent = formatOcrStatus(monitor.ocr);
      fulltextStatusNode.textContent = formatFulltextStatus(monitor.fulltext);
      semanticStatusNode.textContent = formatSemanticStatus(monitor.semantic);
      storageStatusNode.textContent = formatStorageStatus(monitor.storage);
      renderMonitor(monitor);
      updateSummaryFromMonitor(monitor);
    } catch (error) {
      summaryStatsNode.textContent = "ошибка";
      summaryStatsNode.classList.add("is-error");
      if (monitorSummaryNode) {
        monitorSummaryNode.textContent = String(error.message || error);
        monitorSummaryNode.className = "menu-index-monitor-summary is-error";
      }
      ocrStatusNode.textContent = String(error.message || error);
    }
  }

  async function runRebuild(url, statusNode, okLabel, options = {}) {
    statusNode.textContent = options.loadingLabel || "Сборка…";
    const response = await fetch(buildApiUrl(url), {
      method: "POST",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.details || response.statusText);
    statusNode.textContent = okLabel(data);
    await refreshStatus();
    return data;
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

  async function bindActionButton(button, handler) {
    if (!button) return;
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.classList.add("is-loading");
      try {
        await handler();
      } finally {
        button.disabled = false;
        button.classList.remove("is-loading");
      }
    });
  }

  bindActionButton(ocrRunBtn, async () => {
    await runRebuild(
      "/api/ocr-index/run",
      ocrStatusNode,
      (data) => `OCR: обработано ${data.processed}, пропущено ${data.skipped}, ошибок ${data.failed}.`,
      { body: { force: false, limit: 100 } }
    );
  });

  bindActionButton(ocrForceBtn, async () => {
    await runRebuild(
      "/api/ocr-index/run",
      ocrStatusNode,
      (data) => `OCR (всё): обработано ${data.processed}, пропущено ${data.skipped}, ошибок ${data.failed}.`,
      { body: { force: true, limit: 200 } }
    );
  });

  bindActionButton(fulltextRebuildBtn, async () => {
    await runRebuild("/api/search/fulltext/reindex", fulltextStatusNode, (data) =>
      `Слова: ${data.fileCount} файлов, ${data.termCount} термов.`
    );
  });

  bindActionButton(semanticRebuildBtn, async () => {
    await runRebuild("/api/search/semantic/reindex", semanticStatusNode, (data) =>
      `Смысл: ${data.fileCount} файлов, ${data.chunkCount} фрагментов.`
    );
  });

  bindActionButton(storageRebuildBtn, async () => {
    await runRebuild("/api/storage-index/reindex", storageStatusNode, (data) =>
      `Поля: ${data.recordCount} записей, ${data.fieldCount} уникальных полей.`
    );
  });

  bindActionButton(pipelineBtn, async () => {
    if (!pipelineStatusNode) return;
    pipelineStatusNode.textContent = "Цепочка: OCR → слова → смысл → поля…";
    const data = await runRebuild(
      "/api/workspace-index/pipeline",
      pipelineStatusNode,
      () => "Готово: OCR → fulltext → semantic → поля.",
      { body: { ocrLimit: 200 }, loadingLabel: "Цепочка: OCR → слова → смысл → поля…" }
    );
    if (data?.ocr) {
      pipelineStatusNode.textContent = `Готово · OCR ${data.ocr.processed}/${data.ocr.candidateCount || "?"}`;
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
