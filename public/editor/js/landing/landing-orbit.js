/**
 * Landing orbit view (refactor 14) — lazy chunk.
 */
/** @type {Record<string, any> | null} */
let host = null;

let orbitUiBound = false;

/** Orbit: клик по пузырю сразу открывает workspace */
const ORBIT_BUBBLE_OPENS_WORKSPACE = true;

export function getOrbitBubbleOpensWorkspace() {
  return ORBIT_BUBBLE_OPENS_WORKSPACE;
}

export function getLandingOrbitDiveAgentId() {
  return landingOrbitDiveAgentId;
}

export function registerLandingOrbitHost(next) {
  host = next && typeof next === "object" ? next : null;
  bindLandingOrbitUiListeners();
}

function requireHost() {
  if (!host) throw new Error("landing orbit host not registered");
  return host;
}

function bindLandingOrbitUiListeners() {
  if (orbitUiBound || !host) return;
  orbitUiBound = true;
  host.appLandingOrbitTwigsNode?.addEventListener("mouseenter", cancelOrbitAgentFocusHide);
  host.appLandingOrbitTwigsNode?.addEventListener("mouseleave", scheduleOrbitAgentFocusHide);
  host.appLandingOrbitDiveBackBtn?.addEventListener("click", closeOrbitAgentDive);
  host.appLandingOrbitDiveOpenBtn?.addEventListener("click", () => {
    if (!landingOrbitDiveAgentId) return;
    host.selectAgentOption(landingOrbitDiveAgentId);
  });
  window.addEventListener("resize", () => {
    if (landingOrbitDiveAgentId) scheduleOrbitDiveLinksDraw();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !landingOrbitDiveAgentId) return;
    if (host.getLandingAgentsView() !== "orbit") return;
    event.preventDefault();
    closeOrbitAgentDive();
  });
}

function hashAgentIdForOrbit(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
const ORBIT_LINK_CENTER = { x: 50, y: 50 };
/** Референс высоты .app-landing-orbit (clamp 440–760px, ~60vh). */
const ORBIT_LAYOUT_STAGE_REF_HEIGHT_PX = 560;
/** Высота hub-copy (mark + текст), px — по styles.css. */
const ORBIT_HUB_COPY_HEIGHT_PX = 198;
/** Подпись + meta под центром аватара в orbit-direct, px. */
const ORBIT_BUBBLE_STACK_BELOW_CENTER_PX = 90;
/** Зазор между низом карточки агента и верхом hub, px. */
const ORBIT_LOGO_GAP_PX = 12;
const ORBIT_LAYOUT_BOUNDS = {
  xMin: 13,
  xMax: 87,
  yMin: 12,
  yMax: 74
};
/** Запретная зона hub/логотипа (радиус от центра до якоря, %). */
const ORBIT_HUB_MIN_RADIUS_PERCENT = 27;

/** Макс. Y якоря (центр аватара) у верхнего слота, % — чтобы meta не заходила на hub. */
function getOrbitTopAnchorMaxYPercent() {
  const hubTop =
    ORBIT_LINK_CENTER.y -
    (ORBIT_HUB_COPY_HEIGHT_PX / ORBIT_LAYOUT_STAGE_REF_HEIGHT_PX) * 50;
  const stackBelowCenter =
    (ORBIT_BUBBLE_STACK_BELOW_CENTER_PX / ORBIT_LAYOUT_STAGE_REF_HEIGHT_PX) * 100;
  const gap = (ORBIT_LOGO_GAP_PX / ORBIT_LAYOUT_STAGE_REF_HEIGHT_PX) * 100;
  return hubTop - stackBelowCenter - gap;
}

/** Мин. радиус кольца, %: 50 − maxY ≈ 36 при референсных размерах. */
function getOrbitMinCircleRadiusPercent() {
  return ORBIT_LINK_CENTER.y - getOrbitTopAnchorMaxYPercent();
}

function clampOrbitLayoutPoint(layout) {
  layout.x = Math.min(ORBIT_LAYOUT_BOUNDS.xMax, Math.max(ORBIT_LAYOUT_BOUNDS.xMin, layout.x));
  layout.y = Math.min(ORBIT_LAYOUT_BOUNDS.yMax, Math.max(ORBIT_LAYOUT_BOUNDS.yMin, layout.y));
  return layout;
}

function ensureOrbitLayoutClearOfHub(layout) {
  const dx = layout.x - ORBIT_LINK_CENTER.x;
  const dy = layout.y - ORBIT_LINK_CENTER.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= ORBIT_HUB_MIN_RADIUS_PERCENT) return layout;
  if (dist < 0.05) {
    layout.x = ORBIT_LINK_CENTER.x;
    layout.y = ORBIT_LINK_CENTER.y - ORBIT_HUB_MIN_RADIUS_PERCENT;
    return layout;
  }
  const scale = ORBIT_HUB_MIN_RADIUS_PERCENT / dist;
  layout.x = ORBIT_LINK_CENTER.x + dx * scale;
  layout.y = ORBIT_LINK_CENTER.y + dy * scale;
  return layout;
}

function finalizeOrbitBubbleLayout(layout) {
  ensureOrbitLayoutClearOfHub(layout);
  clampOrbitLayoutPoint(layout);
  ensureOrbitLayoutClearOfHub(layout);
  return layout;
}

function getOrbitCircleRadiusPercent(total) {
  const count = Math.max(1, total);
  const minForLogo = getOrbitMinCircleRadiusPercent();
  let radius = count <= 1 ? 34 : 33 + Math.max(0, count - 4) * 0.55;
  radius = Math.max(radius, minForLogo);
  return Math.min(40, radius);
}

/** Верхний пузырь: нижняя часть аватара ближе к hub — слегка выдвигаем верхнюю дугу. */
function nudgeOrbitLayoutForLogoClearance(layout, angle) {
  const sin = Math.sin(angle);
  if (sin >= -0.08) return layout;

  const dx = layout.x - ORBIT_LINK_CENTER.x;
  const dy = layout.y - ORBIT_LINK_CENTER.y;
  const dist = Math.hypot(dx, dy) || 1;
  const sizePct = ((layout.size || 64) / 480) * 100;
  const logoRadius = getOrbitMinCircleRadiusPercent();
  const minDist = Math.max(
    logoRadius,
    ORBIT_HUB_MIN_RADIUS_PERCENT + sizePct * 0.9 + 3.5 + Math.max(0, -sin - 0.35) * 5.5
  );

  if (dist >= minDist) return layout;
  const scale = minDist / dist;
  layout.x = ORBIT_LINK_CENTER.x + dx * scale;
  layout.y = ORBIT_LINK_CENTER.y + dy * scale;
  return layout;
}

function getOrbitBubbleLayout(index, total, agentId) {
  const hash = hashAgentIdForOrbit(String(agentId || index));
  const count = Math.max(1, total);
  const radius = getOrbitCircleRadiusPercent(count);
  const angle =
    count <= 1 ? -Math.PI / 2 : (index / count) * Math.PI * 2 - Math.PI / 2;
  const layout = {
    x: ORBIT_LINK_CENTER.x + Math.cos(angle) * radius,
    y: ORBIT_LINK_CENTER.y + Math.sin(angle) * radius,
    size: 54 + (hash % 18),
    duration: 7 + (hash % 6),
    delay: ((hash % 50) / 10).toFixed(1),
    floatX: 6 + (hash % 10),
    floatY: 8 + (hash % 10)
  };
  nudgeOrbitLayoutForLogoClearance(layout, angle);
  return finalizeOrbitBubbleLayout(layout);
}

