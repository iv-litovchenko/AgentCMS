(function initWorkspaceIndexPanel() {
  const OCR_INDEXING_ENABLED = false;
  const OCR_DISABLED_HINT = "OCR временно недоступен";

  const summaryStatsNode = document.getElementById("menu-workspace-index-stats");
  const workspaceIdUniquenessNode = document.getElementById("menu-workspace-id-uniqueness");
  const ocrStatusNode = document.getElementById("menu-ocr-index-status");
  const ocrRunBtn = document.getElementById("menu-ocr-index-run-btn");
  const ocrForceBtn = document.getElementById("menu-ocr-index-force-btn");
  const fulltextStatusNode = document.getElementById("menu-fulltext-index-status");
  const fulltextRebuildBtn = document.getElementById("menu-fulltext-index-rebuild-btn");
  const semanticStatusNode = document.getElementById("menu-semantic-index-status");
  const semanticRebuildBtn = document.getElementById("menu-semantic-index-rebuild-btn");
  const semanticShowBtn = document.getElementById("menu-semantic-index-show-btn");
  const storageStatusNode = document.getElementById("menu-storage-index-status");
  const storageRebuildQuickBtn = document.getElementById("menu-storage-index-rebuild-quick-btn");
  const storageRebuildFullBtn = document.getElementById("menu-storage-index-rebuild-full-btn");
  const storageShowBtn = document.getElementById("menu-storage-index-show-btn");
  const linkStatusNode = document.getElementById("menu-link-index-status");
  const linkRebuildBtn = document.getElementById("menu-link-index-rebuild-btn");
  const linkShowBtn = document.getElementById("menu-link-index-show-btn");
  const linkProbePathInput = document.getElementById("menu-link-index-probe-path");
  const linkProbeBtn = document.getElementById("menu-link-index-probe-btn");
  const linkProbeResultNode = document.getElementById("menu-link-index-probe-result");
  const workspaceIdStatusNode = document.getElementById("menu-workspace-id-status");
  const workspaceIdSyncBtn = document.getElementById("menu-workspace-id-sync-btn");
  const workspaceIdShowBtn = document.getElementById("menu-workspace-id-show-btn");
  const workspaceIdProbeInput = document.getElementById("menu-workspace-id-probe-input");
  const workspaceIdProbeBtn = document.getElementById("menu-workspace-id-probe-btn");
  const workspaceIdProbeResultNode = document.getElementById("menu-workspace-id-probe-result");
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
    !storageRebuildQuickBtn ||
    !storageRebuildFullBtn
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

  const buttonDefaultLabels = new Map();
  const buttonProgressPollers = new Map();

  function rememberButtonLabel(button) {
    if (!button) return "";
    if (!buttonDefaultLabels.has(button)) {
      buttonDefaultLabels.set(button, button.textContent.trim());
    }
    return buttonDefaultLabels.get(button);
  }

  function formatProgressButtonLabel(baseLabel, progress, layer) {
    if (!progress?.running || progress.layer !== layer) return baseLabel;
    const current = Number(progress.current) || 0;
    const total = Number(progress.total) || 0;
    if (total > 0) return `${baseLabel} · ${current} из ${total}`;
    if (current > 0) return `${baseLabel} · ${current}…`;
    return `${baseLabel}…`;
  }

  function applyButtonProgress(button, layer, progress) {
    if (!button) return;
    const baseLabel = rememberButtonLabel(button);
    button.textContent = formatProgressButtonLabel(baseLabel, progress, layer);
  }

  function startButtonProgressPolling(button, layer) {
    if (!button) return;
    rememberButtonLabel(button);
    stopButtonProgressPolling(button);

    const poll = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/workspace-index/progress"));
        const progress = await response.json();
        if (response.ok) {
          applyButtonProgress(button, layer, progress);
        }
      } catch {
        // ignore transient polling errors
      }
    };

    poll();
    const timer = setInterval(poll, 450);
    buttonProgressPollers.set(button, timer);
  }

  function stopButtonProgressPolling(button) {
    if (!button) return;
    const timer = buttonProgressPollers.get(button);
    if (timer) {
      clearInterval(timer);
      buttonProgressPollers.delete(button);
    }
    const baseLabel = buttonDefaultLabels.get(button);
    if (baseLabel) button.textContent = baseLabel;
  }

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
    const modeLabel =
      layer.enrichmentMode === "quick" ? "быстрый" : layer.enrichmentMode === "full" ? "полный" : "";
    const parts = [
      `${layer.recordCount || 0} записей · ${layer.fieldCount || 0} полей${modeLabel ? ` · ${modeLabel}` : ""}`,
      layer.builtAge || "—"
    ];
    if (layer.lastRebuildLabel) parts.push(`сборка ${layer.lastRebuildLabel}`);
    if ((layer.staleCount || 0) > 0) parts.push(`устарело ${layer.staleCount}`);
    if ((layer.newFilesCount || 0) > 0) parts.push(`новых ${layer.newFilesCount}`);
    return parts.join(" · ");
  }

  function formatLinkStatus(layer) {
    if (!layer?.ready) return layer?.hint || "Не построен";
    const parts = [
      `${layer.edgeCount || 0} рёбер · ${layer.nodeCount || 0} узлов · ${layer.fileCount || 0} файлов`,
      layer.builtAge || "—"
    ];
    if (layer.lastRebuildLabel) parts.push(`сборка ${layer.lastRebuildLabel}`);
    return parts.join(" · ");
  }

  function formatWorkspaceIdStatus(data) {
    if (!data?.ready) return data?.reason || "—";
    const parts = [
      `${data.assignedCount || 0} записей с id · уникальных ${data.uniqueIdCount || 0} · след. ${data.nextId || 1}`,
      data.updatedAt ? new Date(data.updatedAt).toLocaleString("ru-RU") : "—"
    ];
    return parts.join(" · ");
  }

  function formatWorkspaceIdMonitorStatus(layer) {
    if (!layer?.ready) return layer?.hint || "—";
    const parts = [
      `${layer.assignedCount || 0} записей · уникальных ${layer.uniqueIdCount || 0} · след. ${layer.nextId || 1}`,
      layer.builtAge || "—"
    ];
    if ((layer.duplicateCount || 0) > 0) parts.push(`повторов: ${layer.duplicateCount}`);
    return parts.join(" · ");
  }

  function renderWorkspaceIdUniqueness(data) {
    if (!workspaceIdUniquenessNode) return;
    if (!data?.ready || !(data.assignedCount > 0)) {
      workspaceIdUniquenessNode.textContent = "";
      workspaceIdUniquenessNode.className = "header-index-id-uniqueness hidden";
      return;
    }
    if ((data.duplicateCount || 0) > 0) {
      const samples = (data.duplicates || [])
        .slice(0, 4)
        .map((row) => `#${row.id} (${row.count || row.paths?.length || 2})`)
        .join(", ");
      const extra = (data.duplicateCount || 0) > 4 ? ` и ещё ${data.duplicateCount - 4}` : "";
      workspaceIdUniquenessNode.textContent = `Повторяющиеся awn-id: ${data.duplicateCount}${samples ? ` — ${samples}${extra}` : ""}`;
      workspaceIdUniquenessNode.className = "header-index-id-uniqueness is-warning";
      return;
    }
    workspaceIdUniquenessNode.textContent = "Все id уникальны";
    workspaceIdUniquenessNode.className = "header-index-id-uniqueness is-ok";
  }

  function emptyMonitorLayer(hint) {
    return { ready: false, health: "empty", hint: hint || "Не построен" };
  }

  function renderMonitorCard(title, layer) {
    const card = layer || emptyMonitorLayer();
    const badge = healthLabel(card.health);
    const lines = [];
    if (!card.ready) {
      lines.push(card.hint || "Не построен");
    } else if (card.layer === "ocr") {
      lines.push(`${card.processedCount || 0}/${card.candidateCount || 0} вложений`);
      if ((card.pendingCount || 0) > 0) lines.push(`ожидает OCR: ${card.pendingCount}`);
      if (card.builtAge && card.builtAge !== "—") lines.push(`последний прогон: ${card.builtAge}`);
    } else if (card.layer === "fulltext") {
      lines.push(`${card.fileCount || 0} файлов · ${card.termCount || 0} термов`);
      lines.push(`обновлён ${card.builtAge || "—"}`);
    } else if (card.layer === "semantic") {
      lines.push(`${card.fileCount || 0} файлов · ${card.chunkCount || 0} фрагментов`);
      lines.push(`обновлён ${card.builtAge || "—"}`);
    } else if (card.layer === "storage") {
      lines.push(`${card.recordCount || 0} записей · ${card.fieldCount || 0} полей`);
      lines.push(`обновлён ${card.builtAge || "—"}`);
    } else if (card.layer === "link") {
      lines.push(`${card.edgeCount || 0} рёбер · ${card.nodeCount || 0} узлов · ${card.fileCount || 0} файлов`);
      lines.push(`обновлён ${card.builtAge || "—"}`);
    } else if (card.layer === "workspace-id") {
      lines.push(`${card.assignedCount || 0} записей · уникальных ${card.uniqueIdCount || 0}`);
      lines.push(`след. id ${card.nextId || 1} · ${card.builtAge || "—"}`);
      if ((card.duplicateCount || 0) > 0) lines.push(`повторов id: ${card.duplicateCount}`);
      else if (card.allIdsUnique && (card.assignedCount || 0) > 0) lines.push("все id уникальны");
    } else {
      lines.push(card.hint || "—");
    }
    if (card.lastRebuildLabel) lines.push(`длительность: ${card.lastRebuildLabel}`);
    if ((card.staleCount || 0) > 0) lines.push(`устарело: ${card.staleCount}`);
    if ((card.newFilesCount || 0) > 0) lines.push(`новых: ${card.newFilesCount}`);
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
        renderMonitorCard("Поля", monitor?.storage),
        renderMonitorCard(
          "Связи",
          monitor?.link ||
            emptyMonitorLayer(
              monitor && !("link" in monitor)
                ? "Нет данных — перезапустите сервер"
                : "Граф связей не построен"
            )
        ),
        renderMonitorCard(
          "ID",
          monitor?.workspaceId ||
            emptyMonitorLayer(
              monitor && !("workspaceId" in monitor)
                ? "Нет данных — перезапустите сервер"
                : "Счётчик awn-id недоступен"
            )
        )
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
    const link = monitor?.link;
    if (link?.ready) {
      const mark = link.health === "stale" ? "!" : "";
      parts.push(`связи ${link.edgeCount || 0}${mark}`);
    }
    const workspaceId = monitor?.workspaceId;
    if (workspaceId?.ready) {
      const mark =
        workspaceId.health === "stale" || (workspaceId.duplicateCount || 0) > 0 ? "!" : "";
      parts.push(`id ${workspaceId.assignedCount || 0}${mark}`);
    } else if (window.__workspaceIdStatus?.ready) {
      parts.push(`id ${window.__workspaceIdStatus.assignedCount || 0}`);
    }
    summaryStatsNode.textContent = parts.length ? parts.join(" · ") : "нет индексов";
    summaryStatsNode.classList.toggle("is-empty", !parts.length);
    summaryStatsNode.classList.remove("is-error");
    const hasAlert =
      monitor?.summary?.health === "stale" ||
      monitor?.summary?.health === "partial" ||
      (ocr?.pendingCount || 0) > 0;
    if (hasAlert) {
      summaryStatsNode.classList.add("is-error");
    }
    const headerIndexToggleBtn = document.getElementById("header-index-toggle-btn");
    const headerIndexAlertDot = document.getElementById("header-index-alert-dot");
    headerIndexToggleBtn?.classList.toggle("has-alert", hasAlert);
    headerIndexAlertDot?.classList.toggle("hidden", !hasAlert);
  }

  async function refreshWorkspaceIdStatus() {
    if (!workspaceIdStatusNode) return null;
    try {
      const response = await fetch(buildApiUrl("/api/workspace-id/status"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      window.__workspaceIdStatus = data;
      workspaceIdStatusNode.textContent = formatWorkspaceIdStatus(data);
      renderWorkspaceIdUniqueness(data);
      return data;
    } catch (error) {
      workspaceIdStatusNode.textContent = String(error.message || error);
      window.__workspaceIdStatus = null;
      renderWorkspaceIdUniqueness(null);
      return null;
    }
  }

  async function refreshStatus() {
    try {
      const [monitorRes, idStatus] = await Promise.all([
        fetch(buildApiUrl("/api/workspace-index/monitor")),
        refreshWorkspaceIdStatus()
      ]);
      const monitor = await monitorRes.json();
      if (!monitorRes.ok) throw new Error(monitor.error || monitorRes.statusText);
      if (idStatus) window.__workspaceIdStatus = idStatus;

      ocrStatusNode.textContent = formatOcrStatus(monitor.ocr);
      fulltextStatusNode.textContent = formatFulltextStatus(monitor.fulltext);
      semanticStatusNode.textContent = formatSemanticStatus(monitor.semantic);
      storageStatusNode.textContent = formatStorageStatus(monitor.storage);
      if (linkStatusNode) linkStatusNode.textContent = formatLinkStatus(monitor.link);
      if (workspaceIdStatusNode && monitor.workspaceId) {
        workspaceIdStatusNode.textContent = formatWorkspaceIdMonitorStatus(monitor.workspaceId);
        window.__workspaceIdStatus = {
          ready: monitor.workspaceId.ready,
          assignedCount: monitor.workspaceId.assignedCount,
          uniqueIdCount: monitor.workspaceId.uniqueIdCount,
          duplicateCount: monitor.workspaceId.duplicateCount,
          allIdsUnique: monitor.workspaceId.allIdsUnique,
          nextId: monitor.workspaceId.nextId,
          updatedAt: monitor.workspaceId.builtAt
        };
        renderWorkspaceIdUniqueness(window.__workspaceIdStatus);
      }
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
    const progressButton = options.progressButton || null;
    const progressLayer = options.progressLayer || null;
    if (progressButton && progressLayer) {
      startButtonProgressPolling(progressButton, progressLayer);
    } else {
      statusNode.textContent = options.loadingLabel || "Сборка…";
    }

    try {
      const response = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: options.body ? { "Content-Type": "application/json" } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      statusNode.textContent = okLabel(data);
      if (url.includes("/api/storage-index/") && typeof window.invalidateContentSearchFieldCatalog === "function") {
        window.invalidateContentSearchFieldCatalog();
      }
      await refreshStatus();
      return data;
    } finally {
      if (progressButton) stopButtonProgressPolling(progressButton);
    }
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

  function formatCatalogFieldEntry(entry) {
    if (entry != null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry) {
      return {
        value: entry.value,
        type: entry.type || "—",
        title: entry.title || "—"
      };
    }
    return {
      value: entry,
      type: "—",
      title: "—"
    };
  }

  function renderFieldItems(items) {
    if (!items.length) {
      return '<p class="workspace-index-catalog-empty">Нет записей по текущему фильтру.</p>';
    }
    return items
      .map((item) => {
        const contextHint = item.schemaContext
          ? `<span class="workspace-index-catalog-context" title="Контекст схемы">${escapeHtml(item.schemaContext)}</span>`
          : "";
        const fields = Object.entries(item.fields || {})
          .map(([key, rawEntry]) => {
            const entry = formatCatalogFieldEntry(rawEntry);
            const displayValue =
              entry.value != null && typeof entry.value === "object"
                ? JSON.stringify(entry.value)
                : String(entry.value ?? "");
            return `<tr>
              <th>${escapeHtml(key)}</th>
              <td class="workspace-index-catalog-field-type">${escapeHtml(entry.type)}</td>
              <td class="workspace-index-catalog-field-title">${escapeHtml(entry.title)}</td>
              <td>${escapeHtml(displayValue)}</td>
            </tr>`;
          })
          .join("");
        return `<article class="workspace-index-catalog-item">
          <div class="workspace-index-catalog-item-head">
            <code>${escapeHtml(item.path)}</code>
            ${contextHint}
          </div>
          <table class="workspace-index-catalog-fields">
            <thead>
              <tr>
                <th>Ключ</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Значение</th>
              </tr>
            </thead>
            <tbody>${fields || "<tr><td colspan=\"4\">—</td></tr>"}</tbody>
          </table>
        </article>`;
      })
      .join("");
  }

  function renderLinkItems(items) {
    if (!items.length) {
      return '<p class="workspace-index-catalog-empty">Нет рёбер по текущему фильтру.</p>';
    }
    return items
      .map((item) => {
        const kind = String(item.kind || "link");
        const targetNote =
          item.unresolved && item.toTarget && item.toTarget !== item.to
            ? `<span class="workspace-index-catalog-link-target" title="Исходная ссылка">«${escapeHtml(item.toTarget)}»</span>`
            : "";
        return `<article class="workspace-index-catalog-item workspace-index-catalog-item--link">
          <div class="workspace-index-catalog-link-edge">
            <code class="workspace-index-catalog-link-from">${escapeHtml(item.from || "—")}</code>
            <span class="workspace-index-catalog-link-arrow" aria-hidden="true">→</span>
            <code class="workspace-index-catalog-link-to">${escapeHtml(item.to || "—")}</code>
            <span class="workspace-index-catalog-badge workspace-index-catalog-badge--kind is-${escapeHtml(kind)}">${escapeHtml(kind)}</span>
          </div>
          ${targetNote}
        </article>`;
      })
      .join("");
  }

  function renderWorkspaceIdItems(items) {
    if (!items.length) {
      return '<p class="workspace-index-catalog-empty">Нет записей с awn-id по текущему фильтру.</p>';
    }
    return items
      .map(
        (item) => `<article class="workspace-index-catalog-item workspace-index-catalog-item--id">
          <div class="workspace-index-catalog-item-head">
            <span class="workspace-index-catalog-badge">#${escapeHtml(item.id)}</span>
            <code>${escapeHtml(item.path || "—")}</code>
          </div>
        </article>`
      )
      .join("");
  }

  function populateCatalogFilterSelect(catalog, selected, emptyLabel) {
    if (!catalogField) return;
    const current = selected || catalogField.value || "";
    catalogField.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;
    for (const name of catalog || []) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      catalogField.appendChild(option);
    }
    catalogField.value = current;
  }

  function populateFieldSelect(fieldCatalog, selected, fieldCatalogMeta = []) {
    if (!catalogField) return;
    const current = selected || catalogField.value || "";
    const metaByKey = new Map((fieldCatalogMeta || []).map((item) => [item.key, item]));
    catalogField.innerHTML = `<option value="">Все поля</option>`;
    for (const name of fieldCatalog || []) {
      const option = document.createElement("option");
      option.value = name;
      const meta = metaByKey.get(name);
      const variants = meta?.variants || [];
      if (variants.length > 1) {
        option.textContent = `${name} · ${variants.length} контекста`;
        option.title = variants
          .map((variant) => `${variant.title || "—"} (${variant.type || "?"}) · ${variant.pathPrefix || variant.manifestRel || ""}`)
          .join("\n");
      } else if (variants.length === 1) {
        option.textContent = variants[0].title ? `${name} · ${variants[0].title}` : name;
        option.title = `${variants[0].type || "?"} · ${variants[0].pathPrefix || variants[0].manifestRel || ""}`;
      } else {
        option.textContent = name;
      }
      catalogField.appendChild(option);
    }
    catalogField.value = current;
  }

  function populateKindSelect(kindCatalog, selected) {
    populateCatalogFilterSelect(kindCatalog, selected, "Все типы");
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

    let endpoint = "/api/search/semantic/catalog";
    if (catalogState.mode === "fields") endpoint = "/api/storage-index/catalog";
    if (catalogState.mode === "links") endpoint = "/api/link-index/catalog";
    if (catalogState.mode === "ids") endpoint = "/api/workspace-id/catalog";
    if (catalogState.mode === "fields" && catalogField?.value) {
      params.field = catalogField.value;
    }
    if (catalogState.mode === "links" && catalogField?.value) {
      params.kind = catalogField.value;
    }
    if (catalogQ) {
      catalogQ.placeholder =
        catalogState.mode === "links"
          ? "Поиск по from / to / kind…"
          : catalogState.mode === "ids"
            ? "Поиск по id / пути…"
            : "Поиск по пути / тексту…";
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
        catalogField?.setAttribute("aria-label", "Фильтр по полю");
      } else if (catalogState.mode === "links") {
        catalogTitle.textContent = "~show-links";
        catalogSubtitle.textContent = data.ready
          ? `${data.edgeCount || 0} рёбер · ${data.nodeCount || 0} узлов · ${data.fileCount || 0} файлов`
          : data.hint || "Граф не построен";
        populateKindSelect(data.kindCatalog, catalogField?.value);
        catalogField?.classList.remove("hidden");
        catalogField?.setAttribute("aria-label", "Фильтр по типу связи");
        const kindSample = Array.isArray(data.kindCatalog) ? data.kindCatalog.join(", ") : "";
        catalogMeta.textContent = data.ready
          ? `Показано ${data.items.length} из ${data.total}${kindSample ? ` · типы: ${kindSample}` : ""}${
              data.builtAt ? ` · обновлён ${new Date(data.builtAt).toLocaleString("ru-RU")}` : ""
            }`
          : "";
        catalogList.innerHTML = renderLinkItems(data.items || []);
      } else if (catalogState.mode === "ids") {
        catalogTitle.textContent = "~show-ids";
        catalogSubtitle.textContent = data.ready
          ? `${data.total || 0} записей с awn-id · след. ${data.nextId || 1} · ${data.counterFile || "id-autoincrement.json"}`
          : data.hint || "Каталог не готов";
        catalogField?.classList.add("hidden");
        catalogMeta.textContent = data.ready
          ? `Показано ${data.items.length} из ${data.total}`
          : "";
        catalogList.innerHTML = renderWorkspaceIdItems(data.items || []);
      } else {
        catalogTitle.textContent = "~show-fields";
        catalogSubtitle.textContent = data.ready
          ? `${data.recordCount || 0} записей · ${data.fieldCount || 0} полей · schema-aware SQL-like`
          : data.hint || "Каталог не построен";
        populateFieldSelect(data.fieldCatalog, catalogField?.value, data.fieldCatalogMeta);
        catalogField?.classList.remove("hidden");
        catalogField?.setAttribute("aria-label", "Фильтр по полю");
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
    catalogState.mode =
      mode === "fields"
        ? "fields"
        : mode === "links"
          ? "links"
          : mode === "ids"
            ? "ids"
            : "vector";
    catalogState.offset = 0;
    catalogModal.classList.remove("hidden");
    loadCatalogPage();
  }

  function closeCatalog() {
    catalogModal?.classList.add("hidden");
  }

  function lockIndexingButton(button, hint = OCR_DISABLED_HINT) {
    if (!button) return;
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = hint;
    button.classList.add("is-feature-disabled");
  }

  function applyOcrIndexingFeatureGate() {
    if (OCR_INDEXING_ENABLED) return;
    lockIndexingButton(ocrRunBtn);
    lockIndexingButton(ocrForceBtn);
    for (const flushBtn of document.querySelectorAll('[data-index-flush="ocr"]')) {
      lockIndexingButton(flushBtn, OCR_DISABLED_HINT);
    }
    ocrStatusNode.textContent = OCR_DISABLED_HINT;
    ocrRunBtn?.closest(".menu-index-block")?.classList.add("is-feature-disabled");
    if (pipelineBtn) {
      pipelineBtn.title = "Слова → смысл → поля → связи → id (OCR пропускается)";
    }
    for (const flushBtn of document.querySelectorAll('[data-index-flush="pipeline"]')) {
      flushBtn.title = "Слова → смысл → поля → связи → id (OCR пропускается)";
    }
  }

  async function bindActionButton(button, handler, { keepDisabled = false } = {}) {
    if (!button) return;
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      button.classList.add("is-loading");
      try {
        await handler();
      } finally {
        button.disabled = keepDisabled;
        button.classList.remove("is-loading");
      }
    });
  }

  [
    ocrRunBtn,
    ocrForceBtn,
    fulltextRebuildBtn,
    semanticRebuildBtn,
    storageRebuildQuickBtn,
    storageRebuildFullBtn,
    linkRebuildBtn,
    workspaceIdSyncBtn
  ].forEach((button) => rememberButtonLabel(button));

  if (OCR_INDEXING_ENABLED) {
    bindActionButton(ocrRunBtn, async () => {
      await runRebuild(
        "/api/ocr-index/run",
        ocrStatusNode,
        (data) => `OCR: обработано ${data.processed}, пропущено ${data.skipped}, ошибок ${data.failed}.`,
        { body: { force: false, limit: 100 }, progressButton: ocrRunBtn, progressLayer: "ocr" }
      );
    });

    bindActionButton(ocrForceBtn, async () => {
      await runRebuild(
        "/api/ocr-index/run",
        ocrStatusNode,
        (data) => `OCR (всё): обработано ${data.processed}, пропущено ${data.skipped}, ошибок ${data.failed}.`,
        { body: { force: true, limit: 200 }, progressButton: ocrForceBtn, progressLayer: "ocr" }
      );
    });
  }

  bindActionButton(fulltextRebuildBtn, async () => {
    await runRebuild(
      "/api/search/fulltext/reindex",
      fulltextStatusNode,
      (data) => `Слова: ${data.fileCount} файлов, ${data.termCount} термов.`,
      { progressButton: fulltextRebuildBtn, progressLayer: "fulltext" }
    );
  });

  bindActionButton(semanticRebuildBtn, async () => {
    await runRebuild(
      "/api/search/semantic/reindex",
      semanticStatusNode,
      (data) => `Смысл: ${data.fileCount} файлов, ${data.chunkCount} фрагментов.`,
      { progressButton: semanticRebuildBtn, progressLayer: "semantic" }
    );
  });

  bindActionButton(storageRebuildQuickBtn, async () => {
    await runRebuild(
      "/api/storage-index/reindex",
      storageStatusNode,
      (data) =>
        `Поля (быстро): ${data.recordCount} записей, ${data.fieldCount} полей · без schema-enrich.`,
      { body: { mode: "quick" }, progressButton: storageRebuildQuickBtn, progressLayer: "storage" }
    );
  });

  bindActionButton(storageRebuildFullBtn, async () => {
    await runRebuild(
      "/api/storage-index/reindex",
      storageStatusNode,
      (data) =>
        `Поля (полный): ${data.recordCount} записей, ${data.fieldCount} полей · schema + типы.`,
      { body: { mode: "full" }, progressButton: storageRebuildFullBtn, progressLayer: "storage" }
    );
  });

  bindActionButton(linkRebuildBtn, async () => {
    await runRebuild(
      "/api/link-index/reindex",
      linkStatusNode,
      (data) => `Связи: ${data.edgeCount} рёбер, ${data.fileCount} файлов.`,
      { progressButton: linkRebuildBtn, progressLayer: "link" }
    );
  });

  bindActionButton(workspaceIdSyncBtn, async () => {
    await runRebuild(
      "/api/workspace-id/sync-counter",
      workspaceIdStatusNode,
      (data) =>
        `ID: ${data.assignedCount || 0} записей · счётчик → ${data.nextId || 1}${
          data.allIdsUnique ? " · все id уникальны" : ` · повторов ${data.duplicateCount || 0}`
        }.`
    );
  });

  bindActionButton(workspaceIdProbeBtn, async () => {
    if (!workspaceIdProbeResultNode) return;
    const idValue = workspaceIdProbeInput?.value?.trim() || "";
    if (!idValue) {
      workspaceIdProbeResultNode.textContent = "Укажите awn-id.";
      return;
    }
    workspaceIdProbeResultNode.textContent = "Resolve…";
    try {
      const response = await fetch(buildApiUrl("/api/workspace-id/resolve", { id: idValue }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      if (!data.ok || !data.path) {
        workspaceIdProbeResultNode.textContent = `id ${idValue}: не найден.`;
        return;
      }
      const paths = Array.isArray(data.paths) && data.paths.length ? data.paths : [data.path];
      workspaceIdProbeResultNode.textContent =
        paths.length > 1
          ? `id ${data.id}: ${paths.length} записей — ${paths.join(" · ")}`
          : `id ${data.id}: ${data.path}`;
    } catch (error) {
      workspaceIdProbeResultNode.textContent = String(error.message || error);
    }
  });

  bindActionButton(linkProbeBtn, async () => {
    if (!linkProbeResultNode) return;
    const pathValue = linkProbePathInput?.value?.trim() || "";
    if (!pathValue) {
      linkProbeResultNode.textContent = "Укажите путь к файлу.";
      return;
    }
    linkProbeResultNode.textContent = "Запрос backlinks…";
    try {
      const response = await fetch(buildApiUrl("/api/link-index/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "backlinks", path: pathValue, limit: 12 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      if (!data.ready) {
        linkProbeResultNode.textContent = data.hint || "Индекс связей не построен.";
        return;
      }
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        linkProbeResultNode.textContent = `Backlinks для «${pathValue}»: нет.`;
        return;
      }
      const lines = items.map((item) => `${item.from} (${item.kind || "link"})`);
      linkProbeResultNode.textContent = `Backlinks (${data.count || items.length}): ${lines.join(" · ")}`;
    } catch (error) {
      linkProbeResultNode.textContent = String(error.message || error);
    }
  });

  bindActionButton(pipelineBtn, async () => {
    if (!pipelineStatusNode) return;
    if (OCR_INDEXING_ENABLED) {
      pipelineStatusNode.textContent = "Цепочка: OCR → слова → смысл → поля → связи → id…";
      const data = await runRebuild(
        "/api/workspace-index/pipeline",
        pipelineStatusNode,
        () => "Готово: OCR → fulltext → semantic → поля → связи → id.",
        { body: { ocrLimit: 200 }, loadingLabel: "Цепочка: OCR → слова → смысл → поля → связи → id…" }
      );
      if (data?.ocr) {
        pipelineStatusNode.textContent = `Готово · OCR ${data.ocr.processed}/${data.ocr.candidateCount || "?"} · связи ${data.link?.edgeCount || 0} · id ${data.workspaceId?.assignedCount || 0}`;
      } else if (data?.workspaceId) {
        pipelineStatusNode.textContent = `Готово · слова ${data.fulltext?.fileCount || 0} · смысл ${data.semantic?.chunkCount || 0} · поля ${data.storage?.recordCount || 0} · связи ${data.link?.edgeCount || 0} · id ${data.workspaceId.assignedCount || 0}`;
      }
      return;
    }

    pipelineStatusNode.textContent = "Цепочка: слова → смысл → поля → связи → id…";
    const fulltext = await runRebuild(
      "/api/search/fulltext/reindex",
      pipelineStatusNode,
      () => "Цепочка: смысл → поля → связи → id…",
      { loadingLabel: "Цепочка: слова…" }
    );
    const semantic = await runRebuild(
      "/api/search/semantic/reindex",
      pipelineStatusNode,
      () => "Цепочка: поля → связи → id…",
      { loadingLabel: "Цепочка: смысл…" }
    );
    const storage = await runRebuild(
      "/api/storage-index/reindex",
      pipelineStatusNode,
      () => "Цепочка: связи → id…",
      { body: { mode: "full" }, loadingLabel: "Цепочка: поля (полный)…" }
    );
    const link = await runRebuild(
      "/api/link-index/reindex",
      pipelineStatusNode,
      () => "Цепочка: id…",
      { loadingLabel: "Цепочка: связи…", progressButton: linkRebuildBtn, progressLayer: "link" }
    );
    await runRebuild(
      "/api/workspace-id/sync-counter",
      pipelineStatusNode,
      (data) =>
        `Готово · слова ${fulltext.fileCount || 0} · смысл ${semantic.chunkCount || 0} · поля ${storage.recordCount || 0} · связи ${link.edgeCount || 0} · id ${data.assignedCount || 0}`,
      { loadingLabel: "Цепочка: id…", progressButton: workspaceIdSyncBtn }
    );
  });

  applyOcrIndexingFeatureGate();

  const flushTargets = {
    pipeline: pipelineBtn,
    ocr: ocrRunBtn,
    fulltext: fulltextRebuildBtn,
    semantic: semanticRebuildBtn,
    storage: storageRebuildQuickBtn,
    link: linkRebuildBtn,
    "workspace-id": workspaceIdSyncBtn
  };
  for (const flushBtn of document.querySelectorAll("[data-index-flush]")) {
    flushBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = flushBtn.getAttribute("data-index-flush");
      const targetBtn = flushTargets[key];
      if (!targetBtn || targetBtn.disabled) return;
      targetBtn.click();
    });
  }

  window.addEventListener("header-index-popover-open", () => {
    void refreshStatus();
  });

  semanticShowBtn?.addEventListener("click", () => openCatalog("vector"));
  storageShowBtn?.addEventListener("click", () => openCatalog("fields"));
  linkShowBtn?.addEventListener("click", () => openCatalog("links"));
  workspaceIdShowBtn?.addEventListener("click", () => openCatalog("ids"));

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
  } else if (hash === "show-links" || hash === "~show-links") {
    openCatalog("links");
  } else if (hash === "show-ids" || hash === "~show-ids") {
    openCatalog("ids");
  }

  let refreshTimer = null;
  window.addEventListener("workspace-index-file-saved", () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refreshStatus(), 600);
  });

  refreshStatus();
})();
