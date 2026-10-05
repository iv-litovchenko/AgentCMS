(function initCompanionPageContextStrip(global) {
  if (global.__companionPageContextStripInit) return;
  if (window !== window.top) return;
  global.__companionPageContextStripInit = true;

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
      secure: location.protocol === "https:"
    };
  }

  function bookmarkDialogRows(s) {
    return [
      { label: "Заголовок", value: s.titleShort, wide: true },
      { label: "Адрес", value: `${s.host}${s.pathShort}`, wide: true },
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
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return {
      el: panel,
      refresh,
      unbind() {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
      }
    };
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
        { label: "Окно", value: `${s.vpW}×${s.vpH}` },
        { label: "Страница", value: `${s.pageW}×${s.pageH}` },
        { label: "Прокрутка", value: `${s.scrollY}px · ${s.scrollPct}%` },
        { label: "DPR", value: String(s.dpr) },
        { label: "Язык", value: s.lang },
        { label: "HTTPS", value: s.secure ? "да" : "нет" },
        { label: "Домен", value: s.host }
      ];

      for (const item of items) {
        const chip = document.createElement("span");
        chip.className = "asc-page-context-chip";
        chip.title = `${item.label}: ${item.value}`;

        const label = document.createElement("span");
        label.className = "asc-page-context-chip-label";
        label.textContent = item.label;

        const value = document.createElement("span");
        value.className = "asc-page-context-chip-value";
        value.textContent = item.value;

        chip.append(label, value);
        chips.append(chip);
      }

      titleEl.textContent = s.titleStrip;
      titleEl.title = s.titleStrip;
    }

    const onResize = () => render();
    const onScroll = () => render();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    render();

    return {
      wrap,
      refresh: render,
      destroy() {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        wrap.remove();
      }
    };
  }

  global.createCompanionPageContextStrip = createCompanionPageContextStrip;
  global.createCompanionBookmarksPagePanel = createCompanionBookmarksPagePanel;
})(globalThis);
