/**
 * Workspace map/graph views (refactor 14) — lazy chunk.
 */
/** @type {Record<string, any> | null} */
let host = null;

let agentMapLinksResizeObserver = null;
let agentMap2LinksResizeObserver = null;
let agentMap2PanZoomCleanup = null;
let agentMap3RequestId = 0;

export function registerWorkspaceGraphHost(next) {
  host = next && typeof next === "object" ? next : null;
}

export async function renderWorkspaceGraphView(viewId) {
  if (!host) return { ok: false, reason: "host-not-registered" };
  if (viewId === "map") {
    renderAgentMapView();
    return { ok: true };
  }
  if (viewId === "map2") {
    renderAgentMap2View();
    return { ok: true };
  }
  if (viewId === "map3") {
    await renderAgentMap3View();
    return { ok: true };
  }
  if (viewId === "graph") {
    await renderAgentGraphView();
    return { ok: true };
  }
  return { ok: false, reason: "unknown-view" };
}

const AGENT_MAP_ZONE_SPECS = [
  { id: "core", title: "Core", icon: "⚙️", className: "agent-map-zone--core" },
  { id: "memory", title: "Memory", icon: "🧠", className: "agent-map-zone--memory" },
  { id: "projects", title: "Projects", icon: "📁", className: "agent-map-zone--projects" },
  { id: "registry", title: "Registry", icon: "🗂️", className: "agent-map-zone--registry" },
  { id: "nodes", title: "nodes", icon: "📄", className: "agent-map-zone--nodes" }
];

function buildAgentMapZoneData(menu) {
  const baseTree = menu ? { title: host.getAgentTreeTitle(), ...menu } : null;
  const rootPath = baseTree?.indexPath || null;

  const core = [];
  if (rootPath) {
    core.push({
      label: host.getLabelFromPath(rootPath),
      sub: host.AREA_MANIFEST_FILE,
      path: rootPath,
      action: "node"
    });
  }
  core.push({
    label: "AGENTS.md",
    sub: "системный файл",
    systemFile: "AGENTS.md",
    action: "system"
  });

  const memory = [
    {
      label: "Однофайловая",
      sub: `${host.getNamedStorageBundleRel(rootPath || host.AREA_MANIFEST_FILE, host.BUNDLE_CONTENT_FILE)}`,
      mode: "internal",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Многофайловая",
      sub: `${host.STORAGE_SUBFOLDER_CONTENT}/`,
      mode: "external",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Табличная",
      sub: `${host.getNamedStorageBundleRel(rootPath || host.AREA_MANIFEST_FILE, host.BUNDLE_TABULAR_FILE)}`,
      mode: "tabular",
      path: rootPath,
      action: "memory"
    }
  ];

  const projects = [];
  if (baseTree) {
    for (const child of host.getOrderedMenuChildren(baseTree).slice(0, 5)) {
      if (child.kind === "folder") {
        const path = child.entry.indexPath;
        if (!path) continue;
        projects.push({
          label: child.entry.title || host.getLabelFromPath(path),
          sub: host.getNodeDisplayPath(path),
          path,
          action: "node"
        });
      } else {
        projects.push({
          label: child.entry.label || host.getLabelFromPath(child.entry.path),
          sub: host.getNodeDisplayPath(child.entry.path),
          path: child.entry.path,
          action: "node"
        });
      }
    }
  }

  const registry = host.getSelectableAgents()
    .slice(0, 6)
    .map((agent) => ({
      label: agent.name || agent.id,
      sub: agent.path || agent.id,
      agentId: agent.id,
      action: "agent",
      active: agent.id === host.activeWorkspaceId
    }));

  const nodes = menu
    ? host.collectAgentMenuFlatEntries(menu, host.activeWorkspaceId, { includeHiddenSections: true })
        .filter((entry) => entry.path && entry.path !== rootPath)
        .slice(0, 6)
        .map((entry) => ({
          label: entry.label || host.getLabelFromPath(entry.path),
          sub: entry.displayPath || host.getNodeDisplayPath(entry.path),
          path: entry.path,
          action: "node"
        }))
    : [];

  return { core, memory, projects, registry, nodes, rootPath };
}

