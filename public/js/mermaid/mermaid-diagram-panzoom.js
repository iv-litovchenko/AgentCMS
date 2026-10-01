const PANZOOM_MIN = 1;
const PANZOOM_MAX = 4;
const WHEEL_ZOOM_FACTOR = 1.08;
const PAN_MARGIN_RATIO = 0.28;

const hostState = new WeakMap();

function getDiagramContent(host) {
  return host.querySelector("pre.mermaid") || host.querySelector("svg");
}

function getDiagramSvg(content) {
  if (!content) return null;
  if (content.tagName?.toLowerCase() === "svg") return content;
  return content.querySelector("svg");
}

function unwrapLegacyMermaidViewport(host) {
  const viewport = host.querySelector(":scope > .mermaid-diagram-viewport");
  if (!viewport) return;
  const panzoom = viewport.querySelector(".mermaid-diagram-panzoom");
  const inner = panzoom?.firstElementChild;
  if (inner) host.insertBefore(inner, viewport);
  viewport.remove();
}

function readSvgViewBox(svg) {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  }
  const raw = String(svg.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
  if (raw.length === 4 && raw[2] > 0 && raw[3] > 0) {
    return { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
  }
  return null;
}

/** Mermaid intrinsic box before pan-zoom padding; avoids shrinking on each re-capture. */
function readMermaidIntrinsicViewBox(svg) {
  const stored = String(svg?.getAttribute("data-mermaid-intrinsic-viewbox") || "").trim();
  if (stored) {
    const parts = stored.split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }
  const raw = readSvgViewBox(svg);
  if (!raw) return null;
  svg.setAttribute("data-mermaid-intrinsic-viewbox", formatViewBox(raw));
  return raw;
}

export function normalizeMermaidRenderedSvgRoot(blockOrSvg) {
  const svg =
    blockOrSvg?.tagName?.toLowerCase() === "svg"
      ? blockOrSvg
      : blockOrSvg?.querySelector?.("svg");
  if (!svg) return;
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.style.removeProperty("width");
  svg.style.removeProperty("height");
  svg.style.removeProperty("max-width");
}

function cloneViewBox(vb) {
  return { x: vb.x, y: vb.y, w: vb.w, h: vb.h };
}

const VIEWBOX_PAD_RATIO = 0.08;

function padViewBox(vb, ratio = VIEWBOX_PAD_RATIO) {
  const padW = vb.w * ratio;
  const padH = vb.h * ratio;
  return {
    x: vb.x - padW * 0.5,
    y: vb.y - padH * 0.5,
    w: vb.w + padW,
    h: vb.h + padH
  };
}

function formatViewBox(vb) {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
}

function parseViewBoxString(value) {
  const parts = String(value || "").trim().split(/\s+/).map(Number);
  if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  return null;
}

function viewBoxScale(base, current) {
  return base.w / current.w;
}

function isViewBoxTransformed(base, current) {
  if (!base || !current) return false;
  const scale = viewBoxScale(base, current);
  if (scale > 1.02) return true;
  return (
    Math.abs(current.x - base.x) > 0.5 ||
    Math.abs(current.y - base.y) > 0.5 ||
    Math.abs(current.w - base.w) > 0.5 ||
    Math.abs(current.h - base.h) > 0.5
  );
}

function clampViewBoxToBase(viewBox, baseViewBox) {
  const vb = cloneViewBox(viewBox);
  const base = baseViewBox;
  if (!base?.w || !base?.h) return vb;

  if (vb.w >= base.w) {
    vb.x = base.x + (base.w - vb.w) / 2;
  } else {
    const marginX = vb.w * PAN_MARGIN_RATIO;
    const minX = base.x - marginX;
    const maxX = base.x + base.w - vb.w + marginX;
    vb.x = minX > maxX ? base.x + (base.w - vb.w) / 2 : Math.min(Math.max(vb.x, minX), maxX);
  }

  if (vb.h >= base.h) {
    vb.y = base.y + (base.h - vb.h) / 2;
  } else {
    const marginY = vb.h * PAN_MARGIN_RATIO;
    const minY = base.y - marginY;
    const maxY = base.y + base.h - vb.h + marginY;
    vb.y = minY > maxY ? base.y + (base.h - vb.h) / 2 : Math.min(Math.max(vb.y, minY), maxY);
  }

  return vb;
}

function findMermaidResetZoomButton(host) {
  if (!(host instanceof Element)) return null;
  const inHost = host.querySelector(":scope > .mermaid-diagram-actions .mermaid-diagram-reset-zoom-btn");
  if (inHost) return inHost;
  const inHostDirect = host.querySelector(".mermaid-diagram-reset-zoom-btn");
  if (inHostDirect) return inHostDirect;
  const panel = host.closest(".mermaid-diagram-lightbox-panel");
  return panel?.querySelector(".mermaid-diagram-reset-zoom-btn") || null;
}

function syncZoomedClass(host, baseViewBox, currentViewBox) {
  const transformed = isViewBoxTransformed(baseViewBox, currentViewBox);
  host?.classList.toggle("is-mermaid-zoomed", transformed);
  const resetBtn = findMermaidResetZoomButton(host);
  if (resetBtn) resetBtn.disabled = !transformed;
}

function clearMermaidDiagramFocus(host) {
  const svg = getDiagramSvg(getDiagramContent(host));
  if (!svg) return;
  const active = document.activeElement;
  if (active instanceof Element && svg.contains(active) && typeof active.blur === "function") {
    active.blur();
  }
}

function applyViewBox(svg, state) {
  if (!state.baseViewBox) return;
  state.viewBox = clampViewBoxToBase(state.viewBox, state.baseViewBox);
  const { x, y, w, h } = state.viewBox;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  state.transformed = isViewBoxTransformed(state.baseViewBox, state.viewBox);
  syncZoomedClass(state.host, state.baseViewBox, state.viewBox);
}

function clientPointToSvg(svg, clientX, clientY, viewBox) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
  }
  const sx = (clientX - rect.left) / rect.width;
  const sy = (clientY - rect.top) / rect.height;
  return { x: viewBox.x + sx * viewBox.w, y: viewBox.y + sy * viewBox.h };
}