function buildOrbitBubbleLayouts(agents) {
  const list = Array.isArray(agents) ? agents : [];
  return list.map((agent, index) => ({
    agentId: agent.id,
    ...getOrbitBubbleLayout(index, list.length, agent.id)
  }));
}

let landingOrbitGitLoadSeq = 0;

function getRegistryAgentAwnStatus(agent) {
  return String(agent?.awnProps?.["awn-status"] ?? agent?.status ?? "").trim();
}

function getRegistryAgentAwnId(agent) {
  return String(agent?.awnProps?.["awn-id"] ?? "").trim();
}

function formatLandingOrbitGitSummary(git) {
  if (!git || typeof git !== "object") return "git …";
  if (git.error) return "git: ошибка";
  if (!git.hasDotGit) return "нет git";
  const upstream = String(git.upstream || "").trim();
  const branch = String(git.branch || "").trim() || "main";
  const remoteLine = upstream || `origin/${branch}`;
  const parts = [remoteLine];
  if (git.clean === true) parts.push("чисто");
  else if (Number(git.changeCount) > 0) parts.push(`${git.changeCount} изм.`);
  if (Number(git.ahead) > 0 || Number(git.behind) > 0) {
    parts.push(`↑${git.ahead || 0} ↓${git.behind || 0}`);
  }
  return parts.join(" · ");
}

function createAppLandingOrbitBubbleMeta(agent) {
  const meta = document.createElement("div");
  meta.className = "app-landing-orbit-bubble-meta";
  meta.setAttribute("aria-hidden", "true");

  const statusValue = getRegistryAgentAwnStatus(agent) || "—";
  const statusRow = document.createElement("div");
  statusRow.className = "app-landing-orbit-bubble-meta-row is-status";
  const statusLabel = document.createElement("span");
  statusLabel.className = "app-landing-orbit-bubble-meta-label";
  statusLabel.textContent = "status";
  const statusText = document.createElement("span");
  statusText.className = "app-landing-orbit-bubble-meta-value";
  statusText.textContent = statusValue;
  statusText.title = statusValue;
  statusRow.append(statusLabel, statusText);

  const slugRow = document.createElement("div");
  slugRow.className = "app-landing-orbit-bubble-meta-row is-slug";
  const slugLabel = document.createElement("span");
  slugLabel.className = "app-landing-orbit-bubble-meta-label";
  slugLabel.textContent = "slug (key)";
  const slugText = document.createElement("span");
  slugText.className = "app-landing-orbit-bubble-meta-value is-mono";
  slugText.textContent = agent.id || "—";
  slugText.title = agent.id || "";
  slugRow.append(slugLabel, slugText);

  const gitRow = document.createElement("div");
  gitRow.className = "app-landing-orbit-bubble-meta-row is-git is-loading";
  const gitLabel = document.createElement("span");
  gitLabel.className = "app-landing-orbit-bubble-meta-label";
  gitLabel.textContent = "git";
  const gitText = document.createElement("span");
  gitText.className = "app-landing-orbit-bubble-meta-value is-mono";
  gitText.textContent = "…";
  gitRow.append(gitLabel, gitText);

  meta.append(statusRow, slugRow, gitRow);
  return meta;
}

function appendAppLandingOrbitBubbleAwnIdBadge(bubbleBtn, agent) {
  const awnId = getRegistryAgentAwnId(agent);
  if (!awnId || !bubbleBtn) return;
  bubbleBtn.classList.add("has-awn-id");
  const badge = document.createElement("span");
  badge.className = "app-landing-orbit-bubble-awn-id-badge";
  badge.textContent = awnId;
  badge.title = `awn-id: ${awnId}`;
  badge.setAttribute("aria-hidden", "true");
  bubbleBtn.appendChild(badge);
}

function applyLandingOrbitGitSummaries(summaries = {}) {
  const orbitAgentsNode = getOrbitAgentBubblesNode();
  if (!orbitAgentsNode) return;
  for (const item of orbitAgentsNode.querySelectorAll(".app-landing-orbit-item")) {
    const agentId = String(item.dataset.agentId || "").trim();
    const gitRow = item.querySelector(".app-landing-orbit-bubble-meta-row.is-git");
    const gitText = gitRow?.querySelector(".app-landing-orbit-bubble-meta-value");
    if (!gitRow || !gitText) continue;
    gitRow.classList.remove("is-loading");
    const summary = summaries[agentId];
    const line = formatLandingOrbitGitSummary(summary);
    gitText.textContent = line;
    gitText.title = line;
    gitRow.classList.toggle("is-clean", summary?.hasDotGit === true && summary?.clean === true);
    gitRow.classList.toggle("is-dirty", summary?.hasDotGit === true && summary?.clean === false);
    gitRow.classList.toggle("is-missing", summary?.hasDotGit === false);
  }
}

export async function refreshLandingOrbitGitSummaries() {
  const seq = ++landingOrbitGitLoadSeq;
  try {
    const response = await fetch("/api/agents/git-summaries");
    if (!response.ok) return;
    const data = await response.json().catch(() => ({}));
    if (seq !== landingOrbitGitLoadSeq) return;
    applyLandingOrbitGitSummaries(data?.summaries || {});
  } catch {
    if (seq !== landingOrbitGitLoadSeq) return;
    applyLandingOrbitGitSummaries({});
  }
}

