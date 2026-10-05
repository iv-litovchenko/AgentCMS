(function () {
  function bootFail(msg) {
    const el = document.getElementById("boot-error");
    el.textContent = msg;
    el.classList.add("is-visible");
  }

  if (!window.RoadmapRenderer || !window.Mindmap) {
    bootFail(
      "Не загрузились roadmap/mindmap.js. Запустите: /examples/agent-cms-core-three-views.html (через Agent CMS)"
    );
    return;
  }

  let D;
  try {
    const raw = document
      .getElementById("cms-views-data")
      .textContent.replace(/<!-- __CMS_DATA__ -->/g, "")
      .trim();
    D = JSON.parse(raw);
  } catch (e) {
    bootFail("Ошибка данных JSON: " + e.message);
    return;
  }

  document.getElementById("gen-at").textContent = D.generatedAt || "вручную";
  document.getElementById("roadmap-src").textContent = D.roadmap?.source || "—";
  document.getElementById("mindmap-src").textContent = D.mindmap?.source || "—";
  document.getElementById("graph-src").textContent = D.graph?.source || "—";

  const detailBar = document.getElementById("detail-bar");
  const setDetail = (title, text) => {
    detailBar.hidden = !title;
    document.getElementById("detail-title").textContent = title || "";
    document.getElementById("detail-text").textContent = text || "";
  };

  const panZooms = {};
  const graphState = { nodes: [], edges: [], selected: null };

  initRoadmap(D.roadmap);
  initMindmap(D.mindmap);
  initGraph(D.graph);
  initTabs();
  initLayoutMode();
  bindToolbars();

  function initTabs() {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (document.body.classList.contains("mode-split")) return;
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("is-active"));
        document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.getElementById("panel-" + btn.dataset.panel).classList.add("is-active");
      });
    });
  }

  function initLayoutMode() {
    document.querySelectorAll("[data-layout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-layout]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const split = btn.dataset.layout === "split";
        document.body.classList.toggle("mode-split", split);
        document.querySelector(".tabs")?.classList.toggle("is-hidden", split);
        if (split) {
          document.querySelectorAll(".panel").forEach((p) => p.classList.add("is-active"));
        } else {
          const active = document.querySelector(".tab.is-active")?.dataset.panel || "roadmap";
          document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
          document.getElementById("panel-" + active).classList.add("is-active");
        }
      });
    });
  }

  function bindToolbars() {
    document.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const pz = panZooms[target];
        if (!pz) return;
        const action = btn.dataset.zoom;
        if (action === "in") pz.zoomBy(1.15);
        else if (action === "out") pz.zoomBy(1 / 1.15);
        else if (action === "reset") pz.reset();
        else if (action === "fit") pz.fit();
      });
    });

    document.getElementById("filter-roadmap")?.addEventListener("change", (e) => {
      const v = e.target.value;
      document.querySelectorAll("#roadmap .stage").forEach((el) => {
        const st = el.dataset.status;
        el.classList.toggle("is-filtered-out", v !== "all" && st !== v);
      });
    });

    document.getElementById("toggle-mm-xref")?.addEventListener("click", (e) => {
      const on = e.target.classList.toggle("is-active");
      document.querySelectorAll("#mindmap .link-xref, #mindmap .link-xref-ext, #mindmap .link-xref-term").forEach((l) => {
        l.style.display = on ? "" : "none";
      });
    });

    document.getElementById("graph-filter")?.addEventListener("change", (e) => {
      renderGraph(D.graph, e.target.value);
    });
  }

  function createPanZoom(wrap, inner, options = {}) {
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let sx = 0;
    let sy = 0;
    const min = options.minScale ?? 0.35;
    const max = options.maxScale ?? 2.5;

    const apply = () => {
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    wrap.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = wrap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const prev = scale;
        scale = Math.min(max, Math.max(min, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
        tx = mx - (mx - tx) * (scale / prev);
        ty = my - (my - ty) * (scale / prev);
        apply();
      },
      { passive: false }
    );

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".stage, .node, .g-node")) return;
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

    const api = {
      zoomBy(f) {
        const rect = wrap.getBoundingClientRect();
        const mx = rect.width / 2;
        const my = rect.height / 2;
        const prev = scale;
        scale = Math.min(max, Math.max(min, scale * f));
        tx = mx - (mx - tx) * (scale / prev);
        ty = my - (my - ty) * (scale / prev);
        apply();
      },
      reset() {
        scale = 1;
        tx = 0;
        ty = 0;
        apply();
      },
      fit() {
        scale = 1;
        tx = 20;
        ty = 10;
        apply();
      },
    };
    apply();
    return api;
  }

  function createSvgPanZoom(wrap, svg) {
    const vb0 = svg.viewBox.baseVal;
    let vb = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let vbx = 0;
    let vby = 0;

    const apply = () => {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    };

    wrap.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
        const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;
        const f = e.deltaY < 0 ? 0.9 : 1.1;
        const nw = vb.w * f;
        const nh = vb.h * f;
        vb.x = mx - (mx - vb.x) * (nw / vb.w);
        vb.y = my - (my - vb.y) * (nh / vb.h);
        vb.w = nw;
        vb.h = nh;
        apply();
      },
      { passive: false }
    );

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".g-node")) return;
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      vbx = vb.x;
      vby = vb.y;
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add("is-dragging");
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - sx) / rect.width) * vb.w;
      const dy = ((e.clientY - sy) / rect.height) * vb.h;
      vb.x = vbx - dx;
      vb.y = vby - dy;
      apply();
    });
    wrap.addEventListener("pointerup", () => {
      dragging = false;
      wrap.classList.remove("is-dragging");
    });

    return {
      zoomBy(f) {
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        vb.w *= f;
        vb.h *= f;
        vb.x = cx - vb.w / 2;
        vb.y = cy - vb.h / 2;
        apply();
      },
      reset() {
        vb = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
        apply();
      },
      fit() {
        vb = { x: vb0.x - 20, y: vb0.y - 20, w: vb0.width + 40, h: vb0.height + 40 };
        apply();
      },
    };
  }

  function initRoadmap(roadmap) {
    const { renderRoadmap } = window.RoadmapRenderer;
    const container = document.getElementById("roadmap");
    renderRoadmap(roadmap, container);
    const title = document.createElement("p");
    title.className = "roadmap-title";
    title.textContent = roadmap.title;
    document.querySelector("#panel-roadmap .canvas-inner").prepend(title);

    container.querySelectorAll(".stage").forEach((el) => {
      el.addEventListener("click", () => {
        container.querySelectorAll(".stage").forEach((s) => s.classList.remove("is-selected"));
        el.classList.add("is-selected");
        const h = el.querySelector("h3")?.textContent || "";
        const d = el.querySelector(".stage-desc")?.textContent || "";
        setDetail(h, d);
      });
    });

    panZooms.roadmap = createPanZoom(
      document.getElementById("rm-wrap"),
      document.getElementById("rm-viewport")
    );
  }

  function initMindmap(data) {
    const svg = document.getElementById("mindmap");
    const { renderMindmap, bindPanZoom, bindHighlight } = window.Mindmap;
    renderMindmap(svg, data, { centerX: 520, centerY: 280, branchRadius: 220, leafRadius: 78 });
    bindHighlight(svg);
    panZooms.mindmap = bindPanZoom(document.getElementById("mm-wrap"), document.getElementById("mm-viewport"));

    svg.querySelectorAll(".node").forEach((node) => {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = node.dataset.id;
        const n = data.nodes.find((x) => x.id === id);
        setDetail(n?.label || id, "Узел mind map · id: " + id);
      });
    });
  }

  function initGraph(g) {
    renderGraph(g, "all");
    panZooms.graph = createSvgPanZoom(document.getElementById("graph-wrap"), document.getElementById("graph"));
  }

  function layoutForce(nodes, edges, W, H, iterations = 80) {
    const pos = new Map();
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      const r = n.group === "workspace" ? 0 : 140 + (groupsRank(n.group) || 2) * 35;
      pos.set(n.id, {
        x: W / 2 + Math.cos(a) * r,
        y: H / 2 + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        ...n,
      });
    });
    const center = pos.get("ws");
    if (center) {
      center.x = W / 2;
      center.y = H / 2;
    }

    for (let iter = 0; iter < iterations; iter++) {
      for (const [, a] of pos) {
        for (const [, b] of pos) {
          if (a.id === b.id) continue;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy + 0.01;
          const rep = 1200 / d2;
          a.vx += (dx / Math.sqrt(d2)) * rep;
          a.vy += (dy / Math.sqrt(d2)) * rep;
        }
      }
      for (const e of edges) {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const want = e.kind === "depends" ? 90 : 120;
        const f = (dist - want) * 0.02;
        a.vx += (dx / dist) * f;
        a.vy += (dy / dist) * f;
        b.vx -= (dx / dist) * f;
        b.vy -= (dy / dist) * f;
      }
      for (const [, p] of pos) {
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(40, Math.min(W - 40, p.x));
        p.y = Math.max(40, Math.min(H - 40, p.y));
      }
    }
    return pos;
  }

  function groupsRank(g) {
    return { workspace: 0, topic: 1, module: 1, feature: 2, record: 3 }[g];
  }

  function renderGraph(g, filterKind) {
    const svg = document.getElementById("graph");
    const ns = "http://www.w3.org/2000/svg";
    const W = 900;
    const H = 520;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    let edges = g.edges;
    if (filterKind && filterKind !== "all") {
      edges = g.edges.filter((e) => e.kind === filterKind);
    }
    const nodeIds = new Set();
    edges.forEach((e) => {
      nodeIds.add(e.from);
      nodeIds.add(e.to);
    });
    const nodes = filterKind === "all" ? g.nodes : g.nodes.filter((n) => nodeIds.has(n.id));

    const pos = layoutForce(nodes, edges, W, H);
    graphState.nodes = nodes;
    graphState.edges = edges;
    graphState.selected = null;

    svg.replaceChildren();
    const gEdges = document.createElementNS(ns, "g");
    gEdges.setAttribute("class", "graph-edges");
    const gNodes = document.createElementNS(ns, "g");
    gNodes.setAttribute("class", "graph-nodes");

    const colors = { "part-of": "#64748b", contains: "#64748b", depends: "#f59e0b", related: "#22c55e" };
    for (const e of edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("stroke", colors[e.kind] || "#475569");
      line.setAttribute("stroke-width", e.kind === "depends" ? "2.5" : "1.5");
      line.setAttribute("opacity", "0.85");
      line.dataset.from = e.from;
      line.dataset.to = e.to;
      if (e.kind === "related") line.setAttribute("stroke-dasharray", "6 4");
      gEdges.appendChild(line);
    }

    const groupColors = {
      workspace: "#3b82f6",
      topic: "#22c55e",
      module: "#a78bfa",
      feature: "#f59e0b",
      record: "#94a3b8",
    };

    for (const n of nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      const gEl = document.createElementNS(ns, "g");
      gEl.setAttribute("class", "g-node");
      gEl.dataset.id = n.id;
      gEl.style.cursor = "pointer";
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", n.group === "workspace" ? "20" : "12");
      circle.setAttribute("fill", "#151b26");
      circle.setAttribute("stroke", groupColors[n.group] || "#3b82f6");
      circle.setAttribute("stroke-width", "2");
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", p.x);
      text.setAttribute("y", p.y + 26);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#cbd5e1");
      text.setAttribute("font-size", "9");
      text.textContent = n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label;
      gEl.append(circle, text);
      gEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectGraphNode(n.id);
      });
      gNodes.appendChild(gEl);
    }

    svg.append(gEdges, gNodes);
  }

  function selectGraphNode(id) {
    graphState.selected = id;
    const related = new Set([id]);
    graphState.edges.forEach((e) => {
      if (e.from === id || e.to === id) {
        related.add(e.from);
        related.add(e.to);
      }
    });
    document.querySelectorAll("#graph .g-node").forEach((el) => {
      el.classList.toggle("is-dimmed", el.dataset.id !== id && !related.has(el.dataset.id));
      el.classList.toggle("is-selected", el.dataset.id === id);
    });
    document.querySelectorAll("#graph line").forEach((line) => {
      const on = line.dataset.from === id || line.dataset.to === id;
      line.classList.toggle("is-dimmed", !on);
      line.classList.toggle("is-highlight", on);
    });
    const n = graphState.nodes.find((x) => x.id === id);
    const deg = graphState.edges.filter((e) => e.from === id || e.to === id).length;
    setDetail(n?.label || id, `Группа: ${n?.group || "—"} · связей: ${deg}`);
  }

  document.getElementById("graph-wrap")?.addEventListener("click", () => {
    graphState.selected = null;
    document.querySelectorAll("#graph .g-node, #graph line").forEach((el) => {
      el.classList.remove("is-dimmed", "is-highlight", "is-selected");
    });
    setDetail("", "");
  });
})();