function handleAgentMapItemClick(item) {
  if (!item) return;
  if (item.action === "system" && item.systemFile) {
    void host.selectSystemFile(item.systemFile);
    return;
  }
  if (item.action === "agent" && item.agentId) {
    host.selectAgentOption(item.agentId);
    return;
  }
  if (item.action === "memory" && item.path && item.mode) {
    void host.openNodeMemoryWorkspace(host.getLabelFromPath(item.path), item.path).then(() => {
      host.setContentMode(item.mode);
    });
    return;
  }
  if (item.action === "node" && item.path) {
    void host.openNodeFromMenu(host.getLabelFromPath(item.path), item.path);
  }
}

function createAgentMapTile(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "agent-map-tile";
  if (item.active) btn.classList.add("is-active");

  const label = document.createElement("span");
  label.className = "agent-map-tile-label";
  label.textContent = item.label;

  const sub = document.createElement("span");
  sub.className = "agent-map-tile-sub";
  sub.textContent = item.sub;

  btn.append(label, sub);
  btn.addEventListener("click", () => handleAgentMapItemClick(item));
  return btn;
}

function createAgentMapZone(spec, items) {
  const zone = document.createElement("section");
  zone.className = `agent-map-zone ${spec.className}`;
  zone.dataset.zoneId = spec.id;

  const head = document.createElement("header");
  head.className = "agent-map-zone-head";
  head.innerHTML = `<span class="agent-map-zone-icon" aria-hidden="true">${spec.icon}</span><span class="agent-map-zone-title">${host.escapeHtml(spec.title)}</span>`;

  const body = document.createElement("div");
  body.className = "agent-map-zone-body";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "agent-map-zone-empty";
    empty.textContent = "Пусто";
    body.appendChild(empty);
  } else {
    for (const item of items) {
      body.appendChild(createAgentMapTile(item));
    }
  }

  zone.append(head, body);
  return zone;
}

function renderAgentMapHub() {
  if (!host.agentMapHubTitleNode || !host.agentMapHubSubNode || !host.agentMapHubAvatarNode) return;
  const agent = host.getActiveAgentMeta();
  host.agentMapHubTitleNode.textContent = agent?.name || host.getActiveAgentLabel() || "Agent";
  host.agentMapHubSubNode.textContent = host.activeWorkspaceId || "workspace";

  host.agentMapHubAvatarNode.innerHTML = "";
  if (agent?.previewUrl) {
    const img = document.createElement("img");
    img.src = agent.previewUrl;
    img.alt = "";
    host.agentMapHubAvatarNode.appendChild(img);
  } else {
    host.agentMapHubAvatarNode.textContent = "🤖";
  }
}

function renderAgentMapLinks() {
  if (!host.agentMapStageNode || !host.agentMapLinksNode || !host.agentMapHubNode || !host.agentMapZonesNode) return;

  const stageRect = host.agentMapStageNode.getBoundingClientRect();
  if (stageRect.width < 1 || stageRect.height < 1) return;

  host.agentMapLinksNode.setAttribute("width", String(stageRect.width));
  host.agentMapLinksNode.setAttribute("height", String(stageRect.height));
  host.agentMapLinksNode.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  host.agentMapLinksNode.innerHTML = "";

  const hubRect = host.agentMapHubNode.getBoundingClientRect();
  const hx = hubRect.left + hubRect.width / 2 - stageRect.left;
  const hy = hubRect.top + hubRect.height / 2 - stageRect.top;

  for (const zoneEl of host.agentMapZonesNode.querySelectorAll(".agent-map-zone")) {
    const zoneRect = zoneEl.getBoundingClientRect();
    const zx = zoneRect.left + zoneRect.width / 2 - stageRect.left;
    const zy = zoneRect.top + zoneRect.height / 2 - stageRect.top;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(hx));
    line.setAttribute("y1", String(hy));
    line.setAttribute("x2", String(zx));
    line.setAttribute("y2", String(zy));
    line.setAttribute("class", "agent-map-link");
    host.agentMapLinksNode.appendChild(line);
  }
}

function bindAgentMapLinksObserver() {
  if (!host.agentMapStageNode || typeof ResizeObserver === "undefined") return;
  if (agentMapLinksResizeObserver) {
    agentMapLinksResizeObserver.disconnect();
  }
  agentMapLinksResizeObserver = new ResizeObserver(() => {
    if (host.agentWorkspaceView !== "map" || !host.isAgentWorkspaceCanvasVisible()) return;
    renderAgentMapLinks();
  });
  agentMapLinksResizeObserver.observe(host.agentMapStageNode);
}