function createAppLandingOrbitBubble(agent, index, total, share, layoutOverride = null) {
  const registryActive = host?.isAgentRegistryActive?.(agent) ?? false;
  const isOrchestrator = agent.orchestrator === true;
  const label = agent.name || agent.id;
  const layout = layoutOverride || getOrbitBubbleLayout(index, total, agent.id);

  const item = document.createElement("div");
  item.className = "app-landing-orbit-item";
  if (isOrchestrator) item.classList.add("app-landing-orbit-item--orchestrator");
  item.setAttribute("role", "listitem");
  item.dataset.agentId = agent.id;
  item.style.setProperty("--orbit-x", `${layout.x}%`);
  item.style.setProperty("--orbit-y", `${layout.y}%`);
  item.style.setProperty("--orbit-size", `${layout.size}px`);
  item.style.setProperty("--orbit-duration", `${layout.duration}s`);
  item.style.setProperty("--orbit-delay", `${layout.delay}s`);
  item.style.setProperty("--orbit-float-x", `${layout.floatX}px`);
  item.style.setProperty("--orbit-float-y", `${layout.floatY}px`);
  if (share?.color) item.style.setProperty("--orbit-attention-color", share.color);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `app-landing-orbit-bubble${registryActive ? " is-active" : " is-inactive"}${
    isOrchestrator ? " is-orchestrator" : ""
  }`;
  btn.title = registryActive
    ? isOrchestrator
      ? `Оркестратор · ${label} — открыть workspace`
      : `Открыть workspace · ${label}`
    : `${label} — неактивен`;
  btn.setAttribute(
    "aria-label",
    registryActive
      ? isOrchestrator
        ? `Оркестратор ${label} — открыть workspace`
        : `Открыть workspace агента ${label}`
      : `Агент ${label} неактивен`
  );

  const avatar = document.createElement("span");
  avatar.className = "app-landing-orbit-bubble-avatar";

  host.mountPreviewOrFallback(avatar, {
    previewUrl: host.getRegistryAgentPreviewUrl(agent),
    emoji: host.resolveAwnEmoji(agent),
    fallbackText: host.getAgentPickerInitials(agent),
    emojiClass: "app-landing-orbit-bubble-emoji",
    initialsClass: "app-landing-orbit-bubble-initials"
  });
  btn.append(avatar);
  appendAppLandingOrbitBubbleAwnIdBadge(btn, agent);

  if (isOrchestrator) {
    const badge = document.createElement("span");
    badge.className = "app-landing-orbit-orchestrator-badge";
    badge.textContent = "Оркестратор";
    badge.setAttribute("aria-hidden", "true");
    btn.appendChild(badge);
  }

  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-orbit-bubble-label";
  if (isOrchestrator) nameNode.classList.add("is-orchestrator");
  nameNode.textContent = label;

  const metaNode = createAppLandingOrbitBubbleMeta(agent);

  btn.addEventListener("click", () => {
    if (!registryActive) {
      host.showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    if (ORBIT_BUBBLE_OPENS_WORKSPACE) {
      host.selectAgentOption(agent.id);
      return;
    }
    if (landingOrbitDiveAgentId === agent.id) {
      host.selectAgentOption(agent.id);
      return;
    }
    openOrbitAgentDive(agent.id);
  });

  const children = [btn, nameNode, metaNode];

  if (share) {
    const attentionWrap = document.createElement("div");
    attentionWrap.className = "app-landing-orbit-bubble-attention";
    attentionWrap.setAttribute("aria-hidden", "true");

    const track = document.createElement("div");
    track.className = "app-landing-orbit-attention-track app-landing-orbit-bubble-attention-track";

    const fill = document.createElement("span");
    fill.className = "app-landing-orbit-attention-fill";
    fill.style.width = `${share.percent}%`;
    fill.style.backgroundColor = share.color;

    track.appendChild(fill);
    attentionWrap.appendChild(track);
    children.push(attentionWrap);
  }

  item.append(...children);
  bindOrbitAttentionHover(item, agent.id);
  if (!ORBIT_BUBBLE_OPENS_WORKSPACE) {
    bindOrbitItemFocusHover(item, agent, index);
  }
  return item;
}

function renderAppLandingOrbitLinks(agents, layoutByAgentId = null) {
  if (!host.appLandingOrbitLinksNode) return;
  host.appLandingOrbitLinksNode.replaceChildren();

  if (!Array.isArray(agents) || agents.length === 0) return;

  const svgNs = "http://www.w3.org/2000/svg";
  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index];
    const layout =
      layoutByAgentId?.get(agent.id) || getOrbitBubbleLayout(index, agents.length, agent.id);
    const registryActive = host.isAgentRegistryActive(agent);

    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", String(ORBIT_LINK_CENTER.x));
    line.setAttribute("y1", String(ORBIT_LINK_CENTER.y));
    line.setAttribute("x2", String(layout.x));
    line.setAttribute("y2", String(layout.y));
    line.classList.add("app-landing-orbit-link");
    if (registryActive) line.classList.add("is-active");
    line.style.animationDelay = `${layout.delay}s`;
    host.appLandingOrbitLinksNode.appendChild(line);
  }
}

function getOrbitAgentBubblesNode() {
  const fromHost =
    host?.appLandingOrbitAgentBubblesNode ||
    host?.appLandingOrbitAgentsNode ||
    host?.appLandingOrbitBubblesNode;
  if (fromHost) return fromHost;
  return (
    document.getElementById("app-landing-orbit-agent-bubbles") ||
    document.getElementById("app-landing-orbit-agents") ||
    document.getElementById("app-landing-orbit-bubbles")
  );
}

export function renderAppLandingOrbit() {
  if (!host?.getAgentsForLandingOrbit) {
    const node = getOrbitAgentBubblesNode();
    if (node && !node.childElementCount) {
      const wait = document.createElement("p");
      wait.className = "app-landing-orbit-empty is-loading";
      wait.textContent = "Загрузка карты…";
      node.replaceChildren(wait);
    }
    return;
  }
  const orbitAgentsNode = getOrbitAgentBubblesNode();
  if (!orbitAgentsNode) return;
  orbitAgentsNode.replaceChildren();
  clearOrbitAttentionHighlight();

  const agents = host.getAgentsForLandingOrbit();
  if (agents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "app-landing-orbit-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр.";
    orbitAgentsNode.appendChild(empty);
    renderAppLandingAttention([]);
    return;
  }

  const shares = buildMockAgentAttentionShares(agents);
  const shareByAgentId = new Map(shares.map((share) => [share.agent.id, share]));
  const orbitLayouts = buildOrbitBubbleLayouts(agents);
  const layoutByAgentId = new Map(orbitLayouts.map((entry) => [entry.agentId, entry]));

  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index];
    try {
      orbitAgentsNode.appendChild(
        createAppLandingOrbitBubble(
          agent,
          index,
          agents.length,
          shareByAgentId.get(agent.id),
          layoutByAgentId.get(agent.id)
        )
      );
    } catch (error) {
      console.error("[landing-orbit] bubble render failed", agent?.id, error);
    }
  }

  renderAppLandingOrbitLinks(agents, layoutByAgentId);
  renderAppLandingAttention(buildMockAgentAttentionShares(agents));
  setLandingOrbitFocusCache(host.getLandingHubOrbitTopicItems());
  syncOrbitDiveSelection();
  host.appLandingInnerNode?.classList.toggle("is-orbit-direct-open", ORBIT_BUBBLE_OPENS_WORKSPACE);
  void refreshLandingOrbitGitSummaries();
}

const ORBIT_FOCUS_TWIG_LIMIT = 8;
let landingOrbitFocusByAgent = new Map();
let landingOrbitFocusHoverAgentId = null;
let landingOrbitFocusHideTimer = null;

export function setLandingOrbitFocusCache(items = []) {
  landingOrbitFocusByAgent = host.groupFocusItemsByAgent(items);
  renderOrbitAllAgentFocusGraphs();
  if (landingOrbitDiveAgentId) {
    renderOrbitAgentDive(landingOrbitDiveAgentId);
  }
}

function clearOrbitAgentFocusDisplay() {
  landingOrbitFocusHoverAgentId = null;
  host.appLandingOrbitTwigsNode?.replaceChildren();
  host.appLandingOrbitFocusLinksNode?.replaceChildren();
  host.appLandingOrbitTwigsNode?.classList.remove("is-visible");
  host.appLandingOrbitFocusLinksNode?.classList.remove("is-visible");
}

export function cancelOrbitAgentFocusHide() {
  if (landingOrbitFocusHideTimer) {
    clearTimeout(landingOrbitFocusHideTimer);
    landingOrbitFocusHideTimer = null;
  }
}

export function scheduleOrbitAgentFocusHide() {
  cancelOrbitAgentFocusHide();
  landingOrbitFocusHideTimer = window.setTimeout(() => {
    syncOrbitFocusHighlight(null);
  }, 160);
}

function syncOrbitFocusHighlight(agentId = null) {
  const resolvedAgentId = String(agentId || "").trim() || null;
  landingOrbitFocusHoverAgentId = resolvedAgentId;
  const showGraph = Boolean(resolvedAgentId);

  host.appLandingOrbitTwigsNode?.classList.toggle("is-visible", showGraph);
  host.appLandingOrbitFocusLinksNode?.classList.toggle("is-visible", showGraph);

  for (const el of host.appLandingOrbitTwigsNode?.querySelectorAll("[data-orbit-agent-id]") || []) {
    const match = resolvedAgentId && el.dataset.orbitAgentId === resolvedAgentId;
    el.hidden = !match;
    el.classList.toggle("is-highlighted", Boolean(match));
    el.classList.toggle("is-dimmed", false);
  }

  for (const el of host.appLandingOrbitFocusLinksNode?.querySelectorAll("[data-orbit-agent-id]") || []) {
    const match = resolvedAgentId && el.dataset.orbitAgentId === resolvedAgentId;
    el.hidden = !match;
    el.classList.toggle("is-highlighted", Boolean(match));
    el.classList.toggle("is-dimmed", false);
  }
}

