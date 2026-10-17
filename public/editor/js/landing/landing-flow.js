/**
 * Landing flow view (refactor 14) — lazy chunk.
 */

/** @type {Record<string, unknown> | null} */
let host = null;

/** @param {Record<string, unknown>} next */
export function registerLandingFlowHost(next) {
  host = next && typeof next === "object" ? next : null;
}

function requireHost() {
  if (!host) {
    throw new Error("landing flow host not registered");
  }
  return host;
}

function createAppLandingFlowCard(focusItem) {
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
  const agentLabel = agent.name || focusItem.agentName || focusItem.agentId;
  const nodePath = String(focusItem.nodePath || "").trim();
  const awnProps =
    focusItem.awnProps && typeof focusItem.awnProps === "object" ? focusItem.awnProps : {};
  const status = h.getFocusPropDisplayValue(focusItem, "awn-status");
  const typeLabel =
    h.getFocusPropDisplayValue(focusItem, "awn-type") || h.getFocusItemType(focusItem);
  const updatedAt = String(focusItem.updatedAt || focusItem?.awnProps?.["awn-update"] || "").trim();
  const updatedLabel = updatedAt ? h.formatTimelineRelativeTime(updatedAt) : "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-landing-flow-card";
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

  const media = document.createElement("span");
  media.className = "app-landing-flow-card-media";
  const nodeEmoji = h.resolveAwnEmoji(awnProps);
  const agentEmoji = h.resolveAwnEmoji(agent.awnProps);
  const previewUrl = h.resolveFocusPreviewUrl(focusItem.nodePreviewUrl, focusItem.agentId);
  h.mountPreviewOrFallback(media, {
    previewUrl,
    emoji: nodeEmoji || agentEmoji,
    fallbackText: h.getAgentPickerInitials({ name: label, id: focusItem.agentId }),
    emojiClass: "app-landing-flow-card-emoji",
    initialsClass: "app-landing-flow-card-fallback",
    emptyClass: "app-landing-flow-card-media-empty",
    nodePath,
    iconClass: "node-cover-icon--in-flow-card"
  });

  const body = document.createElement("span");
  body.className = "app-landing-flow-card-body";

  const titleNode = document.createElement("span");
  titleNode.className = "app-landing-flow-card-title";
  titleNode.textContent = label;

  const meta = document.createElement("span");
  meta.className = "app-landing-flow-card-meta";

  const agentChip = document.createElement("span");
  agentChip.className = "app-landing-flow-card-agent";
  const agentAvatar = document.createElement("span");
  agentAvatar.className = "app-landing-flow-card-agent-avatar";
  h.mountPreviewOrFallback(agentAvatar, {
    previewUrl: h.getRegistryAgentPreviewUrl(agent),
    emoji: h.resolveAwnEmoji(agent),
    fallbackText: h.getAgentPickerInitials(agent),
    emojiClass: "app-landing-flow-card-agent-emoji",
    initialsClass: "app-landing-flow-card-agent-initials"
  });
  const agentName = document.createElement("span");
  agentName.className = "app-landing-flow-card-agent-name";
  agentName.textContent = agentLabel;
  agentChip.append(agentAvatar, agentName);

  meta.appendChild(agentChip);

  if (updatedLabel) {
    const updatedNode = document.createElement("span");
    updatedNode.className = "app-landing-flow-card-updated";
    updatedNode.textContent = updatedLabel;
    updatedNode.title = h.formatNodeMetaDateTime(updatedAt);
    meta.appendChild(updatedNode);
  }

  if (status || typeLabel) {
    const tags = document.createElement("span");
    tags.className = "app-landing-flow-card-tags";
    if (status) {
      const statusTag = document.createElement("span");
      statusTag.className = "app-landing-flow-card-tag app-landing-flow-card-tag--status";
      statusTag.textContent = status;
      tags.appendChild(statusTag);
    }
    if (typeLabel) {
      const typeTag = document.createElement("span");
      typeTag.className = "app-landing-flow-card-tag app-landing-flow-card-tag--type";
      typeTag.textContent = typeLabel;
      tags.appendChild(typeTag);
    }
    meta.appendChild(tags);
  }

  body.append(titleNode, meta);
  btn.append(media, body);
  btn.addEventListener("click", () => {
    void h.openFocusItem(focusItem);
  });
  return btn;
}

