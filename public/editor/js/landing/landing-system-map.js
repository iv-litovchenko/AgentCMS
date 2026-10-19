/** Landing chunk: system map diagram (refactor 14). */
const APP_LANDING_SYSTEM_MAP_COLUMNS = [
  {
    id: "page",
    icon: "📁",
    title: "Дерево страниц",
    caption: "Для изучения и анализа данных",
    tone: "blue",
    nodes: [
      { type: "group", label: "Область", layout: "row", items: ["Общие", "Агент"] },
      "Тема",
      "Слот",
      "Раздел",
      "Запись",
      "Sidecar"
    ]
  },
  {
    id: "data",
    icon: "🗄️",
    title: "Структурированные данные",
    caption: "Для хранения структурированных данных",
    tone: "violet",
    nodes: [
      { label: "Инфоблок", side: ["Таксономии"] },
      { type: "row", items: ["Группа", "Коллекция", "Одиночка"] },
      "Раздел",
      "Запись"
    ]
  },
  {
    id: "memory",
    icon: "🧠",
    title: "Память и коммуникация",
    tone: "emerald",
    nodes: [
      "Facts",
      "Journal",
      { type: "group", label: "Коммуникация", items: ["Dialogs", "Discussion / Comments"] },
      "Inbox"
    ]
  },
  {
    id: "aux",
    icon: "⚙️",
    title: "Вспомогательное",
    tone: "amber",
    nodes: ["Settings", "Search / Index", "Repository", "NOTE.md / TODO.md"]
  }
];

function createAppLandingPlatformVisualBg() {
  const bg = document.createElement("div");
  bg.className = "app-landing-platform-visual-bg";

  const grid = document.createElement("div");
  grid.className = "app-landing-platform-grid";

  const glowLeft = document.createElement("span");
  glowLeft.className = "app-landing-platform-glow app-landing-platform-glow--left";

  const glowRight = document.createElement("span");
  glowRight.className = "app-landing-platform-glow app-landing-platform-glow--right";

  const scan = document.createElement("span");
  scan.className = "app-landing-platform-scan";

  bg.append(grid, glowLeft, glowRight, scan);
  return bg;
}

function createAppLandingSystemMapNode({ id, label, icon = "", variant = "leaf", tone = "blue", meta = "" }) {
  const node = document.createElement("div");
  node.className = `app-landing-system-map-node is-${variant} is-tone-${tone}`;
  node.dataset.nodeId = id;

  if (icon) {
    const iconNode = document.createElement("span");
    iconNode.className = "app-landing-system-map-node-icon";
    iconNode.setAttribute("aria-hidden", "true");
    iconNode.textContent = icon;
    node.appendChild(iconNode);
  }

  const labelNode = document.createElement("span");
  labelNode.className = "app-landing-system-map-node-label";
  labelNode.textContent = label;
  node.appendChild(labelNode);

  if (meta) {
    const metaNode = document.createElement("span");
    metaNode.className = "app-landing-system-map-node-meta";
    metaNode.textContent = meta;
    node.appendChild(metaNode);
  }

  return node;
}

function buildAppLandingSystemMapEdges() {
  const edges = [];
  for (const column of APP_LANDING_SYSTEM_MAP_COLUMNS) {
    const rootId = `${column.id}-root`;
    edges.push(["workspace", rootId]);

    let prevId = rootId;
    for (const entry of column.nodes || []) {
      if (entry && typeof entry === "object" && entry.type === "row") {
        const restNodes = column.nodes.slice(column.nodes.indexOf(entry) + 1);
        const nextLabel = restNodes.find((item) => typeof item === "string");
        const nextId = nextLabel ? `${column.id}-${nextLabel}` : `${column.id}-${entry.tail || "Запись"}`;
        edges.push([prevId, `${column.id}-row`]);
        for (const label of entry.items || []) {
          const rowNodeId = `${column.id}-${label}`;
          edges.push([`${column.id}-row`, rowNodeId]);
          edges.push([rowNodeId, nextId]);
        }
        prevId = nextId;
        continue;
      }

      if (entry && typeof entry === "object" && entry.type === "group") {
        const groupId = `${column.id}-${entry.label}`;
        if (groupId !== prevId) edges.push([prevId, groupId]);

        if (entry.layout === "row") {
          const rowId = `${column.id}-${entry.label}-row`;
          const restNodes = column.nodes.slice(column.nodes.indexOf(entry) + 1);
          const nextLabel = restNodes.find((item) => typeof item === "string");
          const nextId = nextLabel ? `${column.id}-${nextLabel}` : groupId;
          edges.push([groupId, rowId]);
          for (const itemLabel of entry.items || []) {
            const itemId = `${column.id}-${itemLabel}`;
            edges.push([rowId, itemId]);
            if (nextId !== itemId) edges.push([itemId, nextId]);
          }
          prevId = nextId;
        } else {
          for (const itemLabel of entry.items || []) {
            edges.push([groupId, `${column.id}-${itemLabel}`]);
          }
          prevId = groupId;
        }
        continue;
      }

      if (entry && typeof entry === "object" && entry.label && Array.isArray(entry.side)) {
        const nodeId = `${column.id}-${entry.label}`;
        if (nodeId !== prevId) edges.push([prevId, nodeId]);
        for (const sideLabel of entry.side) {
          edges.push([nodeId, `${column.id}-${sideLabel}`]);
        }
        prevId = nodeId;
        continue;
      }

      const nodeId = `${column.id}-${entry}`;
      if (nodeId !== prevId) edges.push([prevId, nodeId]);
      prevId = nodeId;
    }
  }
  return edges;
}