function getOrbitGraphTwigLayout(focusIndex, focusTotal, agentLayout, focusItem) {
  const hash = hashAgentIdForOrbit(String(focusItem?.nodePath || focusItem?.agentId || focusIndex));
  const count = Math.max(focusTotal, 1);
  const baseAngle = (hash % 360) * (Math.PI / 180);
  const ring = Math.floor(focusIndex / 6);
  const slot = focusIndex % 6;
  const angle = baseAngle + (slot / 6) * Math.PI * 2 + ring * 0.45;
  const dist = 11 + ring * 5 + (hash % 4);
  return {
    x: Math.min(96, Math.max(4, agentLayout.x + Math.cos(angle) * dist)),
    y: Math.min(92, Math.max(6, agentLayout.y + Math.sin(angle) * dist * 0.78))
  };
}

function renderOrbitAllAgentFocusGraphs() {
  if (ORBIT_BUBBLE_OPENS_WORKSPACE) {
    clearOrbitAgentFocusDisplay();
    return;
  }
  if (!host.appLandingOrbitTwigsNode || !host.appLandingOrbitFocusLinksNode) return;
  if (host.getLandingAgentsView() !== "orbit") return;

  host.appLandingOrbitTwigsNode.replaceChildren();
  host.appLandingOrbitFocusLinksNode.replaceChildren();

  const agents = host.getAgentsForLandingOrbit();
  const orbitLayoutByAgentId = new Map(
    buildOrbitBubbleLayouts(agents).map((entry) => [entry.agentId, entry])
  );
  let hasAny = false;
  const svgNs = "http://www.w3.org/2000/svg";

  agents.forEach((agent, agentIndex) => {
    const agentFocusItems = landingOrbitFocusByAgent.get(agent.id) || [];
    if (!agentFocusItems.length) return;

    hasAny = true;
    const agentLayout =
      orbitLayoutByAgentId.get(agent.id) ||
      getOrbitBubbleLayout(agentIndex, agents.length, agent.id);
    const shown = agentFocusItems.slice(0, ORBIT_FOCUS_TWIG_LIMIT);

    shown.forEach((focusItem, focusIndex) => {
      const twigLayout = getOrbitGraphTwigLayout(focusIndex, shown.length, agentLayout, focusItem);
      const label = focusItem.name || host.getLabelFromPath(focusItem.nodePath) || focusItem.agentName || "Тема";
      const nodePath = String(focusItem.nodePath || "").trim();

      const line = document.createElementNS(svgNs, "line");
      line.setAttribute("x1", String(agentLayout.x));
      line.setAttribute("y1", String(agentLayout.y));
      line.setAttribute("x2", String(twigLayout.x));
      line.setAttribute("y2", String(twigLayout.y));
      line.classList.add("app-landing-orbit-focus-link");
      line.hidden = true;
      line.dataset.orbitAgentId = agent.id;
      if (nodePath) line.dataset.focusPath = nodePath;
      host.appLandingOrbitFocusLinksNode.appendChild(line);

      const twig = document.createElement("button");
      twig.type = "button";
      twig.className = "app-landing-orbit-twig";
      twig.hidden = true;
      twig.dataset.orbitAgentId = agent.id;
      twig.setAttribute("role", "listitem");
      twig.style.setProperty("--twig-x", `${twigLayout.x}%`);
      twig.style.setProperty("--twig-y", `${twigLayout.y}%`);
      if (nodePath) twig.dataset.focusPath = nodePath;
      if (host.isFocusItemActive(focusItem)) twig.classList.add("is-active");
      twig.textContent = label;
      twig.title = nodePath || label;
      twig.addEventListener("click", (event) => {
        event.stopPropagation();
        void host.openFocusItem(focusItem);
      });
      twig.addEventListener("mouseenter", () => {
        cancelOrbitAgentFocusHide();
        syncOrbitFocusHighlight(agent.id);
      });
      twig.addEventListener("mouseleave", scheduleOrbitAgentFocusHide);
      host.appLandingOrbitTwigsNode.appendChild(twig);
    });
  });

  if (!hasAny) {
    host.appLandingOrbitTwigsNode.classList.remove("is-visible");
    host.appLandingOrbitFocusLinksNode.classList.remove("is-visible");
  }
  syncOrbitFocusHighlight(landingOrbitFocusHoverAgentId);
  host.syncFocusPanelActiveState();
}

function bindOrbitItemFocusHover(item, agent, agentIndex) {
  if (!item || !agent?.id) return;
  item.addEventListener("mouseenter", () => {
    cancelOrbitAgentFocusHide();
    syncOrbitFocusHighlight(agent.id);
  });
  item.addEventListener("mouseleave", scheduleOrbitAgentFocusHide);
  item.addEventListener("focusin", () => {
    cancelOrbitAgentFocusHide();
    syncOrbitFocusHighlight(agent.id);
  });
  item.addEventListener("focusout", (event) => {
    if (!item.contains(event.relatedTarget)) scheduleOrbitAgentFocusHide();
  });
}

export function renderAppLandingOrbitFocus(items = []) {
  setLandingOrbitFocusCache(items);
}

const ORBIT_DIVE_MENU_DEPTH = 6;
let landingOrbitDiveAgentId = null;
let landingOrbitDiveLinksFrame = 0;
let landingOrbitDiveGraphNodes = [];

function mountOrbitDiveOrbContent(container, {
  previewUrl = "",
  emoji = "",
  nodePath = "",
  iconKind = ""
}) {
  container.replaceChildren();

  const mountIcon = (path, kind = "") => {
    const icon = kind
      ? (() => {
          const el = document.createElement("span");
          el.className = `node-cover-icon node-cover-icon--${kind} node-cover-icon--in-dive-orb`;
          el.setAttribute("aria-hidden", "true");
          return el;
        })()
      : host.createNodeCoverIconElement(path);
    icon.classList.add("node-cover-icon--fallback", "node-cover-icon--in-dive-orb");
    container.appendChild(icon);
  };

  if (previewUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.onerror = () => {
      if (emoji) {
        container.replaceChildren();
        const emojiNode = document.createElement("span");
        emojiNode.className = "app-landing-orbit-dive-graph-emoji";
        emojiNode.textContent = emoji;
        emojiNode.setAttribute("aria-hidden", "true");
        container.appendChild(emojiNode);
        return;
      }
      mountIcon(nodePath, iconKind);
    };
    img.src = previewUrl;
    container.appendChild(img);
    return;
  }

  if (emoji) {
    const emojiNode = document.createElement("span");
    emojiNode.className = "app-landing-orbit-dive-graph-emoji";
    emojiNode.textContent = emoji;
    emojiNode.setAttribute("aria-hidden", "true");
    container.appendChild(emojiNode);
    return;
  }

  mountIcon(nodePath, iconKind);
}

function getOrbitDiveAgentRecord(agentId) {
  const cache = host?.agentsCache || [];
  return (
    cache.find((entry) => entry.id === agentId) ||
    host.getAgentsForLandingGrid().find((entry) => entry.id === agentId) ||
    null
  );
}

