(function () {
  "use strict";

  const FOLDER = "awn-dashboards";
  const DEFAULT_SLUG = "home";
  const presenters = new Map();

  let ctx = {
    buildApiUrl: null,
    splitFrontmatter: null,
    parsePropsYaml: null,
    getPropsEntryValueByKey: null,
    escapeHtml: (value) => String(value ?? ""),
    getActiveAgentId: () => "",
    getTodoFileName: () => "TODO.md",
    setWorkspaceView: null,
    openFolderBrowse: null,
    contentHostNode: null,
    menuListNode: null,
    menuStatsNode: null,
    menuStatusDotNode: null,
    menuOpenBtn: null,
    menuRefreshBtn: null,
    toolbarBtn: null
  };

  let activeSlug = DEFAULT_SLUG;
  let renderSeq = 0;
  let menuLoadSeq = 0;
  let clockTimer = null;

  function registerPresenter(id, fn) {
    presenters.set(String(id || "").trim().toLowerCase(), fn);
  }

  function getEntry(entries, key) {
    if (!ctx.getPropsEntryValueByKey) return "";
    return ctx.getPropsEntryValueByKey(entries, key);
  }

  function getEntryNumber(entries, key, fallback = 0) {
    const raw = getEntry(entries, key);
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  }

  async function fetchWorkspaceText(relPath, agentId) {
    const response = await fetch(
      ctx.buildApiUrl("/api/workspace/fs/read", { path: relPath }, agentId)
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.error) return null;
    return String(data.content || "");
  }

  function parseWidgetMeta(raw, basePath) {
    const { frontmatter, body } = ctx.splitFrontmatter(raw);
    const entries = ctx.parsePropsYaml(frontmatter);
    const widgetRef = basePath.replace(/^awn-dashboards\//, "");
    return {
      ref: widgetRef,
      name: getEntry(entries, "awn-name") || widgetRef,
      present: getEntry(entries, "awn-dashboard-present") || "unknown",
      sourceKind: getEntry(entries, "awn-dashboard-source-kind") || "internal",
      builtin: getEntry(entries, "awn-dashboard-builtin") || "",
      sourceUrl: getEntry(entries, "awn-dashboard-source-url") || "",
      sourceMap: getEntry(entries, "awn-dashboard-source-map") || "",
      sourceSuffix: getEntry(entries, "awn-dashboard-source-suffix") || "",
      sourceTool: getEntry(entries, "awn-dashboard-source-tool") || "",
      limit: getEntryNumber(entries, "awn-dashboard-filter-limit", 5),
      chartType: getEntry(entries, "awn-dashboard-chart-type") || "bar",
      x: getEntryNumber(entries, "awn-dashboard-x", 0),
      y: getEntryNumber(entries, "awn-dashboard-y", 0),
      w: Math.max(1, getEntryNumber(entries, "awn-dashboard-w", 4)),
      h: Math.max(1, getEntryNumber(entries, "awn-dashboard-h", 1)),
      body: String(body || "").trim()
    };
  }

  function parseLayoutMeta(raw) {
    const { frontmatter } = ctx.splitFrontmatter(raw);
    const entries = ctx.parsePropsYaml(frontmatter);
    const widgetsEntry = entries.find((item) => item.key === "awn-dashboard-widgets");
    const widgetRefs = widgetsEntry?.kind === "array" ? widgetsEntry.value : [];
    return {
      name: getEntry(entries, "awn-name") || "Дашборд",
      grid: Math.max(1, getEntryNumber(entries, "awn-dashboard-grid", 12)),
      widgetRefs: widgetRefs.map((ref) => String(ref || "").trim()).filter(Boolean)
    };
  }

  function resolveWidgetPath(ref) {
    const normalized = String(ref || "").replace(/^\/+/, "");
    if (normalized.startsWith("widgets/")) return `${FOLDER}/${normalized}`;
    if (normalized.startsWith(`${FOLDER}/`)) return normalized;
    return `${FOLDER}/${normalized}`;
  }

  function createWidgetShell(meta) {
    const article = document.createElement("article");
    article.className = "awn-dashboard-widget";
    article.style.gridColumn = `${meta.x + 1} / span ${meta.w}`;
    article.style.gridRow = `${meta.y + 1} / span ${meta.h}`;

    const head = document.createElement("div");
    head.className = "awn-dashboard-widget-head";

    const title = document.createElement("h3");
    title.className = "awn-dashboard-widget-title";
    title.textContent = meta.name;

    const badge = document.createElement("span");
    badge.className = "awn-dashboard-widget-badge";
    badge.textContent = meta.present;

    head.append(title, badge);

    const body = document.createElement("div");
    body.className = "awn-dashboard-widget-body";

    const foot = document.createElement("div");
    foot.className = "awn-dashboard-widget-foot";
    const source = document.createElement("span");
    source.className = "awn-dashboard-widget-source";
    source.textContent = meta.sourceKind || "—";
    foot.appendChild(source);

    article.append(head, body, foot);
    return { article, body, foot };
  }

  function resolvePresenter(meta) {
    const key = String(meta.present || "").trim().toLowerCase();
    if (presenters.has(key)) return presenters.get(key);
    if (meta.sourceKind === "builtin" && meta.builtin === "clock") return presenters.get("clock");
    if (key === "stat" && meta.sourceKind === "external") return presenters.get("stat");
    if (key === "list" && meta.sourceKind === "internal") return presenters.get("list");
    if (
      key === "activity" ||
      meta.sourceTool === "list_recent_activity" ||
      meta.sourceTool === "read_workspace_activity"
    ) {
      return presenters.get("activity");
    }
    return presenters.get("unknown");
  }

  function parseTodoItems(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const items = [];
    for (const line of lines) {
      const match = line.match(/^\s*-\s+\[( |x|X)\]\s+(.+)$/);
      if (!match || match[1] !== " ") continue;
      items.push(match[2].trim());
    }
    return items;
  }

  registerPresenter("clock", (shell) => {
    const value = document.createElement("div");
    value.className = "awn-dashboard-stat-value";
    const sub = document.createElement("div");
    sub.className = "awn-dashboard-stat-sub";
    shell.body.replaceChildren(value, sub);

    const paint = () => {
      const now = new Date();
      value.textContent = now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      sub.textContent = now.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    };
    paint();
    if (clockTimer) window.clearInterval(clockTimer);
    clockTimer = window.setInterval(paint, 1000);
  });

  registerPresenter("calendar", (shell) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const monthLabel = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    const wrap = document.createElement("div");
    wrap.className = "awn-dashboard-calendar";

    const caption = document.createElement("div");
    caption.className = "awn-dashboard-calendar-caption";
    caption.textContent = monthLabel;

    const weekdays = document.createElement("div");
    weekdays.className = "awn-dashboard-calendar-weekdays";
    for (const day of ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]) {
      const cell = document.createElement("span");
      cell.textContent = day;
      weekdays.appendChild(cell);
    }

    const grid = document.createElement("div");
    grid.className = "awn-dashboard-calendar-grid";

    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i += 1) {
      const empty = document.createElement("span");
      empty.className = "awn-dashboard-calendar-day is-empty";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = document.createElement("span");
      cell.className = "awn-dashboard-calendar-day";
      if (day === today) cell.classList.add("is-today");
      cell.textContent = String(day);
      grid.appendChild(cell);
    }

    wrap.append(caption, weekdays, grid);
    shell.body.replaceChildren(wrap);
  });

  registerPresenter("stat", async (shell, meta) => {
    const value = document.createElement("div");
    value.className = "awn-dashboard-stat-value";
    value.textContent = "…";
    shell.body.replaceChildren(value);
    if (!meta.sourceUrl) {
      value.textContent = "—";
      return;
    }
    try {
      const response = await fetch(meta.sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      let extracted = data;
      if (meta.sourceMap) {
        extracted = meta.sourceMap.split(".").reduce((acc, key) => acc?.[key], data);
      }
      value.textContent = `${extracted ?? "—"}${meta.sourceSuffix || ""}`;
    } catch {
      value.textContent = "ошибка API";
      value.classList.add("is-error");
    }
  });

  registerPresenter("list", async (shell, meta, agentId) => {
    const list = document.createElement("ul");
    list.className = "awn-dashboard-list";
    shell.body.replaceChildren(list);

    if (meta.sourceTool === "read_workspace_todo") {
      try {
        const response = await fetch(
          ctx.buildApiUrl("/api/system-file", { name: ctx.getTodoFileName() }, agentId)
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const items = parseTodoItems(data.content).slice(0, meta.limit);
        if (!items.length) {
          list.innerHTML = `<li class="awn-dashboard-list-empty">Открытых задач нет</li>`;
          return;
        }
        for (const item of items) {
          const li = document.createElement("li");
          li.className = "awn-dashboard-list-item";
          li.innerHTML = `<span class="awn-dashboard-check" aria-hidden="true"></span><span>${ctx.escapeHtml(item)}</span>`;
          list.appendChild(li);
        }
        const link = document.createElement("button");
        link.type = "button";
        link.className = "awn-dashboard-widget-link";
        link.textContent = `все → ${ctx.getTodoFileName()}`;
        shell.foot.appendChild(link);
        return;
      } catch {
        list.innerHTML = `<li class="awn-dashboard-list-empty is-error">Не удалось загрузить TODO</li>`;
        return;
      }
    }

    list.innerHTML = `<li class="awn-dashboard-list-empty">Источник не настроен</li>`;
  });

  registerPresenter("markdown", (shell, meta) => {
    const node = document.createElement("div");
    node.className = "awn-dashboard-markdown";
    node.textContent = meta.body || "—";
    shell.body.replaceChildren(node);
  });

  function extractJsonBody(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : text;
  }

  function parseChartSeries(meta) {
    const raw = extractJsonBody(meta.body);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data.labels) && Array.isArray(data.values)) {
          return {
            labels: data.labels.map((item) => String(item)),
            values: data.values.map((item) => Number(item) || 0)
          };
        }
      } catch {
        // ignore invalid JSON in body
      }
    }
    return {
      labels: ["Пн", "Вт", "Ср", "Чт", "Пт"],
      values: [120, 85, 200, 140, 95]
    };
  }

  function renderBarChart(host, series) {
    const max = Math.max(...series.values, 1);
    const wrap = document.createElement("div");
    wrap.className = "awn-dashboard-chart awn-dashboard-chart--bar";
    const bars = document.createElement("div");
    bars.className = "awn-dashboard-chart-bars";
    for (let i = 0; i < series.labels.length; i += 1) {
      const col = document.createElement("div");
      col.className = "awn-dashboard-chart-bar-col";
      const value = series.values[i] || 0;
      const fill = document.createElement("span");
      fill.className = "awn-dashboard-chart-bar-fill";
      fill.style.height = `${Math.max(8, Math.round((value / max) * 100))}%`;
      fill.title = `${series.labels[i]}: ${value}`;
      const label = document.createElement("span");
      label.className = "awn-dashboard-chart-bar-label";
      label.textContent = series.labels[i];
      col.append(fill, label);
      bars.appendChild(col);
    }
    wrap.appendChild(bars);
    host.replaceChildren(wrap);
  }

  function renderLineChart(host, series) {
    const width = 280;
    const height = 120;
    const pad = 12;
    const max = Math.max(...series.values, 1);
    const min = Math.min(...series.values, 0);
    const range = Math.max(max - min, 1);
    const step = series.values.length > 1 ? (width - pad * 2) / (series.values.length - 1) : 0;
    const points = series.values.map((value, index) => {
      const x = pad + step * index;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    });

    const wrap = document.createElement("div");
    wrap.className = "awn-dashboard-chart awn-dashboard-chart--line";
    wrap.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="awn-dashboard-chart-svg" aria-hidden="true">
        <polyline class="awn-dashboard-chart-line" points="${points.join(" ")}" />
        ${points
          .map((point) => {
            const [x, y] = point.split(",");
            return `<circle class="awn-dashboard-chart-dot" cx="${x}" cy="${y}" r="3.5" />`;
          })
          .join("")}
      </svg>
      <div class="awn-dashboard-chart-legend">
        ${series.labels
          .map(
            (label, index) =>
              `<span>${ctx.escapeHtml(label)} <strong>${series.values[index]}</strong></span>`
          )
          .join("")}
      </div>
    `;
    host.replaceChildren(wrap);
  }

  registerPresenter("chart", (shell, meta) => {
    const series = parseChartSeries(meta);
    const chartType = String(meta.chartType || "bar").trim().toLowerCase();
    if (chartType === "line") {
      renderLineChart(shell.body, series);
      return;
    }
    renderBarChart(shell.body, series);
  });

  registerPresenter("kanban", (shell, meta) => {
    shell.body.innerHTML = `
      <div class="awn-dashboard-stub">
        <strong>kanban</strong>
        <p>Колонки появятся, когда источник вернёт статусы.</p>
        <code>${ctx.escapeHtml(meta.sourceTool || meta.ref)}</code>
      </div>
    `;
  });

  registerPresenter("activity", async (shell, meta, agentId) => {
    const list = document.createElement("ul");
    list.className = "awn-dashboard-list";
    shell.body.replaceChildren(list);

    try {
      const response = await fetch(
        ctx.buildApiUrl("/api/agent/activity", { limit: meta.limit || 5 }, agentId)
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];
      if (!events.length) {
        list.innerHTML = `<li class="awn-dashboard-list-empty">Пока нет изменений в ленте</li>`;
        return;
      }
      for (const event of events) {
        const li = document.createElement("li");
        li.className = "awn-dashboard-list-item awn-dashboard-activity-item";
        const title = event.label || event.topicName || event.path || "изменение";
        const action = event.action || "update";
        const ago = event.at
          ? new Date(event.at).toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })
          : "";
        li.innerHTML = `
          <span class="awn-dashboard-activity-dot" aria-hidden="true"></span>
          <span class="awn-dashboard-activity-copy">
            <span class="awn-dashboard-activity-title">${ctx.escapeHtml(title)}</span>
            <span class="awn-dashboard-activity-meta">${ctx.escapeHtml(action)}${ago ? ` · ${ctx.escapeHtml(ago)}` : ""}</span>
          </span>
        `;
        list.appendChild(li);
      }
    } catch {
      list.innerHTML = `<li class="awn-dashboard-list-empty is-error">Не удалось загрузить activity</li>`;
    }
  });

  registerPresenter("unknown", (shell, meta) => {
    shell.body.innerHTML = `
      <div class="awn-dashboard-stub">
        <strong>present: ${ctx.escapeHtml(meta.present)}</strong>
        <p>Нет рендера с таким id.</p>
        <p class="awn-dashboard-stub-hint">Добавьте: <code>AwnDashboards.registerPresenter('${ctx.escapeHtml(meta.present)}', fn)</code></p>
      </div>
    `;
  });

  async function renderWidget(meta, agentId) {
    const shell = createWidgetShell(meta);
    const presenter = resolvePresenter(meta);
    await presenter(shell, meta, agentId);
    return shell.article;
  }

  async function loadDashboard(slug, agentId) {
    const layoutPath = `${FOLDER}/${slug}/layout.md`;
    const layoutRaw = await fetchWorkspaceText(layoutPath, agentId);
    if (!layoutRaw) return null;

    const layout = parseLayoutMeta(layoutRaw);
    const widgets = [];
    for (const ref of layout.widgetRefs) {
      const widgetPath = resolveWidgetPath(ref);
      const widgetRaw = await fetchWorkspaceText(widgetPath, agentId);
      if (!widgetRaw) continue;
      widgets.push(parseWidgetMeta(widgetRaw, widgetPath));
    }
    return { slug, layout, widgets, layoutPath };
  }

  function renderEmptyState(host, message) {
    host.replaceChildren();
    const box = document.createElement("div");
    box.className = "awn-dashboard-empty";
    box.innerHTML = `<p>${ctx.escapeHtml(message)}</p><p class="awn-dashboard-empty-hint">Создайте <code>${FOLDER}/home/layout.md</code> и виджеты в <code>${FOLDER}/widgets/</code>.</p>`;
    host.appendChild(box);
  }

  async function renderActiveDashboard() {
    const host = ctx.contentHostNode;
    if (!host) return;

    const agentId = ctx.getActiveAgentId();
    const seq = ++renderSeq;
    host.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "awn-dashboard-loading";
    loading.textContent = "Загрузка дашборда…";
    host.appendChild(loading);

    const payload = await loadDashboard(activeSlug, agentId);
    if (seq !== renderSeq) return;
    host.replaceChildren();

    if (!payload) {
      renderEmptyState(host, `Дашборд «${activeSlug}» не найден.`);
      return;
    }

    const shell = document.createElement("div");
    shell.className = "awn-dashboard-shell";

    const head = document.createElement("header");
    head.className = "awn-dashboard-page-head";
    head.innerHTML = `
      <div>
        <p class="awn-dashboard-eyebrow">awn-dashboards / ${ctx.escapeHtml(payload.slug)}</p>
        <h2 class="awn-dashboard-title">${ctx.escapeHtml(payload.layout.name)}</h2>
        <p class="awn-dashboard-lead">present — любая строка. Рендеры регистрируются, не зашиваются в enum.</p>
      </div>
      <button type="button" class="awn-dashboard-open-folder-btn">Открыть папку</button>
    `;
    head.querySelector(".awn-dashboard-open-folder-btn")?.addEventListener("click", () => {
      ctx.openFolderBrowse?.("Дашборды", FOLDER, { agentId });
    });

    const grid = document.createElement("section");
    grid.className = "awn-dashboard-grid";
    grid.style.setProperty("--awn-dashboard-cols", String(payload.layout.grid));

    shell.append(head, grid);
    host.appendChild(shell);

    for (const meta of payload.widgets) {
      grid.appendChild(await renderWidget(meta, agentId));
    }

    if (!payload.widgets.length) {
      const empty = document.createElement("p");
      empty.className = "awn-dashboard-list-empty";
      empty.textContent = "В layout.md нет виджетов.";
      grid.appendChild(empty);
    }
  }

  function applyMenuStatusDot(data, options = {}) {
    const dot = ctx.menuStatusDotNode;
    if (!dot) return;
    const dashboards = data?.dashboards || [];
    const widgetCount = Number(data?.widgetCount) || 0;
    const exists = Boolean(data?.exists);
    const itemCount = dashboards.length + widgetCount;
    const hasItems = exists && itemCount > 0;
    const isActive = !options.loading && !options.error && hasItems;
    dot.textContent = isActive ? "🟢" : "⚪";
    dot.classList.toggle("is-active", isActive);
    dot.classList.toggle("is-empty", !isActive);
    dot.title = isActive
      ? `awn-dashboards: ${dashboards.length} дашборд(ов) · ${widgetCount} видж.`
      : exists
        ? "awn-dashboards: папка пуста"
        : "awn-dashboards: папка не создана";
  }

  function renderMenuStats(data, options = {}) {
    applyMenuStatusDot(data, options);
    const node = ctx.menuStatsNode;
    if (!node) return;
    if (options.loading) {
      node.textContent = "…";
      node.classList.remove("is-empty", "is-error");
      return;
    }
    if (options.error) {
      node.textContent = "—";
      node.classList.add("is-error");
      node.classList.remove("is-empty");
      return;
    }
    const dashboards = data?.dashboards || [];
    const widgetCount = Number(data?.widgetCount) || 0;
    node.textContent = dashboards.length
      ? `${dashboards.length} дашборд(ов) · ${widgetCount} виджетов`
      : data?.exists
        ? "Папка пуста"
        : "Папка не создана";
    node.classList.toggle("is-empty", dashboards.length === 0);
    node.classList.remove("is-error");
  }

  function renderMenuList(data) {
    const list = ctx.menuListNode;
    if (!list) return;
    list.replaceChildren();
    const dashboards = data?.dashboards || [];
    if (!dashboards.length) {
      const empty = document.createElement("p");
      empty.className = "menu-awn-dashboards-empty";
      empty.textContent = "Нет layout.md — создайте home/layout.md";
      list.appendChild(empty);
      return;
    }
    for (const item of dashboards) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-awn-dashboards-item";
      if (item.slug === activeSlug) btn.classList.add("is-active");
      btn.innerHTML = `<span class="menu-awn-dashboards-item-name">${ctx.escapeHtml(item.name)}</span><span class="menu-awn-dashboards-item-meta">${ctx.escapeHtml(item.slug)} · ${item.widgetCount} видж.</span>`;
      btn.addEventListener("click", () => {
        activeSlug = item.slug;
        ctx.setWorkspaceView?.("dashboard3");
        void renderActiveDashboard();
        void refreshMenuStats();
      });
      list.appendChild(btn);
    }
  }

  async function refreshMenuStats(agentId = ctx.getActiveAgentId()) {
    const seq = ++menuLoadSeq;
    renderMenuStats(null, { loading: true });
    if (!agentId) {
      renderMenuStats({ exists: false, dashboards: [], widgetCount: 0 });
      renderMenuList({ dashboards: [] });
      return;
    }
    try {
      const response = await fetch(
        ctx.buildApiUrl("/api/workspace/folder/browse", { folderPath: FOLDER }, agentId)
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (seq !== menuLoadSeq) return;
      const folders = Array.isArray(data.folders) ? data.folders : [];
      const dashboards = [];
      let widgetCount = 0;
      for (const folder of folders) {
        const slug = String(folder.name || folder.folderPath || "").split("/").pop();
        if (!slug || slug === "widgets") continue;
        const layoutRaw = await fetchWorkspaceText(`${FOLDER}/${slug}/layout.md`, agentId);
        if (!layoutRaw) continue;
        const layout = parseLayoutMeta(layoutRaw);
        widgetCount += layout.widgetRefs.length;
        dashboards.push({ slug, name: layout.name, widgetCount: layout.widgetRefs.length });
      }
      const widgetsBrowse = await fetch(
        ctx.buildApiUrl("/api/workspace/folder/browse", { folderPath: `${FOLDER}/widgets` }, agentId)
      );
      if (widgetsBrowse.ok) {
        const widgetsData = await widgetsBrowse.json();
        const pages = Array.isArray(widgetsData.pages) ? widgetsData.pages : [];
        if (!widgetCount) widgetCount = pages.length;
      }
      if (seq !== menuLoadSeq) return;
      renderMenuStats({ exists: Boolean(data.exists), dashboards, widgetCount });
      renderMenuList({ dashboards });
    } catch {
      if (seq !== menuLoadSeq) return;
      renderMenuStats(null, { error: true });
      renderMenuList({ dashboards: [] });
    }
  }

  function setupUi() {
    ctx.menuOpenBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      ctx.openFolderBrowse?.("Дашборды", FOLDER, { agentId: ctx.getActiveAgentId() });
    });
    ctx.menuRefreshBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      ctx.menuRefreshBtn?.classList.add("is-spinning");
      void refreshMenuStats().finally(() => ctx.menuRefreshBtn?.classList.remove("is-spinning"));
    });
    ctx.toolbarBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      ctx.setWorkspaceView?.("dashboard3");
      void renderActiveDashboard();
    });
  }

  window.AwnDashboards = {
    init(options = {}) {
      ctx = { ...ctx, ...options };
      setupUi();
    },
    registerPresenter,
    listPresenters() {
      return [...presenters.keys()].sort();
    },
    renderActiveDashboard,
    refreshMenuStats,
    setActiveSlug(slug) {
      activeSlug = String(slug || DEFAULT_SLUG).trim() || DEFAULT_SLUG;
    },
    getActiveSlug() {
      return activeSlug;
    },
    getFolderName() {
      return FOLDER;
    }
  };
})();
