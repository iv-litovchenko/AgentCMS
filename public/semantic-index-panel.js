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
  const runLogBtn = document.getElementById("menu-workspace-index-run-log-btn");
  const pipelineStatusNode = document.getElementById("menu-workspace-index-pipeline-status");
  const indexPolicyHintNode = document.getElementById("menu-workspace-index-policy-hint");
  const storageModeSelect = document.getElementById("menu-storage-index-mode-select");
  const PIPELINE_BTN_LABEL_FULL =
    "Полная цепочка (OCR → слова → смысл → поля → связи → id)";
  const PIPELINE_BTN_TITLE_WITH_OCR =
    "OCR → слова → смысл → поля → связи → id";
  const PIPELINE_BTN_TITLE_NO_OCR =
    "Слова → смысл → поля → связи → id (OCR пропускается)";
  const navFlagsStatusNode = document.getElementById("menu-nav-flags-registry-status");
  const navFlagsRebuildBtn = document.getElementById("menu-nav-flags-registry-rebuild-btn");
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
    !storageRebuildQuickBtn
  ) {
    return;
  }

  let indexPolicyCache = null;

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

  const runLogModal = document.getElementById("workspace-index-run-log-modal");
  const runLogSubtitle = document.getElementById("workspace-index-run-log-subtitle");
  const runLogQ = document.getElementById("workspace-index-run-log-q");
  const runLogMeta = document.getElementById("workspace-index-run-log-meta");
  const runLogList = document.getElementById("workspace-index-run-log-list");
  const runLogCloseBtn = document.getElementById("workspace-index-run-log-close-btn");
  const runLogRefreshBtn = document.getElementById("workspace-index-run-log-refresh-btn");

  const runLogState = {
    loading: false,
    files: [],
    filter: ""
  };

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
    if (health === "error") return "error";
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

  function formatNavFlagsRegistryStatus(data) {
    if (!data?.ready) return data?.reason || "Реестр не построен";
    const parts = [
      `фокус ${data.focusCount || 0} · главная ${data.mainCount || 0}`,
      data.builtAt ? new Date(data.builtAt).toLocaleString("ru-RU") : "—"
    ];
    if (data.rebuildMs != null) parts.push(`${data.rebuildMs} ms`);
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
      monitor?.summary?.health === "error" ||
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

  async function refreshNavFlagsRegistryStatus() {
    if (!navFlagsStatusNode) return null;
    try {
      const response = await fetch(buildApiUrl("/api/nav-flags-registry/status"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      navFlagsStatusNode.textContent = formatNavFlagsRegistryStatus(data);
      return data;
    } catch (error) {
      navFlagsStatusNode.textContent = String(error.message || error);
      return null;
    }
  }

  function getSelectedStorageMode() {
    return storageModeSelect?.value === "full" ? "full" : "quick";
  }

  function getPipelineStepsFromPolicy() {
    if (indexPolicyCache?.steps) return { ...indexPolicyCache.steps };
    return {
      ocr: false,
      fulltext: true,
      semantic: true,
      storage: true,
      link: true,
      "workspace-id": true
    };
  }

  function syncPipelineButtonChrome() {
    if (!pipelineBtn) return;
    pipelineBtn.textContent = PIPELINE_BTN_LABEL_FULL;
    const steps = getPipelineStepsFromPolicy();
    const parts = [];
    if (steps.ocr && OCR_INDEXING_ENABLED) parts.push("OCR");
    if (steps.fulltext) parts.push("слова");
    if (steps.semantic) parts.push("смысл");
    if (steps.storage) parts.push("поля");
    if (steps.link) parts.push("связи");
    if (steps["workspace-id"]) parts.push("id");
    const chain = parts.join(" → ");
    if (OCR_INDEXING_ENABLED && steps.ocr) {
      pipelineBtn.title = chain || PIPELINE_BTN_TITLE_WITH_OCR;
    } else {
      pipelineBtn.title = chain ? `${chain} (OCR пропускается)` : PIPELINE_BTN_TITLE_NO_OCR;
    }
  }

  function applyLayerButtonState(button, enabled, disabledHint = "Слой отключён в settings.global.yml") {
    if (!button) return;
    const disabled = enabled === false;
    button.disabled = disabled;
    button.classList.toggle("is-feature-disabled", disabled);
    button.title = disabled ? disabledHint : rememberButtonLabel(button);
  }

  function restoreIndexButtonPolicyState(button) {
    if (!button || !indexPolicyCache?.layers) return;
    const layerByButton = new Map([
      [fulltextRebuildBtn, "fulltext"],
      [semanticRebuildBtn, "semantic"],
      [storageRebuildQuickBtn, "storage"],
      [storageRebuildFullBtn, "storage"],
      [linkRebuildBtn, "link"],
      [workspaceIdSyncBtn, "workspaceId"]
    ]);
    const layerKey = layerByButton.get(button);
    if (!layerKey) return;
    applyLayerButtonState(button, indexPolicyCache.layers[layerKey]);
  }

  function syncLayerBlockBadges(policy) {
    const layers = policy?.layers || {};
    document.querySelectorAll("[data-index-layer]").forEach((block) => {
      const layerKey = block.dataset.indexLayer;
      const enabled = Boolean(layers[layerKey]);
      block.classList.toggle("is-feature-disabled", !enabled);
      const title = block.querySelector(".menu-index-block-title");
      if (!title) return;
      let badge = title.querySelector(".menu-index-layer-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "menu-index-layer-badge";
        title.append(badge);
      }
      badge.textContent = enabled ? "вкл" : "выкл";
      badge.classList.toggle("is-on", enabled);
      badge.classList.toggle("is-off", !enabled);
    });
  }

  function syncIndexPolicyUi(policy) {
    indexPolicyCache = policy || null;
    if (!policy) return;

    if (storageModeSelect) {
      storageModeSelect.value = policy.storageMode === "full" ? "full" : "quick";
    }

    applyLayerButtonState(fulltextRebuildBtn, policy.layers?.fulltext);
    applyLayerButtonState(semanticRebuildBtn, policy.layers?.semantic);
    applyLayerButtonState(storageRebuildQuickBtn, policy.layers?.storage);
    applyLayerButtonState(linkRebuildBtn, policy.layers?.link);
    applyLayerButtonState(workspaceIdSyncBtn, policy.layers?.workspaceId);

    syncLayerBlockBadges(policy);

    if (indexPolicyHintNode) {
      const ext = (policy.extensions || []).join(", ") || ".md";
      const prefixes = (policy.prefixes || []).length ? policy.prefixes.join(", ") : "весь workspace";
      const excludes = (policy.excludePatterns || []).length ? policy.excludePatterns.join(", ") : "—";
      const enabledSteps = Object.entries(policy.steps || {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([step]) => step)
        .join(", ");
      const tuning = policy.searchTuning || {};
      indexPolicyHintNode.textContent =
        `Политика: ${ext} · разделы: ${prefixes} · исключения: ${excludes}` +
        `${enabledSteps ? ` · pipeline: ${enabledSteps}` : ""}` +
        `${tuning.semanticChunkMaxLen ? ` · RAG: ${tuning.semanticChunkMaxLen}/${tuning.semanticChunkOverlap}` : ""}`;
    }
    syncPipelineButtonChrome();
  }

  async function loadIndexPolicy() {
    try {
      const response = await fetch(buildApiUrl("/api/workspace-index/policy"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      syncIndexPolicyUi(data);
      return data;
    } catch (error) {
      if (indexPolicyHintNode) {
        indexPolicyHintNode.textContent = String(error.message || error);
      }
      return null;
    }
  }

  async function refreshStatus() {
    try {
      const [monitorRes, idStatus] = await Promise.all([
        fetch(buildApiUrl("/api/workspace-index/monitor")),
        refreshWorkspaceIdStatus(),
        refreshNavFlagsRegistryStatus(),
        loadIndexPolicy()
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
          ? `${data.total || 0} записей с awn-id · след. ${data.nextId || 1} · ${data.counterFile || "settings.yml"}`
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

  function renderRunLogItems(files) {
    if (!files.length) {
      return '<p class="workspace-index-run-log-empty">Нет файлов по текущему фильтру.</p>';
    }
    return files
      .map(
        (filePath) =>
          `<div class="workspace-index-run-log-item"><code>${escapeHtml(filePath)}</code></div>`
      )
      .join("");
  }

  function applyRunLogFilter() {
    const query = String(runLogState.filter || "")
      .trim()
      .toLowerCase();
    const files = query
      ? runLogState.files.filter((filePath) => String(filePath).toLowerCase().includes(query))
      : runLogState.files.slice();
    if (runLogMeta) {
      runLogMeta.textContent = query
        ? `Показано ${files.length} из ${runLogState.files.length}`
        : `Всего ${runLogState.files.length} файлов`;
    }
    if (runLogList) {
      runLogList.innerHTML = renderRunLogItems(files);
    }
  }

  async function loadRunLog() {
    if (!runLogList || runLogState.loading) return;
    runLogState.loading = true;
    runLogList.innerHTML = '<p class="workspace-index-run-log-empty">Загрузка…</p>';
    if (runLogMeta) runLogMeta.textContent = "";
    try {
      const response = await fetch(buildApiUrl("/api/workspace-index/run-log"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      if (!data.exists) {
        runLogState.files = [];
        if (runLogSubtitle) {
          runLogSubtitle.textContent = data.hint || "Лог ещё не создан";
        }
        runLogList.innerHTML = `<p class="workspace-index-run-log-empty">${escapeHtml(
          data.hint || "Лог ещё не создан — запустите полную цепочку индексирования."
        )}</p>`;
        if (runLogMeta && data.path) {
          runLogMeta.textContent = data.path;
        }
        return;
      }
      runLogState.files = Array.isArray(data.files) ? data.files : [];
      if (runLogSubtitle) {
        const parts = [];
        if (data.builtAt) parts.push(data.builtAt);
        if (data.kind) parts.push(data.kind);
        if (data.durationMs != null) parts.push(`${data.durationMs} ms`);
        runLogSubtitle.textContent = parts.join(" · ");
      }
      if (runLogMeta) {
        const pathParts = [data.path, data.jsonPath].filter(Boolean);
        runLogMeta.textContent = pathParts.length ? pathParts.join(" · ") : "";
      }
      applyRunLogFilter();
    } catch (error) {
      runLogState.files = [];
      runLogList.innerHTML = `<p class="workspace-index-run-log-empty is-error">${escapeHtml(
        error.message || error
      )}</p>`;
      if (runLogSubtitle) runLogSubtitle.textContent = "";
      if (runLogMeta) runLogMeta.textContent = "";
    } finally {
      runLogState.loading = false;
    }
  }

  function openRunLogModal() {
    if (!runLogModal) return;
    runLogModal.classList.remove("hidden");
    void loadRunLog();
  }

  function closeRunLogModal() {
    runLogModal?.classList.add("hidden");
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
    syncPipelineButtonChrome();
  }

  async function bindActionButton(button, handler) {
    if (!button) return;
    button.addEventListener("click", async () => {
      if (button.disabled || button.classList.contains("is-feature-disabled")) return;
      button.disabled = true;
      button.classList.add("is-loading");
      try {
        await handler();
      } finally {
        button.classList.remove("is-loading");
        restoreIndexButtonPolicyState(button);
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
    workspaceIdSyncBtn,
    navFlagsRebuildBtn
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
    const mode = getSelectedStorageMode();
    await runRebuild(
      "/api/storage-index/reindex",
      storageStatusNode,
      (data) =>
        mode === "full"
          ? `Поля (полный): ${data.recordCount} записей, ${data.fieldCount} полей · schema + типы.`
          : `Поля (быстрый): ${data.recordCount} записей, ${data.fieldCount} полей.`,
      { body: { mode }, progressButton: storageRebuildQuickBtn, progressLayer: "storage" }
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

  bindActionButton(navFlagsRebuildBtn, async () => {
    await runRebuild(
      "/api/nav-flags-registry/rebuild",
      navFlagsStatusNode,
      (data) =>
        `Реестр: фокус ${data.focusCount || 0} · главная ${data.mainCount || 0} · ${data.rebuildMs || 0} ms`,
      { loadingLabel: "Сборка реестра awn-main / awn-focus…" }
    );
  });

  bindActionButton(pipelineBtn, async () => {
    if (!pipelineStatusNode) return;
    const steps = getPipelineStepsFromPolicy();
    const enabledLabels = [];
    if (steps.ocr && OCR_INDEXING_ENABLED) enabledLabels.push("OCR");
    if (steps.fulltext) enabledLabels.push("слова");
    if (steps.semantic) enabledLabels.push("смысл");
    if (steps.storage) enabledLabels.push("поля");
    if (steps.link) enabledLabels.push("связи");
    if (steps["workspace-id"]) enabledLabels.push("id");
    if (!enabledLabels.length) {
      pipelineStatusNode.textContent = "Все шаги pipeline отключены в settings.global.yml";
      return;
    }
    const loadingLabel = `Цепочка: ${enabledLabels.join(" → ")}…`;
    pipelineStatusNode.textContent = loadingLabel;
    const data = await runRebuild("/api/workspace-index/pipeline", pipelineStatusNode, () => "Готово.", {
      body: {
        storageMode: getSelectedStorageMode(),
        ocrLimit: 200
      },
      loadingLabel
    });
    if (!data) return;
    const resolvedSteps = data.steps || steps;
    const parts = [];
    if (resolvedSteps.ocr && data.ocr && !data.ocr.skipped) {
      parts.push(`OCR ${data.ocr.processed || 0}/${data.ocr.candidateCount || "?"}`);
    }
    if (resolvedSteps.fulltext && data.fulltext && !data.fulltext.skipped) {
      parts.push(`слова ${data.fulltext.fileCount || 0}`);
    }
    if (resolvedSteps.semantic && data.semantic && !data.semantic.skipped) {
      parts.push(`смысл ${data.semantic.chunkCount || 0}`);
    }
    if (resolvedSteps.storage && data.storage && !data.storage.skipped) {
      parts.push(`поля ${data.storage.recordCount || 0}`);
    }
    if (resolvedSteps.link && data.link && !data.link.skipped) {
      parts.push(`связи ${data.link.edgeCount || 0}`);
    }
    if (resolvedSteps["workspace-id"] && data.workspaceId && !data.workspaceId.skipped) {
      parts.push(`id ${data.workspaceId.assignedCount || 0}`);
    }
    const runLogHint =
      data.runLog?.fileCount != null
        ? `лог ${data.runLog.fileCount} файлов → ${data.runLog.logPath || ".agent-cms/cache/indexes/last-run-files.txt"}`
        : "";
    const summary = parts.length ? `Готово · ${parts.join(" · ")}` : "Готово";
    pipelineStatusNode.textContent = runLogHint ? `${summary} · ${runLogHint}` : summary;
  });

  bindActionButton(runLogBtn, async () => {
    openRunLogModal();
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

  function initCacheResetHintButton() {
    const hintBtn = document.getElementById("menu-workspace-index-cache-reset-hint-btn");
    if (!hintBtn || hintBtn.dataset.hintBound === "1") return;
    hintBtn.dataset.hintBound = "1";

    let hintNode = null;
    let hintOpen = false;

    function ensureHintNode() {
      if (hintNode) return hintNode;
      hintNode = document.getElementById("app-floating-hint");
      if (!hintNode) {
        hintNode = document.createElement("div");
        hintNode.id = "app-floating-hint";
        hintNode.className = "app-floating-hint hidden";
        hintNode.setAttribute("role", "tooltip");
        document.body.appendChild(hintNode);
      }
      return hintNode;
    }

    function hideHint() {
      hintOpen = false;
      hintBtn.setAttribute("aria-expanded", "false");
      ensureHintNode().classList.add("hidden");
    }

    function positionHint() {
      const node = ensureHintNode();
      const rect = hintBtn.getBoundingClientRect();
      const margin = 8;
      node.classList.remove("hidden");
      const tipW = node.offsetWidth;
      const tipH = node.offsetHeight;
      let left = rect.left + rect.width / 2 - tipW / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
      let top = rect.bottom + margin;
      if (top + tipH > window.innerHeight - margin) {
        top = rect.top - tipH - margin;
      }
      node.style.left = `${Math.round(left)}px`;
      node.style.top = `${Math.round(top)}px`;
    }

    function showHint() {
      const text = String(hintBtn.dataset.hint || "").trim();
      if (!text) return;
      hintOpen = true;
      hintBtn.setAttribute("aria-expanded", "true");
      const node = ensureHintNode();
      node.textContent = text;
      positionHint();
    }

    hintBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hintOpen) hideHint();
      else showHint();
    });

    document.addEventListener("click", (event) => {
      if (!hintOpen) return;
      if (event.target.closest("#menu-workspace-index-cache-reset-hint-btn")) return;
      hideHint();
    });

    window.addEventListener(
      "scroll",
      () => {
        if (hintOpen) positionHint();
      },
      true
    );
    window.addEventListener("resize", () => {
      if (hintOpen) positionHint();
    });
  }

  initCacheResetHintButton();

  window.addEventListener("header-index-popover-open", () => {
    void refreshStatus();
  });

  window.addEventListener("workspace-index-policy-changed", () => {
    void loadIndexPolicy();
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

  runLogCloseBtn?.addEventListener("click", closeRunLogModal);
  runLogModal?.addEventListener("click", (event) => {
    if (event.target === runLogModal) closeRunLogModal();
  });
  runLogRefreshBtn?.addEventListener("click", () => {
    void loadRunLog();
  });
  runLogQ?.addEventListener("input", () => {
    runLogState.filter = runLogQ.value || "";
    applyRunLogFilter();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (catalogModal && !catalogModal.classList.contains("hidden")) {
      closeCatalog();
      return;
    }
    if (runLogModal && !runLogModal.classList.contains("hidden")) {
      closeRunLogModal();
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