function collectOrbitDiveTopicsFromMenuNode(node, agent, depth, maxDepth, acc, seen) {
  if (!node || depth > maxDepth) return;

  if (depth > 0 && node.indexPath) {
    const topic = host.mapMenuEntryToLandingTopicItem(agent, node, node.indexPath);
    if (topic && !seen.has(topic.nodePath)) {
      seen.add(topic.nodePath);
      acc.push(topic);
    }
  }

  for (const item of node.items || []) {
    if (!item?.path) continue;
    const topic = host.mapMenuEntryToLandingTopicItem(agent, item, item.path);
    if (topic && !seen.has(topic.nodePath)) {
      seen.add(topic.nodePath);
      acc.push(topic);
    }
  }

  if (depth >= maxDepth) return;

  for (const section of node.sections || []) {
    if (!section || !host.shouldShowMenuTreeFolder(section, agent.id)) continue;
    collectOrbitDiveTopicsFromMenuNode(section, agent, depth + 1, maxDepth, acc, seen);
  }
}

function collectOrbitDiveTopicsFromMenu(menu, agent) {
  const acc = [];
  const seen = new Set();
  if (!menu || menu.workspaceMissing) return acc;

  const walkTree = (node) => {
    if (!node) return;
    collectOrbitDiveTopicsFromMenuNode(node, agent, 0, ORBIT_DIVE_MENU_DEPTH, acc, seen);
  };

  walkTree(host.getWorkspaceRootMenuTreeNode(menu, agent.id));
  if (menu.containerTree && host.shouldShowContainerSectionInMenu(agent.id)) {
    walkTree({ title: menu.containerTree.title || "", ...menu.containerTree });
  }
  if (menu.sharedTree && host.shouldShowSharedSectionInMenu(agent.id)) {
    walkTree({ title: menu.sharedTree.title || "", ...menu.sharedTree });
  }
  return acc;
}

function buildOrbitDiveSections(agent) {
  const menu = host.menuCacheByAgent.get(agent.id);
  const sections = [];
  const seen = new Set();

  const pushSection = (label, topics, folderPath = "") => {
    const cleanLabel = String(label || "").trim() || "Раздел";
    const key = `${cleanLabel}::${topics.map((topic) => topic.nodePath).join("|")}`;
    if (!topics.length || seen.has(key)) return;
    seen.add(key);
    sections.push({ label: cleanLabel, topics, folderPath });
  };

  const collectTopicsFromNode = (node) => {
    const topics = [];
    if (node?.indexPath) {
      const topic = host.mapMenuEntryToLandingTopicItem(agent, node, node.indexPath);
      if (topic) topics.push(topic);
    }
    for (const item of node?.items || []) {
      const topic = host.mapMenuEntryToLandingTopicItem(agent, item, item.path);
      if (topic) topics.push(topic);
    }
    return topics;
  };

  if (menu) {
    const roots = [];
    const workspaceRoot = host.getWorkspaceRootMenuTreeNode(menu, agent.id);
    if (workspaceRoot) roots.push({ label: agent.name || agent.id, node: workspaceRoot });
    if (menu.containerTree && host.shouldShowContainerSectionInMenu(agent.id)) {
      roots.push({ label: menu.containerTree.title || "Container", node: menu.containerTree });
    }
    if (menu.sharedTree && host.shouldShowSharedSectionInMenu(agent.id)) {
      roots.push({ label: menu.sharedTree.title || "Shared", node: menu.sharedTree });
    }

    for (const root of roots) {
      const rootTopics = host.collectTopicsFromNode(root.node);
      if (rootTopics.length) pushSection(root.label, rootTopics, root.node?.indexPath || "_registration.md");

      for (const section of root.node?.sections || []) {
        if (!section || !host.shouldShowMenuTreeFolder(section, agent.id)) continue;
        const sectionTopics = host.collectTopicsFromNode(section);
        if (sectionTopics.length) {
          pushSection(
            section.title || host.getLabelFromPath(section.folderPath) || "Раздел",
            sectionTopics,
            section.indexPath || section.folderPath || `${section.title || "section"}/index.md`
          );
        }
      }
    }
  }

  if (!sections.length) {
    const allTopics = collectOrbitDiveTopicsFromMenu(menu, agent);
    const source = allTopics.length ? allTopics : landingOrbitFocusByAgent.get(agent.id) || [];
    const byFolder = new Map();
    for (const focusItem of source) {
      const path = String(focusItem?.nodePath || "").trim();
      const parts = path.split("/").filter(Boolean);
      const folder = parts.length > 1 ? host.getLabelFromPath(parts[0]) : "Темы";
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder).push(focusItem);
    }
    for (const [label, topics] of byFolder.entries()) {
      const folderPath = topics[0]?.nodePath?.includes("/")
        ? `${topics[0].nodePath.split("/")[0]}/index.md`
        : "index.md";
      pushSection(label, topics, folderPath);
    }
  }

  return sections;
}

function buildOrbitDiveGraph(agent) {
  const nodes = [];
  const rootId = "root";
  nodes.push({
    id: rootId,
    type: "root",
    label: agent.name || agent.id,
    agent,
    parentId: null,
    focusItem: null
  });

  const sections = buildOrbitDiveSections(agent);
  sections.forEach((section, sectionIndex) => {
    const sectionId = `section-${sectionIndex}`;
    nodes.push({
      id: sectionId,
      type: "section",
      label: section.label,
      folderPath: section.folderPath || "",
      agent,
      parentId: rootId,
      focusItem: null,
      sectionIndex
    });

    section.topics.forEach((focusItem, topicIndex) => {
      nodes.push({
        id: `${sectionId}-topic-${topicIndex}`,
        type: "topic",
        label: focusItem.name || host.getLabelFromPath(focusItem.nodePath) || "Тема",
        agent,
        parentId: sectionId,
        focusItem,
        topicIndex,
        sectionIndex
      });
    });
  });

  layoutOrbitDiveGraph(nodes);
  return nodes;
}

function pickOrbitDiveShape(seed, kind) {
  const hash = hashAgentIdForOrbit(String(seed));
  if (kind === "root") return "circle";
  if (kind === "section") return hash % 2 === 0 ? "tile" : "circle";
  const variant = hash % 3;
  if (variant === 0) return "circle";
  if (variant === 1) return "tile";
  return "wide-tile";
}

