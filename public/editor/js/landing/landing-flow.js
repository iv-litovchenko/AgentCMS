/**
 * Landing flow view (refactor 14) — lazy chunk.
 *
 * Layout: vertical timeline grouped by day (Сегодня / Вчера / date).
 * Each time slot: grid of horizontal compact cards (thumb left, title + agent); rail on the left.
 * Only .md and .csv; dedupe by CHPU record; hour slots in a grid row.
 */

const FLOW_ELIGIBLE_EXTENSIONS = new Set(["md", "csv"]);
const FLOW_DISPLAY_LIMIT = 36;

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

function getFlowItemUpdatedIso(focusItem) {
  return String(focusItem?.updatedAt || focusItem?.awnProps?.["awn-update"] || "").trim();
}

function getFlowPathExtension(nodePath) {
  const base = String(nodePath || "").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function isFlowEligibleFocusItem(focusItem) {
  return FLOW_ELIGIBLE_EXTENSIONS.has(getFlowPathExtension(focusItem?.nodePath));
}

function normalizeFlowPathKey(nodePath) {
  return String(nodePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();
}

/** One card per CHPU record (same slug/path after CHPU normalization). */
function getFlowItemDedupeKey(focusItem) {
  const h = requireHost();
  let nodePath = String(focusItem?.nodePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
  if (!nodePath) return "";

  const ext = getFlowPathExtension(nodePath);
  if (ext === "csv") {
    nodePath = nodePath.replace(/\.csv$/i, "");
  }

  const toChpu = h.workspaceRelToChpuPath;
  if (typeof toChpu === "function") {
    const chpu = String(toChpu(nodePath) || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .trim()
      .toLowerCase();
    if (chpu) return `chpu:${chpu}`;
  }

  return `path:${normalizeFlowPathKey(nodePath)}`;
}

function pickBetterFlowDuplicate(current, incoming, activeAgentId) {
  const activeId = String(activeAgentId || "").trim();
  const score = (item) => {
    let value = Date.parse(getFlowItemUpdatedIso(item)) || 0;
    if (activeId && String(item?.agentId || "") === activeId) {
      value += 1e15;
    }
    return value;
  };
  return score(incoming) >= score(current) ? incoming : current;
}

/** Same CHPU record / path from different agents → prefer active workspace, then newest. */
function dedupeFlowItemsByRecordKey(items) {
  const h = requireHost();
  const activeId =
    typeof h.getActiveWorkspaceId === "function" ? String(h.getActiveWorkspaceId() || "") : "";
  const bestByKey = new Map();
  for (const item of items) {
    const key = getFlowItemDedupeKey(item);
    if (!key) continue;
    const prev = bestByKey.get(key);
    bestByKey.set(key, prev ? pickBetterFlowDuplicate(prev, item, activeId) : item);
  }

  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = getFlowItemDedupeKey(item);
    if (!key) {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(bestByKey.get(key) || item);
  }
  return out;
}

function filterFlowItemsForDisplay(focusItems) {
  const list = Array.isArray(focusItems) ? focusItems : [];
  const eligible = list.filter(isFlowEligibleFocusItem);
  return dedupeFlowItemsByRecordKey(eligible).slice(0, FLOW_DISPLAY_LIMIT);
}

function getFlowDaySortKey(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "0000-00-00";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getFlowDayGroupLabel(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Без даты";
  const d = new Date(t);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startItem = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startItem) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

function groupFlowItemsByDay(items) {
  const map = new Map();
  for (const item of items) {
    const iso = getFlowItemUpdatedIso(item);
    const sortKey = getFlowDaySortKey(iso);
    const label = getFlowDayGroupLabel(iso);
    if (!map.has(sortKey)) {
      map.set(sortKey, { sortKey, label, items: [] });
    }
    map.get(sortKey).items.push(item);
  }
  return [...map.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function getFlowTimeSlotSortKey(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "0000-00-00T00";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${hour}`;
}

function groupFlowItemsByTimeSlot(items) {
  const h = requireHost();
  const map = new Map();
  for (const item of items) {
    const iso = getFlowItemUpdatedIso(item);
    const slotKey = getFlowTimeSlotSortKey(iso);
    const mapKey = `${getFlowDaySortKey(iso)}\0${slotKey}`;
    if (!map.has(mapKey)) {
      map.set(mapKey, {
        sortKey: slotKey,
        label: iso ? h.formatTimelineRelativeTime(iso) : "—",
        latestMs: Number.NEGATIVE_INFINITY,
        items: []
      });
    }
    const group = map.get(mapKey);
    group.items.push(item);
    const ms = Date.parse(iso);
    if (Number.isFinite(ms) && ms >= group.latestMs) {
      group.latestMs = ms;
      group.label = iso ? h.formatTimelineRelativeTime(iso) : group.label;
    }
  }
  for (const group of map.values()) {
    group.items.sort(
      (a, b) => Date.parse(getFlowItemUpdatedIso(b)) - Date.parse(getFlowItemUpdatedIso(a))
    );
  }
  return [...map.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function appendFlowGridTilePhotoMedia(btn, previewUrl) {
  const media = document.createElement("span");
  media.className = "app-landing-flow-card-media app-landing-flow-card-media--photo-only";

  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener(
    "error",
    () => {
      media.remove();
      btn.classList.add("app-landing-flow-card--no-media");
    },
    { once: true }
  );
  img.src = previewUrl;
  media.appendChild(img);
  return media;
}

function createAppLandingFlowCard(focusItem, { timeline = false, compact = false } = {}) {
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
  const nodePath =
    typeof h.getLandingFocusItemNodePath === "function"
      ? h.getLandingFocusItemNodePath(focusItem)
      : String(focusItem.nodePath || "").trim();
  const awnId =
    typeof h.getLandingFocusItemAwnId === "function" ? h.getLandingFocusItemAwnId(focusItem) : "";
  const awnProps =
    focusItem.awnProps && typeof focusItem.awnProps === "object" ? focusItem.awnProps : {};
  const status = h.getFocusPropDisplayValue(focusItem, "awn-status");
  const typeLabel =
    h.getFocusPropDisplayValue(focusItem, "awn-type") || h.getFocusItemType(focusItem);
  const updatedAt = String(focusItem.updatedAt || focusItem?.awnProps?.["awn-update"] || "").trim();
  const updatedLabel = updatedAt ? h.formatTimelineRelativeTime(updatedAt) : "";

  const btn = document.createElement("button");
  btn.type = "button";
  const classNames = ["app-landing-flow-card"];
  if (timeline) classNames.push("app-landing-flow-card--timeline");
  if (compact) classNames.push("app-landing-flow-card--compact");
  btn.className = classNames.join(" ");
  if (!timeline) btn.setAttribute("role", "listitem");
  if (timeline && compact) btn.setAttribute("role", "listitem");
  btn.dataset.agentId = focusItem.agentId;
  if (nodePath) btn.dataset.focusPath = nodePath;
  if (h.isFocusItemActive(focusItem)) btn.classList.add("is-active");
  if (!registryActive) btn.classList.add("is-registry-off");
  const openLabel = registryActive ? `Открыть ${label}` : `${label} — агент неактивен`;
  btn.title = awnId ? `${openLabel} · id:${awnId}` : openLabel;
  btn.setAttribute("aria-label", btn.title);

  const nodeEmoji = h.resolveAwnEmoji(awnProps);
  const agentEmoji = h.resolveAwnEmoji(agent.awnProps);
  const previewUrl = h.resolveFocusPreviewUrl(focusItem.nodePreviewUrl, focusItem.agentId);
  const isGridTile = timeline && compact;

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

  if (updatedLabel && !timeline) {
    const updatedNode = document.createElement("span");
    updatedNode.className = "app-landing-flow-card-updated";
    updatedNode.textContent = updatedLabel;
    updatedNode.title = h.formatNodeMetaDateTime(updatedAt);
    meta.appendChild(updatedNode);
  }

  if (!compact && (status || typeLabel)) {
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

  body.appendChild(titleNode);
  if (isGridTile && nodePath && typeof h.formatLandingFocusItemPathMeta === "function") {
    const pathMeta = h.formatLandingFocusItemPathMeta(focusItem, { includeId: false });
    if (pathMeta) {
      const pathNode = document.createElement("span");
      pathNode.className = "app-landing-flow-card-path";
      pathNode.textContent = pathMeta;
      pathNode.title = nodePath;
      body.appendChild(pathNode);
    }
  }
  body.appendChild(meta);

  if (isGridTile) {
    btn.classList.add("app-landing-flow-card--grid-tile");
    if (previewUrl) {
      btn.append(appendFlowGridTilePhotoMedia(btn, previewUrl), body);
    } else {
      btn.classList.add("app-landing-flow-card--no-media");
      btn.append(body);
    }
  } else {
    const media = document.createElement("span");
    media.className = "app-landing-flow-card-media";
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
    btn.append(media, body);
  }

  if (awnId) {
    btn.classList.add("has-awn-id");
    const idBadge = document.createElement("span");
    idBadge.className = "app-landing-flow-card-id-badge";
    idBadge.textContent = awnId;
    idBadge.title = `awn-id: ${awnId}`;
    idBadge.setAttribute("aria-label", `awn-id ${awnId}`);
    btn.appendChild(idBadge);
  }

  return btn;
}

function createAppLandingFlowTimeSlotEntry(focusItems, { isLastInDay = false } = {}) {
  const h = requireHost();
  const items = Array.isArray(focusItems) ? focusItems : [];
  const latestIso = items.reduce((best, item) => {
    const iso = getFlowItemUpdatedIso(item);
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return best;
    if (!best || ms > Date.parse(best)) return iso;
    return best;
  }, "");
  const updatedLabel = latestIso ? h.formatTimelineRelativeTime(latestIso) : "—";

  const entry = document.createElement("article");
  entry.className = "app-landing-flow-timeline-entry";
  if (isLastInDay) entry.classList.add("is-last-in-day");

  const rail = document.createElement("div");
  rail.className = "app-landing-flow-timeline-rail";
  rail.setAttribute("aria-hidden", "true");

  const time = document.createElement("time");
  time.className = "app-landing-flow-timeline-time";
  if (latestIso) time.dateTime = latestIso;
  time.textContent = updatedLabel;
  if (latestIso) time.title = h.formatNodeMetaDateTime(latestIso);

  const dot = document.createElement("span");
  dot.className = "app-landing-flow-timeline-dot";

  const line = document.createElement("span");
  line.className = "app-landing-flow-timeline-line";

  rail.append(time, dot, line);

  const row = document.createElement("div");
  row.className = "app-landing-flow-time-row";
  row.setAttribute("role", "list");
  for (const focusItem of items) {
    row.appendChild(createAppLandingFlowCard(focusItem, { timeline: true, compact: true }));
  }

  entry.append(rail, row);
  return entry;
}

function createAppLandingFlowTimelineSkeletonEntry(index) {
  const entry = document.createElement("article");
  entry.className = "app-landing-flow-timeline-entry app-landing-flow-timeline-entry--skeleton";
  entry.setAttribute("aria-hidden", "true");
  entry.style.setProperty("--flow-skeleton-delay", `${(index % 4) * 0.14}s`);

  const rail = document.createElement("div");
  rail.className = "app-landing-flow-timeline-rail";
  const time = document.createElement("span");
  time.className = "app-landing-flow-timeline-time app-landing-flow-skeleton-line";
  const dot = document.createElement("span");
  dot.className = "app-landing-flow-timeline-dot app-landing-flow-skeleton-block";
  rail.append(time, dot);

  const row = document.createElement("div");
  row.className = "app-landing-flow-time-row";
  const cardCount = index % 2 === 0 ? 2 : 3;
  for (let i = 0; i < cardCount; i += 1) {
    const card = createAppLandingFlowSkeletonCard(index + i, { omitMedia: true });
    card.classList.add(
      "app-landing-flow-card--timeline",
      "app-landing-flow-card--compact",
      "app-landing-flow-card--grid-tile",
      "app-landing-flow-card--no-media"
    );
    row.appendChild(card);
  }
  entry.append(rail, row);
  return entry;
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

function createAppLandingFlowSkeletonCard(index, { omitMedia = false } = {}) {
  const card = document.createElement("div");
  card.className = "app-landing-flow-card app-landing-flow-card--skeleton";
  card.style.setProperty("--flow-skeleton-delay", `${(index % 4) * 0.14}s`);
  card.setAttribute("aria-hidden", "true");

  const body = document.createElement("span");
  body.className = "app-landing-flow-card-body";

  const titleLine = document.createElement("span");
  titleLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--title";

  const metaLine = document.createElement("span");
  metaLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--meta";

  const agentLine = document.createElement("span");
  agentLine.className = "app-landing-flow-skeleton-line app-landing-flow-skeleton-line--agent";

  body.append(titleLine, metaLine, agentLine);
  if (omitMedia) {
    card.append(body);
  } else {
    const media = document.createElement("span");
    media.className = "app-landing-flow-card-media app-landing-flow-skeleton-block";
    card.append(media, body);
  }
  return card;
}

export function renderAppLandingFlowLoading() {
  const h = requireHost();
  if (!h.appLandingFlowGridNode) return;
  if (h.getLandingAgentsView() !== "flow") return;

  setAppLandingFlowLoadingUi(true);
  h.appLandingFlowGridNode.replaceChildren();
  h.appLandingFlowGridNode.classList.add("app-landing-flow-grid--timeline");
  for (let i = 0; i < 6; i += 1) {
    h.appLandingFlowGridNode.appendChild(createAppLandingFlowTimelineSkeletonEntry(i));
  }
}

export function renderAppLandingFlow(focusItems) {
  const h = requireHost();
  if (!h.appLandingFlowGridNode) return;
  if (h.getLandingAgentsView() !== "flow") return;

  setAppLandingFlowLoadingUi(false);
  h.appLandingFlowGridNode?.classList.remove("is-loading");
  h.appLandingFlowNode?.classList.remove("is-loading");
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

  const rawItems = Array.isArray(focusItems) ? focusItems : [];
  const items = filterFlowItemsForDisplay(rawItems);

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "app-landing-flow-empty-wrap";

    const lead = document.createElement("p");
    lead.className = "app-landing-flow-empty";
    lead.textContent = rawItems.length
      ? "Нет недавних изменений в .md или .csv."
      : "Пока нет недавних обновлений.";

    const hint = document.createElement("p");
    hint.className = "app-landing-flow-empty-hint";
    hint.textContent = rawItems.length
      ? "В ленте только markdown и таблицы CSV — служебные config.yml, read.json и прочее скрыты."
      : `До ${FLOW_DISPLAY_LIMIT} последних правок в .md/.csv по всем агентам, сгруппированных по времени.`;

    empty.append(lead, hint);
    h.appLandingFlowGridNode.appendChild(empty);
    h.syncFocusPanelActiveState();
    return;
  }

  h.appLandingFlowGridNode.classList.add("app-landing-flow-grid--timeline");
  const dayGroups = groupFlowItemsByDay(items);

  for (const group of dayGroups) {
    const section = document.createElement("section");
    section.className = "app-landing-flow-day-group";

    const heading = document.createElement("h3");
    heading.className = "app-landing-flow-day-label";
    const headingText = document.createElement("span");
    headingText.className = "app-landing-flow-day-label-text";
    headingText.textContent = group.label;
    heading.appendChild(headingText);

    const list = document.createElement("div");
    list.className = "app-landing-flow-day-items";

    const timeSlots = groupFlowItemsByTimeSlot(group.items);
    timeSlots.forEach((slot, index) => {
      list.appendChild(
        createAppLandingFlowTimeSlotEntry(slot.items, {
          isLastInDay: index === timeSlots.length - 1
        })
      );
    });

    section.append(heading, list);
    h.appLandingFlowGridNode.appendChild(section);
  }

  h.syncFocusPanelActiveState();
}