export function setAppLandingFlowLoadingUi(loading) {
  const h = requireHost();
  const isFlowLoading = Boolean(loading) && h.getLandingAgentsView() === "flow";
  h.appLandingFlowNode?.classList.toggle("is-loading", isFlowLoading);
  h.appLandingFlowGridNode?.classList.toggle("is-loading", isFlowLoading);
  h.appLandingFlowNode?.setAttribute("aria-busy", isFlowLoading ? "true" : "false");
  h.appLandingViewFlowBtn?.classList.toggle("is-loading", isFlowLoading);
  h.appLandingViewFlowBtn?.setAttribute("aria-busy", isFlowLoading ? "true" : "false");
}

function createAppLandingFlowSkeletonCard(index) {
  const card = document.createElement("div");
  card.className = "app-landing-flow-card app-landing-flow-card--skeleton";
  card.style.setProperty("--flow-skeleton-delay", `${(index % 4) * 0.14}s`);
  card.setAttribute("aria-hidden", "true");

  const media = document.createElement("span");
  media.className = "app-landing-flow-card-media app-landing-flow-skeleton-block";

  const body = document.createElement("span");
  body.className = "app-landing-flow-card-body";

  const titleLine = document.createElement("span");
  titleLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--title";

  const metaLine = document.createElement("span");
  metaLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--meta";

  const agentLine = document.createElement("span");
  agentLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--agent";

  body.append(titleLine, metaLine, agentLine);
  card.append(media, body);
  return card;
}

export function renderAppLandingFlowLoading() {
  const h = requireHost();
  if (!h.appLandingFlowGridNode) return;
  if (h.getLandingAgentsView() !== "flow") return;

  setAppLandingFlowLoadingUi(true);
  h.appLandingFlowGridNode.replaceChildren();
  for (let i = 0; i < 8; i += 1) {
    h.appLandingFlowGridNode.appendChild(createAppLandingFlowSkeletonCard(i));
  }
}

export function renderAppLandingFlow(focusItems) {
  const h = requireHost();
  if (!h.appLandingFlowGridNode) return;
  if (h.getLandingAgentsView() !== "flow") return;

  setAppLandingFlowLoadingUi(false);
  h.appLandingFlowGridNode.replaceChildren();
  const agents = h.getAgentsForLandingGrid();

  if (!agents.length) {
    const empty = document.createElement("p");
    empty.className = "app-landing-flow-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр (⚙).";
    h.appLandingFlowGridNode.appendChild(empty);
    h.syncFocusPanelActiveState();
    return;
  }

  const items = Array.isArray(focusItems) ? focusItems : [];
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "app-landing-flow-empty-wrap";

    const lead = document.createElement("p");
    lead.className = "app-landing-flow-empty";
    lead.textContent = "Пока нет недавних обновлений.";

    const hint = document.createElement("p");
    hint.className = "app-landing-flow-empty-hint";
    const limit = Number(h.LANDING_FLOW_RECENT_LIMIT) || 30;
    hint.textContent = `Здесь показываются ${limit} последних изменённых записей по всем агентам.`;

    empty.append(lead, hint);
    h.appLandingFlowGridNode.appendChild(empty);
    h.syncFocusPanelActiveState();
    return;
  }

  for (const focusItem of items) {
    h.appLandingFlowGridNode.appendChild(createAppLandingFlowCard(focusItem));
  }
  h.syncFocusPanelActiveState();
}
