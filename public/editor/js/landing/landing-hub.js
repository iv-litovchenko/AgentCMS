/**
 * Landing hub + grid list rows (refactor 14) — lazy chunk.
 */

/** @type {Record<string, unknown> | null} */
let host = null;

/** @param {Record<string, unknown>} next */
export function registerLandingHubHost(next) {
  host = next && typeof next === "object" ? next : null;
}

function requireHost() {
  if (!host) throw new Error("landing hub host not registered");
  return host;
}

function createAppLandingHubTwig(focusItem) {
  const h = requireHost();
  const agentsCache = /** @type {Array<{id?: string}>} */ (h.agentsCache || []);
  const agent =
    agentsCache.find((entry) => entry.id === focusItem.agentId) || {
      id: focusItem.agentId,
      name: focusItem.agentName
    };
  const registryActive =
    focusItem.agentActive !== false && h.isAgentRegistryActive(agent);
  const label =
    focusItem.name ||
    h.getLabelFromPath(focusItem.nodePath) ||
    focusItem.agentName ||
    "Тема";
  const nodePath = String(focusItem.nodePath || "").trim();
  const status = h.getFocusPropDisplayValue(focusItem, "awn-status");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-landing-hub-twig";
  if (nodePath) btn.dataset.focusPath = nodePath;
  if (h.isFocusItemActive(focusItem)) btn.classList.add("is-active");
  if (!registryActive) btn.classList.add("is-registry-off");
  btn.title = nodePath || label;
  btn.setAttribute(
    "aria-label",
    registryActive ? `Открыть ${label}` : `${label} — агент неактивен`
  );

  const dot = document.createElement("span");
  dot.className = "app-landing-hub-twig-dot";
  dot.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "app-landing-hub-twig-label";
  text.textContent = label;

  btn.append(dot, text);
  if (status) {
    const statusNode = document.createElement("span");
    statusNode.className = "app-landing-hub-twig-status";
    statusNode.textContent = status;
    btn.appendChild(statusNode);
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    void h.openFocusItem(focusItem);
  });
  return btn;
}