function zoomViewBoxAtPointer(svg, state, clientX, clientY, factor) {
  const currentScale = viewBoxScale(state.baseViewBox, state.viewBox);
  const nextScale = Math.min(PANZOOM_MAX, Math.max(PANZOOM_MIN, currentScale * factor));
  if (nextScale === currentScale) return;
  const zoomFactor = nextScale / currentScale;
  const pt = clientPointToSvg(svg, clientX, clientY, state.viewBox);
  const nw = state.viewBox.w / zoomFactor;
  const nh = state.viewBox.h / zoomFactor;
  state.viewBox.x = pt.x - (pt.x - state.viewBox.x) * (nw / state.viewBox.w);
  state.viewBox.y = pt.y - (pt.y - state.viewBox.y) * (nh / state.viewBox.h);
  state.viewBox.w = nw;
  state.viewBox.h = nh;
  applyViewBox(svg, state);
}

function wantsZoomWheel(event) {
  if (event.ctrlKey || event.metaKey) return true;
  const dominantVertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
  return (
    dominantVertical &&
    (event.deltaMode === 1 || (Math.abs(event.deltaY) >= 48 && Math.abs(event.deltaX) < 8))
  );
}

function bindPanZoom(host) {
  if (hostState.has(host)) return hostState.get(host);

  const state = {
    host,
    content: null,
    svg: null,
    originalViewBoxAttr: null,
    baseViewBox: null,
    viewBox: null,
    transformed: false,
    dragging: false,
    dragPointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginViewBox: null,
    pinchStartDist: 0,
    pinchStartViewBox: null,
    pinchMidX: 0,
    pinchMidY: 0
  };

  state.captureBase = (options = {}) => {
    const updateBaseOnly = Boolean(options.updateBaseOnly);
    state.content = getDiagramContent(host) || state.content;
    state.svg = getDiagramSvg(state.content);
    if (!state.svg) return false;

    const raw = readMermaidIntrinsicViewBox(state.svg);
    if (!raw) return false;

    const base = padViewBox(raw);
    state.originalViewBoxAttr = formatViewBox(base);
    state.baseViewBox = base;

    if (updateBaseOnly) {
      if (state.viewBox) {
        state.transformed = isViewBoxTransformed(base, state.viewBox);
        syncZoomedClass(host, base, state.viewBox);
      }
      return true;
    }

    state.viewBox = cloneViewBox(base);
    state.transformed = false;
    state.svg.setAttribute("viewBox", state.originalViewBoxAttr);
    syncZoomedClass(host, base, state.viewBox);
    return true;
  };

  state.reset = () => {
    if (!state.svg?.isConnected && !state.captureBase()) return;
    if (!state.svg || !state.baseViewBox) return;

    state.svg.setAttribute("viewBox", formatViewBox(state.baseViewBox));
    state.viewBox = cloneViewBox(state.baseViewBox);
    state.transformed = false;
    syncZoomedClass(host, state.baseViewBox, state.viewBox);
  };

  const ignorePanZoomForEvent = (event) => {
    if (host.classList.contains("is-mermaid-source-open")) return true;
    const target = event.target;
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(".mermaid-diagram-source-panel, .mermaid-diagram-actions"));
  };

  const onWheel = (event) => {
    if (!host.isConnected || !state.svg?.isConnected || !state.baseViewBox) return;
    if (ignorePanZoomForEvent(event)) return;
    if (event.target.closest("button, a, input, textarea, select, label")) return;

    const zoomIntent = wantsZoomWheel(event);
    if (!state.transformed && !zoomIntent) return;

    event.preventDefault();
    event.stopPropagation();

    if (zoomIntent) {
      const factor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      zoomViewBoxAtPointer(state.svg, state, event.clientX, event.clientY, factor);
      clearMermaidDiagramFocus(host);
      return;
    }

    const rect = state.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.viewBox.x += (event.deltaX / rect.width) * state.viewBox.w;
    state.viewBox.y += (event.deltaY / rect.height) * state.viewBox.h;
    applyViewBox(state.svg, state);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    if (ignorePanZoomForEvent(event)) return;
    if (event.target.closest("button, a, input, textarea, select, label")) return;
    if (!state.svg?.isConnected || !state.transformed) return;
    state.dragging = true;
    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragOriginViewBox = cloneViewBox(state.viewBox);
    event.preventDefault();
    host.classList.add("is-mermaid-panning");
    host.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!state.dragging || event.pointerId !== state.dragPointerId || !state.svg) return;
    const rect = state.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((event.clientX - state.dragStartX) / rect.width) * state.dragOriginViewBox.w;
    const dy = ((event.clientY - state.dragStartY) / rect.height) * state.dragOriginViewBox.h;
    state.viewBox.x = state.dragOriginViewBox.x - dx;
    state.viewBox.y = state.dragOriginViewBox.y - dy;
    state.viewBox.w = state.dragOriginViewBox.w;
    state.viewBox.h = state.dragOriginViewBox.h;
    applyViewBox(state.svg, state);
  };

  const endDrag = (event) => {
    if (!state.dragging || (event.pointerId !== undefined && event.pointerId !== state.dragPointerId)) {
      return;
    }
    state.dragging = false;
    state.dragPointerId = null;
    host.classList.remove("is-mermaid-panning");
    clearMermaidDiagramFocus(host);
    try {
      host.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerUpClearFocus = (event) => {
    if (event.target.closest("button, a, input, textarea, select, label")) return;
    clearMermaidDiagramFocus(host);
  };

  const touchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const touchMidpoint = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  });

  const onTouchStart = (event) => {
    if (ignorePanZoomForEvent(event)) return;
    if (event.touches.length === 2 && state.svg) {
      event.preventDefault();
      state.pinchStartDist = touchDistance(event.touches);
      state.pinchStartViewBox = cloneViewBox(state.viewBox);
      const mid = touchMidpoint(event.touches);
      state.pinchMidX = mid.x;
      state.pinchMidY = mid.y;
    }
  };

  const onTouchMove = (event) => {
    if (event.touches.length !== 2 || state.pinchStartDist <= 0 || !state.svg || !state.pinchStartViewBox) {
      return;
    }
    event.preventDefault();
    const dist = touchDistance(event.touches);
    const ratio = dist / state.pinchStartDist;
    const scaleAtStart = viewBoxScale(state.baseViewBox, state.pinchStartViewBox);
    const targetScale = Math.min(PANZOOM_MAX, Math.max(PANZOOM_MIN, scaleAtStart * ratio));
    if (targetScale === scaleAtStart) return;
    state.viewBox = cloneViewBox(state.pinchStartViewBox);
    zoomViewBoxAtPointer(
      state.svg,
      state,
      state.pinchMidX,
      state.pinchMidY,
      targetScale / scaleAtStart
    );
  };

  const onTouchEnd = (event) => {
    if (event.touches.length < 2) state.pinchStartDist = 0;
  };

  const onDblClick = (event) => {
    if (event.target.closest("button")) return;
    if (!state.svg) return;
    event.preventDefault();
    state.reset();
  };

  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointerup", onPointerUpClearFocus);
  host.addEventListener("pointercancel", endDrag);
  host.addEventListener("touchstart", onTouchStart, { passive: false });
  host.addEventListener("touchmove", onTouchMove, { passive: false });
  host.addEventListener("touchend", onTouchEnd);
  host.addEventListener("touchcancel", onTouchEnd);
  host.addEventListener("dblclick", onDblClick);

  hostState.set(host, state);
  return state;
}