function layoutOrbitDiveGraph(nodes) {
  const root = nodes.find((node) => node.type === "root");
  if (!root) return;

  const rootHash = hashAgentIdForOrbit(root.id);
  root.x = 47 + (rootHash % 9);
  root.y = 7 + (rootHash % 4);
  root.size = 98;
  root.shape = "circle";

  const sections = nodes.filter((node) => node.type === "section");
  const marginX = 10;
  let maxY = root.y + 10;

  sections.forEach((section, sectionIndex) => {
    const hash = hashAgentIdForOrbit(`${section.id}:${section.label}`);
    const band = sections.length <= 1 ? 0.5 : sectionIndex / (sections.length - 1);
    const baseX = marginX + band * (100 - marginX * 2);
    const baseY = 16 + sectionIndex * (58 / Math.max(sections.length, 1)) + (hash % 7);

    section.x = Math.min(100 - marginX, Math.max(marginX, baseX + ((hash % 19) - 9) * 1.35));
    section.y = baseY + ((hash >> 4) % 11 - 5) * 1.1;
    section.shape = pickOrbitDiveShape(section.id, "section");
    section.size = section.shape === "circle" ? 70 + (hash % 10) : 0;
    section.w = section.shape === "tile" ? 108 + (hash % 18) : 0;
    section.h = section.shape === "tile" ? 96 + (hash % 14) : 0;

    const topics = nodes.filter((node) => node.parentId === section.id);
    topics.forEach((topic, topicIndex) => {
      const topicHash = hashAgentIdForOrbit(`${topic.id}:${topic.focusItem?.nodePath || topicIndex}`);
      const angle = (topicIndex / Math.max(topics.length, 1)) * Math.PI * 2 + (hash % 100) * 0.07;
      const spread = 11 + (topicHash % 9) + topicIndex * 1.6;
      let x = section.x + Math.cos(angle) * spread * 0.72 + ((topicHash % 15) - 7) * 0.85;
      let y = section.y + Math.sin(angle) * spread * 0.55 + 10 + ((topicHash >> 3) % 13) * 0.75;

      x = Math.min(100 - marginX, Math.max(marginX, x));
      y = Math.min(94, Math.max(12, y));

      topic.x = x;
      topic.y = y;
      topic.shape = pickOrbitDiveShape(`${topic.id}:${topicIndex}`, "topic");

      if (topic.shape === "circle") {
        topic.size = 50 + (topicHash % 18);
        topic.w = 0;
        topic.h = 0;
      } else if (topic.shape === "tile") {
        topic.size = 0;
        topic.w = 96 + (topicHash % 24);
        topic.h = 88 + (topicHash % 16);
      } else {
        topic.size = 0;
        topic.w = 148 + (topicHash % 28);
        topic.h = 74 + (topicHash % 12);
      }
    });

    const sectionBottom = section.y + (section.shape === "tile" ? 14 : 8);
    for (const topic of topics) {
      const topicBottom = topic.y + (topic.shape === "circle" ? 8 : topic.shape === "tile" ? 12 : 10);
      maxY = Math.max(maxY, topicBottom, sectionBottom);
    }
    maxY = Math.max(maxY, sectionBottom);
  });

  const canvasHeight = maxY + 10;
  for (const node of nodes) {
    node.canvasHeight = canvasHeight;
  }
}

function appendOrbitDiveNodeLabel(container, label, variant = "") {
  const caption = document.createElement("span");
  caption.className = `app-landing-orbit-dive-node-label${variant ? ` app-landing-orbit-dive-node-label--${variant}` : ""}`;
  caption.textContent = label;
  container.appendChild(caption);
}

function appendOrbitDivePreviewMount(container, opts, { rounded = true } = {}) {
  const mount = document.createElement("span");
  mount.className = `app-landing-orbit-dive-preview-mount${rounded ? "" : " is-square"}`;
  mountOrbitDiveOrbContent(mount, opts);
  container.appendChild(mount);
  return mount;
}

function buildOrbitDiveTileNode(nodeData, { agent, focusItem, folderPath, isTopic = false } = {}) {
  const { label, shape, w, h } = nodeData;
  const tile = document.createElement("div");
  tile.className = `app-landing-orbit-dive-tile app-landing-orbit-dive-tile--${shape === "wide-tile" ? "wide" : "square"}`;

  const preview = document.createElement("span");
  preview.className = "app-landing-orbit-dive-tile-preview";
  appendOrbitDivePreviewMount(
    preview,
    isTopic
      ? {
          previewUrl: host.resolveFocusPreviewUrl(focusItem?.nodePreviewUrl, agent.id),
          emoji: host.resolveAwnEmoji(focusItem),
          nodePath: focusItem?.nodePath || "topic.md"
        }
      : {
          nodePath: folderPath || `${label}/index.md`,
          iconKind: "section"
        },
    { rounded: false }
  );

  appendOrbitDiveNodeLabel(tile, label, isTopic ? "topic" : "section");
  tile.prepend(preview);
  return tile;
}

function createOrbitDiveGraphNode(nodeData) {
  const { type, label, agent, focusItem, x, y, size, id, folderPath, shape = "circle", w = 0, h = 0 } = nodeData;
  const isTile = shape === "tile" || shape === "wide-tile";
  const el = document.createElement(type === "topic" ? "button" : "div");
  if (type === "topic") el.type = "button";

  el.className = [
    "app-landing-orbit-dive-graph-node",
    `app-landing-orbit-dive-graph-node--${type}`,
    `app-landing-orbit-dive-graph-node--shape-${isTile ? shape : "circle"}`
  ].join(" ");
  el.dataset.diveNodeId = id;
  el.style.setProperty("--dive-x", `${x}%`);
  el.style.setProperty("--dive-y", `${y}%`);
  el.style.setProperty("--dive-delay", String((nodeData.sectionIndex || 0) + (nodeData.topicIndex || 0) * 0.15));

  if (isTile) {
    el.style.setProperty("--dive-w", `${w}px`);
    el.style.setProperty("--dive-h", `${h}px`);
  } else {
    el.style.setProperty("--dive-size", `${size}px`);
  }

  if (type === "root") {
    el.setAttribute("role", "treeitem");
    el.setAttribute("aria-label", label);
    const aura = document.createElement("span");
    aura.className = "app-landing-orbit-dive-graph-aura";
    aura.setAttribute("aria-hidden", "true");
    const body = document.createElement("span");
    body.className = "app-landing-orbit-dive-node-body is-circle";
    appendOrbitDivePreviewMount(body, {
      previewUrl: host.getRegistryAgentPreviewUrl(agent),
      emoji: host.resolveAwnEmoji(agent),
      nodePath: "_registration.md",
      iconKind: "agent-root"
    });
    appendOrbitDiveNodeLabel(el, label, "root");
    el.append(aura, body);
    return el;
  }

  if (type === "section") {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", label);
    if (isTile) {
      el.appendChild(buildOrbitDiveTileNode(nodeData, { folderPath }));
    } else {
      const body = document.createElement("span");
      body.className = "app-landing-orbit-dive-node-body is-circle is-section";
      const ring = document.createElement("span");
      ring.className = "app-landing-orbit-dive-graph-ring";
      ring.setAttribute("aria-hidden", "true");
      const core = document.createElement("span");
      core.className = "app-landing-orbit-dive-graph-section-core";
      mountOrbitDiveOrbContent(core, {
        nodePath: folderPath || `${label}/index.md`,
        iconKind: "section"
      });
      body.append(ring, core);
      appendOrbitDiveNodeLabel(el, label, "section");
      el.append(body);
    }
    el.addEventListener("mouseenter", () => highlightOrbitDiveNode(id, true));
    el.addEventListener("mouseleave", () => highlightOrbitDiveNode(id, false));
    return el;
  }

  el.setAttribute("role", "treeitem");
  el.title = focusItem?.nodePath || label;
  el.setAttribute("aria-label", label);

  if (isTile) {
    el.appendChild(buildOrbitDiveTileNode(nodeData, { agent, focusItem, isTopic: true }));
    if (host.isFocusItemActive(focusItem)) el.classList.add("is-active");
  } else {
    const halo = document.createElement("span");
    halo.className = "app-landing-orbit-dive-graph-halo";
    halo.setAttribute("aria-hidden", "true");
    const body = document.createElement("span");
    body.className = "app-landing-orbit-dive-node-body is-circle is-topic";
    appendOrbitDivePreviewMount(body, {
      previewUrl: host.resolveFocusPreviewUrl(focusItem?.nodePreviewUrl, agent.id),
      emoji: host.resolveAwnEmoji(focusItem),
      nodePath: focusItem?.nodePath || "topic.md"
    });
    appendOrbitDiveNodeLabel(el, label, "topic");
    if (host.isFocusItemActive(focusItem)) el.classList.add("is-active");
    el.append(halo, body);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    void host.openFocusItem({ ...focusItem, agentId: agent.id, agentName: agent.name || agent.id });
  });
  el.addEventListener("mouseenter", () => highlightOrbitDiveNode(id, true));
  el.addEventListener("mouseleave", () => highlightOrbitDiveNode(id, false));
  return el;
}

