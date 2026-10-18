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
  btn.dataset.agentId = focusItem.agentId;
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

function appendAppLandingFocusPhotoMedia(card, previewUrl) {
  const media = document.createElement("span");
  media.className = "app-landing-focus-card-media app-landing-focus-card-media--photo-only";

  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.addEventListener(
    "error",
    () => {
      media.remove();
      card.classList.add("app-landing-focus-card--no-media");
    },
    { once: true }
  );
  img.src = previewUrl;
  media.appendChild(img);
  return media;
}

function createAppLandingFocusCard(focusItem) {
  const h = requireHost();
  const agentsCache = /** @type {Array<{id?: string}>} */ (h.agentsCache || []);
  const agent =
    agentsCache.find((entry) => entry.id === focusItem.agentId) || {
      id: focusItem.agentId,
      name: focusItem.agentName,
      path: focusItem.agentPath
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
  const typeLabel =
    h.getFocusPropDisplayValue(focusItem, "awn-type") || h.getFocusItemType(focusItem);
  const previewUrl = h.resolveFocusPreviewUrl(focusItem.nodePreviewUrl, focusItem.agentId);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-landing-focus-card";
  btn.setAttribute("role", "listitem");
  btn.dataset.agentId = focusItem.agentId;
  if (nodePath) btn.dataset.focusPath = nodePath;
  if (h.isFocusItemActive(focusItem)) btn.classList.add("is-active");
  if (!registryActive) btn.classList.add("is-registry-off");
  btn.title = registryActive ? `Открыть ${label}` : `${label} — агент неактивен`;
  btn.setAttribute(
    "aria-label",
    registryActive ? `Открыть ${label}` : `${label} — агент неактивен`
  );

  const body = document.createElement("span");
  body.className = "app-landing-focus-card-body";

  const badge = document.createElement("span");
  badge.className = "app-landing-focus-card-badge";
  badge.textContent = "⊙";
  badge.setAttribute("aria-hidden", "true");

  const titleNode = document.createElement("span");
  titleNode.className = "app-landing-focus-card-title";
  titleNode.textContent = label;

  const meta = document.createElement("span");
  meta.className = "app-landing-focus-card-meta";
  if (nodePath) {
    const pathNode = document.createElement("span");
    pathNode.className = "app-landing-focus-card-path";
    pathNode.textContent = nodePath.split("/").pop() || nodePath;
    pathNode.title = nodePath;
    meta.appendChild(pathNode);
  }

  if (status || typeLabel) {
    const tags = document.createElement("span");
    tags.className = "app-landing-focus-card-tags";
    if (status) {
      const statusTag = document.createElement("span");
      statusTag.className = "app-landing-focus-card-tag app-landing-focus-card-tag--status";
      statusTag.textContent = status;
      tags.appendChild(statusTag);
    }
    if (typeLabel) {
      const typeTag = document.createElement("span");
      typeTag.className = "app-landing-focus-card-tag app-landing-focus-card-tag--type";
      typeTag.textContent = typeLabel;
      tags.appendChild(typeTag);
    }
    meta.appendChild(tags);
  }

  body.append(badge, titleNode, meta);

  if (previewUrl) {
    btn.append(appendAppLandingFocusPhotoMedia(btn, previewUrl), body);
  } else {
    btn.classList.add("app-landing-focus-card--no-media");
    btn.append(body);
  }

  return btn;
}

function createAppLandingFocusAgentSection(agent, focusItems) {
  const h = requireHost();
  const registryActive = h.isAgentRegistryActive(agent);
  const label = agent.name || agent.id;
  const isOrchestrator = agent.orchestrator === true;

  const section = document.createElement("section");
  section.className = "app-landing-focus-agent-section";
  if (isOrchestrator) section.classList.add("is-orchestrator");
  if (!registryActive) section.classList.add("is-registry-off");

  const head = document.createElement("header");
  head.className = "app-landing-focus-agent-head";

  const agentBtn = document.createElement("button");
  agentBtn.type = "button";
  agentBtn.className = "app-landing-focus-agent-btn";
  agentBtn.title = registryActive
    ? `Открыть workspace ${label}`
    : `${label} — неактивен`;

  const avatar = document.createElement("span");
  avatar.className = "app-landing-focus-agent-avatar";
  h.mountPreviewOrFallback(avatar, {
    previewUrl: h.getRegistryAgentPreviewUrl(agent),
    emoji: h.resolveAwnEmoji(agent),
    fallbackText: h.getAgentPickerInitials(agent),
    emojiClass: "app-landing-focus-agent-emoji",
    initialsClass: "app-landing-focus-agent-initials"
  });

  const copy = document.createElement("span");
  copy.className = "app-landing-focus-agent-copy";
  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-focus-agent-name";
  nameNode.textContent = label;
  const hintNode = document.createElement("span");
  hintNode.className = "app-landing-focus-agent-hint";
  hintNode.textContent = isOrchestrator ? "Оркестратор" : "Workspace";
  copy.append(nameNode, hintNode);

  const countNode = document.createElement("span");
  countNode.className = "app-landing-focus-agent-count";
  countNode.textContent = String(focusItems.length);

  agentBtn.append(avatar, copy);
  head.append(agentBtn, countNode);
  agentBtn.addEventListener("click", () => {
    if (!registryActive) {
      h.showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    h.selectAgentOption(agent.id);
  });

  const grid = document.createElement("div");
  grid.className = "app-landing-focus-grid";
  grid.setAttribute("role", "list");
  grid.setAttribute("aria-label", `В фокусе — ${label}`);
  for (const focusItem of focusItems) {
    grid.appendChild(createAppLandingFocusCard(focusItem));
  }

  section.append(head, grid);
  return section;
}

function getAgentsWithFocusItems(h, agents, focusByAgent) {
  const ordered = [];
  const { orchestrator, rest } = h.splitLandingOrchestratorAgent(agents);
  if (orchestrator && (focusByAgent.get(orchestrator.id) || []).length) {
    ordered.push(orchestrator);
  }
  for (const agent of rest) {
    if ((focusByAgent.get(agent.id) || []).length) ordered.push(agent);
  }
  return ordered;
}

export function renderAppLandingList(focusItems) {
  const h = requireHost();
  if (!h.appLandingAgentsNode) return;
  if (h.getLandingAgentsView() !== "grid") return;

  const items = Array.isArray(focusItems) ? focusItems : [];
  h.appLandingAgentsNode.replaceChildren();
  h.appLandingAgentsNode.className =
    "app-landing-agents app-landing-agents--focus app-landing-grid-panel";

  const agents = h.getAgentsForLandingGrid();
  if (!agents.length) {
    const empty = document.createElement("p");
    empty.className = "app-landing-list-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр (⚙).";
    h.appLandingAgentsNode.appendChild(empty);
    return;
  }

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "app-landing-focus-empty-wrap";

    const lead = document.createElement("p");
    lead.className = "app-landing-focus-empty";
    lead.textContent = "Пока ничего не в фокусе.";

    const hint = document.createElement("p");
    hint.className = "app-landing-focus-empty-hint";
    hint.textContent =
      "Отметьте темы ⊙ «В фокусе» в обзоре или свойствах — они появятся здесь карточками.";

    empty.append(lead, hint);
    h.appLandingAgentsNode.appendChild(empty);
    h.syncFocusPanelActiveState();
    return;
  }

  const focusByAgent = h.groupFocusItemsByAgent(items);
  const agentsWithFocus = getAgentsWithFocusItems(h, agents, focusByAgent);

  const pageHead = document.createElement("header");
  pageHead.className = "app-landing-focus-page-head";

  const title = document.createElement("h2");
  title.className = "app-landing-focus-page-title";
  title.textContent = "В фокусе";

  const subtitle = document.createElement("p");
  subtitle.className = "app-landing-focus-page-subtitle";
  const countLabel =
    items.length === 1 ? "1 запись" : items.length < 5 ? `${items.length} записи` : `${items.length} записей`;
  subtitle.textContent = `${countLabel} · ${agentsWithFocus.length} workspace`;

  pageHead.append(title, subtitle);
  h.appLandingAgentsNode.appendChild(pageHead);

  for (const agent of agentsWithFocus) {
    h.appLandingAgentsNode.appendChild(
      createAppLandingFocusAgentSection(agent, focusByAgent.get(agent.id) || [])
    );
  }

  h.syncFocusPanelActiveState();
}