export function renderAgentMapView() {
  if (!host.agentMapZonesNode) return;

  const zoneData = buildAgentMapZoneData(host.currentMenuData);
  host.agentMapZonesNode.innerHTML = "";

  for (const spec of AGENT_MAP_ZONE_SPECS) {
    host.agentMapZonesNode.appendChild(createAgentMapZone(spec, zoneData[spec.id] || []));
  }

  renderAgentMapHub();
  bindAgentMapLinksObserver();
  requestAnimationFrame(() => {
    renderAgentMapLinks();
    requestAnimationFrame(renderAgentMapLinks);
  });
}

const AGENT_MAP2_NODE_WIDTH = 136;
const AGENT_MAP2_NODE_HEIGHT = 52;
const AGENT_MAP2_LEVEL_GAP = 92;
const AGENT_MAP2_SIBLING_GAP = 18;
const AGENT_MAP2_CANVAS_PADDING = 48;
const AGENT_MAP2_MAX_NODES = 140;

function buildAgentMap2Data(menu) {
  const nodes = [];
  const hardEdges = [];
  const softEdges = [];
  const rootId = "map2-root";
  const baseTree = menu ? { title: host.getAgentTreeTitle(), ...menu } : { title: host.getAgentTreeTitle(), sections: [], items: [] };

  nodes.push({
    id: rootId,
    label: host.getAgentTreeTitle(),
    type: "folder",
    kind: "root",
    path: baseTree.indexPath || null,
    sub: baseTree.indexPath ? host.getNodeDisplayPath(baseTree.indexPath) : "корень workspace",
    hasPreview: Boolean(baseTree.hasPreview),
    previewUrl: baseTree.previewUrl || null
  });

  function host.pushNode(node, parentId) {
    if (nodes.length >= AGENT_MAP2_MAX_NODES) return false;
    nodes.push(node);
    hardEdges.push({ from: parentId, to: node.id, kind: "hard" });
    return true;
  }

  function host.walkMenuNode(menuNode, parentId, depth, parentSectionPath) {
    if (nodes.length >= AGENT_MAP2_MAX_NODES || depth > 8) return;
    for (const child of host.getVisibleMenuChildren(menuNode, host.activeWorkspaceId, parentSectionPath, depth)) {
      if (nodes.length >= AGENT_MAP2_MAX_NODES) break;
      if (child.kind === "folder") {
        host.attachFolderNode(child.entry, parentId, depth, parentSectionPath);
      } else {
        host.attachItemNode(child.entry, parentId);
      }
    }
  }

  function host.attachFolderNode(section, parentId, depth, parentSectionPath) {
    const folderPath = host.resolveSectionFolderPath(section, parentSectionPath, depth);
    const hasManifest = Boolean(section.indexPath);
    const id = hasManifest
      ? `map2:${host.normalizeMenuNodePath(section.indexPath)}`
      : `map2-group:${host.normalizeMenuNodePath(folderPath)}`;
    if (nodes.some((entry) => entry.id === id)) return;

    const label = section.title || (hasManifest ? host.getLabelFromPath(section.indexPath) : folderPath);
    const added = host.pushNode(
      {
        id,
        label,
        type: hasManifest ? "folder" : "group",
        kind: hasManifest ? "folder" : "group",
        path: section.indexPath || null,
        sub: hasManifest ? host.getNodeDisplayPath(section.indexPath) : "группа папок",
        hasPreview: Boolean(section.hasPreview),
        previewUrl: section.previewUrl || null
      },
      parentId
    );
    if (!added) return;
    host.walkMenuNode(section, id, depth + 1, folderPath);
  }

  function host.attachItemNode(item, parentId) {
    const id = `map2:${host.normalizeMenuNodePath(item.path)}`;
    if (nodes.some((entry) => entry.id === id)) return;
    host.pushNode(
      {
        id,
        label: item.label || host.getLabelFromPath(item.path),
        type: "file",
        kind: "file",
        path: item.path,
        sub: host.getNodeDisplayPath(item.path),
        hasPreview: Boolean(item.hasPreview),
        previewUrl: item.previewUrl || null
      },
      parentId
    );
  }

  host.walkMenuNode(baseTree, rootId, 0, "");

  if (menu?.serviceTree && host.shouldShowServiceSectionInMenu(host.activeWorkspaceId)) {
    host.attachFolderNode(
      { ...menu.serviceTree, title: menu.serviceTree.title || SERVICE_SECTION_TITLE },
      rootId,
      0,
      ""
    );
  }
  if (menu?.containerTree && host.shouldShowContainerSectionInMenu(host.activeWorkspaceId)) {
    host.attachFolderNode(
      { ...menu.containerTree, title: menu.containerTree.title || CONTAINER_SECTION_LABEL },
      rootId,
      0,
      ""
    );
  }

  return { nodes, hardEdges, softEdges, truncated: nodes.length >= AGENT_MAP2_MAX_NODES };
}

