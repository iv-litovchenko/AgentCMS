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

  function getAssignedLandingAgentGroupMap(groups) {
    const assigned = new Map();
    for (const group of Array.isArray(groups) ? groups : []) {
      for (const agentId of group.agentIds || []) {
        assigned.set(agentId, group.id);
      }
    }
    return assigned;
  }

  function buildLandingGroupsLayout(agents, groups) {
    const layoutAgents = (Array.isArray(agents) ? agents : []).filter(
      (agent) => !isOrchestratorAgent(agent)
    );
    const agentById = new Map(layoutAgents.map((agent) => [agent.id, agent]));
    const assigned = getAssignedLandingAgentGroupMap(groups);
    const grouped = (Array.isArray(groups) ? groups : []).map((group) => ({
      ...group,
      agents: (group.agentIds || [])
        .map((agentId) => agentById.get(agentId))
        .filter((agent) => agent && !isOrchestratorAgent(agent))
    }));
    const ungrouped = layoutAgents.filter((agent) => !assigned.has(agent.id));
    return { grouped, ungrouped };
  }

  /** Тот же порядок, что в populateAgentSelect (Voice / CMS). */
  function buildVaultListEntries(agents, groups) {
    const registry = getRegistryAgentsForUi(agents);
    const entries = [];
    if (!Array.isArray(groups) || groups.length === 0) {
      for (const agent of registry) entries.push({ agent, groupTitle: "" });
      return entries;
    }

    const workspaceAgents = registry.filter((agent) => !isPlatformAgent(agent));
    const { orchestrator } = splitLandingOrchestratorAgent(workspaceAgents);
    const { grouped, ungrouped } = buildLandingGroupsLayout(workspaceAgents, groups);

    if (orchestrator) entries.push({ agent: orchestrator, groupTitle: "" });

    for (const group of grouped) {
      const groupTitle = String(group.title || group.id || "").trim();
      for (const agent of group.agents || []) {
        entries.push({ agent, groupTitle });
      }
    }

    for (const agent of ungrouped) {
      entries.push({ agent, groupTitle: "" });
    }

    return entries;
  }

  function formatVaultListLabel(agent, groupTitle, { forList = false } = {}) {
    const prefix = String(groupTitle || "").trim();
    let label = agentDisplayName(agent, { forList });
    if (prefix) label = `${prefix} · ${label}`;
    return `${resolveAgentStatusEmoji(agent)} ${label}`;
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

    const list = document.createElement("div");
    list.className = "asc-vault-list";

    pop.append(popHead, list);
    wrap.append(trigger, pop);

    let open = false;
    let agents = [];
    let groups = [];
    let cmsBaseUrl = "";
    let selectedId = "";

    function setOpen(next) {
      open = Boolean(next);
      pop.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.classList.toggle("is-open", open);
    }

    function findAgent(id) {
      return agents.find((a) => a.id === id) || null;
    }

    function renderSelected() {
      const agent = findAgent(selectedId);
      const label = agent
        ? agentDisplayName(agent, { forList: !isAgentRegistryActive(agent) })
        : selectedId
          ? selectedId
          : "Выберите хранилище";
      nameEl.textContent = label;
      hintEl.textContent = agent
        ? `${resolveAgentStatusEmoji(agent)} ${agent.id}`
        : selectedId
          ? "сохранено в расширении"
          : "не выбрано";
      avatarFallback.textContent = agentEmoji(agent);
      const thumb = agent ? buildAgentThumbUrl(cmsBaseUrl, agent) : null;
      if (thumb) {
        avatarImg.src = thumb;
        avatarImg.hidden = false;
        avatarFallback.hidden = true;
        avatar.classList.add("asc-vault-avatar--has-preview");
        avatar.classList.remove("asc-vault-avatar--fallback");
      } else {
        avatarImg.removeAttribute("src");
        avatarImg.hidden = true;
        avatarFallback.hidden = false;
        avatar.classList.remove("asc-vault-avatar--has-preview");
        avatar.classList.add("asc-vault-avatar--fallback");
      }
      const inactiveVault = Boolean(
        agent && (!isAgentRegistryActive(agent) || agent.folderExists === false)
      );
      trigger.classList.toggle("is-inactive-vault", inactiveVault);
      if (agent) {
        avatarStatus.hidden = false;
        avatarStatus.classList.toggle("is-warn", inactiveVault);
        avatarStatus.classList.toggle("is-ok", !inactiveVault);
        avatarStatus.title = inactiveVault ? "Хранилище выключено или недоступно" : "Хранилище активно";
      } else {
        avatarStatus.hidden = true;
        avatarStatus.classList.remove("is-warn", "is-ok");
        avatarStatus.removeAttribute("title");
      }
      const hasSelectedVault = Boolean(agent || selectedId);
      wrap.classList.toggle("asc-vault-dock--fit", hasSelectedVault);
      trigger.classList.toggle("asc-vault-trigger--fit", hasSelectedVault);
      trigger.title = agent ? `Хранилище: ${label}` : "Выбрать хранилище";
    }

    function renderList() {
      list.innerHTML = "";
      const entries = buildVaultListEntries(agents, groups);
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "asc-vault-empty";
        empty.textContent = cmsBaseUrl
          ? "Нет хранилищ или CMS недоступна"
          : "Укажите URL CMS в настройках расширения";
        list.append(empty);
        return;
      }
      let prevGroupKey = null;
      for (const { agent, groupTitle } of entries) {
        const groupKey = String(groupTitle || "").trim();
        if (groupKey && groupKey !== prevGroupKey) {
          const groupHead = document.createElement("div");
          groupHead.className = "asc-vault-group-head";
          groupHead.textContent = groupKey;
          list.append(groupHead);
        }
        prevGroupKey = groupKey;

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
          const img = document.createElement("img");
          img.src = thumb;
          img.alt = "";
          optAvatar.append(img);
        } else {
          optAvatar.textContent = agentEmoji(agent);
        }

        const optMeta = document.createElement("span");
        optMeta.className = "asc-vault-option-meta";
        const optName = document.createElement("span");
        optName.className = "asc-vault-option-name";
        optName.textContent = formatVaultListLabel(agent, groupTitle, { forList: true });
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
      agents = data?.ok && Array.isArray(data.agents) ? data.agents : [];
      groups = data?.ok && Array.isArray(data.groups) ? data.groups : [];

      renderSelected();
      renderList();
    }

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!open);
      if (open) void refresh();
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
