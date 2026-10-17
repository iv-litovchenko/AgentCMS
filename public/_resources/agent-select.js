const PLATFORM_AGENT_ID = "platform";

export function isPlatformAgentId(agentId) {
  return String(agentId || "").trim() === PLATFORM_AGENT_ID;
}

export function isPlatformAgent(agent) {
  return agent?.virtual === true || isPlatformAgentId(agent?.id);
}

export function isOrchestratorAgent(agent) {
  return agent?.orchestrator === true;
}

export function isAgentRegistryActive(agent) {
  return agent?.active !== false;
}

export function getRegistryAgentsForUi(agents) {
  return (Array.isArray(agents) ? agents : []).filter(
    (agent) => agent.registryEditable !== false && !isPlatformAgent(agent)
  );
}

export function getSelectableAgents(agents) {
  return (Array.isArray(agents) ? agents : []).filter(
    (agent) => agent.active !== false && agent.folderExists !== false
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

function resolveAgentSelectStatusEmoji(agent) {
  const fromStatus = normalizeAwnEmoji(agent?.awnProps?.["awn-status"] || agent?.status || "");
  if (fromStatus) return fromStatus;
  const fromEmoji = normalizeAwnEmoji(agent?.awnProps?.["awn-emoji"] || "");
  if (fromEmoji) return fromEmoji;
  if (agent?.folderExists === false) return "🔴";
  if (!isAgentRegistryActive(agent)) return "⚪";
  return "🟢";
}

export function formatAgentSelectLabel(agent, groupTitle = "") {
  const registryActive = isAgentRegistryActive(agent);
  const name = agent.name || agent.id;
  let label = registryActive ? name : `${name} (выкл.)`;
  if (isPlatformAgent(agent)) {
    label = `${name} — глобальные справочники`;
  }
  if (isOrchestratorAgent(agent)) {
    return `${resolveAgentSelectStatusEmoji(agent)} ★ ${label}`;
  }
  const prefix = String(groupTitle || "").trim();
  const core = prefix ? `${prefix} · ${label}` : label;
  return `${resolveAgentSelectStatusEmoji(agent)} ${core}`;
}

export function createAgentSelectOption(agent, groupTitle = "") {
  const option = document.createElement("option");
  option.value = agent.id;
  option.textContent = formatAgentSelectLabel(agent, groupTitle);
  if (isOrchestratorAgent(agent)) {
    option.title = "Оркестратор";
  }
  option.disabled = !isAgentRegistryActive(agent);
  return option;
}

export function splitLandingOrchestratorAgent(agents) {
  const list = Array.isArray(agents) ? agents : [];
  const orchestrator = list.find(isOrchestratorAgent) || null;
  const rest = orchestrator ? list.filter((agent) => !isOrchestratorAgent(agent)) : list;
  return { orchestrator, rest };
}

export function getAssignedLandingAgentGroupMap(groups = []) {
  const assigned = new Map();
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const agentId of group.agentIds || []) {
      assigned.set(agentId, group.id);
    }
  }
  return assigned;
}

export function buildLandingGroupsLayout(agents, groups = []) {
  const layoutAgents = (Array.isArray(agents) ? agents : []).filter((agent) => !isOrchestratorAgent(agent));
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

function renderAgentSelectGrouped(selectEl, agents, groups) {
  const platformAgents = agents.filter(isPlatformAgent);
  const workspaceAgents = agents.filter((agent) => !isPlatformAgent(agent));
  const { orchestrator } = splitLandingOrchestratorAgent(workspaceAgents);
  const { grouped, ungrouped } = buildLandingGroupsLayout(workspaceAgents, groups);

  for (const agent of platformAgents) {
    selectEl.appendChild(createAgentSelectOption(agent, "Платформа"));
  }

  if (orchestrator) {
    selectEl.appendChild(createAgentSelectOption(orchestrator));
  }

  for (const group of grouped) {
    const groupTitle = group.title || group.id;
    for (const agent of group.agents || []) {
      selectEl.appendChild(createAgentSelectOption(agent, groupTitle));
    }
  }

  for (const agent of ungrouped) {
    selectEl.appendChild(createAgentSelectOption(agent));
  }
}

function renderAgentSelectFlat(selectEl, agents) {
  for (const agent of agents) {
    selectEl.appendChild(createAgentSelectOption(agent));
  }
}

export function populateAgentSelect(selectEl, {
  agents = [],
  groups = [],
  selectedId = "",
  placeholder = "— Хранилище (агент) —",
  includePlaceholder = true
} = {}) {
  if (!selectEl) return { selectedId: "", selectableAgents: [] };

  const registryAgents = getRegistryAgentsForUi(agents);
  const selectableAgents = getSelectableAgents(agents);
  const previousValue = selectEl.value;
  selectEl.innerHTML = "";

  if (includePlaceholder) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = registryAgents.length ? placeholder : "Нет агентов";
    placeholderOption.disabled = registryAgents.length === 0;
    selectEl.appendChild(placeholderOption);
  }

  if (registryAgents.length === 0) {
    selectEl.disabled = true;
    return { selectedId: "", selectableAgents };
  }

  if (Array.isArray(groups) && groups.length > 0) {
    renderAgentSelectGrouped(selectEl, registryAgents, groups);
  } else {
    renderAgentSelectFlat(selectEl, registryAgents);
  }

  selectEl.disabled = false;

  const candidate =
    selectedId ||
    previousValue ||
    "";
  const nextValue =
    candidate && selectableAgents.some((agent) => agent.id === candidate)
      ? candidate
      : includePlaceholder
        ? ""
        : selectableAgents[0]?.id || registryAgents[0]?.id || "";

  selectEl.value = nextValue;
  return { selectedId: nextValue, selectableAgents };
}

export async function loadAgentSelectData() {
  const [agentsResponse, groupsResponse] = await Promise.all([
    fetch("/api/agents"),
    fetch("/api/agents/groups")
  ]);

  if (!agentsResponse.ok) {
    throw new Error(`Request failed with ${agentsResponse.status}`);
  }

  const agentsData = await agentsResponse.json();
  let groups = [];
  if (groupsResponse.ok) {
    const groupsData = await groupsResponse.json();
    groups = Array.isArray(groupsData.groups) ? groupsData.groups : [];
  }

  return {
    agents: Array.isArray(agentsData.agents) ? agentsData.agents : [],
    groups,
    defaultAgentId: agentsData.defaultAgentId || ""
  };
}
