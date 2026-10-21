/**
 * Карты визуализации (*.viz.md) — вкладка «Карты» боковой панели документа.
 * Не использует awn-viz-* — RMM mindmap/roadmap остаются как были.
 */
(function initVizMapsAside() {
  const MOUNT_ID = "doc-viz-maps-content";
  const GROUP_CLASS = "props-viz-maps-group";

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

  async function confirmVizMapsAction(message, { okLabel, title = "Подтверждение", hint = "" } = {}) {
    const ask = typeof window.askConfirm === "function" ? window.askConfirm : null;
    if (ask) {
      return ask(message, {
        okLabel,
        cancelLabel: "Отмена",
        title,
        hint,
        icon: "🗺",
        variant: "info"
      });
    }
    return window.confirm(String(message || "").replace(/\n+/g, " "));
  }

  function isVizMapsAsideHostPath(contextPath) {
    if (typeof window.isVizMapsAboutHostRelPath === "function") {
      return window.isVizMapsAboutHostRelPath(contextPath);
    }
    const p = String(contextPath || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
    if (!p || !/\.md$/i.test(p)) return false;
    if (/\.viz\.md$/i.test(p)) return false;
    if (/\/manifest\.md$/i.test(p)) return true;
    return true;
  }

  window.agentCmsVizMapsAsideAvailable = function agentCmsVizMapsAsideAvailable(contextPath) {
    return isVizMapsAsideHostPath(contextPath);
  };

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
        void (async () => {
          const label = row.label || row.kind;
          const mapPath = row.map?.path || "";
          const confirmed = await confirmVizMapsAction(`Открыть карту «${label}»?`, {
            okLabel: "Открыть",
            title: "Открыть карту",
            hint: mapPath ? mapPath.split("/").pop() || mapPath : ""
          });
          if (!confirmed) return;
          void window.agentCmsOpenVizMap?.(mapPath, about);
        })();
      });
      actions.appendChild(openBtn);
    } else if (!readOnly) {
      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.className = "props-viz-maps-btn props-viz-maps-btn--create";
      createBtn.textContent = "Создать";
      createBtn.addEventListener("click", () => {
        void (async () => {
          const label = row.label || row.kind;
          const confirmed = await confirmVizMapsAction(
            `Создать карту «${label}» для этого узла?\n\nФайл появится в assets/viz/{awn-id}/.`,
            {
              okLabel: "Создать",
              title: "Создать карту",
              hint: row.expectedPath ? row.expectedPath.split("/").pop() || row.expectedPath : `${row.kind}.viz.md`
            }
          );
          if (!confirmed) return;
          createBtn.disabled = true;
          try {
            const response = await fetch(buildApiUrl("/api/viz/map"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ about, kind: row.kind })
            });
            const data = await response.json();
            if (data.error) {
              const hint = data.hint ? ` ${data.hint}` : "";
              throw new Error(`${data.error}.${hint}`);
            }
            toast(`Карта «${label}» создана`, "success");
            if (data.path) void window.agentCmsOpenVizMap?.(data.path, about);
            onRefresh();
          } catch (err) {
            toast(err.message || "Не удалось создать карту", "error");
          } finally {
            createBtn.disabled = false;
          }
        })();
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

  function renderVizMapsLoading(list) {
    list.replaceChildren();
    list.classList.add("props-viz-maps-list--loading");
    list.setAttribute("aria-busy", "true");
    list.setAttribute("aria-live", "polite");

    const status = document.createElement("p");
    status.className = "props-viz-maps-loading-status";
    const spinner = document.createElement("span");
    spinner.className = "props-viz-maps-loading-spinner";
    spinner.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = "Загрузка видов карт…";
    status.append(spinner, label);

    const skeleton = document.createElement("div");
    skeleton.className = "props-viz-maps-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 5; i += 1) {
      const row = document.createElement("div");
      row.className = "props-viz-maps-skeleton-row";
      row.style.setProperty("--viz-skeleton-delay", `${i * 0.07}s`);

      const icon = document.createElement("span");
      icon.className = "props-viz-maps-skeleton-icon";

      const copy = document.createElement("span");
      copy.className = "props-viz-maps-skeleton-copy";
      const title = document.createElement("span");
      title.className = "props-viz-maps-skeleton-line props-viz-maps-skeleton-line--title";
      const meta = document.createElement("span");
      meta.className = "props-viz-maps-skeleton-line props-viz-maps-skeleton-line--meta";
      copy.append(title, meta);

      const btn = document.createElement("span");
      btn.className = "props-viz-maps-skeleton-btn";

      row.append(icon, copy, btn);
      skeleton.appendChild(row);
    }

    list.append(status, skeleton);
  }

  function finishVizMapsLoading(list) {
    list.classList.remove("props-viz-maps-list--loading");
    list.removeAttribute("aria-busy");
  }

  async function renderBlock({ readOnly, contextPath } = {}) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    mount.replaceChildren();

    const about = String(contextPath || "").replace(/\\/g, "/").trim();
    if (!isVizMapsAsideHostPath(about)) {
      const empty = document.createElement("p");
      empty.className = "doc-viz-maps-empty";
      empty.textContent =
        "Карты *.viz.md доступны для записей и для manifest темы или раздела (нужен awn-id у этого файла).";
      mount.appendChild(empty);
      return;
    }

    const host = document.createElement("div");
    host.className = GROUP_CLASS;

    const intro = document.createElement("p");
    intro.className = "props-viz-maps-hint";
    intro.textContent =
      "Карты в assets/viz/{awn-id}/ — нужен awn-id у записи, темы или раздела (manifest). Legacy *.viz.md рядом с файлом только читаются.";

    const list = document.createElement("div");
    list.className = "props-viz-maps-list";
    host.append(intro, list);
    mount.appendChild(host);

    async function refresh() {
      renderVizMapsLoading(list);
      try {
        const response = await fetch(buildApiUrl("/api/viz/maps-for-about", { about }));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || response.statusText);
        finishVizMapsLoading(list);
        list.replaceChildren();
        const maps = Array.isArray(data.maps) ? data.maps : [];
        if (!maps.length) {
          const empty = document.createElement("p");
          empty.className = "props-viz-maps-empty";
          empty.textContent = "Нет зарегистрированных видов карт.";
          list.appendChild(empty);
          return;
        }
        for (const row of maps) {
          list.appendChild(renderRow(row, { readOnly, about, onRefresh: refresh }));
        }
      } catch (error) {
        finishVizMapsLoading(list);
        list.replaceChildren();
        const err = document.createElement("p");
        err.className = "props-viz-maps-error";
        err.textContent = `Ошибка: ${error.message}`;
        list.appendChild(err);
      }
    }

    await refresh();
  }

  window.agentCmsRenderVizMapsAside = function agentCmsRenderVizMapsAside(options = {}) {
    void renderBlock(options);
  };
})();
