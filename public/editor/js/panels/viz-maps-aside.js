/**
 * Карты визуализации (*.viz.md) в группе «Визуализация» панели свойств.
 * Не использует awn-viz-* — RMM mindmap/roadmap остаются как были.
 */
(function initVizMapsAside() {
  const GROUP_CLASS = "props-viz-maps-group";
  const COLLAPSE_KEY = "yamlcms.propsVizMapsCollapsed";

  function buildApiUrl(apiPath, params = {}) {
    if (typeof window.buildApiUrl === "function") {
      return window.buildApiUrl(apiPath, params);
    }
    const search = new URLSearchParams(params);
    return `${apiPath}?${search.toString()}`;
  }

  function toast(message, tone = "info") {
    if (typeof window.showToast === "function") window.showToast(message, tone);
  }

  function isRecordMdPath(contextPath) {
    const p = String(contextPath || "").replace(/\\/g, "/");
    if (!p || p.endsWith("/manifest.md")) return false;
    if (!/\.md$/i.test(p)) return false;
    if (/\.viz\.md$/i.test(p)) return false;
    return true;
  }

  function findVisualizationGroup(container) {
    for (const group of container.querySelectorAll(".props-form-group--collapsible")) {
      const title = group.querySelector(".props-form-group-title");
      if (title && /визуал/i.test(String(title.textContent || ""))) return group;
    }
    return null;
  }

  function loadCollapsed() {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function saveCollapsed(value) {
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function renderRow(row, { readOnly, about, onRefresh }) {
    const item = document.createElement("div");
    item.className = "props-viz-maps-row";
    item.dataset.vizKind = row.kind;

    const icon = document.createElement("span");
    icon.className = "props-viz-maps-row-icon";
    icon.textContent = row.icon || "🗺";
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "props-viz-maps-row-copy";
    const label = document.createElement("div");
    label.className = "props-viz-maps-row-label";
    label.textContent = row.label || row.kind;
    const meta = document.createElement("div");
    meta.className = "props-viz-maps-row-meta";
    meta.textContent = row.map ? row.map.path : row.expectedPath || `${row.kind}.viz.md`;
    copy.append(label, meta);

    const actions = document.createElement("div");
    actions.className = "props-viz-maps-row-actions";

    if (row.map) {
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "props-viz-maps-btn props-viz-maps-btn--open";
      openBtn.textContent = "Открыть";
      openBtn.addEventListener("click", () => {
        void window.agentCmsOpenVizMap?.(row.map.path, about);
      });
      actions.appendChild(openBtn);
    } else if (!readOnly) {
      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.className = "props-viz-maps-btn props-viz-maps-btn--create";
      createBtn.textContent = "Создать";
      createBtn.addEventListener("click", () => {
        createBtn.disabled = true;
        fetch(buildApiUrl("/api/viz/map"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ about, kind: row.kind })
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.error) throw new Error(data.error);
            toast(`Карта «${row.label}» создана`, "success");
            if (data.path) void window.agentCmsOpenVizMap?.(data.path, about);
            onRefresh();
          })
          .catch((err) => toast(err.message || "Не удалось создать карту", "error"))
          .finally(() => {
            createBtn.disabled = false;
          });
      });
      actions.appendChild(createBtn);
    } else {
      const empty = document.createElement("span");
      empty.className = "props-viz-maps-row-empty";
      empty.textContent = "—";
      actions.appendChild(empty);
    }

    item.append(icon, copy, actions);
    return item;
  }

  async function renderBlock({ container, readOnly, contextPath }) {
    if (!container) return;
    container.querySelectorAll(`.${GROUP_CLASS}`).forEach((node) => node.remove());

    const about = String(contextPath || "").replace(/\\/g, "/").trim();
    if (!isRecordMdPath(about)) return;

    const host = document.createElement("div");
    host.className = GROUP_CLASS;

    const intro = document.createElement("p");
    intro.className = "props-viz-maps-hint";
    intro.textContent =
      "Живые карты *.viz.md (атлас). Поля awn-viz-* выше — для RMM «Интеллект-карта» / «Дорожная карта» в canvas.";

    const list = document.createElement("div");
    list.className = "props-viz-maps-list";
    list.textContent = "Загрузка…";
    host.append(intro, list);

    const collapsed = loadCollapsed();
    const vizGroup = findVisualizationGroup(container);
    if (vizGroup) {
      const body = vizGroup.querySelector(".props-form-group-body");
      if (body) body.appendChild(host);
      else vizGroup.appendChild(host);
    } else {
      const wrap = document.createElement("section");
      wrap.className = "props-form-group props-form-group--collapsible props-viz-maps-fallback";
      wrap.classList.toggle("is-collapsed", collapsed);
      const header = document.createElement("button");
      header.type = "button";
      header.className = "props-form-group-toggle";
      header.setAttribute("aria-expanded", String(!collapsed));
      const title = document.createElement("span");
      title.className = "props-form-group-title";
      title.textContent = "Карты .viz.md";
      header.appendChild(title);
      header.addEventListener("click", () => {
        const now = !wrap.classList.contains("is-collapsed");
        wrap.classList.toggle("is-collapsed", now);
        header.setAttribute("aria-expanded", String(!now));
        saveCollapsed(now);
      });
      const body = document.createElement("div");
      body.className = "props-form-group-body";
      body.appendChild(host);
      wrap.append(header, body);
      container.appendChild(wrap);
      return;
    }

    async function refresh() {
      list.textContent = "Загрузка…";
      try {
        const response = await fetch(buildApiUrl("/api/viz/maps-for-about", { about }));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || response.statusText);
        list.replaceChildren();
        const maps = Array.isArray(data.maps) ? data.maps : [];
        if (!maps.length) {
          list.textContent = "Нет зарегистрированных видов карт.";
          return;
        }
        for (const row of maps) {
          list.appendChild(renderRow(row, { readOnly, about, onRefresh: refresh }));
        }
      } catch (error) {
        list.textContent = `Ошибка: ${error.message}`;
      }
    }

    await refresh();
  }

  window.agentCmsRenderVizMapsAside = function agentCmsRenderVizMapsAside(options = {}) {
    void renderBlock(options);
  };
})();