function buildAgentMap2ChildMap(hardEdges) {
  const children = new Map();
  for (const edge of hardEdges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  return children;
}

function measureAgentMap2SubtreeWidth(nodeId, childrenById, memo = new Map()) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  const children = childrenById.get(nodeId) || [];
  if (!children.length) {
    memo.set(nodeId, AGENT_MAP2_NODE_WIDTH);
    return AGENT_MAP2_NODE_WIDTH;
  }
  const width = children.reduce(
    (sum, childId, index) =>
      sum + measureAgentMap2SubtreeWidth(childId, childrenById, memo) + (index > 0 ? AGENT_MAP2_SIBLING_GAP : 0),
    0
  );
  memo.set(nodeId, width);
  return width;
}

function layoutAgentMap2Nodes(nodes, hardEdges) {
  const nodeById = new Map(nodes.map((node) => [node.id, { ...node }]));
  const childrenById = buildAgentMap2ChildMap(hardEdges);
  const rootId = "map2-root";
  let maxDepth = 0;

  function host.placeNode(nodeId, left, depth) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const subtreeWidth = measureAgentMap2SubtreeWidth(nodeId, childrenById);
    node.x = left + subtreeWidth / 2;
    node.y = AGENT_MAP2_CANVAS_PADDING + depth * AGENT_MAP2_LEVEL_GAP;
    maxDepth = Math.max(maxDepth, depth);

    const children = childrenById.get(nodeId) || [];
    let cursor = left;
    for (const childId of children) {
      const childWidth = measureAgentMap2SubtreeWidth(childId, childrenById);
      host.placeNode(childId, cursor, depth + 1);
      cursor += childWidth + AGENT_MAP2_SIBLING_GAP;
    }
  }

  const totalWidth = measureAgentMap2SubtreeWidth(rootId, childrenById);
  host.placeNode(rootId, AGENT_MAP2_CANVAS_PADDING, 0);

  const canvasWidth = Math.max(totalWidth + AGENT_MAP2_CANVAS_PADDING * 2, 640);
  const canvasHeight = Math.max(
    AGENT_MAP2_CANVAS_PADDING * 2 + maxDepth * AGENT_MAP2_LEVEL_GAP + AGENT_MAP2_NODE_HEIGHT + 24,
    420
  );

  return {
    nodes: Array.from(nodeById.values()),
    canvasWidth,
    canvasHeight
  };
}

function createAgentMap2NodeButton(node) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.nodeId = node.id;
  btn.className = `agent-map2-node agent-map2-node--${node.kind || node.type}`;
  btn.style.left = `${node.x - AGENT_MAP2_NODE_WIDTH / 2}px`;
  btn.style.top = `${node.y - AGENT_MAP2_NODE_HEIGHT / 2}px`;

  if (node.hasPreview && node.previewUrl) {
    const preview = document.createElement("img");
    preview.className = "agent-map2-node-preview";
    preview.alt = "";
    preview.src = host.appendCacheBuster(host.appendAgentToApiUrl(node.previewUrl));
    btn.appendChild(preview);
  }

  const kind = document.createElement("span");
  kind.className = "agent-map2-node-kind";
  kind.textContent =
    node.kind === "root"
      ? "Агент"
      : node.kind === "folder"
        ? "Папка"
        : node.kind === "group"
          ? "Группа"
          : "Тема";

  const label = document.createElement("span");
  label.className = "agent-map2-node-label";
  label.textContent = node.label;

  const sub = document.createElement("span");
  sub.className = "agent-map2-node-sub";
  sub.textContent = node.sub || "";

  btn.append(kind, label, sub);

  if (node.path) {
    btn.addEventListener("click", () => {
      void host.openNodeFromMenu(host.getLabelFromPath(node.path), node.path);
    });
  } else {
    btn.disabled = true;
  }

  return btn;
}

