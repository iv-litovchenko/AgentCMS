(function initCompanionVaultSwitcher(global) {
  if (global.__companionVaultSwitcherInit) return;
  if (window !== window.top) return;
  global.__companionVaultSwitcherInit = true;

  const PLATFORM_AGENT_ID = "platform";

  function sendRuntime(payload) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          resolve(response && typeof response === "object" ? response : { ok: false });
        });
      } catch {
        resolve({ ok: false });
      }
    });
  }

  function isPlatformAgent(agent) {
    return agent?.virtual === true || String(agent?.id || "").trim() === PLATFORM_AGENT_ID;
  }

  function isOrchestratorAgent(agent) {
    return agent?.orchestrator === true;
  }

  function isAgentRegistryActive(agent) {
    return agent?.active !== false;
  }

  function getRegistryAgentsForUi(agents) {
    return (Array.isArray(agents) ? agents : []).filter(
      (agent) => agent?.registryEditable !== false && !isPlatformAgent(agent)
    );
  }

  function normalizeAwnEmoji(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("ru", { granularity: "grapheme" });
      const first = [...segmenter.segment(text)][0];
      return first?.segment || text;
    }
    return [...text][0] || text;
  }

  function resolveAgentStatusEmoji(agent) {
    const fromStatus = normalizeAwnEmoji(agent?.awnProps?.["awn-status"] || agent?.status || "");
    if (fromStatus) return fromStatus;
    const fromEmoji = normalizeAwnEmoji(agent?.awnProps?.["awn-emoji"] || "");
    if (fromEmoji) return fromEmoji;
    if (agent?.folderExists === false) return "🔴";
    if (!isAgentRegistryActive(agent)) return "⚪";
    return "🟢";
  }

  function splitLandingOrchestratorAgent(agents) {
    const list = Array.isArray(agents) ? agents : [];
    const orchestrator = list.find(isOrchestratorAgent) || null;
    const rest = orchestrator ? list.filter((agent) => !isOrchestratorAgent(agent)) : list;
    return { orchestrator, rest };
  }

  const VAULT_SECTION_ORCHESTRATOR = "orchestrator";
  const VAULT_SECTION_UNGROUPED = "ungrouped";
  const VAULT_SECTION_FLAT = "flat";

  function buildAgentByIdMap(agents) {
    const agentById = new Map();
    for (const agent of Array.isArray(agents) ? agents : []) {
      const id = String(agent?.id || "").trim();
      if (id) agentById.set(id, agent);
    }
    return agentById;
  }

  function resolveAgentInMap(agentById, agentId) {
    const key = String(agentId || "").trim();
    if (!key) return null;
    if (agentById.has(key)) return agentById.get(key);
    const lower = key.toLowerCase();
    for (const [id, agent] of agentById) {
      if (String(id).trim().toLowerCase() === lower) return agent;
    }
    return null;
  }

  function normalizeGroupAgentIds(group) {
    const raw = group?.agentIds ?? group?.agents ?? [];
    if (!Array.isArray(raw)) return [];
    const ids = [];
    for (const item of raw) {
      if (typeof item === "string" || typeof item === "number") {
        const id = String(item).trim();
        if (id) ids.push(id);
        continue;
      }
      const id = String(item?.id || item?.agentId || "").trim();
      if (id) ids.push(id);
    }
    return [...new Set(ids)];
  }

  function getAssignedLandingAgentGroupMap(groups, agentById) {
    const assigned = new Map();
    for (const group of Array.isArray(groups) ? groups : []) {
      const groupId = String(group?.id || "").trim();
      if (!groupId) continue;
      for (const agentId of normalizeGroupAgentIds(group)) {
        const agent = resolveAgentInMap(agentById, agentId);
        if (agent) assigned.set(agent.id, groupId);
      }
    }
    return assigned;
  }

  function buildLandingGroupsLayout(agents, groups) {
    const layoutAgents = (Array.isArray(agents) ? agents : []).filter(
      (agent) => !isOrchestratorAgent(agent)
    );
    const agentById = buildAgentByIdMap(layoutAgents);
    const assigned = getAssignedLandingAgentGroupMap(groups, agentById);
    const grouped = (Array.isArray(groups) ? groups : []).map((group) => ({
      ...group,
      agents: normalizeGroupAgentIds(group)
        .map((agentId) => resolveAgentInMap(agentById, agentId))
        .filter((agent) => agent && !isOrchestratorAgent(agent))
    }));
    const ungrouped = layoutAgents.filter((agent) => !assigned.has(agent.id));
    return { grouped, ungrouped };
  }

  function vaultSectionHeader(sectionKey, sectionLabel) {
    if (!sectionKey || sectionKey === VAULT_SECTION_ORCHESTRATOR || sectionKey === VAULT_SECTION_FLAT) {
      return "";
    }
    if (sectionKey === VAULT_SECTION_UNGROUPED) return "Без группы";
    if (String(sectionKey).startsWith("group:")) {
      return String(sectionLabel || "").trim();
    }
    return "";
  }

  /** Тот же порядок, что в populateAgentSelect (Voice / CMS). */
  function buildVaultListEntries(agents, groups) {
    const registry = getRegistryAgentsForUi(agents);
    const entries = [];
    const workspaceAgents = registry.filter((agent) => !isPlatformAgent(agent));
    const { orchestrator } = splitLandingOrchestratorAgent(workspaceAgents);
    const hasGroups = Array.isArray(groups) && groups.length > 0;

    if (!hasGroups) {
      const rest = orchestrator
        ? workspaceAgents.filter((agent) => !isOrchestratorAgent(agent))
        : workspaceAgents;
      if (orchestrator) {
        entries.push({
          agent: orchestrator,
          sectionKey: VAULT_SECTION_ORCHESTRATOR,
          sectionLabel: ""
        });
      }
      for (const agent of rest) {
        entries.push({ agent, sectionKey: VAULT_SECTION_FLAT, sectionLabel: "" });
      }
      return entries;
    }

    const { grouped, ungrouped } = buildLandingGroupsLayout(workspaceAgents, groups);

    if (orchestrator) {
      entries.push({
        agent: orchestrator,
        sectionKey: VAULT_SECTION_ORCHESTRATOR,
        sectionLabel: ""
      });
    }

    for (const group of grouped) {
      const groupId = String(group.id || "").trim();
      const sectionLabel = String(group.title || group.id || "").trim();
      const sectionKey = groupId ? `group:${groupId}` : "";
      for (const agent of group.agents || []) {
        entries.push({ agent, sectionKey, sectionLabel });
      }
    }

    for (const agent of ungrouped) {
      entries.push({
        agent,
        sectionKey: VAULT_SECTION_UNGROUPED,
        sectionLabel: "Без группы"
      });
    }

    return entries;
  }

  function formatVaultListLabel(agent, groupTitle, { forList = false } = {}) {
    const prefix = String(groupTitle || "").trim();
    let label = agentDisplayName(agent, { forList });
    if (prefix) label = `${prefix} · ${label}`;
    return `${resolveAgentStatusEmoji(agent)} ${label}`;
  }

  function vaultEntrySearchHaystack(agent, sectionLabel = "") {
    const name = String(agent?.name || "").trim();
    const id = String(agent?.id || "").trim();
    const path = String(agent?.path || "").trim();
    const section = String(sectionLabel || "").trim();
    return [
      id,
      name,
      path,
      section,
      agentDisplayName(agent, { forList: true }),
      formatVaultListLabel(agent, "", { forList: true })
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function filterVaultListEntries(entries, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      vaultEntrySearchHaystack(entry.agent, entry.sectionLabel).includes(q)
    );
  }

  function agentDisplayName(agent, { forList = false } = {}) {
    if (!agent) return "Хранилище";
    const name = String(agent.name || "").trim();
    const id = String(agent.id || "").trim();
    let label = name && name !== id ? name : id || "Хранилище";
    if (forList && !isAgentRegistryActive(agent)) {
      label = `${label} (выкл.)`;
    }
    if (forList && isOrchestratorAgent(agent)) {
      label = `★ ${label}`;
    }
    return label;
  }

  function agentEmoji(agent) {
    const status = resolveAgentStatusEmoji(agent);
    if (status && status.length <= 2) return status;
    const name = agentDisplayName(agent);
    return name.charAt(0).toUpperCase() || "◆";
  }

  function buildAgentThumbUrl(cmsBase, agent) {
    if (!agent?.path || !cmsBase) return null;
    const base = String(cmsBase).replace(/\/$/, "");
    const hasPreview =
      agent.hasPreview === true ||
      String(agent.previewUrl || "").startsWith("/api/agents/workspace-preview");
    if (!hasPreview) return null;
    const pathPart = String(agent.previewUrl || "").startsWith("/api/agents/workspace-preview")
      ? agent.previewUrl
      : `/api/agents/workspace-preview?path=${encodeURIComponent(agent.path)}`;
    const url = new URL(pathPart, base);
    if (agent.id) url.searchParams.set("agent", String(agent.id));
    url.searchParams.set("thumb", "1");
    url.searchParams.set("max", "160");
    return url.href;
  }

  async function loadVaultPreviewIntoImg(img, thumbUrl) {
    const url = String(thumbUrl || "").trim();
    if (!img || !url) return false;
    const token = Symbol("vaultPreview");
    img.__ascVaultPreviewToken = token;
    img.hidden = true;
    img.removeAttribute("src");
    const res = await sendRuntime({ type: "COMPANION_FETCH_CMS_PREVIEW", url });
    if (img.__ascVaultPreviewToken !== token) return false;
    if (!res?.ok || !res.dataUrl) return false;
    await new Promise((resolve) => {
      const onDone = () => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onFail);
        resolve();
      };
      const onFail = () => {
        if (img.__ascVaultPreviewToken !== token) {
          onDone();
          return;
        }
        img.hidden = true;
        img.removeAttribute("src");
        onDone();
      };
      img.addEventListener("load", () => {
        if (img.__ascVaultPreviewToken !== token) return;
        img.hidden = false;
        onDone();
      });
      img.addEventListener("error", onFail);
      img.src = res.dataUrl;
      if (img.complete && img.naturalWidth > 0) {
        img.hidden = false;
        resolve();
      }
    });
    return img.__ascVaultPreviewToken === token && !img.hidden;
  }

  function clearVaultPreviewImg(img) {
    if (!img) return;
    img.__ascVaultPreviewToken = null;
    img.hidden = true;
    img.removeAttribute("src");
  }

  function createCompanionVaultDock() {
    const wrap = document.createElement("div");
    wrap.className = "asc-vault-dock";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "asc-vault-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.title = "Выбрать хранилище";

    const avatar = document.createElement("span");
    avatar.className = "asc-vault-avatar asc-vault-avatar--fallback";
    const avatarFrame = document.createElement("span");
    avatarFrame.className = "asc-vault-avatar-frame";
    const avatarImg = document.createElement("img");
    avatarImg.className = "asc-vault-avatar-img";
    avatarImg.alt = "";
    avatarImg.hidden = true;
    const avatarFallback = document.createElement("span");
    avatarFallback.className = "asc-vault-avatar-fallback";
    avatarFallback.setAttribute("aria-hidden", "true");
    const avatarShine = document.createElement("span");
    avatarShine.className = "asc-vault-avatar-shine";
    avatarShine.setAttribute("aria-hidden", "true");
    const avatarStatus = document.createElement("span");
    avatarStatus.className = "asc-vault-avatar-status";
    avatarStatus.setAttribute("aria-hidden", "true");
    avatarStatus.hidden = true;
    avatarFrame.append(avatarImg, avatarFallback, avatarShine);
    avatar.append(avatarFrame, avatarStatus);

    const meta = document.createElement("span");
    meta.className = "asc-vault-meta";
    const nameEl = document.createElement("span");
    nameEl.className = "asc-vault-name";
    nameEl.textContent = "Хранилище";
    const hintEl = document.createElement("span");
    hintEl.className = "asc-vault-hint";
    hintEl.textContent = "нажмите, чтобы сменить";
    meta.append(nameEl, hintEl);

    const chevron = document.createElement("span");
    chevron.className = "asc-vault-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';

    trigger.append(avatar, meta, chevron);

    const pop = document.createElement("div");
    pop.className = "asc-vault-pop";
    pop.hidden = true;
    pop.setAttribute("role", "listbox");
    pop.setAttribute("aria-label", "Список хранилищ");

    const popHead = document.createElement("p");
    popHead.className = "asc-vault-pop-head";
    popHead.textContent =
      "Хранилища (переключатель области: работа, личное...)";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "asc-vault-search";
    searchInput.placeholder = "Поиск хранилища…";
    searchInput.setAttribute("aria-label", "Поиск по списку хранилищ");
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;

    const list = document.createElement("div");
    list.className = "asc-vault-list";

    pop.append(popHead, searchInput, list);
    wrap.append(trigger, pop);

    let open = false;
    let agents = [];
    let agentsLastKnown = [];
    let groups = [];
    let cmsBaseUrl = "";
    let selectedId = "";
    let agentsFetchOk = true;
    let agentsFetchError = "";

    function isCmsUnreachable() {
      return Boolean(cmsBaseUrl && agentsFetchOk === false);
    }

    function setOpen(next) {
      open = Boolean(next);
      pop.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.classList.toggle("is-open", open);
      if (open) {
        searchInput.value = "";
        window.requestAnimationFrame(() => {
          try {
            searchInput.focus({ preventScroll: true });
          } catch {
            searchInput.focus();
          }
        });
        renderList();
      }
    }

    function findAgent(id) {
      const key = String(id || "").trim();
      if (!key) return null;
      const pool = agents.length ? agents : agentsLastKnown;
      return pool.find((a) => a.id === key) || null;
    }

    function renderSelected() {
      const offline = isCmsUnreachable();
      const agent = findAgent(selectedId);
      const label = agent
        ? agentDisplayName(agent, { forList: !isAgentRegistryActive(agent) })
        : selectedId
          ? selectedId
          : "Выберите хранилище";

      if (offline && !agent && !selectedId) {
        nameEl.textContent = "Нет связи";
        hintEl.textContent = "запустите Agent CMS";
      } else if (offline) {
        nameEl.textContent = label;
        hintEl.textContent = "нет связи с сервером";
      } else {
        nameEl.textContent = label;
        hintEl.textContent = agent
          ? `${resolveAgentStatusEmoji(agent)} ${agent.id}`
          : selectedId
            ? "сохранено в расширении"
            : "не выбрано";
      }

      avatarFallback.textContent = offline && !agent ? "📡" : agentEmoji(agent);
      const thumb = agent ? buildAgentThumbUrl(cmsBaseUrl, agent) : null;
      clearVaultPreviewImg(avatarImg);
      avatarFallback.hidden = false;
      avatar.classList.remove("asc-vault-avatar--has-preview");
      avatar.classList.add("asc-vault-avatar--fallback");
      if (thumb) {
        void loadVaultPreviewIntoImg(avatarImg, thumb).then((loaded) => {
          if (!loaded) return;
          avatarFallback.hidden = true;
          avatar.classList.add("asc-vault-avatar--has-preview");
          avatar.classList.remove("asc-vault-avatar--fallback");
        });
      }
      const inactiveVault =
        !offline &&
        Boolean(agent && (!isAgentRegistryActive(agent) || agent.folderExists === false));
      trigger.classList.toggle("is-inactive-vault", inactiveVault);
      trigger.classList.toggle("is-offline-vault", offline);
      if (offline) {
        avatarStatus.hidden = false;
        avatarStatus.classList.remove("is-warn", "is-ok");
        avatarStatus.classList.add("is-error");
        avatarStatus.title = agentsFetchError
          ? `Нет связи с Agent CMS (${agentsFetchError})`
          : "Нет связи с Agent CMS";
      } else if (agent) {
        avatarStatus.hidden = false;
        avatarStatus.classList.remove("is-error");
        avatarStatus.classList.toggle("is-warn", inactiveVault);
        avatarStatus.classList.toggle("is-ok", !inactiveVault);
        avatarStatus.title = inactiveVault ? "Хранилище выключено или недоступно" : "Хранилище активно";
      } else {
        avatarStatus.hidden = true;
        avatarStatus.classList.remove("is-warn", "is-ok", "is-error");
        avatarStatus.removeAttribute("title");
      }
      const hasSelectedVault = Boolean(agent || selectedId || offline);
      wrap.classList.toggle("asc-vault-dock--fit", hasSelectedVault);
      trigger.classList.toggle("asc-vault-trigger--fit", hasSelectedVault);
      if (offline) {
        trigger.title = "Нет связи с Agent CMS — проверьте, что сервер запущен";
      } else {
        trigger.title = agent ? `Хранилище: ${label}` : "Выбрать хранилище";
      }
    }

    function renderList() {
      list.innerHTML = "";
      const allEntries = buildVaultListEntries(agents, groups);
      const query = String(searchInput.value || "").trim();
      const entries = filterVaultListEntries(allEntries, query);

      if (!allEntries.length) {
        const empty = document.createElement("p");
        empty.className = "asc-vault-empty";
        if (!cmsBaseUrl) {
          empty.textContent = "Укажите URL CMS в настройках расширения";
        } else if (isCmsUnreachable()) {
          empty.textContent =
            "Нет связи с сервером. Запустите Agent CMS или проверьте URL в настройках расширения.";
        } else {
          empty.textContent = "В реестре пока нет хранилищ";
        }
        list.append(empty);
        return;
      }

      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "asc-vault-empty";
        empty.textContent = query ? `Ничего не найдено: «${query}»` : "Нет хранилищ";
        list.append(empty);
        return;
      }
      let prevSectionKey = null;
      for (const entry of entries) {
        const { agent, sectionKey, sectionLabel } = entry;
        if (sectionKey && sectionKey !== prevSectionKey) {
          const headerText = vaultSectionHeader(sectionKey, sectionLabel);
          if (headerText) {
            const groupHead = document.createElement("div");
            groupHead.className = "asc-vault-group-head";
            groupHead.textContent = headerText;
            list.append(groupHead);
          }
        }
        prevSectionKey = sectionKey;

        const inactive = !isAgentRegistryActive(agent) || agent.folderExists === false;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "asc-vault-option";
        if (inactive) btn.classList.add("is-inactive");
        btn.setAttribute("role", "option");
        btn.dataset.agentId = agent.id;
        if (agent.id === selectedId) btn.classList.add("is-active");
        btn.setAttribute("aria-selected", agent.id === selectedId ? "true" : "false");

        const optAvatar = document.createElement("span");
        optAvatar.className = "asc-vault-option-avatar";
        const thumb = buildAgentThumbUrl(cmsBaseUrl, agent);
        if (thumb) {
          const fallback = document.createElement("span");
          fallback.className = "asc-vault-option-avatar-fallback";
          fallback.setAttribute("aria-hidden", "true");
          fallback.textContent = agentEmoji(agent);
          const img = document.createElement("img");
          img.alt = "";
          img.hidden = true;
          optAvatar.append(fallback, img);
          void loadVaultPreviewIntoImg(img, thumb).then((loaded) => {
            if (loaded) fallback.hidden = true;
          });
        } else {
          optAvatar.textContent = agentEmoji(agent);
        }

        const optMeta = document.createElement("span");
        optMeta.className = "asc-vault-option-meta";
        const optName = document.createElement("span");
        optName.className = "asc-vault-option-name";
        optName.textContent = formatVaultListLabel(agent, "", { forList: true });
        const optId = document.createElement("span");
        optId.className = "asc-vault-option-id";
        optId.textContent = inactive
          ? `${agent.id} · ${agent.folderExists === false ? "нет папки" : "выключено"}`
          : agent.id;
        optMeta.append(optName, optId);

        btn.append(optAvatar, optMeta);
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          void selectAgent(agent.id);
        });
        list.append(btn);
      }
    }

    async function selectAgent(agentId) {
      const id = String(agentId || "").trim();
      if (!id) return;
      selectedId = id;
      renderSelected();
      renderList();
      setOpen(false);
      await sendRuntime({ type: "COMPANION_SAVE_SETTINGS", settings: { agentId: id } });
    }

    async function refresh() {
      const settings = await sendRuntime({ type: "COMPANION_GET_SETTINGS" });
      selectedId = String(settings?.agentId || "").trim();
      cmsBaseUrl = String(settings?.cmsBaseUrl || "").replace(/\/$/, "");

      const data = await sendRuntime({ type: "COMPANION_LIST_AGENTS" });
      agentsFetchOk = data?.ok === true;
      agentsFetchError = agentsFetchOk ? "" : String(data?.error || "").trim();
      if (String(data?.cmsBaseUrl || "").trim()) {
        cmsBaseUrl = String(data.cmsBaseUrl).replace(/\/$/, "");
      }
      if (agentsFetchOk && Array.isArray(data.agents)) {
        agents = data.agents;
        agentsLastKnown = data.agents;
        groups = Array.isArray(data.groups) ? data.groups : [];
      } else {
        agents = [];
        groups = [];
      }

      renderSelected();
      renderList();
    }

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !open;
      setOpen(willOpen);
      if (willOpen) void refresh();
    });

    searchInput.addEventListener("input", () => {
      renderList();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (searchInput.value) {
          searchInput.value = "";
          renderList();
          return;
        }
        setOpen(false);
      }
    });

    for (const eventName of ["pointerdown", "mousedown", "dblclick"]) {
      wrap.addEventListener(eventName, (event) => event.stopPropagation());
    }

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!open) return;
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        if (path.includes(wrap)) return;
        setOpen(false);
      },
      true
    );

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.agentId) return;
        selectedId = String(changes.agentId.newValue || "").trim();
        renderSelected();
        renderList();
      });
    } catch {
      // ignore
    }

    void refresh();

    return {
      wrap,
      refresh,
      close: () => setOpen(false)
    };
  }

  global.createCompanionVaultDock = createCompanionVaultDock;
})(globalThis);
