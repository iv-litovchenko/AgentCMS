/**
 * Minimal radial mind-map renderer for HTML examples.
 * Expects: { nodes: [{id, label, level, angle?, parent?}], links: [{source, target, type: 'tree'|'xref'}] }
 */
function renderMindmap(svg, data, options = {}) {
  const { centerX = 500, centerY = 400, branchRadius = 180, leafRadius = 90 } = options;

  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const children = new Map();
  for (const n of data.nodes) {
    if (!n.parent) continue;
    if (!children.has(n.parent)) children.set(n.parent, []);
    children.get(n.parent).push(n.id);
  }

  // Radial layout
  const center = data.nodes.find((n) => n.level === "center");
  if (center) {
    center.x = centerX;
    center.y = centerY;
  }

  const branches = data.nodes.filter((n) => (n.level === "branch" || n.level === "file") && n.x == null);
  const branchCount = branches.length || 1;
  branches.forEach((node, i) => {
    const angle = (i / branchCount) * Math.PI * 2 - Math.PI / 2;
    node.x = centerX + Math.cos(angle) * branchRadius;
    node.y = centerY + Math.sin(angle) * branchRadius;
    node._angle = angle;

    const kids = children.get(node.id) || [];
    kids.forEach((kidId, j) => {
      const kid = byId.get(kidId);
      if (!kid || kid.level !== "leaf") return;
      const spread = Math.min(Math.PI / 3, kids.length * 0.18);
      const offset = kids.length === 1 ? 0 : -spread / 2 + (j / (kids.length - 1)) * spread;
      const a = angle + offset;
      kid.x = node.x + Math.cos(a) * leafRadius;
      kid.y = node.y + Math.sin(a) * leafRadius;
    });
  });

  // Nested h2/h3 under file branches (mode 2)
  for (const branch of branches) {
    const subBranches = (children.get(branch.id) || [])
      .map((id) => byId.get(id))
      .filter((n) => n && n.level === "branch");
    subBranches.forEach((sub, si) => {
      const base = branch._angle ?? 0;
      const spread = Math.PI / 5;
      const a = base - spread / 2 + (si / Math.max(subBranches.length - 1, 1)) * spread;
      sub.x = branch.x + Math.cos(a) * 70;
      sub.y = branch.y + Math.sin(a) * 70;
      const leaves = (children.get(sub.id) || []).map((id) => byId.get(id)).filter(Boolean);
      leaves.forEach((leaf, li) => {
        const la = a - 0.25 + (li / Math.max(leaves.length - 1, 1)) * 0.5;
        leaf.x = sub.x + Math.cos(la) * 55;
        leaf.y = sub.y + Math.sin(la) * 55;
      });
    });
  }

  svg.innerHTML = "";

  const gLinks = el("g", { class: "links" });
  const gXref = el("g", { class: "xrefs" });
  const gXrefExt = el("g", { class: "xrefs-ext" });
  const gXrefTerm = el("g", { class: "xrefs-term" });
  const gNodes = el("g", { class: "nodes" });

  const XREF_GROUPS = {
    xref: gXref,
    "xref-ext": gXrefExt,
    "xref-term": gXrefTerm,
  };

  for (const link of data.links.filter((l) => l.type === "tree")) {
    const s = byId.get(link.source);
    const t = byId.get(link.target);
    if (s.x == null || t.x == null) continue;
    gLinks.appendChild(el("path", {
      class: "link-tree",
      d: curve(s.x, s.y, t.x, t.y, 0.15),
      "data-source": link.source,
      "data-target": link.target,
    }));
  }

  for (const link of data.links.filter((l) => l.type === "xref" || l.type === "xref-ext" || l.type === "xref-term")) {
    const s = byId.get(link.source);
    const t = byId.get(link.target);
    if (s.x == null || t.x == null) continue;
    const cls = link.type === "xref-ext" ? "link-xref-ext" : link.type === "xref-term" ? "link-xref-term" : "link-xref";
    const group = XREF_GROUPS[link.type] || gXref;
    group.appendChild(el("path", {
      class: cls,
      d: curve(s.x, s.y, t.x, t.y, 0.45),
      "data-source": link.source,
      "data-target": link.target,
      "data-label": link.label || "",
      "data-type": link.type,
    }));
  }

  for (const node of data.nodes) {
    if (node.x == null) continue;
    const g = el("g", {
      class: `node ${node.level}`,
      "data-id": node.id,
      transform: `translate(${node.x},${node.y})`,
    });
    const r = node.level === "center" ? 28
      : node.level === "leaf" ? 6
      : node.level === "file" ? 14
      : node.level === "external" ? 10
      : node.level === "term" ? 9
      : 12;
    g.appendChild(el("circle", { r }));
    const label = el("text", {
      x: r + 8,
      y: 4,
      "text-anchor": "start",
    });
    label.textContent = node.label;
    g.appendChild(label);
    gNodes.appendChild(g);
  }

  svg.append(gLinks, gXref, gXrefExt, gXrefTerm, gNodes);
  return { byId, svg, gNodes, gXref };
}

function bindPanZoom(wrap, viewport) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let sx = 0;
  let sy = 0;

  const apply = () => {
    viewport.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  };

  wrap.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const prev = scale;
    scale = Math.min(2.5, Math.max(0.4, scale * (e.deltaY < 0 ? 1.08 : 0.92)));
    tx = mx - (mx - tx) * (scale / prev);
    ty = my - (my - ty) * (scale / prev);
    apply();
  }, { passive: false });

  wrap.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".node")) return;
    dragging = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
    wrap.classList.add("is-dragging");
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    apply();
  });

  wrap.addEventListener("pointerup", () => {
    dragging = false;
    wrap.classList.remove("is-dragging");
  });

  return {
    reset() { scale = 1; tx = 0; ty = 0; apply(); },
    fit(offsetX = 0, offsetY = 0) { tx = offsetX; ty = offsetY; apply(); },
  };
}

function bindHighlight(svg) {
  const nodes = [...svg.querySelectorAll(".node")];
  const xrefs = [...svg.querySelectorAll(".link-xref, .link-xref-ext, .link-xref-term")];

  const clear = () => {
    nodes.forEach((n) => n.classList.remove("is-highlight", "is-dimmed"));
    xrefs.forEach((l) => l.classList.remove("is-highlight", "is-dimmed"));
  };

  nodes.forEach((node) => {
    node.style.cursor = "pointer";
    node.addEventListener("pointerenter", () => {
      const id = node.dataset.id;
      clear();
      node.classList.add("is-highlight");
      const related = new Set([id]);
      xrefs.forEach((link) => {
        const s = link.dataset.source;
        const t = link.dataset.target;
        if (s === id || t === id) {
          link.classList.add("is-highlight");
          related.add(s);
          related.add(t);
        } else {
          link.classList.add("is-dimmed");
        }
      });
      nodes.forEach((n) => {
        if (!related.has(n.dataset.id) && n !== node) n.classList.add("is-dimmed");
      });
    });
    node.addEventListener("pointerleave", clear);
  });
}

function el(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function curve(x1, y1, x2, y2, bend) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

window.Mindmap = { renderMindmap, bindPanZoom, bindHighlight };