function renderAgentMap2Links(layoutNodes, hardEdges, softEdges) {
  if (!host.agentMap2CanvasNode || !host.agentMap2LinksNode) return;

  const canvasRect = host.agentMap2CanvasNode.getBoundingClientRect();
  if (canvasRect.width < 1 || canvasRect.height < 1) return;

  host.agentMap2LinksNode.setAttribute("width", String(canvasRect.width));
  host.agentMap2LinksNode.setAttribute("height", String(canvasRect.height));
  host.agentMap2LinksNode.setAttribute("viewBox", `0 0 ${canvasRect.width} ${canvasRect.height}`);
  host.agentMap2LinksNode.innerHTML = "";

  const nodeElements = new Map(
    Array.from(host.agentMap2NodesNode?.querySelectorAll(".agent-map2-node") || []).map((el) => [
      el.dataset.nodeId,
      el
    ])
  );

  const getAnchor = (nodeId, side) => {
    const el = nodeElements.get(nodeId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - canvasRect.left;
    const y = side === "bottom" ? rect.bottom - canvasRect.top : rect.top - canvasRect.top;
    return { x, y };
  };

  const drawHardLink = (edge) => {
    const from = getAnchor(edge.from, "bottom");
    const to = getAnchor(edge.to, "top");
    if (!from || !to) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midY = (from.y + to.y) / 2;
    path.setAttribute(
      "d",
      `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
    );
    path.setAttribute("class", "agent-map2-link--hard");
    host.agentMap2LinksNode.appendChild(path);
  };

  const drawSoftLink = (edge) => {
    const from = getAnchor(edge.from, "bottom");
    const to = getAnchor(edge.to, "top");
    if (!from || !to) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const lift = Math.min(from.y, to.y) - 36;
    path.setAttribute(
      "d",
      `M ${from.x} ${from.y} C ${from.x} ${lift}, ${to.x} ${lift}, ${to.x} ${to.y}`
    );
    path.setAttribute("class", "agent-map2-link--soft");
    host.agentMap2LinksNode.appendChild(path);
  };

  for (const edge of hardEdges) drawHardLink(edge);
  for (const edge of softEdges) drawSoftLink(edge);
}

function renderAgentMap2Stats(data) {
  if (!host.agentMap2StatsNode) return;
  host.agentMap2StatsNode.innerHTML = "";

  const hardStat = document.createElement("span");
  hardStat.className = "agent-workspace-stat";
  hardStat.innerHTML = `<strong>${data.hardEdges.length}</strong> жёстких`;

  const softStat = document.createElement("span");
  softStat.className = "agent-workspace-stat agent-workspace-stat--soft";
  softStat.innerHTML = `<strong>${data.softEdges.length}</strong> мягких`;

  const nodeStat = document.createElement("span");
  nodeStat.className = "agent-workspace-stat";
  nodeStat.innerHTML = `<strong>${data.nodes.length}</strong> тем`;

  host.agentMap2StatsNode.append(hardStat, softStat, nodeStat);

  if (data.truncated) {
    const truncated = document.createElement("span");
    truncated.className = "agent-workspace-stat";
    truncated.innerHTML = `<strong>${AGENT_MAP2_MAX_NODES}</strong> макс.`;
    host.agentMap2StatsNode.appendChild(truncated);
  }
}

function destroyAgentMap2PanZoom() {
  if (agentMap2PanZoomCleanup) {
    agentMap2PanZoomCleanup();
    agentMap2PanZoomCleanup = null;
  }
}

function attachAgentMap2PanZoom(layoutWidth, layoutHeight, onTransform = () => {}) {
  destroyAgentMap2PanZoom();

  const viewport = host.agentMap2ViewportNode;
  const canvas = host.agentMap2CanvasNode;
  if (!viewport || !canvas) return;

  const state = {
    scale: 1,
    tx: 0,
    ty: 0,
    panning: false,
    panStartX: 0,
    panStartY: 0,
    panOriginTx: 0,
    panOriginTy: 0
  };

  const applyTransform = () => {
    canvas.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
    onTransform();
  };

  const fitToView = () => {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height || !layoutWidth || !layoutHeight) return;
    const padding = 40;
    const scaleX = (rect.width - padding * 2) / layoutWidth;
    const scaleY = (rect.height - padding * 2) / layoutHeight;
    state.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.15), 2.5);
    state.tx = (rect.width - layoutWidth * state.scale) / 2;
    state.ty = Math.max(24, (rect.height - layoutHeight * state.scale) / 2);
    applyTransform();
  };

  const onWheel = (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = Math.min(2.5, Math.max(0.15, state.scale * factor));
    state.tx = mx - ((mx - state.tx) * nextScale) / state.scale;
    state.ty = my - ((my - state.ty) * nextScale) / state.scale;
    state.scale = nextScale;
    applyTransform();
  };

  const onMouseMove = (event) => {
    if (!state.panning) return;
    state.tx = state.panOriginTx + (event.clientX - state.panStartX);
    state.ty = state.panOriginTy + (event.clientY - state.panStartY);
    applyTransform();
  };

  const onMouseUp = () => {
    if (!state.panning) return;
    state.panning = false;
    viewport.classList.remove("is-panning");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const onMouseDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".agent-map2-node")) return;
    state.panning = true;
    state.panStartX = event.clientX;
    state.panStartY = event.clientY;
    state.panOriginTx = state.tx;
    state.panOriginTy = state.ty;
    viewport.classList.add("is-panning");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    event.preventDefault();
  };

  const onDblClick = (event) => {
    if (event.target.closest(".agent-map2-node")) return;
    fitToView();
  };

  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("mousedown", onMouseDown);
  viewport.addEventListener("dblclick", onDblClick);

  const getViewportContext = () => ({
    wrap: viewport,
    svg: viewport,
    state,
    fitToView,
    applyTransform
  });

  const detachControls = host.attachGraphControlHandlers(host.agentMap2ControlsNode, getViewportContext);

  agentMap2PanZoomCleanup = () => {
    viewport.removeEventListener("wheel", onWheel);
    viewport.removeEventListener("mousedown", onMouseDown);
    viewport.removeEventListener("dblclick", onDblClick);
    onMouseUp();
    detachControls();
    canvas.style.transform = "";
  };

  fitToView();
}

function bindAgentMap2LinksObserver(onRefresh) {
  if (!host.agentMap2ViewportNode || typeof ResizeObserver === "undefined") return;
  if (agentMap2LinksResizeObserver) {
    agentMap2LinksResizeObserver.disconnect();
  }
  agentMap2LinksResizeObserver = new ResizeObserver(() => {
    if (host.agentWorkspaceView !== "map2" || !host.isAgentWorkspaceCanvasVisible()) return;
    onRefresh();
  });
  agentMap2LinksResizeObserver.observe(host.agentMap2ViewportNode);
  agentMap2LinksResizeObserver.observe(host.agentMap2CanvasNode);
}

function countAgentMap3SlotLayers(slot) {
  if (!slot?.layers) return 0;
  return AGENT_MAP3_LAYER_KEYS.reduce((sum, spec) => sum + (slot.layers[spec.key]?.exists ? 1 : 0), 0);
}

function createAgentMap3LayerDots(slot) {
  const wrap = document.createElement("div");
  wrap.className = "agent-map3-layer-dots";
  wrap.setAttribute("aria-label", `Слои ${host.STORAGE_FOLDER_NAME}`);

  for (const spec of AGENT_MAP3_LAYER_KEYS) {
    const dot = document.createElement("span");
    dot.className = "agent-map3-layer-dot";
    dot.title = spec.label;
    if (slot.layers?.[spec.key]?.exists) dot.classList.add("is-on");
    wrap.appendChild(dot);
  }

  return wrap;
}

function createAgentMap3SlotNode(slot) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `agent-map3-slot${slot.kind === "area" ? " is-area" : " is-topic"}${slot.exists ? "" : " is-empty"}`;
  btn.dataset.manifestPath = slot.manifestPath || "";

  const kind = document.createElement("span");
  kind.className = "agent-map3-slot-kind";
  kind.textContent = slot.kind === "area" ? "Область" : "Тема";

  const title = document.createElement("span");
  title.className = "agent-map3-slot-title";
  title.textContent = slot.label || slot.slotKey;

  const path = document.createElement("span");
  path.className = "agent-map3-slot-path";
  path.textContent = slot.slotKey === "_" ? "_/" : `${slot.slotKey}/`;

  const meta = document.createElement("span");
  meta.className = "agent-map3-slot-meta";
  const layerCount = countAgentMap3SlotLayers(slot);
  meta.textContent = slot.exists ? `${layerCount}/${AGENT_MAP3_LAYER_KEYS.length} слоёв` : "слот не создан";

  btn.append(kind, title, path, createAgentMap3LayerDots(slot), meta);
  btn.addEventListener("click", () => {
    if (slot.manifestPath) host.openNodeFromMenu(slot.label || slot.slotKey, slot.manifestPath);
  });
  return btn;
}

function createAgentMap3ContainerLane(containerData) {
  const lane = document.createElement("section");
  lane.className = "agent-map3-lane";

  const head = document.createElement("header");
  head.className = "agent-map3-lane-head";
  const title = document.createElement("h3");
  title.className = "agent-map3-lane-title";
  title.textContent = containerData.containerDir || host.getActiveAgentLabel() || "Корень workspace";
  const storagePath = document.createElement("span");
  storagePath.className = "agent-map3-lane-storage";
  storagePath.textContent = containerData.storageRoot;
  head.append(title, storagePath);
  lane.appendChild(head);

  if (containerData.rootHasContent) {
    const warn = document.createElement("p");
    warn.className = "agent-map3-lane-warn";
    warn.textContent = `В корне ${host.STORAGE_FOLDER_NAME} есть файлы вне слотов — см. вид «Хранилище».`;
    lane.appendChild(warn);
  }

  const track = document.createElement("div");
  track.className = "agent-map3-track";

  const areaSlot = (containerData.slots || []).find((slot) => slot.kind === "area");
  const topicSlots = (containerData.slots || []).filter((slot) => slot.kind === "topic");

  if (areaSlot) {
    const hub = document.createElement("div");
    hub.className = "agent-map3-hub";
    hub.appendChild(createAgentMap3SlotNode(areaSlot));
    track.appendChild(hub);
  }

  if (topicSlots.length) {
    const topics = document.createElement("div");
    topics.className = "agent-map3-topics";
    topics.setAttribute("role", "list");
    for (const slot of topicSlots) {
      const item = document.createElement("div");
      item.className = "agent-map3-topic-wrap";
      item.setAttribute("role", "listitem");
      item.appendChild(createAgentMap3SlotNode(slot));
      topics.appendChild(item);
    }
    track.appendChild(topics);
  } else if (!areaSlot) {
    const empty = document.createElement("p");
    empty.className = "agent-map3-lane-empty";
    empty.textContent = "Нет манифестов в этом контейнере";
    track.appendChild(empty);
  }

  if (areaSlot && topicSlots.length) {
    track.classList.add("has-topics");
  }

  lane.appendChild(track);

  if (containerData.orphanSlots?.length) {
    const orphans = document.createElement("div");
    orphans.className = "agent-map3-orphans";
    orphans.innerHTML =
      "Слоты без манифеста: " +
      containerData.orphanSlots.map((name) => `<code>${host.escapeHtml(name)}</code>`).join(" · ");
    lane.appendChild(orphans);
  }

  return lane;
}

function renderAgentMap3Stats(layout) {
  if (!host.agentMap3StatsNode) return;
  const slotCount = (layout.containers || []).reduce((sum, c) => sum + (c.slots?.length || 0), 0);
  const filledSlots = (layout.containers || []).reduce(
    (sum, c) => sum + (c.slots || []).filter((s) => s.exists && countAgentMap3SlotLayers(s) > 0).length,
    0
  );

  host.agentMap3StatsNode.innerHTML = `
    <span class="agent-workspace-stat"><strong>${layout.containers?.length || 0}</strong> контейнеров</span>
    <span class="agent-workspace-stat"><strong>${slotCount}</strong> слотов</span>
    <span class="agent-workspace-stat agent-workspace-stat--ok"><strong>${filledSlots}</strong> с данными</span>
  `;
}

export async function renderAgentMap3View() {
  if (!host.agentMap3BoardNode) return;

  const requestId = ++agentMap3RequestId;
  host.agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">Загрузка карты ${host.STORAGE_FOLDER_NAME}…</div>`;
  if (host.agentMap3StatsNode) host.agentMap3StatsNode.innerHTML = "";

  try {
    const layout = await host.fetchAgentStorageLayout();
    if (requestId !== agentMap3RequestId) return;

    host.agentMap3BoardNode.innerHTML = "";
    renderAgentMap3Stats(layout);

    if (!layout.containers?.length) {
      host.agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">В workspace пока нет манифестов для карты ${host.STORAGE_FOLDER_NAME}</div>`;
      return;
    }

    for (const container of layout.containers) {
      host.agentMap3BoardNode.appendChild(createAgentMap3ContainerLane(container));
    }
  } catch {
    if (requestId !== agentMap3RequestId) return;
    host.agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">Не удалось построить карту. Запустите сервер и обновите страницу.</div>`;
    if (host.agentMap3StatsNode) host.agentMap3StatsNode.innerHTML = "";
  }
}

export function renderAgentMap2View() {
  if (!host.agentMap2CanvasNode || !host.agentMap2NodesNode) return;

  if (!host.currentMenuData) {
    destroyAgentMap2PanZoom();
    host.agentMap2CanvasNode.style.width = "";
    host.agentMap2CanvasNode.style.height = "";
    host.agentMap2NodesNode.innerHTML = `<div class="agent-map2-empty">Дерево агента ещё не загружено</div>`;
    if (host.agentMap2LinksNode) host.agentMap2LinksNode.innerHTML = "";
    if (host.agentMap2StatsNode) host.agentMap2StatsNode.innerHTML = "";
    return;
  }

  const mapData = buildAgentMap2Data(host.currentMenuData);
  if (mapData.nodes.length <= 1) {
    destroyAgentMap2PanZoom();
    host.agentMap2CanvasNode.style.width = "";
    host.agentMap2CanvasNode.style.height = "";
    host.agentMap2NodesNode.innerHTML = `<div class="agent-map2-empty">В workspace пока нет тем для схемы</div>`;
    if (host.agentMap2LinksNode) host.agentMap2LinksNode.innerHTML = "";
    renderAgentMap2Stats(mapData);
    return;
  }

  const layout = layoutAgentMap2Nodes(mapData.nodes, mapData.hardEdges);
  host.agentMap2CanvasNode.style.width = `${layout.canvasWidth}px`;
  host.agentMap2CanvasNode.style.height = `${layout.canvasHeight}px`;
  host.agentMap2NodesNode.innerHTML = "";

  for (const node of layout.nodes) {
    host.agentMap2NodesNode.appendChild(createAgentMap2NodeButton(node));
  }

  renderAgentMap2Stats(mapData);

  const refreshLinks = () => {
    renderAgentMap2Links(layout.nodes, mapData.hardEdges, mapData.softEdges);
  };

  bindAgentMap2LinksObserver(refreshLinks);
  attachAgentMap2PanZoom(layout.canvasWidth, layout.canvasHeight, refreshLinks);
  requestAnimationFrame(() => {
    refreshLinks();
    requestAnimationFrame(refreshLinks);
  });
}
export async function renderAgentGraphView() {
  if (!host.agentGraphContentNode) return;
  host.agentGraphContentNode.innerHTML = "";
  host.applyAgentGraphSettingsUi();

  if (!host.currentMenuData) {
    host.renderListEmptyMessage(host.agentGraphContentNode, "Дерево агента ещё не загружено");
    return;
  }

  host.renderListEmptyMessage(host.agentGraphContentNode, "Загрузка графа…");

  const [repositoriesPayload, awnDataPayload, mediaLibrariesPayload, channelsPayload, pageIndexPayload] =
    await Promise.all([
      host.loadAgentGraphRepositoriesPayload(),
      host.loadAgentGraphAwnDataPayload(),
      host.loadAgentGraphMediaLibrariesPayload(),
      host.loadAgentGraphChannelsPayload(),
      host.fetchAgentWorkspacePageIndexPayload()
    ]);

  const graph = host.buildGraphDataFromAgentMenu(host.currentMenuData, {
    repositoriesPayload,
    awnDataPayload,
    mediaLibrariesPayload,
    channelsPayload,
    pageIndexPayload
  });
  if (graph.nodes.length <= 1) {
    host.renderListEmptyMessage(host.agentGraphContentNode, "В workspace пока нет тем для графа");
    return;
  }

  host.agentGraphContentNode.innerHTML = "";
  const showPreviews = host.getAgentGraphSettings().showPreviews;
  const render = () => {
    host.renderGraphCanvas(host.agentGraphContentNode, graph, {
      ariaLabel: "Граф workspace агента",
      fullViewport: true,
      showPreviews,
      controlsHost: host.agentGraphControlsNode,
      isNodeClickable: (node) => Boolean(node.nodePath || node.graphTarget),
      onNodeClick: (node) => {
        host.handleAgentGraphNodeClick(node);
      }
    });
  };
  requestAnimationFrame(render);
}