function highlightOrbitDiveNode(nodeId, active) {
  if (!nodeId || !host.appLandingOrbitDiveTreeNode) return;
  const related = new Set([nodeId]);
  const node = landingOrbitDiveGraphNodes.find((entry) => entry.id === nodeId);
  if (node?.parentId) related.add(node.parentId);
  if (node?.type === "section") {
    for (const child of landingOrbitDiveGraphNodes) {
      if (child.parentId === nodeId) related.add(child.id);
    }
  }
  for (const child of landingOrbitDiveGraphNodes) {
    if (child.parentId === nodeId) related.add(child.id);
  }

  for (const el of host.appLandingOrbitDiveTreeNode.querySelectorAll("[data-dive-node-id]")) {
    const match = related.has(el.dataset.diveNodeId);
    el.classList.toggle("is-highlighted", active && match);
    el.classList.toggle("is-dimmed", active && !match);
  }

  for (const link of host.appLandingOrbitDiveLinksNode?.querySelectorAll("[data-dive-link]") || []) {
    const match = related.has(link.dataset.diveFrom) && related.has(link.dataset.diveTo);
    link.classList.toggle("is-highlighted", active && match);
    link.classList.toggle("is-dimmed", active && !match);
  }
}

function resetOrbitDiveTreeContent() {
  if (!host.appLandingOrbitDiveTreeNode) return;
  const bg = host.appLandingOrbitDiveTreeNode.querySelector(".app-landing-orbit-dive-canvas-bg");
  const linksNode = host.appLandingOrbitDiveLinksNode;
  host.appLandingOrbitDiveTreeNode.replaceChildren();
  if (bg) host.appLandingOrbitDiveTreeNode.appendChild(bg);
  if (linksNode) host.appLandingOrbitDiveTreeNode.appendChild(linksNode);
}

function renderOrbitAgentDive(agentId) {
  if (!host.appLandingOrbitDiveTreeNode || !host.appLandingOrbitDiveTitleNode) return;
  const agent = getOrbitDiveAgentRecord(agentId);
  if (!agent) return;

  landingOrbitDiveGraphNodes = buildOrbitDiveGraph(agent);
  resetOrbitDiveTreeContent();
  host.appLandingOrbitDiveLinksNode?.replaceChildren();
  host.appLandingOrbitDiveTitleNode.textContent = agent.name || agent.id;

  const topicCount = landingOrbitDiveGraphNodes.filter((node) => node.type === "topic").length;
  const sectionCount = landingOrbitDiveGraphNodes.filter((node) => node.type === "section").length;
  if (host.appLandingOrbitDiveStatsNode) {
    host.appLandingOrbitDiveStatsNode.textContent =
      topicCount > 0
        ? `${topicCount} тем · ${sectionCount} разделов`
        : "Пока пусто — добавьте страницы в workspace";
  }

  if (!topicCount) {
    const empty = document.createElement("p");
    empty.className = "app-landing-orbit-dive-empty";
    empty.textContent = "База знаний пуста. Добавьте разделы и страницы в workspace агента.";
    host.appLandingOrbitDiveTreeNode.appendChild(empty);
    return;
  }

  const canvasHeight = landingOrbitDiveGraphNodes[0]?.canvasHeight || 100;
  const stageMin = Math.max(Math.round(canvasHeight * 14), 480);
  host.appLandingOrbitDiveTreeNode.style.minHeight = `${stageMin}px`;

  for (const nodeData of landingOrbitDiveGraphNodes) {
    host.appLandingOrbitDiveTreeNode.appendChild(createOrbitDiveGraphNode(nodeData));
  }

  scheduleOrbitDiveLinksDraw();
}

function getOrbitDiveNodeCenter(node, stageRect) {
  const anchor =
    node.querySelector(
      ".app-landing-orbit-dive-node-body, .app-landing-orbit-dive-tile-preview, .app-landing-orbit-dive-tile"
    ) || node;
  const rect = anchor.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - stageRect.left,
    y: rect.top + rect.height / 2 - stageRect.top
  };
}