function createAppLandingHubRow(agent, focusItems = [], options = {}) {
  const h = requireHost();
  const isList = options.variant === "list";
  const registryActive = h.isAgentRegistryActive(agent);
  const isOrchestrator = agent.orchestrator === true;
  const label = agent.name || agent.id;
  const hubTwigLimit = Number(h.HUB_FOCUS_TWIG_LIMIT) || 8;

  const row = document.createElement("article");
  row.className = "app-landing-hub-row";
  if (isList) row.classList.add("app-landing-hub-row--list");
  if (!registryActive) row.classList.add("is-registry-off");
  if (isOrchestrator) row.classList.add("is-orchestrator");
  row.setAttribute("role", "listitem");
  row.dataset.agentId = agent.id;

  const agentBtn = document.createElement("button");
  agentBtn.type = "button";
  agentBtn.className = "app-landing-hub-agent";
  agentBtn.title = registryActive
    ? `Открыть workspace ${label}`
    : `${label} — неактивен, включите в реестре`;

  const node = document.createElement("span");
  node.className = "app-landing-hub-node";
  h.mountPreviewOrFallback(node, {
    previewUrl: h.getRegistryAgentPreviewUrl(agent),
    emoji: h.resolveAwnEmoji(agent),
    fallbackText: h.getAgentPickerInitials(agent),
    emojiClass: "app-landing-hub-node-emoji",
    initialsClass: "app-landing-hub-node-initials"
  });

  const copy = document.createElement("span");
  copy.className = "app-landing-hub-agent-copy";
  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-hub-agent-name";
  nameNode.textContent = label;
  const hintNode = document.createElement("span");
  hintNode.className = "app-landing-hub-agent-hint";
  hintNode.textContent = isOrchestrator ? "Оркестратор" : "Workspace";
  copy.append(nameNode, hintNode);
  agentBtn.append(node, copy);
  agentBtn.addEventListener("click", () => {
    if (!registryActive) {
      h.showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    h.selectAgentOption(agent.id);
  });

  const branches = document.createElement("div");
  branches.className = "app-landing-hub-branches";

  if (focusItems.length) {
    const twigs = document.createElement("div");
    twigs.className = `app-landing-hub-twigs${isList ? " app-landing-hub-twigs--list" : ""}`;
    twigs.setAttribute("role", "list");
    twigs.setAttribute("aria-label", `Темы — ${label}`);

    const limit = isList ? 16 : hubTwigLimit;
    const shown = focusItems.slice(0, limit);
    for (const focusItem of shown) {
      twigs.appendChild(createAppLandingHubTwig(focusItem));
    }

    const overflow = focusItems.length - shown.length;
    if (overflow > 0) {
      const more = document.createElement("span");
      more.className = "app-landing-hub-more";
      more.textContent = `+${overflow}`;
      more.title = `Ещё ${overflow} тем у ${label}`;
      twigs.appendChild(more);
    }

    if (!isList) {
      const stem = document.createElement("span");
      stem.className = "app-landing-hub-stem";
      stem.setAttribute("aria-hidden", "true");
      branches.append(stem, twigs);
    } else {
      branches.appendChild(twigs);
    }
  } else {
    const empty = document.createElement("span");
    empty.className = "app-landing-hub-empty";
    empty.textContent = "Нет тем";
    branches.appendChild(empty);
  }

  row.append(agentBtn, branches);
  return row;
}

function appendAppLandingHubAgents(container, agents, focusByAgent, options = {}) {
  for (const agent of agents) {
    container.appendChild(
      createAppLandingHubRow(agent, focusByAgent.get(agent.id) || [], options)
    );
  }
}

export function renderAppLandingHub(focusItems) {
  const h = requireHost();
  if (!h.appLandingHubNode) return;
  if (h.getLandingAgentsView() !== "hub") return;

  const items = Array.isArray(focusItems) ? focusItems : [];
  h.appLandingHubNode.replaceChildren();
  const focusByAgent = h.groupFocusItemsByAgent(items);
  const agents = h.getAgentsForLandingGrid();

  if (!agents.length) {
    const empty = document.createElement("p");
    empty.className = "app-landing-hub-page-empty";
    empty.textContent = "Нет агентов. Нажмите «+ Агент» или откройте реестр (⚙).";
    h.appLandingHubNode.appendChild(empty);
    h.syncFocusPanelActiveState();
    return;
  }

  const { orchestrator, rest } = h.splitLandingOrchestratorAgent(agents);
  const groupsCache = h.landingAgentsGroupsCache || [];
  const ungroupedMeta = h.landingAgentsUngroupedCache || { title: "Без группы" };

  if (orchestrator) {
    const orchSection = document.createElement("section");
    orchSection.className = "app-landing-hub-section app-landing-hub-section--orchestrator";
    orchSection.appendChild(
      createAppLandingHubRow(orchestrator, focusByAgent.get(orchestrator.id) || [])
    );
    h.appLandingHubNode.appendChild(orchSection);
  }

  if (groupsCache.length > 0) {
    const { grouped, ungrouped } = h.buildLandingGroupsLayout(rest, groupsCache);

    for (const group of grouped) {
      if (!group.agents?.length) continue;
      const section = document.createElement("section");
      section.className = "app-landing-hub-section";
      const title = document.createElement("h3");
      title.className = "app-landing-hub-section-title";
      title.textContent = group.title || "Группа";
      section.appendChild(title);
      appendAppLandingHubAgents(section, group.agents, focusByAgent);
      h.appLandingHubNode.appendChild(section);
    }

    if (ungrouped.length) {
      const section = document.createElement("section");
      section.className = "app-landing-hub-section";
      const title = document.createElement("h3");
      title.className = "app-landing-hub-section-title";
      title.textContent = ungroupedMeta.title || "Без группы";
      section.appendChild(title);
      appendAppLandingHubAgents(section, ungrouped, focusByAgent);
      h.appLandingHubNode.appendChild(section);
    }
  } else {
    appendAppLandingHubAgents(h.appLandingHubNode, rest, focusByAgent);
  }

  h.syncFocusPanelActiveState();
}

export function renderAppLandingList(focusItems) {
  const h = requireHost();
  if (!h.appLandingAgentsNode) return;
  if (h.getLandingAgentsView() !== "grid") return;

  const items = Array.isArray(focusItems) ? focusItems : [];
  h.appLandingAgentsNode.replaceChildren();
  h.appLandingAgentsNode.className =
    "app-landing-agents app-landing-agents--list app-landing-grid-panel";
  const focusByAgent = h.groupFocusItemsByAgent(items);
  const agents = h.getAgentsForLandingGrid();

  if (!agents.length) {
    const empty = document.createElement("p");
    empty.className = "app-landing-list-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр (⚙).";
    h.appLandingAgentsNode.appendChild(empty);
    return;
  }

  const { orchestrator, rest } = h.splitLandingOrchestratorAgent(agents);
  if (orchestrator) {
    h.appLandingAgentsNode.appendChild(
      createAppLandingHubRow(orchestrator, focusByAgent.get(orchestrator.id) || [], {
        variant: "list"
      })
    );
  }
  appendAppLandingHubAgents(h.appLandingAgentsNode, rest, focusByAgent, { variant: "list" });
  h.syncFocusPanelActiveState();
}
