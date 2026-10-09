/**
 * Canvas «second brain» for Живая трансляция — rings / areas layouts inspired by AI OS Dashboard.
 * Expects global d3 and graph { nodes, edges } from buildGraphDataFromAgentMenu.
 */
(function initAgentRmmLiveBrain(global) {
  const AREA_PALETTE = ["#F07A2E", "#56CBA3", "#8B86E8", "#5EAAF5", "#D7B26A", "#D479A9", "#A9BA6C"];
  const MAX_LEAVES = 140;
  const VIEW_STORAGE_KEY = "agentcms.agentRmmLiveBrainView.v1";

  function rnd(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function graphToBrainModel(graph) {
    const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const rawEdges = Array.isArray(graph?.edges) ? graph.edges : [];
    if (!rawNodes.length) return { areas: [], nodes: [], links: [] };

    const byId = new Map(rawNodes.map((n) => [n.id, n]));
    const children = new Map();
    const degree = new Map();
    for (const edge of rawEdges) {
      if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
      if (!children.has(edge.from)) children.set(edge.from, []);
      children.get(edge.from).push(edge.to);
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    }

    const rootId =
      rawNodes.find((n) => n.id === "agent-root")?.id ||
      rawNodes.find((n) => n.depth === 0)?.id ||
      rawNodes[0].id;
    const rootLabel = byId.get(rootId)?.label || "Workspace";

    const areas = [];
    const areaColor = new Map();
    const nodes = [];
    const links = [];
    const seen = new Set();

    function addNode(brainNode, graphNode) {
      if (seen.has(brainNode.id)) return;
      seen.add(brainNode.id);
      brainNode.deg = degree.get(brainNode.id) || degree.get(graphNode?.id) || 0;
      brainNode.graphNode = graphNode || null;
      brainNode.ph = rnd(seen.size + 7) * Math.PI * 2;
      brainNode.f1 = Math.PI * 2 / (6 + 4 * rnd(seen.size + 11));
      brainNode.f2 = brainNode.f1 * 0.73;
      nodes.push(brainNode);
    }

    addNode(
      {
        id: "root",
        kind: "root",
        label: rootLabel,
        area: null,
        layer: "memory"
      },
      byId.get(rootId)
    );

    function registerArea(name) {
      const key = String(name || "shared").trim() || "shared";
      if (!areaColor.has(key)) {
        areas.push(key);
        areaColor.set(key, AREA_PALETTE[areas.length % AREA_PALETTE.length]);
      }
      return key;
    }

    let leafCount = 0;
    const rootKids = (children.get(rootId) || []).slice(0, 14);

    for (const kidId of rootKids) {
      const gn = byId.get(kidId);
      if (!gn) continue;
      const areaName = registerArea(gn.label || kidId.replace(/^folder:/, ""));

      if (gn.type === "folder" || String(gn.id).startsWith("folder:")) {
        const areaNodeId = `area:${areaName}`;
        addNode(
          {
            id: areaNodeId,
            kind: "area",
            label: areaName,
            area: areaName,
            layer: "memory"
          },
          gn
        );
        links.push({ s: areaNodeId, t: "root", k: "tree" });

        const sub = (children.get(kidId) || []).slice(0, 24);
        for (const subId of sub) {
          if (leafCount >= MAX_LEAVES) break;
          const sn = byId.get(subId);
          if (!sn) continue;
          const kind = sn.type === "file" ? "note" : "project";
          addNode(
            {
              id: `n:${subId}`,
              kind,
              label: sn.label || subId,
              area: areaName,
              layer: "memory"
            },
            sn
          );
          links.push({ s: `n:${subId}`, t: areaNodeId, k: "tree" });
          leafCount += 1;

          if (sn.type === "folder" || String(sn.id).startsWith("folder:")) {
            const deep = (children.get(subId) || []).slice(0, 8);
            for (const deepId of deep) {
              if (leafCount >= MAX_LEAVES) break;
              const dn = byId.get(deepId);
              if (!dn || dn.type !== "file") continue;
              addNode(
                {
                  id: `n:${deepId}`,
                  kind: "note",
                  label: dn.label || deepId,
                  area: areaName,
                  layer: "memory"
                },
                dn
              );
              links.push({ s: `n:${deepId}`, t: `n:${subId}`, k: "tree" });
              leafCount += 1;
            }
          }
        }
      } else {
        addNode(
          {
            id: `n:${kidId}`,
            kind: "project",
            label: gn.label || kidId,
            area: areaName,
            layer: "memory"
          },
          gn
        );
        links.push({ s: `n:${kidId}`, t: "root", k: "tree" });
        leafCount += 1;
      }
    }

    for (const edge of rawEdges) {
      if (links.length > 220) break;
      if (edge.weak) continue;
      const a = byId.get(edge.from);
      const b = byId.get(edge.to);
      if (!a || !b) continue;
      const sid = a.id === rootId ? "root" : seen.has(`n:${edge.from}`) ? `n:${edge.from}` : null;
      const tid = b.id === rootId ? "root" : seen.has(`n:${edge.to}`) ? `n:${edge.to}` : null;
      if (!sid || !tid || sid === tid) continue;
      const key = `${sid}|${tid}`;
      if (links.some((l) => `${l.s}|${l.t}` === key || `${l.t}|${l.s}` === key)) continue;
      links.push({ s: sid, t: tid, k: "link" });
    }

    for (const node of nodes) {
      node.r = baseRadius(node);
    }

    const byBrainId = new Map(nodes.map((n) => [n.id, n]));
    for (const link of links) {
      link.a = byBrainId.get(link.s);
      link.b = byBrainId.get(link.t);
      link.source = link.a;
      link.target = link.b;
    }
    nodes.forEach((n) => {
      n.nb = [];
      n.nl = [];
    });
    links.forEach((l) => {
      if (!l.a || !l.b) return;
      l.a.nb.push(l.b);
      l.b.nb.push(l.a);
      l.a.nl.push(l);
      l.b.nl.push(l);
    });

    return { areas, areaColor, nodes, links, AI: Object.fromEntries(areas.map((a, i) => [a, i])) };
  }

  function baseRadius(n) {
    switch (n.kind) {
      case "root":
        return 0;
      case "area":
        return 7;
      case "project":
        return 3.4 + Math.min(2.2, Math.sqrt(n.deg || 1) * 0.45);
      default:
        return 2.3 + Math.min(2, Math.sqrt(n.deg || 1) * 0.4);
    }
  }

  function mount(container, options = {}) {
    if (!container || typeof d3 === "undefined") {
      return { destroy() {} };
    }

    const graph = options.graph || { nodes: [], edges: [] };
    const onNodeClick = typeof options.onNodeClick === "function" ? options.onNodeClick : () => {};
    const onViewportReady = typeof options.onViewportReady === "function" ? options.onViewportReady : null;

    const model = graphToBrainModel(graph);
    const { areas, areaColor, nodes: N, links: L } = model;
    if (N.length <= 1) {
      container.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "agent-rmm-live-brain-empty";
      empty.textContent = "Недостаточно узлов для карты.";
      container.appendChild(empty);
      return { destroy() {} };
    }

    const AREA_NODE = {};
    N.forEach((n) => {
      if (n.kind === "area") AREA_NODE[n.area] = n;
    });

    container.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "agent-rmm-live-brain";
    const toolbar = document.createElement("div");
    toolbar.className = "agent-rmm-live-brain-toolbar";
    toolbar.setAttribute("role", "toolbar");
    const legend = document.createElement("div");
    legend.className = "agent-rmm-live-brain-legend";
    areas.forEach((a) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "agent-rmm-live-brain-legend-chip";
      chip.dataset.areaFilter = a;
      chip.style.setProperty("--area-color", areaColor.get(a) || "#788790");
      chip.textContent = a.length > 18 ? `${a.slice(0, 16)}…` : a;
      chip.title = a;
      legend.appendChild(chip);
    });
    toolbar.innerHTML =
      '<span class="agent-rmm-live-brain-toolbar-label">Вид</span>' +
      '<button type="button" class="agent-rmm-live-brain-view is-active" data-brain-view="rings">Кольца</button>' +
      '<button type="button" class="agent-rmm-live-brain-view" data-brain-view="circle">Круг</button>' +
      '<button type="button" class="agent-rmm-live-brain-view" data-brain-view="areas">Области</button>' +
      '<button type="button" class="agent-rmm-live-brain-view" data-brain-view="links">Связи</button>' +
      '<button type="button" class="agent-rmm-live-brain-fit" data-brain-action="fit" title="Вписать в экран">fit</button>' +
      '<button type="button" class="agent-rmm-live-brain-fit" data-brain-action="clear-filter" title="Сбросить фильтр области">все</button>';
    toolbar.appendChild(legend);
    const core = document.createElement("div");
    core.className = "agent-rmm-live-brain-core";
    const canvas = document.createElement("canvas");
    canvas.className = "agent-rmm-live-brain-canvas";
    canvas.setAttribute("aria-label", "Карта workspace: кольца по областям");
    const tip = document.createElement("div");
    tip.className = "agent-rmm-live-brain-tip hidden";
    tip.setAttribute("role", "status");
    core.append(canvas, tip);
    wrap.append(toolbar, core);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let view = "rings";
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "rings" || saved === "circle" || saved === "areas" || saved === "links") view = saved;
    } catch {
      /* ignore */
    }
    let sim = null;
    let tr = d3.zoomIdentity;
    let tween = null;
    let sectors = [];
    let hover = null;
    let pin = null;
    let areaFilter = null;
    let mouse = null;
    let panning = false;
    let raf = 0;
    let destroyed = false;
    const linkPulses = L.filter((l) => l.k !== "tree" && l.a && l.b)
      .slice(0, 12)
      .map((l, i) => ({ link: l, t: i * 0.17 }));

    const MONO = "ui-monospace, Menlo, monospace";
    const DISP = "ui-monospace, Menlo, monospace";

    function sectorsFor() {
      const gap = 0.3;
      const groups = areas.map((a) => ({ a, nodes: N.filter((n) => n.area === a && n.kind !== "root") }));
      const ws = groups.map((g) => Math.max(2.6, Math.sqrt(g.nodes.length)));
      const tot = ws.reduce((s, w) => s + w, 0);
      const span = Math.PI * 2 - gap;
      let ang = -Math.PI / 2 + gap / 2;
      groups.forEach((g, i) => {
        g.a0 = ang;
        g.a1 = ang + (span * ws[i]) / tot;
        ang = g.a1;
        g.mid = (g.a0 + g.a1) / 2;
      });
      return groups;
    }

    function placeBand(list, r0, r1, a0, a1, set) {
      const n = list.length;
      if (!n) return;
      const rm = (r0 + r1) / 2;
      const arc = (a1 - a0) * rm;
      const sp = Math.max(9, Math.min(16, (arc * 6) / n));
      let rows = Math.max(1, Math.min(8, Math.ceil((n * sp) / arc)));
      const per = Math.ceil(n / rows);
      rows = Math.ceil(n / per);
      for (let row = 0; row < rows; row += 1) {
        const items = list.slice(row * per, (row + 1) * per);
        if (!items.length) break;
        const r = rows === 1 ? rm : r0 + ((r1 - r0) * row) / (rows - 1);
        const step = (a1 - a0) / per;
        const start = a0 + step / 2 + ((per - items.length) * step) / 2;
        items.forEach((d, i) => set(d, r, start + step * i));
      }
    }

    function layoutRings() {
      const T = new Map();
      const set = (n, r, ang) => T.set(n.id, { x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      T.set("root", { x: 0, y: 0 });
      const groups = sectorsFor();
      sectors = groups;
      groups.forEach((g) => {
        const pad = Math.min(0.05, (g.a1 - g.a0) * 0.12);
        const a0 = g.a0 + pad;
        const a1 = g.a1 - pad;
        const hubN = AREA_NODE[g.a];
        if (hubN) set(hubN, R * 0.315, g.mid);
        const leaves = g.nodes.filter((n) => n.kind !== "area").sort((a, b) => a.label.localeCompare(b.label, "ru"));
        placeBand(leaves, R * 0.42, R * 0.76, a0, a1, set);
      });
      return T;
    }

    function layoutCircle() {
      const T = new Map();
      T.set("root", { x: 0, y: 0 });
      const list = N.filter((n) => n.kind !== "root" && n.kind !== "area");
      const areaOrder = Object.fromEntries(areas.map((a, i) => [a, i]));
      list.sort(
        (a, b) =>
          (areaOrder[a.area] ?? 99) - (areaOrder[b.area] ?? 99) ||
          a.label.localeCompare(b.label, "ru")
      );
      const gap = 0.06;
      const groups = d3.groups(list, (n) => n.area || "shared");
      const tot = list.length;
      const span = Math.PI * 2 - gap * groups.length;
      let ang = -Math.PI / 2;
      sectors = [];
      groups.forEach(([key, arr]) => {
        const w = span * (arr.length / tot);
        const a0 = ang;
        const a1 = ang + w;
        sectors.push({ a: key, a0, a1, mid: (a0 + a1) / 2 });
        arr.forEach((n, i) => {
          const a = a0 + (w * (i + 0.5)) / arr.length;
          T.set(n.id, { x: Math.cos(a) * R * 0.86, y: Math.sin(a) * R * 0.86 });
        });
        ang = a1 + gap;
      });
      N.filter((n) => n.kind === "area").forEach((n) => {
        const g = sectors.find((s) => s.a === n.area);
        if (g) T.set(n.id, { x: Math.cos(g.mid) * R * 0.38, y: Math.sin(g.mid) * R * 0.38 });
      });
      return T;
    }

    function areaCentres() {
      const groups = sectorsFor();
      const c = {};
      groups.forEach((g) => {
        const cnt = g.nodes.length;
        const rad = R * (0.46 + 0.22 * Math.min(1, Math.sqrt(cnt) / 14));
        c[g.a] = { x: Math.cos(g.mid) * rad, y: Math.sin(g.mid) * rad };
      });
      return c;
    }

    function stopSim() {
      if (sim) {
        sim.stop();
        sim = null;
      }
    }

    function startAreas() {
      stopSim();
      const centres = areaCentres();
      const cxOf = (n) => (n.area && centres[n.area] ? centres[n.area].x : 0);
      const cyOf = (n) => (n.area && centres[n.area] ? centres[n.area].y : 0);
      const pull = (n) => (n.kind === "area" ? 0.14 : 0.1);
      N.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
        if (n.kind === "root") {
          n.fx = 0;
          n.fy = 0;
        } else {
          n.fx = null;
          n.fy = null;
        }
      });
      sim = d3
        .forceSimulation(N)
        .force("x", d3.forceX(cxOf).strength(pull))
        .force("y", d3.forceY(cyOf).strength(pull))
        .force("col", d3.forceCollide((n) => n.r + 1.6).iterations(2))
        .force("ch", d3.forceManyBody().strength((n) => (n.kind === "area" ? -28 : -8)).distanceMax(120))
        .force(
          "l",
          d3
            .forceLink(L)
            .id((n) => n.id)
            .distance((l) => (l.k === "tree" ? 22 : 36))
            .strength((l) => (l.k === "tree" ? 0.12 : 0.06))
        )
        .alpha(1)
        .alphaDecay(0.022)
        .alphaTarget(0);
      sectors = areas.map((a) => ({ a, ...centres[a] }));
    }

    function startLinks() {
      stopSim();
      const centres = areaCentres();
      const F = 1.25;
      const ax = (n) => (n.area ? centres[n.area].x * F : 0);
      const ay = (n) => (n.area ? centres[n.area].y * F : 0);
      N.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
        if (n.kind === "root") {
          n.fx = 0;
          n.fy = 0;
        } else {
          n.fx = null;
          n.fy = null;
        }
      });
      sim = d3
        .forceSimulation(N)
        .force(
          "l",
          d3
            .forceLink(L)
            .id((n) => n.id)
            .distance((l) => (l.k === "tree" ? 28 : 44))
            .strength((l) => (l.k === "tree" ? 0.28 : 0.14))
        )
        .force("ch", d3.forceManyBody().strength((n) => (n.kind === "area" ? -50 : -14)).distanceMax(200))
        .force("col", d3.forceCollide((n) => n.r + 1.2))
        .force("x", d3.forceX(ax).strength(0.1))
        .force("y", d3.forceY(ay).strength(0.1))
        .alpha(1)
        .alphaDecay(0.02);
      sectors = areas.map((a) => ({ a, cx: centres[a].x * F, cy: centres[a].y * F }));
    }

    function applyLayoutForView(animate) {
      if (view === "areas") {
        tween = null;
        startAreas();
        return;
      }
      if (view === "links") {
        tween = null;
        startLinks();
        return;
      }
      stopSim();
      const T = view === "circle" ? layoutCircle() : layoutRings();
      if (animate) animateTo(T);
      else {
        N.forEach((n) => {
          const t = T.get(n.id);
          if (t) {
            n.x = t.x;
            n.y = t.y;
          }
        });
        tween = null;
      }
    }

    function go(nextView) {
      view = nextView;
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
      } catch {
        /* ignore */
      }
      toolbar.querySelectorAll("[data-brain-view]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.brainView === view);
      });
      applyLayoutForView(true);
      fitView();
    }

    function setAreaFilter(area) {
      if (area === null || area === undefined) {
        areaFilter = null;
      } else {
        areaFilter = areaFilter === area ? null : area;
      }
      toolbar.querySelectorAll("[data-area-filter]").forEach((chip) => {
        chip.classList.toggle("is-active", Boolean(areaFilter && chip.dataset.areaFilter === areaFilter));
      });
    }

    function animateTo(T, dur = 720) {
      const t0 = performance.now();
      N.forEach((n) => {
        const t = T.get(n.id) || { x: n.x, y: n.y };
        n.sx = n.x;
        n.sy = n.y;
        n.tx = t.x;
        n.ty = t.y;
        n.dl = 40;
      });
      tween = { t0, dur };
    }

    function stepTween(now) {
      if (!tween) return;
      let done = true;
      N.forEach((n) => {
        const p = Math.max(0, Math.min(1, (now - tween.t0 - (n.dl || 0)) / tween.dur));
        if (p < 1) done = false;
        const e = d3.easeCubicInOut(p);
        n.x = n.sx + (n.tx - n.sx) * e;
        n.y = n.sy + (n.ty - n.sy) * e;
      });
      if (done) tween = null;
    }

    function toScreen(n) {
      return [tr.x + n.x * tr.k, tr.y + n.y * tr.k];
    }

    function toWorld(px, py) {
      return [(px - tr.x) / tr.k, (py - tr.y) / tr.k];
    }

    function homeT(k = 1) {
      return d3.zoomIdentity.translate(cx, cy).scale(k);
    }

    function fitT() {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      N.forEach((n) => {
        if (n.kind === "root") return;
        if (areaFilter && n.area !== areaFilter && n.kind !== "area") return;
        minX = Math.min(minX, n.x - n.r);
        minY = Math.min(minY, n.y - n.r);
        maxX = Math.max(maxX, n.x + n.r);
        maxY = Math.max(maxY, n.y + n.r);
      });
      if (!Number.isFinite(minX)) return homeT(1);
      const bw = Math.max(maxX - minX, 40);
      const bh = Math.max(maxY - minY, 40);
      const pad = 48;
      const scale = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh, 2.8);
      const mx = (minX + maxX) / 2;
      const my = (minY + maxY) / 2;
      return d3.zoomIdentity.translate(cx, cy).scale(scale).translate(-mx, -my);
    }

    function fitView() {
      tr = fitT();
      canvas.__zoom = tr;
      d3.select(canvas).call(zoom.transform, tr);
    }

    function layout() {
      const r = core.getBoundingClientRect();
      W = r.width;
      H = r.height;
      if (W < 120) return;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      const ocx = cx;
      const ocy = cy;
      cx = W / 2;
      cy = H / 2;
      R = Math.min(W, H) / 2 - 28;
      if (ocx && tr.k) {
        tr = d3.zoomIdentity.translate(tr.x + cx - ocx, tr.y + cy - ocy).scale(tr.k);
      } else {
        tr = homeT(1);
      }
      canvas.__zoom = tr;
      if (view === "rings" || view === "circle") {
        const T = view === "circle" ? layoutCircle() : layoutRings();
        N.forEach((n) => {
          const t = T.get(n.id);
          if (t) {
            n.x = t.x;
            n.y = t.y;
          }
        });
        tween = null;
      } else if (view === "areas") startAreas();
      else if (view === "links") startLinks();
    }

    function col(n) {
      if (n.area && areaColor.has(n.area)) return areaColor.get(n.area);
      return "#a3b0b8";
    }

    function hexGround() {
      const a = tr.k > 1.4 ? 0.045 : 0.028;
      const s = 24;
      const h = s * Math.sqrt(3);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1;
      for (let row = -1; row * h * 0.75 < H + h; row += 1) {
        for (let colIdx = -1; colIdx * (s * 1.5) < W + s; colIdx += 1) {
          const x = colIdx * s * 1.5 + (row % 2 ? s * 0.75 : 0);
          const y = row * h * 0.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const q = (Math.PI / 3) * i;
            ctx.lineTo(x + s * 0.5 * Math.cos(q), y + s * 0.5 * Math.sin(q));
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    function drawNucleus(x, y, k, t) {
      const r = Math.max(10, Math.min(90, R * 0.16 * k)) * (1 + 0.03 * Math.sin(t * 0.9));
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      halo.addColorStop(0, "rgba(255,145,22,.42)");
      halo.addColorStop(0.35, "rgba(255,103,12,.18)");
      halo.addColorStop(1, "rgba(232,72,8,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F07A2E";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    function nodeVisible(n) {
      if (n.kind === "root") return true;
      if (!areaFilter) return true;
      if (n.kind === "area" && n.area === areaFilter) return true;
      return n.area === areaFilter;
    }

    function focusSet() {
      const h = hover || pin;
      if (h) {
        const set = new Set([h]);
        h.nb.forEach((nb) => set.add(nb));
        if (h.kind === "area") {
          N.forEach((n) => {
            if (n.area === h.area) set.add(n);
          });
        }
        return { set, links: new Set(h.nl), spokes: h.kind === "area" ? h : null };
      }
      if (areaFilter) {
        const set = new Set();
        N.forEach((n) => {
          if (n.area === areaFilter || (n.kind === "area" && n.area === areaFilter)) set.add(n);
        });
        return { set, links: null, spokes: AREA_NODE[areaFilter] || null };
      }
      return null;
    }

    function drawSectorGuides(ox, oy, k, t) {
      if (view !== "rings" && view !== "circle") return;
      sectors.forEach((s) => {
        const c = areaColor.get(s.a) || "#788790";
        const dim = areaFilter && s.a !== areaFilter;
        ctx.globalAlpha = dim ? 0.12 : 0.55;
        if (view === "rings" && s.a0 !== undefined) {
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(s.a0) * R * 0.82 * k, oy + Math.sin(s.a0) * R * 0.82 * k);
          ctx.strokeStyle = c + "55";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        const lx = ox + Math.cos(s.mid) * R * (view === "rings" ? 0.8 : 0.92) * k;
        const ly = oy + Math.sin(s.mid) * R * (view === "rings" ? 0.8 : 0.92) * k;
        if (k > 0.55 && !dim) {
          const label = s.a.length > 14 ? `${s.a.slice(0, 12)}…` : s.a;
          ctx.font = `600 9px ${DISP}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(248,250,252,.88)";
          ctx.fillText(label, lx, ly);
        }
        ctx.globalAlpha = 1;
      });
    }

    function drawLinkPulse(l, phase, k) {
      if (!l.a || !l.b) return;
      const [x1, y1] = toScreen(l.a);
      const [x2, y2] = toScreen(l.b);
      const p = (phase % 1 + 1) % 1;
      const x = x1 + (x2 - x1) * p;
      const y = y1 + (y2 - y1) * p;
      const c = col(l.a);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6 * k);
      g.addColorStop(0, c + "cc");
      g.addColorStop(1, c + "00");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 5 * Math.min(k, 1.4), 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFrame(ts) {
      if (destroyed || W < 120) return;
      const now = ts || performance.now();
      const t = now / 1000;
      stepTween(now);
      if (sim) sim.tick();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const k = tr.k;
      const [ox, oy] = toScreen({ x: 0, y: 0 });
      const F = focusSet();

      hexGround();

      if (view === "rings" || view === "circle" || view === "areas" || view === "links") {
        sectors.forEach((s, i) => {
          const c = areaColor.get(s.a) || "#788790";
          let X;
          let Y;
          let rad;
          if (view === "rings") {
            X = ox + Math.cos(s.mid) * R * 0.52 * k;
            Y = oy + Math.sin(s.mid) * R * 0.52 * k;
            rad = R * 0.28 * k;
          } else {
            X = ox + (s.cx || 0) * k;
            Y = oy + (s.cy || 0) * k;
            rad = R * 0.26 * k;
          }
          const br = 1 + 0.15 * Math.sin(t * Math.PI / 4 + i);
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, rad * br);
          g.addColorStop(0, c + "22");
          g.addColorStop(1, c + "00");
          ctx.fillStyle = g;
          ctx.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
        });
      }

      const coreGlow = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 0.32 * k);
      coreGlow.addColorStop(0, "rgba(240,122,46,.14)");
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, W, H);

      if (view === "rings" || view === "circle") {
        const ring = (f, color) => {
          ctx.beginPath();
          ctx.arc(ox, oy, R * f * k, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
        };
        ring(0.76, "rgba(255,255,255,.07)");
        ring(0.48, "rgba(240,122,46,.24)");
        ring(0.32, "rgba(255,255,255,.04)");
        drawSectorGuides(ox, oy, k, t);
      }

      L.forEach((l) => {
        if (!l.a || !l.b || l.a.kind === "root" || l.b.kind === "root") return;
        if (!nodeVisible(l.a) && !nodeVisible(l.b) && !(F && (F.set.has(l.a) || F.set.has(l.b)))) return;
        const dim = F && !F.set.has(l.a) && !F.set.has(l.b);
        const [x1, y1] = toScreen(l.a);
        const [x2, y2] = toScreen(l.b);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        const base = l.k === "tree" ? "rgba(255,255,255,.09)" : "rgba(240,122,46,.22)";
        ctx.strokeStyle = dim ? "rgba(255,255,255,.04)" : base;
        ctx.lineWidth = l.k === "tree" ? 0.75 : 1;
        ctx.stroke();
      });

      if (view === "links" && !areaFilter) {
        linkPulses.forEach((p) => {
          p.t = (p.t + 0.004) % 1;
          drawLinkPulse(p.link, p.t, k);
        });
      }

      let hov = null;
      let hd = 12;
      N.forEach((n) => {
        if (n.kind === "root") return;
        if (!nodeVisible(n) && !(F && F.set.has(n))) return;
        let [X, Y] = toScreen(n);
        const wobble = 0.9 * Math.sin(t * n.f1 + n.ph);
        X += wobble;
        Y += 0.7 * Math.sin(t * n.f2 + n.ph * 1.4);
        n.X = X;
        n.Y = Y;
        if (mouse) {
          const d = Math.hypot(X - mouse.x, Y - mouse.y);
          const lim = Math.max(6, n.r * Math.min(k, 1.6) + 4);
          if (d < lim && d <= hd) {
            hd = d;
            hov = n;
          }
        }
      });
      if (!panning) hover = hov;

      N.forEach((n) => {
        if (n.kind === "root") return;
        if (!nodeVisible(n) && !(F && F.set.has(n))) return;
        const dim = F && !F.set.has(n);
        const alpha = dim ? 0.2 : 0.96;
        const [X, Y] = [n.X, n.Y];
        const r = (n.kind === "area" ? n.r * 1.15 : n.r) * Math.min(k, 1.8);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col(n);
        ctx.beginPath();
        if (n.kind === "project") {
          ctx.rect(X - r, Y - r, r * 2, r * 2);
        } else {
          ctx.arc(X, Y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        if (n === hover || n === pin) {
          ctx.strokeStyle = "#F07A2E";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if ((n === hover || n === pin) && k > 0.75 && n.label) {
          ctx.font = `500 9px ${MONO}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(248,250,252,.92)";
          ctx.fillText(n.label.length > 28 ? `${n.label.slice(0, 26)}…` : n.label, X, Y + r + 4);
        }
        ctx.globalAlpha = 1;
      });

      drawNucleus(ox, oy, k, t);

      if (hover && !pin) {
        tip.classList.remove("hidden");
        tip.textContent = hover.label;
        tip.style.left = `${Math.min(W - 8, hover.X + 10)}px`;
        tip.style.top = `${Math.max(8, hover.Y - 24)}px`;
      } else if (pin) {
        tip.classList.remove("hidden");
        tip.textContent = pin.label;
      } else {
        tip.classList.add("hidden");
      }

    }

    function loop(ts) {
      if (destroyed) return;
      drawFrame(ts);
      raf = requestAnimationFrame(loop);
    }

    toolbar.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-brain-view]");
      if (viewBtn) {
        go(viewBtn.dataset.brainView);
        return;
      }
      const areaChip = event.target.closest("[data-area-filter]");
      if (areaChip) {
        setAreaFilter(areaChip.dataset.areaFilter);
        fitView();
        return;
      }
      if (event.target.closest('[data-brain-action="clear-filter"]')) {
        setAreaFilter(null);
        fitView();
        return;
      }
      if (event.target.closest('[data-brain-action="fit"]')) fitView();
    });

    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    canvas.addEventListener("pointerleave", () => {
      mouse = null;
      hover = null;
    });
    canvas.addEventListener(
      "click",
      (event) => {
        const target = hover || pin;
        if (!target) return;
        if (target.kind === "area") {
          setAreaFilter(target.area);
          fitView();
          return;
        }
        if (!target.graphNode) return;
        onNodeClick(target.graphNode);
      },
      true
    );
    canvas.addEventListener("dblclick", () => {
      pin = hover;
      if (!pin) fitView();
    });

    const zoom = d3
      .zoom()
      .scaleExtent([0.45, 4.5])
      .filter((e) => (e.type === "wheel" ? true : !e.ctrlKey && !e.button))
      .on("zoom", (e) => {
        tr = e.transform;
        canvas.__zoom = tr;
      });
    d3.select(canvas).call(zoom).on("dblclick.zoom", null);

    const ro = new ResizeObserver(() => {
      layout();
      fitView();
    });
    ro.observe(core);

    layout();
    toolbar.querySelectorAll("[data-brain-view]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.brainView === view);
    });
    applyLayoutForView(false);
    fitView();
    raf = requestAnimationFrame(loop);

    const viewportApi = {
      reset: () => fitView(),
      zoomIn: () => {
        tr = tr.scale(1.2);
        canvas.__zoom = tr;
        d3.select(canvas).call(zoom.transform, tr);
      },
      zoomOut: () => {
        tr = tr.scale(1 / 1.2);
        canvas.__zoom = tr;
        d3.select(canvas).call(zoom.transform, tr);
      },
      setSearchQuery: () => {}
    };
    if (onViewportReady) onViewportReady(viewportApi);

    function destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      stopSim();
      ro.disconnect();
      d3.select(canvas).on(".zoom", null);
      container.replaceChildren();
    }

    return { destroy, viewportApi };
  }

  global.AgentRmmLiveBrain = { mount, graphToBrainModel };
})(typeof window !== "undefined" ? window : globalThis);