/**
 * @param {Element} host — `.mermaid-diagram-frame` or `.shell-mermaid-lightbox-stage`
 * @param {{ reset?: boolean }} [options]
 */
function buildViewSnapshotFromBoxes(baseViewBox, currentViewBox) {
  if (!baseViewBox || !currentViewBox) return null;
  const cx = currentViewBox.x + currentViewBox.w / 2;
  const cy = currentViewBox.y + currentViewBox.h / 2;
  const transformed = isViewBoxTransformed(baseViewBox, currentViewBox);
  return {
    scale: viewBoxScale(baseViewBox, currentViewBox),
    relCx: (cx - baseViewBox.x) / baseViewBox.w,
    relCy: (cy - baseViewBox.y) / baseViewBox.h,
    transformed
  };
}

export function snapshotMermaidDiagramView(host) {
  if (!(host instanceof Element)) return null;
  const state = hostState.get(host);
  const svg = getDiagramSvg(getDiagramContent(host));
  const current =
    state?.viewBox && state.viewBox.w > 0
      ? cloneViewBox(state.viewBox)
      : svg
        ? readSvgViewBox(svg)
        : null;
  if (!current) return null;

  const base =
    state?.baseViewBox && state.baseViewBox.w > 0
      ? state.baseViewBox
      : (() => {
          const intrinsic = svg ? readMermaidIntrinsicViewBox(svg) : null;
          return intrinsic ? padViewBox(intrinsic) : current;
        })();

  const relative = buildViewSnapshotFromBoxes(base, current);
  return relative ? { ...relative, viewBox: formatViewBox(current) } : null;
}