function getAppLandingSystemMapNodeAnchor(nodeEl, diagramEl, side = "center") {
  if (!nodeEl || !diagramEl) return null;
  const nodeRect = nodeEl.getBoundingClientRect();
  const diagramRect = diagramEl.getBoundingClientRect();
  let x = nodeRect.left + nodeRect.width / 2 - diagramRect.left;
  let y = nodeRect.top + nodeRect.height / 2 - diagramRect.top;
  if (side === "bottom") y = nodeRect.bottom - diagramRect.top;
  if (side === "top") y = nodeRect.top - diagramRect.top;
  if (side === "right") {
    x = nodeRect.right - diagramRect.left;
    y = nodeRect.top + nodeRect.height / 2 - diagramRect.top;
  }
  if (side === "left") {
    x = nodeRect.left - diagramRect.left;
    y = nodeRect.top + nodeRect.height / 2 - diagramRect.top;
  }
  return { x, y };
}

function drawAppLandingSystemMapEdge(svg, from, to, straight = false) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = straight
    ? `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
    : (() => {
        const midY = from.y + (to.y - from.y) * 0.45;
        return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${from.x.toFixed(1)} ${midY.toFixed(1)} L ${to.x.toFixed(1)} ${midY.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      })();
  path.setAttribute("d", d);
  path.setAttribute("class", "app-landing-system-map-link");
  svg.appendChild(path);
}

function syncAppLandingSystemMapLinks(diagramEl) {
  const svg = diagramEl?.querySelector(".app-landing-system-map-svg");
  if (!svg || !diagramEl) return;

  const width = diagramEl.clientWidth;
  const height = diagramEl.clientHeight;
  if (!width || !height) return;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.replaceChildren();

  const nodeById = new Map(
    [...diagramEl.querySelectorAll(".app-landing-system-map-node[data-node-id]")].map((node) => [
      node.dataset.nodeId,
      node
    ])
  );

  for (const rowEl of diagramEl.querySelectorAll(".app-landing-system-map-row[data-node-id]")) {
    nodeById.set(rowEl.dataset.nodeId, rowEl);
  }

  for (const [fromId, toId] of buildAppLandingSystemMapEdges()) {
    const fromNode = nodeById.get(fromId);
    const toNode = nodeById.get(toId);
    if (!fromNode || !toNode) continue;
    const isSideBranch = Boolean(toNode.closest(".app-landing-system-map-fork-side"));
    const from = getAppLandingSystemMapNodeAnchor(
      fromNode,
      diagramEl,
      isSideBranch ? "right" : "bottom"
    );
    const to = getAppLandingSystemMapNodeAnchor(
      toNode,
      diagramEl,
      isSideBranch ? "left" : "top"
    );
    if (!from || !to) continue;
    drawAppLandingSystemMapEdge(svg, from, to, isSideBranch);
  }
}

function mountAppLandingSystemMapLinks(diagramEl) {
  if (!diagramEl) return;
  const sync = () => syncAppLandingSystemMapLinks(diagramEl);
  requestAnimationFrame(() => requestAnimationFrame(sync));
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => sync());
    observer.observe(diagramEl);
    diagramEl._systemMapResizeObserver = observer;
  }
}

function createAppLandingSystemMapColumn(column) {
  const wrap = document.createElement("div");
  wrap.className = `app-landing-system-map-column is-tone-${column.tone}`;
  wrap.dataset.columnId = column.id;

  const chain = document.createElement("div");
  chain.className = "app-landing-system-map-chain";

  chain.appendChild(
    createAppLandingSystemMapNode({
      id: `${column.id}-root`,
      label: column.title,
      icon: column.icon,
      variant: "pillar",
      tone: column.tone,
      meta: column.caption || ""
    })
  );

  for (const entry of column.nodes || []) {
    if (entry && typeof entry === "object" && entry.type === "row") {
      const row = document.createElement("div");
      row.className = "app-landing-system-map-row";
      row.dataset.nodeId = `${column.id}-row`;
      for (const label of entry.items || []) {
        row.appendChild(
          createAppLandingSystemMapNode({
            id: `${column.id}-${label}`,
            label: String(label),
            variant: "leaf",
            tone: column.tone
          })
        );
      }
      chain.appendChild(row);
      continue;
    }

    if (entry && typeof entry === "object" && entry.type === "group") {
      const group = document.createElement("div");
      group.className = "app-landing-system-map-group";

      group.appendChild(
        createAppLandingSystemMapNode({
          id: `${column.id}-${entry.label}`,
          label: String(entry.label),
          variant: "leaf",
          tone: column.tone
        })
      );

      const children = document.createElement("div");
      children.className =
        entry.layout === "row" ? "app-landing-system-map-row" : "app-landing-system-map-stack";
      if (entry.layout === "row") {
        children.dataset.nodeId = `${column.id}-${entry.label}-row`;
      }
      for (const itemLabel of entry.items || []) {
        children.appendChild(
          createAppLandingSystemMapNode({
            id: `${column.id}-${itemLabel}`,
            label: String(itemLabel),
            variant: "leaf",
            tone: column.tone
          })
        );
      }
      group.appendChild(children);
      chain.appendChild(group);
      continue;
    }

    if (entry && typeof entry === "object" && entry.label && Array.isArray(entry.side)) {
      const fork = document.createElement("div");
      fork.className = "app-landing-system-map-fork";

      const main = document.createElement("div");
      main.className = "app-landing-system-map-fork-main";
      main.appendChild(
        createAppLandingSystemMapNode({
          id: `${column.id}-${entry.label}`,
          label: String(entry.label),
          variant: "leaf",
          tone: column.tone
        })
      );
      fork.appendChild(main);

      if (Array.isArray(entry.side) && entry.side.length) {
        const side = document.createElement("div");
        side.className = "app-landing-system-map-fork-side";
        for (const sideLabel of entry.side) {
          side.appendChild(
            createAppLandingSystemMapNode({
              id: `${column.id}-${sideLabel}`,
              label: String(sideLabel),
              variant: "leaf",
              tone: column.tone
            })
          );
        }
        fork.appendChild(side);
      }

      chain.appendChild(fork);
      continue;
    }

    chain.appendChild(
      createAppLandingSystemMapNode({
        id: `${column.id}-${entry}`,
        label: String(entry),
        variant: "leaf",
        tone: column.tone
      })
    );
  }

  wrap.appendChild(chain);
  return wrap;
}

export function createAppLandingSystemMapDiagram() {
  const map = document.createElement("div");
  map.className = "app-landing-system-map";

  const badge = document.createElement("div");
  badge.className = "app-landing-system-map-badge";
  badge.textContent = "Карта идей и элементов системы (workspace)";

  const diagram = document.createElement("div");
  diagram.className = "app-landing-system-map-diagram";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("app-landing-system-map-svg");
  svg.setAttribute("aria-hidden", "true");

  const root = document.createElement("div");
  root.className = "app-landing-system-map-root";
  root.appendChild(
    createAppLandingSystemMapNode({
      id: "workspace",
      label: "Workspace",
      icon: "🏠",
      variant: "hub",
      tone: "gold",
      meta: "agentId"
    })
  );

  const columns = document.createElement("div");
  columns.className = "app-landing-system-map-columns";
  for (const column of APP_LANDING_SYSTEM_MAP_COLUMNS) {
    columns.appendChild(createAppLandingSystemMapColumn(column));
  }

  diagram.append(svg, root, columns);

  const footer = document.createElement("div");
  footer.className = "app-landing-system-map-footer";
  const draftLink = document.createElement("a");
  draftLink.className = "app-landing-system-map-draft-btn";
  draftLink.href = "/editor/index2.html";
  draftLink.target = "_blank";
  draftLink.rel = "noopener noreferrer";
  draftLink.textContent = "Расширенная карта системы";
  footer.appendChild(draftLink);

  map.append(badge, diagram, footer);
  mountAppLandingSystemMapLinks(diagram);
  return map;
}