function buildOrbitDiveCurvePath(x1, y1, x2, y2, bend = 0.42) {
  const cx = x1 + (x2 - x1) * 0.08;
  const cy = y1 + (y2 - y1) * bend;
  const cx2 = x2 - (x2 - x1) * 0.08;
  const cy2 = y2 - (y2 - y1) * 0.12;
  return `M ${x1} ${y1} C ${cx} ${cy}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

function buildOrbitDiveRailPath(x1, y1, x2, y2) {
  const spread = Math.abs(x2 - x1);
  const bend = Math.min(0.72, 0.28 + spread * 0.0015);
  const midX = x1 + (x2 - x1) * bend;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

function drawOrbitDiveLinks() {
  landingOrbitDiveLinksFrame = 0;
  if (!host.appLandingOrbitDiveLinksNode || !host.appLandingOrbitDiveTreeNode) return;

  const stage = host.appLandingOrbitDiveTreeNode;
  if (!stage) {
    host.appLandingOrbitDiveLinksNode.replaceChildren();
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) return;

  host.appLandingOrbitDiveLinksNode.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  host.appLandingOrbitDiveLinksNode.replaceChildren();

  const svgNs = "http://www.w3.org/2000/svg";
  const nodeCenterById = new Map();

  for (const nodeData of landingOrbitDiveGraphNodes) {
    const el = host.appLandingOrbitDiveTreeNode.querySelector(`[data-dive-node-id="${nodeData.id}"]`);
    if (!el) continue;
    nodeCenterById.set(nodeData.id, getOrbitDiveNodeCenter(el, stageRect));
  }

  const drawLink = (fromId, toId, className, pathBuilder = buildOrbitDiveCurvePath) => {
    const from = nodeCenterById.get(fromId);
    const to = nodeCenterById.get(toId);
    if (!from || !to) return;
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", pathBuilder(from.x, from.y, to.x, to.y));
    path.classList.add("app-landing-orbit-dive-link", className);
    path.dataset.diveFrom = fromId;
    path.dataset.diveTo = toId;
    host.appLandingOrbitDiveLinksNode.appendChild(path);
  };

  const rootId = landingOrbitDiveGraphNodes.find((node) => node.type === "root")?.id;

  for (const nodeData of landingOrbitDiveGraphNodes) {
    if (!nodeData.parentId) continue;
    drawLink(
      nodeData.parentId,
      nodeData.id,
      nodeData.type === "section" ? "is-trunk" : "is-leaf"
    );
  }

  if (rootId) {
    for (const section of landingOrbitDiveGraphNodes.filter((node) => node.type === "section")) {
      drawLink(rootId, section.id, "is-mesh");
    }
  }
}

export function scheduleOrbitDiveLinksDraw() {
  if (landingOrbitDiveLinksFrame) cancelAnimationFrame(landingOrbitDiveLinksFrame);
  landingOrbitDiveLinksFrame = requestAnimationFrame(() => {
    landingOrbitDiveLinksFrame = requestAnimationFrame(drawOrbitDiveLinks);
  });
}

function syncOrbitDiveSelection() {
  for (const item of getOrbitAgentBubblesNode()?.querySelectorAll(".app-landing-orbit-item") || []) {
    const selected = landingOrbitDiveAgentId && item.dataset.agentId === landingOrbitDiveAgentId;
    item.classList.toggle("is-dive-selected", Boolean(selected));
  }
}

function syncOrbitDiveUi() {
  const isOpen = Boolean(landingOrbitDiveAgentId);
  host.appLandingOrbitNode?.classList.toggle("is-dive-open", isOpen);
  host.appLandingOrbitNode?.classList.toggle("hidden", isOpen);
  host.appLandingOrbitNode?.setAttribute("aria-hidden", isOpen ? "true" : "false");
  host.appLandingInnerNode?.classList.toggle("is-orbit-dive-open", isOpen);
  host.appLandingOrbitDiveNode?.classList.toggle("hidden", !isOpen);
  host.appLandingOrbitDiveNode?.classList.toggle("is-open", isOpen);
  host.appLandingOrbitDiveNode?.setAttribute("aria-hidden", isOpen ? "false" : "true");

  if (!isOpen) {
    landingOrbitDiveGraphNodes = [];
    resetOrbitDiveTreeContent();
    host.appLandingOrbitDiveLinksNode?.replaceChildren();
    if (host.appLandingOrbitDiveTitleNode) host.appLandingOrbitDiveTitleNode.textContent = "";
    if (host.appLandingOrbitDiveStatsNode) host.appLandingOrbitDiveStatsNode.textContent = "";
    if (host.appLandingOrbitDiveTreeNode) host.appLandingOrbitDiveTreeNode.style.removeProperty("min-height");
  }

  syncOrbitDiveSelection();
  if (isOpen) {
    clearOrbitAgentFocusDisplay();
    renderOrbitAgentDive(landingOrbitDiveAgentId);
  }
}

export function openOrbitAgentDive(agentId) {
  if (ORBIT_BUBBLE_OPENS_WORKSPACE) {
    host.selectAgentOption(agentId);
    return;
  }
  const agent = getOrbitDiveAgentRecord(agentId);
  if (!agent || !host.isAgentRegistryActive(agent)) {
    host.showToast("Агент выключен — включите в реестре (⚙)", "error");
    return;
  }
  landingOrbitDiveAgentId = agent.id;
  syncOrbitDiveUi();
  host.appLandingOrbitDiveBackBtn?.focus({ preventScroll: true });

  if (!host.menuCacheByAgent.has(agent.id)) {
    void fetch(host.buildApiUrl("/api/menu", { maxDepth: String(ORBIT_DIVE_MENU_DEPTH + 1) }, agent.id))
      .then((response) => (response.ok ? response.json() : null))
      .then((menu) => {
        if (!menu || landingOrbitDiveAgentId !== agent.id) return;
        host.menuCacheByAgent.set(agent.id, menu);
        renderOrbitAgentDive(agent.id);
      })
      .catch(() => {});
  }
}

export function closeOrbitAgentDive() {
  landingOrbitDiveAgentId = null;
  syncOrbitDiveUi();
}

export function isOrbitAgentDiveOpen() {
  return Boolean(landingOrbitDiveAgentId);
}

const ORBIT_ATTENTION_PALETTE = [
  "#818cf8",
  "#fbbf24",
  "#34d399",
  "#f472b6",
  "#22d3ee",
  "#c084fc",
  "#fb7185",
  "#a3e635"
];

function getOrbitAttentionColor(agentId) {
  return ORBIT_ATTENTION_PALETTE[hashAgentIdForOrbit(String(agentId || "")) % ORBIT_ATTENTION_PALETTE.length];
}

export function buildMockAgentAttentionShares(agents) {
  if (!Array.isArray(agents) || !agents.length) return [];

  const weighted = agents.map((agent) => ({
    agent,
    weight: 14 + (hashAgentIdForOrbit(agent.id) % 86)
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const shares = weighted.map((item) => ({
    agent: item.agent,
    percent: totalWeight ? Math.round((item.weight / totalWeight) * 100) : 0,
    color: getOrbitAttentionColor(item.agent.id)
  }));

  const drift = 100 - shares.reduce((sum, item) => sum + item.percent, 0);
  if (drift && shares.length) shares[0].percent += drift;

  return shares.sort((a, b) => b.percent - a.percent);
}

function bindOrbitAttentionHover(node, agentId) {
  if (!node || !agentId) return;

  node.addEventListener("mouseenter", () => {
    setOrbitAttentionHighlight(agentId);
  });
  node.addEventListener("mouseleave", () => {
    setOrbitAttentionHighlight(null);
  });
  node.addEventListener("focusin", () => {
    setOrbitAttentionHighlight(agentId);
  });
  node.addEventListener("focusout", (event) => {
    if (!node.contains(event.relatedTarget)) {
      setOrbitAttentionHighlight(null);
    }
  });
}

function setOrbitAttentionHighlight(agentId) {
  const hasHighlight = Boolean(agentId);

  getOrbitAgentBubblesNode()
    ?.querySelectorAll(".app-landing-orbit-item[data-agent-id]")
    .forEach((item) => {
      const isMatch = item.dataset.agentId === agentId;
      item.classList.toggle("is-attention-highlighted", hasHighlight && isMatch);
      item.classList.toggle("is-attention-dimmed", hasHighlight && !isMatch);
    });

  host.appLandingOrbitAttentionNode
    ?.querySelectorAll(".app-landing-orbit-attention-stack-segment[data-agent-id]")
    .forEach((segment) => {
      const isMatch = segment.dataset.agentId === agentId;
      segment.classList.toggle("is-highlighted", hasHighlight && isMatch);
      segment.classList.toggle("is-dimmed", hasHighlight && !isMatch);
    });

  host.appLandingAttentionNode
    ?.querySelectorAll(".app-landing-orbit-attention-stack-segment[data-agent-id]")
    .forEach((segment) => {
      const isMatch = segment.dataset.agentId === agentId;
      segment.classList.toggle("is-highlighted", hasHighlight && isMatch);
      segment.classList.toggle("is-dimmed", hasHighlight && !isMatch);
    });

  host.appLandingFlowGridNode
    ?.querySelectorAll(".app-landing-flow-card[data-agent-id]")
    .forEach((card) => {
      const isMatch = card.dataset.agentId === agentId;
      card.classList.toggle("is-attention-highlighted", hasHighlight && isMatch);
      card.classList.toggle("is-attention-dimmed", hasHighlight && !isMatch);
    });
}

function clearOrbitAttentionHighlight() {
  setOrbitAttentionHighlight(null);
}

export function renderAppLandingAttention(shares) {
  const target = host.appLandingAttentionNode || host.appLandingOrbitAttentionNode;
  if (!target) return;
  target.replaceChildren();
  clearOrbitAttentionHighlight();

  if (!Array.isArray(shares) || !shares.length) {
    target.classList.add("hidden");
    return;
  }

  target.classList.remove("hidden");

  const stackedBar = document.createElement("div");
  stackedBar.className = "app-landing-orbit-attention-stack";
  stackedBar.setAttribute("role", "img");
  stackedBar.setAttribute(
    "aria-label",
    shares.map((item) => `${item.agent.name || item.agent.id}: ${item.percent}%`).join(", ")
  );

  for (const item of shares) {
    if (item.percent <= 0) continue;

    const segment = document.createElement("button");
    segment.type = "button";
    segment.className = "app-landing-orbit-attention-stack-segment";
    segment.dataset.agentId = item.agent.id;
    segment.style.width = `${item.percent}%`;
    segment.style.setProperty("--orbit-attention-color", item.color);
    segment.style.backgroundColor = item.color;
    segment.title = `${item.agent.name || item.agent.id} — ${item.percent}%`;
    segment.setAttribute("aria-label", segment.title);
    bindOrbitAttentionHover(segment, item.agent.id);
    stackedBar.appendChild(segment);
  }

  target.append(stackedBar);
}

export function renderAppLandingOrbitAttention(shares) {
  renderAppLandingAttention(shares);
}
