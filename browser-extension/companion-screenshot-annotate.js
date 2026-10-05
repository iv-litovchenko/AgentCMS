(function initScreenshotAnnotate(global) {
  if (global.__companionScreenshotAnnotateInit) return;
  if (window !== window.top) return;
  global.__companionScreenshotAnnotateInit = true;

  const COLORS = ["#ef4444", "#22d3ee", "#facc15", "#ffffff"];
  const LINE_WIDTHS = [2, 4, 7, 12];
  const TOOL_DEFS = [
    { id: "arrow", title: "Стрелка", icon: "arrow" },
    { id: "rect", title: "Прямоугольник", icon: "rect" },
    { id: "ellipse", title: "Круг / овал", icon: "ellipse" },
    { id: "pen", title: "Карандаш", icon: "pen" },
    { id: "marker", title: "Маркер", icon: "marker" }
  ];

  const SVG = {
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6"/><path d="M11 6h7v7"/></svg>',
    rect:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>',
    ellipse:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>',
    pen:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    marker:
      '<svg viewBox="0 0 24 24" aria-hidden="true" class="asc-shot-annotate-ico-marker"><path class="asc-shot-annotate-ico-marker-body" d="M4 20h3.5L18 9.5 14.5 6 3.5 17v3Z"/><path d="m15 5 4 4"/><path d="M3 21h4"/></svg>',
    undo:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a4 4 0 0 1 4 4v1"/></svg>',
    redo:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a4 4 0 0 0-4 4v1"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не удалось загрузить превью"));
      img.src = dataUrl;
    });
  }

  function fitSize(imgW, imgH, maxW, maxH) {
    const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
    return {
      width: Math.max(1, Math.round(imgW * ratio)),
      height: Math.max(1, Math.round(imgH * ratio)),
      scale: ratio
    };
  }

  function drawArrow(ctx, x1, y1, x2, y2, width) {
    const head = Math.max(16, width * 5.5);
    const wing = Math.PI / 5;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const shaftEndX = x2 - head * 0.55 * Math.cos(angle);
    const shaftEndY = y2 - head * 0.55 * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - wing), y2 - head * Math.sin(angle - wing));
    ctx.lineTo(x2 - head * Math.cos(angle + wing), y2 - head * Math.sin(angle + wing));
    ctx.closePath();
    ctx.fill();
  }

  function withStrokeStyle(ctx, stroke, drawFn) {
    const prevAlpha = ctx.globalAlpha;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = stroke.type === "marker" ? stroke.opacity ?? 0.42 : 1;
    drawFn();
    ctx.globalAlpha = prevAlpha;
  }

  function drawStroke(ctx, stroke) {
    withStrokeStyle(ctx, stroke, () => {
      if ((stroke.type === "pen" || stroke.type === "marker") && stroke.points?.length) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i += 1) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        return;
      }
      if (stroke.type === "rect" && stroke.rect) {
        const { x, y, w, h } = stroke.rect;
        ctx.strokeRect(x, y, w, h);
        return;
      }
      if (stroke.type === "ellipse" && stroke.rect) {
        const { x, y, w, h } = stroke.rect;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      if (stroke.type === "arrow" && stroke.from && stroke.to) {
        drawArrow(ctx, stroke.from.x, stroke.from.y, stroke.to.x, stroke.to.y, stroke.width);
      }
    });
  }

  function scaleStroke(stroke, inv) {
    const scaled = { ...stroke, width: stroke.width * inv };
    if (stroke.opacity != null) scaled.opacity = stroke.opacity;
    if (stroke.points) {
      scaled.points = stroke.points.map((p) => ({ x: p.x * inv, y: p.y * inv }));
    }
    if (stroke.rect) {
      scaled.rect = {
        x: stroke.rect.x * inv,
        y: stroke.rect.y * inv,
        w: stroke.rect.w * inv,
        h: stroke.rect.h * inv
      };
    }
    if (stroke.from && stroke.to) {
      scaled.from = { x: stroke.from.x * inv, y: stroke.from.y * inv };
      scaled.to = { x: stroke.to.x * inv, y: stroke.to.y * inv };
    }
    return scaled;
  }

  function exportAnnotatedPng(img, strokes, displayScale) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен");
    ctx.drawImage(img, 0, 0);
    const inv = 1 / displayScale;
    for (const stroke of strokes) {
      drawStroke(ctx, scaleStroke(stroke, inv));
    }
    return canvas.toDataURL("image/png");
  }

  function openScreenshotAnnotateEditor(dataUrl) {
    return new Promise((resolve) => {
      let settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        document.documentElement.classList.remove("asc-screenshot-annotate-active");
        globalThis.syncCompanionCrosshair?.();
        root.remove();
        document.removeEventListener("keydown", onKeyDown, true);
        resolve(result);
      }

      const root = document.createElement("div");
      root.className = "asc-shot-annotate-root";
      root.setAttribute("role", "presentation");

      const backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "asc-shot-annotate-backdrop";
      backdrop.setAttribute("aria-label", "Закрыть разметку");

      const dialog = document.createElement("div");
      dialog.className = "asc-shot-annotate-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", "Разметка скриншота");

      const head = document.createElement("div");
      head.className = "asc-shot-annotate-head";

      const title = document.createElement("h2");
      title.className = "asc-shot-annotate-title";
      title.id = "asc-shot-annotate-title";
      title.textContent = "Разметка скриншота";

      const closeHeadBtn = document.createElement("button");
      closeHeadBtn.type = "button";
      closeHeadBtn.className = "asc-shot-annotate-close";
      closeHeadBtn.title = "Закрыть";
      closeHeadBtn.setAttribute("aria-label", "Закрыть");
      closeHeadBtn.innerHTML = SVG.close;

      head.append(title, closeHeadBtn);
      dialog.setAttribute("aria-labelledby", "asc-shot-annotate-title");

      const tools = document.createElement("div");
      tools.className = "asc-shot-annotate-tools";

      const historyWrap = document.createElement("div");
      historyWrap.className = "asc-shot-annotate-tool-group asc-shot-annotate-tool-group--history";

      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "asc-shot-annotate-tool asc-shot-annotate-tool--icon";
      undoBtn.title = "Назад (Ctrl+Z)";
      undoBtn.setAttribute("aria-label", "Назад");
      undoBtn.innerHTML = SVG.undo;

      const redoBtn = document.createElement("button");
      redoBtn.type = "button";
      redoBtn.className = "asc-shot-annotate-tool asc-shot-annotate-tool--icon";
      redoBtn.title = "Вперёд (Ctrl+Shift+Z)";
      redoBtn.setAttribute("aria-label", "Вперёд");
      redoBtn.innerHTML = SVG.redo;

      historyWrap.append(undoBtn, redoBtn);

      const drawWrap = document.createElement("div");
      drawWrap.className = "asc-shot-annotate-tool-group asc-shot-annotate-tool-group--draw";

      const sizeWrap = document.createElement("div");
      sizeWrap.className = "asc-shot-annotate-tool-group asc-shot-annotate-sizes";

      const sizeLabel = document.createElement("label");
      sizeLabel.className = "asc-shot-annotate-size-label";
      sizeLabel.textContent = "Толщина";

      const sizeSelect = document.createElement("select");
      sizeSelect.className = "asc-shot-annotate-size-select";
      sizeSelect.setAttribute("aria-label", "Толщина линии");
      for (const w of LINE_WIDTHS) {
        const opt = document.createElement("option");
        opt.value = String(w);
        opt.textContent = `${w} px`;
        sizeSelect.append(opt);
      }
      sizeSelect.addEventListener("change", () => setLineWidth(Number(sizeSelect.value)));
      sizeLabel.append(sizeSelect);
      sizeWrap.append(sizeLabel);
      sizeWrap.setAttribute("role", "group");
      sizeWrap.setAttribute("aria-label", "Толщина линии");

      const stageWrap = document.createElement("div");
      stageWrap.className = "asc-shot-annotate-stage-wrap";
      const stage = document.createElement("div");
      stage.className = "asc-shot-annotate-stage";
      const baseCanvas = document.createElement("canvas");
      baseCanvas.className = "asc-shot-annotate-canvas asc-shot-annotate-canvas--base";
      const drawCanvas = document.createElement("canvas");
      drawCanvas.className = "asc-shot-annotate-canvas asc-shot-annotate-canvas--draw";
      stage.append(baseCanvas, drawCanvas);
      stageWrap.append(stage);

      const foot = document.createElement("div");
      foot.className = "asc-shot-annotate-foot";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "asc-shot-annotate-btn asc-shot-annotate-btn--ghost";
      cancelBtn.textContent = "Отмена";

      const composeBtn = document.createElement("button");
      composeBtn.type = "button";
      composeBtn.className = "asc-shot-annotate-btn asc-shot-annotate-btn--primary";
      composeBtn.textContent = "В чат";

      const clipBtn = document.createElement("button");
      clipBtn.type = "button";
      clipBtn.className = "asc-shot-annotate-btn";
      clipBtn.textContent = "В буфер";

      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "asc-shot-annotate-btn";
      downloadBtn.textContent = "Скачать PNG";

      foot.append(cancelBtn, downloadBtn, clipBtn, composeBtn);
      dialog.append(head, tools, stageWrap, foot);
      root.append(backdrop, dialog);
      document.body.appendChild(root);
      document.documentElement.classList.add("asc-screenshot-annotate-active");

      let img = null;
      let displayScale = 1;
      let tool = "arrow";
      let color = COLORS[0];
      let lineWidth = LINE_WIDTHS[1];
      const strokes = [];
      const redoStack = [];
      let draft = null;
      let drawing = false;

      const drawCtx = drawCanvas.getContext("2d");

      function setTool(next) {
        tool = next;
        for (const btn of tools.querySelectorAll("[data-tool]")) {
          btn.classList.toggle("is-active", btn.getAttribute("data-tool") === tool);
        }
      }

      function setColor(next) {
        color = next;
        for (const btn of tools.querySelectorAll("[data-color]")) {
          btn.classList.toggle("is-active", btn.getAttribute("data-color") === color);
        }
      }

      function setLineWidth(next) {
        const w = Number(next);
        if (!LINE_WIDTHS.includes(w)) return;
        lineWidth = w;
        if (sizeSelect) sizeSelect.value = String(w);
      }

      function updateHistoryButtons() {
        undoBtn.disabled = strokes.length === 0;
        redoBtn.disabled = redoStack.length === 0;
      }

      function redraw() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        for (const stroke of strokes) drawStroke(drawCtx, stroke);
        if (draft) drawStroke(drawCtx, draft);
        updateHistoryButtons();
      }

      function commitStroke(stroke) {
        strokes.push(stroke);
        redoStack.length = 0;
        redraw();
      }

      function undo() {
        const last = strokes.pop();
        if (!last) return;
        redoStack.push(last);
        redraw();
      }

      function redo() {
        const next = redoStack.pop();
        if (!next) return;
        strokes.push(next);
        redraw();
      }

      function pointerToLocal(event) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
          x: ((event.clientX - rect.left) / rect.width) * drawCanvas.width,
          y: ((event.clientY - rect.top) / rect.height) * drawCanvas.height
        };
      }

      function strokeWidthForTool() {
        if (tool === "marker") return lineWidth * 3;
        return lineWidth;
      }

      function onPointerDown(event) {
        if (event.button !== 0) return;
        drawing = true;
        drawCanvas.setPointerCapture(event.pointerId);
        const p = pointerToLocal(event);
        const width = strokeWidthForTool();
        if (tool === "pen" || tool === "marker") {
          draft = { type: tool, color, width, points: [p] };
          if (tool === "marker") draft.opacity = 0.42;
        } else {
          draft = { type: tool, color, width, from: p, to: p };
          if (tool === "rect" || tool === "ellipse") {
            draft.rect = { x: p.x, y: p.y, w: 0, h: 0 };
          }
        }
        redraw();
        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!drawing || !draft) return;
        const p = pointerToLocal(event);
        if (draft.type === "pen" || draft.type === "marker") {
          draft.points.push(p);
        } else {
          draft.to = p;
          if (draft.rect && draft.from) {
            const x = Math.min(draft.from.x, p.x);
            const y = Math.min(draft.from.y, p.y);
            draft.rect = {
              x,
              y,
              w: Math.abs(p.x - draft.from.x),
              h: Math.abs(p.y - draft.from.y)
            };
          }
        }
        redraw();
        event.preventDefault();
      }

      function onPointerUp(event) {
        if (!drawing) return;
        drawing = false;
        try {
          drawCanvas.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
        if (draft) {
          const minSize = 4;
          let keep = true;
          if (draft.rect) {
            keep = draft.rect.w >= minSize && draft.rect.h >= minSize;
          } else if (draft.type === "arrow" && draft.from && draft.to) {
            keep = Math.hypot(draft.to.x - draft.from.x, draft.to.y - draft.from.y) >= minSize;
          } else if (draft.type === "pen" || draft.type === "marker") {
            keep = (draft.points?.length || 0) > 1;
          }
          if (keep) commitStroke(draft);
          else redraw();
        }
        draft = null;
      }

      function buildExport() {
        if (!img) return dataUrl;
        return exportAnnotatedPng(img, strokes, displayScale);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(null);
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
        }
      }

      for (const def of TOOL_DEFS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "asc-shot-annotate-tool asc-shot-annotate-tool--icon";
        btn.setAttribute("data-tool", def.id);
        btn.title = def.title;
        btn.setAttribute("aria-label", def.title);
        btn.innerHTML = SVG[def.icon];
        btn.addEventListener("click", () => setTool(def.id));
        drawWrap.append(btn);
      }

      tools.append(historyWrap, drawWrap, sizeWrap);

      const colorWrap = document.createElement("div");
      colorWrap.className = "asc-shot-annotate-tool-group asc-shot-annotate-colors";
      for (const c of COLORS) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "asc-shot-annotate-color";
        sw.setAttribute("data-color", c);
        sw.style.setProperty("--asc-shot-color", c);
        sw.title = c;
        sw.addEventListener("click", () => setColor(c));
        colorWrap.append(sw);
      }
      tools.append(colorWrap);

      undoBtn.addEventListener("click", () => undo());
      redoBtn.addEventListener("click", () => redo());

      setTool("arrow");
      setColor(COLORS[0]);
      setLineWidth(lineWidth);
      updateHistoryButtons();

      drawCanvas.addEventListener("pointerdown", onPointerDown);
      drawCanvas.addEventListener("pointermove", onPointerMove);
      drawCanvas.addEventListener("pointerup", onPointerUp);
      drawCanvas.addEventListener("pointercancel", onPointerUp);

      backdrop.addEventListener("click", () => finish(null));
      closeHeadBtn.addEventListener("click", () => finish(null));
      cancelBtn.addEventListener("click", () => finish(null));
      composeBtn.addEventListener("click", () => {
        try {
          finish({ destination: "compose", dataUrl: buildExport() });
        } catch {
          finish(null);
        }
      });
      clipBtn.addEventListener("click", () => {
        try {
          finish({ destination: "clipboard", dataUrl: buildExport() });
        } catch {
          finish(null);
        }
      });
      downloadBtn.addEventListener("click", () => {
        try {
          finish({ destination: "download", dataUrl: buildExport() });
        } catch {
          finish(null);
        }
      });

      document.addEventListener("keydown", onKeyDown, true);

      void loadImage(dataUrl)
        .then((loaded) => {
          img = loaded;
          const maxW = Math.min(window.innerWidth - 48, 920);
          const maxH = Math.min(window.innerHeight - 200, 640);
          const fit = fitSize(img.naturalWidth, img.naturalHeight, maxW, maxH);
          displayScale = fit.scale;
          stage.style.width = `${fit.width}px`;
          stage.style.height = `${fit.height}px`;
          for (const canvas of [baseCanvas, drawCanvas]) {
            canvas.width = fit.width;
            canvas.height = fit.height;
            canvas.style.width = `${fit.width}px`;
            canvas.style.height = `${fit.height}px`;
          }
          const bctx = baseCanvas.getContext("2d");
          bctx.drawImage(img, 0, 0, fit.width, fit.height);
        })
        .catch(() => finish(null));
    });
  }

  global.openScreenshotAnnotateEditor = openScreenshotAnnotateEditor;
})(globalThis);
