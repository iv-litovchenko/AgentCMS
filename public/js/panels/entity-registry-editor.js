(function initEntityRegistryEditor() {
  const modal = document.getElementById("entity-registry-editor-modal");
  if (!modal) return;

  const closeBtn = document.getElementById("entity-registry-editor-close-btn");
  const typeList = document.getElementById("entity-editor-type-list");
  const listTitle = document.getElementById("entity-editor-list-title");
  const objectList = document.getElementById("entity-editor-object-list");
  const objectQ = document.getElementById("entity-editor-object-q");
  const addTypeBtn = document.getElementById("entity-editor-add-type-btn");
  const addObjectBtn = document.getElementById("entity-editor-add-object-btn");
  const detailEmpty = document.getElementById("entity-editor-detail-empty");
  const detailForm = document.getElementById("entity-editor-detail-form");
  const detailType = document.getElementById("entity-editor-detail-type");
  const detailLabel = document.getElementById("entity-editor-detail-label");
  const detailCanonical = document.getElementById("entity-editor-detail-canonical");
  const detailReject = document.getElementById("entity-editor-detail-reject");
  const mentionsNode = document.getElementById("entity-editor-mentions");
  const searchType = document.getElementById("entity-editor-search-type");
  const searchObject = document.getElementById("entity-editor-search-object");
  const searchQ = document.getElementById("entity-editor-search-q");
  const searchBtn = document.getElementById("entity-editor-search-btn");
  const rebuildBtn = document.getElementById("entity-editor-rebuild-btn");
  const searchResults = document.getElementById("entity-editor-search-results");
  const openMenuBtn = document.getElementById("menu-entity-editor-open-btn");
  const addTypeForm = document.getElementById("entity-editor-add-type-form");
  const addTypeCancel = document.getElementById("entity-editor-add-type-cancel");
  const newTypeLabel = document.getElementById("entity-editor-new-type-label");
  const newTypeTags = document.getElementById("entity-editor-new-type-tags");
  const addObjectForm = document.getElementById("entity-editor-add-object-form");
  const addObjectCancel = document.getElementById("entity-editor-add-object-cancel");
  const newObjectLabel = document.getElementById("entity-editor-new-object-label");
  const listHint = document.getElementById("entity-editor-list-hint");

  const ACTIVE_AGENT_STORAGE_KEY = "agentcms.activeAgent.v1";

  let panelCtx = { buildApiUrl: null, getActiveAgentId: null };
  let state = {
    registry: null,
    selectedTypeId: "person",
    selectedEntity: null,
    entities: [],
    catalogReady: true,
    catalogHint: ""
  };

  function resolveActiveAgentIdFromLocation() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("agent");
      if (fromQuery) return fromQuery;
    } catch {
      // ignore
    }
    try {
      return localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY) || "main";
    } catch {
      return "main";
    }
  }

  function getActiveAgentId() {
    const fromCtx = panelCtx.getActiveAgentId?.();
    if (fromCtx) return fromCtx;
    return resolveActiveAgentIdFromLocation();
  }

  function buildApiUrl(path, params = {}) {
    if (typeof panelCtx.buildApiUrl === "function") {
      return panelCtx.buildApiUrl(path, params);
    }
    const agentId = getActiveAgentId();
    const url = new URL(path, window.location.origin);
    if (agentId) url.searchParams.set("agent", agentId);
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  function toast(message, kind = "info") {
    if (typeof showToast === "function") showToast(message, kind);
  }

  async function apiJson(path, { method = "GET", body } = {}) {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers: body != null ? { "Content-Type": "application/json" } : undefined,
      body: body != null ? JSON.stringify(body) : undefined
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      // ignore
    }
    if (!response.ok) {
      throw new Error(data.details || data.error || response.statusText || "Ошибка запроса");
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function types() {
    return Array.isArray(state.registry?.types) ? state.registry.types : [];
  }

  function typeLabel(id) {
    return types().find((t) => t.id === id)?.label || id;
  }

  function openModal() {
    modal.classList.remove("hidden");
    toggleAddTypeForm(false);
    toggleAddObjectForm(false);
    void refreshAll();
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  async function fetchRegistry() {
    const response = await fetch(buildApiUrl("/api/entity-index/registry"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.details || response.statusText);
    state.registry = data.registry || data;
    if (!state.selectedTypeId && types()[0]) state.selectedTypeId = types()[0].id;
  }

  async function fetchCatalogItems(typeId) {
    const response = await fetch(
      buildApiUrl("/api/entity-index/catalog", { limit: 200, type: typeId || "" })
    );
    let data = {};
    try {
      data = await response.json();
    } catch {
      // ignore
    }
    if (!response.ok) {
      throw new Error(data.details || data.error || response.statusText || "Ошибка каталога");
    }
    state.catalogReady = data.ready !== false;
    state.catalogHint = data.hint || "";
    return Array.isArray(data.items) ? data.items : [];
  }

  async function fetchEntities() {
    state.entities = await fetchCatalogItems(state.selectedTypeId || "");
  }

  function renderTypes() {
    if (!typeList) return;
    typeList.innerHTML = types()
      .map((t) => {
        const active = t.id === state.selectedTypeId ? " is-active" : "";
        const tags = (t.tags || []).slice(0, 4).join(", ");
        return `<li><button type="button" class="entity-editor-type-btn${active}" data-type-id="${escapeHtml(t.id)}">
          <span class="entity-editor-type-label">${escapeHtml(t.label)}</span>
          <span class="entity-editor-type-meta">${escapeHtml(t.id)}${tags ? ` · #${escapeHtml(tags)}` : ""}</span>
        </button></li>`;
      })
      .join("");
  }

  function renderObjects() {
    if (!objectList) return;
    const q = String(objectQ?.value || "")
      .trim()
      .toLowerCase();
    const items = state.entities.filter((row) => {
      if (row.type !== state.selectedTypeId && state.selectedTypeId) {
        return String(row.type) === state.selectedTypeId;
      }
      return true;
    }).filter((row) => !q || String(row.label || "").toLowerCase().includes(q));

    items.sort((a, b) => {
      const diff = (b.mentionCount || 0) - (a.mentionCount || 0);
      if (diff !== 0) return diff;
      return String(a.label || "").localeCompare(String(b.label || ""), "ru");
    });

    if (listTitle) {
      listTitle.textContent = `Объекты · ${typeLabel(state.selectedTypeId)} (${items.length})`;
    }

    if (listHint) {
      if (!state.catalogReady) {
        listHint.textContent =
          state.catalogHint || "Индекс не построен — нажмите «Пересобрать» внизу формы.";
        listHint.classList.remove("hidden");
      } else {
        listHint.classList.add("hidden");
        listHint.textContent = "";
      }
    }

    if (!items.length) {
      objectList.innerHTML =
        '<p class="entity-registry-editor-hint">Нет объектов этого типа — добавьте вручную (+ объект) или пересоберите индекс.</p>';
      return;
    }

    objectList.innerHTML = items
      .map((row) => {
        const active =
          state.selectedEntity?.entityId === row.entityId ? " is-active" : "";
        const label = String(row.label || "");
        return `<button type="button" class="entity-editor-object-row${active}" data-entity-id="${escapeHtml(row.entityId)}" data-entity-label="${escapeHtml(label)}" data-entity-type="${escapeHtml(row.type)}" title="${escapeHtml(label)}">
          <span class="entity-editor-object-label">${escapeHtml(label)}</span>
          <span class="entity-editor-object-count">${escapeHtml(String(row.mentionCount || 0))}</span>
        </button>`;
      })
      .join("");
  }

  function fillTypeSelects() {
    const options = types()
      .map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)}</option>`)
      .join("");
    if (detailType) detailType.innerHTML = options;
    if (searchType) searchType.innerHTML = options;
    if (searchType) searchType.value = state.selectedTypeId || types()[0]?.id || "";
    syncSearchObjectOptions();
  }

  function renderSearchObjectOptions(rows) {
    if (!searchObject) return;
    const options = [
      '<option value="">— любой из типа —</option>',
      ...rows.map(
        (r) =>
          `<option value="${escapeHtml(r.entityId)}">${escapeHtml(r.label)}${r.mentionCount === 0 ? " · seed" : ""}</option>`
      )
    ];
    searchObject.innerHTML = options.join("");
  }

  async function syncSearchObjectOptions() {
    const typeId = searchType?.value || state.selectedTypeId;
    if (typeId === state.selectedTypeId) {
      renderSearchObjectOptions(state.entities);
      return;
    }
    try {
      const rows = await fetchCatalogItems(typeId);
      renderSearchObjectOptions(rows);
    } catch (error) {
      renderSearchObjectOptions([]);
      if (searchResults) searchResults.textContent = String(error.message || error);
    }
  }

  async function loadMentions(entityId, label) {
    if (!mentionsNode) return;
    mentionsNode.innerHTML = "Загрузка…";
    try {
      const response = await fetch(buildApiUrl("/api/entity-index/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mentions", entityId, limit: 12 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      const items = Array.isArray(data.items) ? data.items : [];
      mentionsNode.innerHTML = items.length
        ? `<p class="entity-registry-editor-hint">Упоминания «${escapeHtml(label)}»</p>${items
            .map(
              (m) =>
                `<div class="entity-editor-mention-row"><code>${escapeHtml(m.path)}:${m.line || "?"}</code><span>${escapeHtml(m.snippet || "")}</span></div>`
            )
            .join("")}`
        : `<p class="entity-registry-editor-hint">Упоминаний пока нет.</p>`;
    } catch (error) {
      mentionsNode.textContent = String(error.message || error);
    }
  }

  function selectEntity(row) {
    state.selectedEntity = row;
    if (!row) {
      detailForm?.classList.add("hidden");
      detailEmpty?.classList.remove("hidden");
      if (mentionsNode) mentionsNode.innerHTML = "";
      renderObjects();
      return;
    }
    detailEmpty?.classList.add("hidden");
    detailForm?.classList.remove("hidden");
    if (detailType) detailType.value = row.type || state.selectedTypeId;
    if (detailLabel) detailLabel.value = row.label || "";
    if (detailCanonical) detailCanonical.value = "";
    if (detailReject) detailReject.checked = false;
    renderObjects();
    void loadMentions(row.entityId, row.label);
  }

  async function refreshAll() {
    try {
      await fetchRegistry();
      if (!types().some((t) => t.id === state.selectedTypeId)) {
        state.selectedTypeId = types()[0]?.id || "person";
      }
      fillTypeSelects();
      renderTypes();
      await fetchEntities();
      renderObjects();
      syncSearchObjectOptions();
    } catch (error) {
      if (searchResults) searchResults.textContent = String(error.message || error);
    }
  }

  async function saveDetailForm(event) {
    event.preventDefault();
    const label = detailLabel?.value?.trim() || "";
    const type = detailType?.value || state.selectedTypeId;
    const canonical = detailCanonical?.value?.trim() || "";
    const reject = Boolean(detailReject?.checked);
    if (!label) return;

    try {
      if (reject) {
        await fetch(buildApiUrl("/api/entity-index/reject"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, type })
        });
      }
      if (canonical && canonical !== label) {
        await fetch(buildApiUrl("/api/entity-index/alias"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match: label, label: canonical, type })
        });
      }
      if (typeof showToast === "function") showToast("Сохранено в entity-registry.yml", "success");
      await fetchRegistry();
      const rebuild = window.confirm("Пересобрать реестр сейчас?");
      if (rebuild) {
        await fetch(buildApiUrl("/api/entity-index/reindex"), { method: "POST" });
        await refreshAll();
      }
    } catch (error) {
      if (typeof showToast === "function") showToast(String(error.message || error), "error");
    }
  }

  function toggleAddTypeForm(show) {
    addTypeForm?.classList.toggle("hidden", !show);
    if (show) newTypeLabel?.focus();
    else {
      if (newTypeLabel) newTypeLabel.value = "";
      if (newTypeTags) newTypeTags.value = "";
    }
  }

  function toggleAddObjectForm(show) {
    addObjectForm?.classList.toggle("hidden", !show);
    if (show) newObjectLabel?.focus();
    else if (newObjectLabel) newObjectLabel.value = "";
  }

  function slugTypeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04ff_-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  async function addTypeFromForm(event) {
    event.preventDefault();
    const label = newTypeLabel?.value?.trim() || "";
    if (!label) return;
    const id = slugTypeId(label);
    const tags = String(newTypeTags?.value || "")
      .split(/[,;]+/)
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean);
    try {
      await apiJson("/api/entity-index/type", {
        method: "POST",
        body: { id, label, tags }
      });
      state.selectedTypeId = id;
      toggleAddTypeForm(false);
      toast("Тип сохранён в entity-registry.yml", "success");
      await refreshAll();
    } catch (error) {
      toast(String(error.message || error), "error");
    }
  }

  async function addObjectFromForm(event) {
    event.preventDefault();
    const label = newObjectLabel?.value?.trim() || "";
    if (!label) return;
    try {
      await apiJson("/api/entity-index/seed", {
        method: "POST",
        body: { label, type: state.selectedTypeId }
      });
      toggleAddObjectForm(false);
      toast("Объект добавлен, обновляю индекс…", "success");
      await apiJson("/api/entity-index/reindex", { method: "POST" });
      await refreshAll();
    } catch (error) {
      toast(String(error.message || error), "error");
    }
  }

  async function runSearch() {
    let q = searchQ?.value?.trim() || "";
    const entityId = searchObject?.value || "";
    if (q.length < 2) q = "заметка";
    searchResults.textContent = "Поиск…";
    try {
      const body = { query: q, limit: 15 };
      if (entityId) body.entityIds = [entityId];
      else {
        body.entityWhere = { type: searchType?.value || state.selectedTypeId };
        const label = searchObject?.selectedOptions?.[0]?.textContent?.trim();
        if (label) body.entityWhere.q = label;
      }
      const response = await fetch(buildApiUrl("/api/search/hybrid"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || response.statusText);
      const hits = Array.isArray(data.hits) ? data.hits : [];
      searchResults.innerHTML = hits.length
        ? hits
            .map(
              (h) =>
                `<div class="entity-editor-search-hit"><code>${escapeHtml(h.path)}</code><span>${escapeHtml(h.snippet || h.title || "")}</span></div>`
            )
            .join("")
        : `<p class="entity-registry-editor-hint">${escapeHtml(data.hint || "Ничего не найдено")}</p>`;
    } catch (error) {
      searchResults.textContent = String(error.message || error);
    }
  }

  typeList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-type-id]");
    if (!btn) return;
    state.selectedTypeId = btn.dataset.typeId;
    state.selectedEntity = null;
    selectEntity(null);
    void fetchEntities().then(() => {
      renderTypes();
      renderObjects();
      syncSearchObjectOptions();
    });
  });

  objectList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-entity-id]");
    if (!btn) return;
    selectEntity({
      entityId: btn.dataset.entityId,
      label: btn.dataset.entityLabel,
      type: btn.dataset.entityType
    });
  });

  objectQ?.addEventListener("input", () => renderObjects());
  detailForm?.addEventListener("submit", (e) => void saveDetailForm(e));
  addTypeBtn?.addEventListener("click", () => toggleAddTypeForm(addTypeForm?.classList.contains("hidden")));
  addObjectBtn?.addEventListener("click", () =>
    toggleAddObjectForm(addObjectForm?.classList.contains("hidden"))
  );
  addTypeForm?.addEventListener("submit", (e) => void addTypeFromForm(e));
  addTypeCancel?.addEventListener("click", () => toggleAddTypeForm(false));
  addObjectForm?.addEventListener("submit", (e) => void addObjectFromForm(e));
  addObjectCancel?.addEventListener("click", () => toggleAddObjectForm(false));
  searchBtn?.addEventListener("click", () => void runSearch());
  searchType?.addEventListener("change", () => {
    void syncSearchObjectOptions();
  });
  rebuildBtn?.addEventListener("click", async () => {
    try {
      rebuildBtn.disabled = true;
      await apiJson("/api/entity-index/reindex", { method: "POST" });
      await refreshAll();
      toast("Реестр пересобран", "success");
    } catch (error) {
      toast(String(error.message || error), "error");
    } finally {
      rebuildBtn.disabled = false;
    }
  });

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  openMenuBtn?.addEventListener("click", openModal);

  window.EntityRegistryEditor = {
    init(options = {}) {
      panelCtx = { ...panelCtx, ...options };
    },
    open: openModal
  };
})();