export function restoreMermaidDiagramView(host, snapshot) {
  if (!(host instanceof Element) || !snapshot) return;
  const state = hostState.get(host);
  if (!state?.svg) return;

  const fromAttr = parseViewBoxString(snapshot.viewBox);
  if (fromAttr) {
    state.viewBox = fromAttr;
    applyViewBox(state.svg, state);
    return;
  }

  if (!snapshot.transformed) {
    state.reset();
    return;
  }
  const base = state.baseViewBox;
  if (!base?.w || !base?.h) return;
  const scale = Math.min(PANZOOM_MAX, Math.max(PANZOOM_MIN, Number(snapshot.scale) || 1));
  const nw = base.w / scale;
  const nh = base.h / scale;
  const cx = base.x + (Number(snapshot.relCx) || 0.5) * base.w;
  const cy = base.y + (Number(snapshot.relCy) || 0.5) * base.h;
  state.viewBox = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
  applyViewBox(state.svg, state);
}

function applyMermaidDiagramPanZoom(host, state, options = {}) {
  if (!host.isConnected) return;
  const hasSnapshot = Boolean(options.viewSnapshot);
  if (!state.captureBase({ updateBaseOnly: hasSnapshot })) return;
  if (hasSnapshot) {
    restoreMermaidDiagramView(host, options.viewSnapshot);
  } else if (options.reset) {
    state.reset();
  }
  host.classList.remove("is-mermaid-panning");
}

export function ensureMermaidDiagramPanZoom(host, options = {}) {
  if (!(host instanceof Element)) return;
  unwrapLegacyMermaidViewport(host);
  const content = getDiagramContent(host);
  if (!content?.querySelector?.("svg") && content?.tagName?.toLowerCase() !== "svg") return;

  const state = bindPanZoom(host);
  requestAnimationFrame(() => {
    applyMermaidDiagramPanZoom(host, state, options);
  });
}

/** Re-measure after SVG swap (e.g. refresh) without duplicating listeners. */
export function refreshMermaidDiagramPanZoom(host, options = {}) {
  if (!(host instanceof Element)) return;
  unwrapLegacyMermaidViewport(host);
  const content = getDiagramContent(host);
  if (!content?.querySelector?.("svg") && content?.tagName?.toLowerCase() !== "svg") return;

  const state = hostState.get(host) || bindPanZoom(host);
  const viewSnapshot = options.viewSnapshot || null;
  const reset = options.reset !== false && !viewSnapshot;
  host.classList.remove("is-mermaid-panning");
  const apply = () => applyMermaidDiagramPanZoom(host, state, { reset, viewSnapshot });
  if (viewSnapshot) apply();
  else requestAnimationFrame(apply);
}

export function resetMermaidDiagramPanZoom(host) {
  if (!(host instanceof Element)) return;
  const state = hostState.get(host);
  if (state?.reset) {
    state.reset();
    return;
  }
  ensureMermaidDiagramPanZoom(host, { reset: true });
}
