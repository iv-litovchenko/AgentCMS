(function initCompanionPageContextStrip(global) {
  if (global.__companionPageContextStripInit) return;
  if (window !== window.top) return;
  global.__companionPageContextStripInit = true;

  let pointerClientX = 0;
  let pointerClientY = 0;
  let hasPointer = false;
  let liveRaf = 0;
  const liveRefreshers = new Set();

  function samplePointer(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    pointerClientX = Math.round(clientX);
    pointerClientY = Math.round(clientY);
    hasPointer = true;
  }

  function coordPadWidth(pageW, pageH, vpW, vpH) {
    const maxDim = Math.max(pageW || 0, pageH || 0, vpW || 0, vpH || 0);
    return Math.max(4, String(Math.round(maxDim)).length);
  }

  function padCoord(n, width) {
    if (!Number.isFinite(n)) return "—";
    const v = Math.round(n);
    const digits = String(Math.abs(v)).padStart(width, "0");
    return v < 0 ? `-${digits}` : digits;
  }

  function formatCoordPair(x, y, width) {
    return `${padCoord(x, width)},${padCoord(y, width)}`;
  }

  function cursorFields(padWidth) {
    if (!hasPointer) {
      return { client: "—", page: "—" };
    }
    const sx = window.scrollX || document.documentElement?.scrollLeft || 0;
    const sy = window.scrollY || document.documentElement?.scrollTop || 0;
    const w = Math.max(4, padWidth || 4);
    return {
      client: formatCoordPair(pointerClientX, pointerClientY, w),
      page: formatCoordPair(pointerClientX + sx, pointerClientY + sy, w)
    };
  }

  function scheduleLiveRefresh() {
    if (liveRaf) return;
    liveRaf = requestAnimationFrame(() => {
      liveRaf = 0;
      for (const fn of liveRefreshers) fn();
    });
  }

  function trackLiveRefresh(fn) {
    liveRefreshers.add(fn);
    return () => liveRefreshers.delete(fn);
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      samplePointer(event.clientX, event.clientY);
      scheduleLiveRefresh();
    },
    { passive: true, capture: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!hasPointer) return;
      scheduleLiveRefresh();
    },
    { passive: true }
  );

  function snapshot() {
    const docEl = document.documentElement;
    const body = document.body;
    const vpW = window.innerWidth || docEl?.clientWidth || 0;
    const vpH = window.innerHeight || docEl?.clientHeight || 0;
    const pageW = Math.max(
      body?.scrollWidth ?? 0,
      docEl?.scrollWidth ?? 0,
      docEl?.clientWidth ?? 0,
      vpW
    );
    const pageH = Math.max(
      body?.scrollHeight ?? 0,
      docEl?.scrollHeight ?? 0,
      docEl?.clientHeight ?? 0,
      vpH
    );
    const scrollY = Math.round(window.scrollY || docEl?.scrollTop || 0);
    const scrollMax = Math.max(0, pageH - vpH);
    const scrollPct = scrollMax > 0 ? Math.min(100, Math.round((scrollY / scrollMax) * 100)) : 0;
    const host = location.hostname || "—";
    const path =
      (location.pathname || "/") +
      (location.search || "") +
      (location.hash && location.hash.length < 48 ? location.hash : "");
    const pathShort = path.length > 56 ? `${path.slice(0, 53)}…` : path;
    const title = String(document.title || "").trim();
    const titleShort = title.length > 72 ? `${title.slice(0, 69)}…` : title || "—";
    const titleStrip = title.length > 64 ? `${title.slice(0, 61)}…` : title || "—";
    let links = 0;
    let images = 0;
    try {
      links = document.links?.length ?? 0;
    } catch {
      links = 0;
    }
    try {
      images = document.images?.length ?? 0;
    } catch {
      images = 0;
    }
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const cursor = cursorFields(coordPadWidth(pageW, pageH, vpW, vpH));

    return {
      host,
      pathShort,
      titleShort,
      titleStrip,
      vpW,
      vpH,
      pageW,
      pageH,
      dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      scrollY,
      scrollPct,
      lang: (docEl?.lang || navigator.language || "—").toLowerCase(),
      theme: dark ? "тёмная" : "светлая",
      links,
      images,
      secure: location.protocol === "https:",
      cursorClient: cursor.client,
      cursorPage: cursor.page
    };
  }

  function bookmarkDialogRows(s) {
    return [
      { label: "Заголовок", value: s.titleShort, wide: true },
      { label: "Адрес", value: `${s.host}${s.pathShort}`, wide: true },
      { label: "Курсор (окно)", value: s.cursorClient },
      { label: "Курсор (стр.)", value: s.cursorPage },
      { label: "Окно", value: `${s.vpW} × ${s.vpH} px` },
      { label: "Документ", value: `${s.pageW} × ${s.pageH} px` },
      { label: "DPR", value: String(s.dpr) },
      { label: "Прокрутка", value: `${s.scrollY} px · ${s.scrollPct}%` },
      { label: "Язык", value: s.lang },
      { label: "Тема ОС", value: s.theme },
      { label: "Ссылок", value: String(s.links) },
      { label: "Картинок", value: String(s.images) },
      { label: "HTTPS", value: s.secure ? "да" : "нет" }
    ];
  }

  function renderBookmarksPagePanel(panelEl) {
    if (!panelEl) return;
    const grid = panelEl.querySelector(".asc-bookmarks-draft-page-panel-grid");
    if (!grid) return;
    const s = snapshot();
    grid.replaceChildren();
    for (const row of bookmarkDialogRows(s)) {
      const item = document.createElement("div");
      item.className = "asc-bookmarks-draft-page-panel-item";
      if (row.wide) item.classList.add("is-wide");

      const dt = document.createElement("span");
      dt.className = "asc-bookmarks-draft-page-panel-label";
      dt.textContent = row.label;

      const dd = document.createElement("span");
      dd.className = "asc-bookmarks-draft-page-panel-value";
      dd.textContent = row.value;
      dd.title = row.value;

      item.append(dt, dd);
      grid.append(item);
    }
  }

  function createCompanionBookmarksPagePanel() {
    const panel = document.createElement("section");
    panel.className = "asc-bookmarks-draft-page-panel";
    panel.setAttribute("aria-label", "Сведения о странице");

    const head = document.createElement("p");
    head.className = "asc-bookmarks-draft-page-panel-head";
    head.textContent = "Сейчас на странице";

    const grid = document.createElement("div");
    grid.className = "asc-bookmarks-draft-page-panel-grid";

    panel.append(head, grid);
    renderBookmarksPagePanel(panel);

    const refresh = () => renderBookmarksPagePanel(panel);
    const onResize = () => refresh();
    const onScroll = () => refresh();
    const untrackLive = trackLiveRefresh(refresh);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return {
      el: panel,
      refresh,
      unbind() {
        untrackLive();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
      }
    };
  }

  const CHIP_ICON_SVG = {
    cursorClient:
      '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>' +
      '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
    cursorPage:
      '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
      '<circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none"/>' +
      '<path d="M12 8v1M12 15v1M8 12h1M15 12h1"/>',
    window: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
    page: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    scroll: '<path d="M12 5v14M8 9l4-4 4 4M8 15l4 4 4-4"/>',
    dpr: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/>',
    lang:
      '<circle cx="12" cy="12" r="9"/>' +
      '<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    https: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    host: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
  };

  function createChipIcon(iconKey) {
    const paths = CHIP_ICON_SVG[iconKey] || CHIP_ICON_SVG.host;
    const wrap = document.createElement("span");
    wrap.className = "asc-page-context-chip-icon";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<svg class="asc-page-context-chip-icon-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      paths +
      "</svg>";
    return wrap;
  }

  function createCompanionPageContextStrip() {
    const wrap = document.createElement("div");
    wrap.className = "asc-page-context-strip";
    wrap.setAttribute("aria-label", "Справка о странице");

    const chips = document.createElement("div");
    chips.className = "asc-page-context-strip-chips";

    const titleEl = document.createElement("p");
    titleEl.className = "asc-page-context-strip-title";

    wrap.append(chips, titleEl);

    function render() {
      const s = snapshot();
      chips.replaceChildren();

      const items = [
        { icon: "page", label: "Страница", value: `${s.pageW}×${s.pageH}` },
        { icon: "window", label: "Окно", value: `${s.vpW}×${s.vpH}` },
        { icon: "scroll", label: "Прокрутка", value: `${s.scrollY}·${s.scrollPct}%`, tone: "scroll" },
        { icon: "cursorPage", label: "На странице", value: s.cursorPage, tone: "cursor" },
        { icon: "cursorClient", label: "Курсор", value: s.cursorClient, tone: "cursor" },
        { icon: "dpr", label: "DPR", value: String(s.dpr) },
        { icon: "lang", label: "Язык", value: s.lang },
        { icon: "https", label: "HTTPS", value: s.secure ? "✓" : "—" },
        { icon: "host", label: "Домен", value: s.host }
      ];

      for (const item of items) {
        const chip = document.createElement("span");
        chip.className = "asc-page-context-chip";
        chip.dataset.chip = item.icon;
        if (item.tone === "cursor") chip.classList.add("asc-page-context-chip--cursor");
        if (item.tone === "scroll") chip.classList.add("asc-page-context-chip--scroll");
        chip.title = `${item.label}: ${item.value}`;
        chip.setAttribute("aria-label", `${item.label}: ${item.value}`);

        const value = document.createElement("span");
        value.className = "asc-page-context-chip-value";
        value.textContent = item.value;

        chip.append(createChipIcon(item.icon), value);
        chips.append(chip);
      }

      titleEl.textContent = s.titleStrip;
      titleEl.title = s.titleStrip;
    }

    const onResize = () => render();
    const onScroll = () => render();
    const untrackLive = trackLiveRefresh(render);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    render();

    return {
      wrap,
      refresh: render,
      destroy() {
        untrackLive();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        wrap.remove();
      }
    };
  }

  global.createCompanionPageContextStrip = createCompanionPageContextStrip;
  global.createCompanionBookmarksPagePanel = createCompanionBookmarksPagePanel;
})(globalThis);
