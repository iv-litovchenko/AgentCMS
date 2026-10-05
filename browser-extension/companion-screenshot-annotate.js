(function initScreenshotAnnotate(global) {
  if (global.__companionScreenshotAnnotateInit) return;
  if (window !== window.top) return;
  global.__companionScreenshotAnnotateInit = true;

  const COLORS = ["#ef4444", "#22d3ee", "#facc15", "#ffffff"];
  const TOOLS = ["pen", "arrow", "rect"];

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
    const head = Math.max(10, width * 3.2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  function drawStroke(ctx, stroke) {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (stroke.type === "pen" && stroke.points?.length) {
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
    if (stroke.type === "arrow" && stroke.from && stroke.to) {
      drawArrow(ctx, stroke.from.x, stroke.from.y, stroke.to.x, stroke.to.y, stroke.width);
    }
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
      const scaled = { ...stroke, width: stroke.width * inv };
      if (stroke.type === "pen" && stroke.points) {
        scaled.points = stroke.points.map((p) => ({ x: p.x * inv, y: p.y * inv }));
      }
      if (stroke.type === "rect" && stroke.rect) {
        scaled.rect = {
          x: stroke.rect.x * inv,
          y: stroke.rect.y * inv,
          w: stroke.rect.w * inv,
          h: stroke.rect.h * inv
        };
      }
      if (stroke.type === "arrow" && stroke.from && stroke.to) {
        scaled.from = { x: stroke.from.x * inv, y: stroke.from.y * inv };
        scaled.to = { x: stroke.to.x * inv, y: stroke.to.y * inv };
      }
      drawStroke(ctx, scaled);
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
      head.innerHTML = "<h2 class=\"asc-shot-annotate-title\">Разметка скриншота</h2>";

      const tools = document.createElement("div");
      tools.className = "asc-shot-annotate-tools";

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
      let lineWidth = 3;
      const strokes = [];
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

      function redraw() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        for (const stroke of strokes) drawStroke(drawCtx, stroke);
        if (draft) drawStroke(drawCtx, draft);
      }

      function pointerToLocal(event) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
          x: ((event.clientX - rect.left) / rect.width) * drawCanvas.width,
          y: ((event.clientY - rect.top) / rect.height) * drawCanvas.height
        };
      }

      function onPointerDown(event) {
        if (event.button !== 0) return;
        drawing = true;
        drawCanvas.setPointerCapture(event.pointerId);
        const p = pointerToLocal(event);
        if (tool === "pen") {
          draft = { type: "pen", color, width: lineWidth, points: [p] };
        } else {
          draft = { type: tool, color, width: lineWidth, from: p, to: p };
          if (tool === "rect") draft.rect = { x: p.x, y: p.y, w: 0, h: 0 };
        }
        redraw();
        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!drawing || !draft) return;
        const p = pointerToLocal(event);
        if (draft.type === "pen") {
          draft.points.push(p);
        } else {
          draft.to = p;
          if (draft.type === "rect" && draft.from) {
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
          if (draft.type === "rect" && draft.rect) {
            keep = draft.rect.w >= minSize && draft.rect.h >= minSize;
          } else if (draft.type === "arrow" && draft.from && draft.to) {
            const dx = draft.to.x - draft.from.x;
            const dy = draft.to.y - draft.from.y;
            keep = Math.hypot(dx, dy) >= minSize;
          } else if (draft.type === "pen") {
            keep = (draft.points?.length || 0) > 1;
          }
          if (keep) strokes.push(draft);
        }
        draft = null;
        redraw();
      }

      function undo() {
        strokes.pop();
        redraw();
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
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          undo();
        }
      }

      for (const id of TOOLS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "asc-shot-annotate-tool";
        btn.setAttribute("data-tool", id);
        btn.title =
          id === "pen" ? "Карандаш" : id === "arrow" ? "Стрелка" : "Прямоугольник";
        btn.textContent = id === "pen" ? "✏️" : id === "arrow" ? "↗" : "▢";
        btn.addEventListener("click", () => setTool(id));
        tools.append(btn);
      }

      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "asc-shot-annotate-tool";
      undoBtn.title = "Отменить (Ctrl+Z)";
      undoBtn.textContent = "↶";
      undoBtn.addEventListener("click", () => undo());
      tools.append(undoBtn);

      const colorWrap = document.createElement("div");
      colorWrap.className = "asc-shot-annotate-colors";
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

      setTool("arrow");
      setColor(COLORS[0]);

      drawCanvas.addEventListener("pointerdown", onPointerDown);
      drawCanvas.addEventListener("pointermove", onPointerMove);
      drawCanvas.addEventListener("pointerup", onPointerUp);
      drawCanvas.addEventListener("pointercancel", onPointerUp);

      backdrop.addEventListener("click", () => finish(null));
      cancelBtn.addEventListener("click", () => finish(null));
      composeBtn.addEventListener("click", () => {
        try {
          finish({ destination: "compose", dataUrl: buildExport() });
        } catch (error) {
          finish(null);
        }
      });
      clipBtn.addEventListener("click", () => {
        try {
          finish({ destination: "clipboard", dataUrl: buildExport() });
        } catch (error) {
          finish(null);
        }
      });
      downloadBtn.addEventListener("click", () => {
        try {
          finish({ destination: "download", dataUrl: buildExport() });
        } catch (error) {
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
