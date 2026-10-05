(function initAgentShellCompanionToolbar() {
  if (window.__agentShellCompanionMounted) return;
  if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return;
  window.__agentShellCompanionMounted = true;

  const STORAGE_EXPANDED = "asc-toolbar-expanded";
  const STORAGE_OFFSET = "asc-toolbar-offset";
  const STORAGE_SEARCH_ENGINE = "asc-web-search-engine";
  const STORAGE_SEARCH_FAVORITES = "asc-web-search-favorites.v1";
  const STORAGE_SEARCH_NEW_WINDOW = "asc-web-search-new-window.v1";

  const CSC = globalThis.CompanionWebSearch;
  const WEB_SEARCH_ENGINES = CSC?.BUILD || {};
  const WEB_SEARCH_OPTION_IDS = CSC?.ALL_IDS || new Set(["google"]);

  /** @type {[string, (host: string) => boolean][]} */
  const WEB_SEARCH_HOST_DETECTORS = [
    ["gemini", (h) => h === "gemini.google.com" || h.endsWith(".gemini.google.com")],
    ["google", (h) => /(^|\.)google\.[a-z.]{2,}$/i.test(h)],
    ["yandex", (h) => h.includes("yandex.") || h === "ya.ru"],
    ["duckduckgo", (h) => h.endsWith("duckduckgo.com")],
    ["bing", (h) => h.endsWith("bing.com")],
    ["youtube", (h) => h.endsWith("youtube.com") || h === "youtu.be"],
    ["wikipedia", (h) => h === "wikipedia.org" || h.endsWith(".wikipedia.org")],
    [
      "chatgpt",
      (h) =>
        h === "chatgpt.com" ||
        h.endsWith(".chatgpt.com") ||
        h === "chat.openai.com" ||
        h.endsWith(".chat.openai.com")
    ],
    ["claude", (h) => h === "claude.ai" || h.endsWith(".claude.ai") || h === "anthropic.com"],
    ["copilot", (h) => h === "copilot.microsoft.com" || h.endsWith(".copilot.microsoft.com")],
    ["grok", (h) => h === "grok.com" || h.endsWith(".grok.com") || h === "x.ai" || h.endsWith(".x.ai")],
    ["qwen", (h) => h === "qwen.com" || h.endsWith(".qwen.com") || h.includes("qwen.ai")],
    ["deepseek", (h) => h === "deepseek.com" || h.endsWith(".deepseek.com")],
    ["perplexity", (h) => h === "perplexity.ai" || h.endsWith(".perplexity.ai")]
  ];

  function detectSearchEngineIdFromPage(loc = window.location) {
    const host = String(loc.hostname || "").toLowerCase();
    const path = String(loc.pathname || "");
    const tbm = new URLSearchParams(loc.search || "").get("tbm");
    if (!host) return null;

    if (host === "images.google.com" || host.endsWith(".images.google.com")) {
      return "google-images";
    }
    if (/(^|\.)google\.[a-z.]{2,}$/i.test(host) && tbm === "isch") {
      return "google-images";
    }
    if (
      (host.includes("yandex.") || host === "ya.ru") &&
      (path === "/images" || path.startsWith("/images/"))
    ) {
      return "yandex-images";
    }
    if (
      host === "maps.google.com" ||
      host.endsWith(".maps.google.com") ||
      (/(^|\.)google\.[a-z.]{2,}$/i.test(host) && path.startsWith("/maps"))
    ) {
      return "google-maps";
    }
    if (
      (host.includes("yandex.") || host === "ya.ru") &&
      (path === "/maps" || path.startsWith("/maps/"))
    ) {
      return "yandex-maps";
    }
    if (host === "translate.google.com" || host.endsWith(".translate.google.com")) {
      return "google-translate";
    }
    if (
      host === "translate.yandex.ru" ||
      host === "translate.yandex.com" ||
      host.endsWith(".translate.yandex.ru") ||
      host.endsWith(".translate.yandex.com") ||
      (host.startsWith("translate.yandex.") && host.includes("yandex."))
    ) {
      return "yandex-translate";
    }

    for (const [id, test] of WEB_SEARCH_HOST_DETECTORS) {
      if (test(host)) return id;
    }
    return null;
  }

  function isWebSearchEngineHost(engineId) {
    const detected = detectSearchEngineIdFromPage();
    return detected === engineId && Boolean(WEB_SEARCH_ENGINES[engineId]);
  }

  function readWebSearchEngineId() {
    try {
      const raw = String(localStorage.getItem(STORAGE_SEARCH_ENGINE) || "google").trim();
      return Object.prototype.hasOwnProperty.call(WEB_SEARCH_ENGINES, raw) ? raw : "google";
    } catch {
      return "google";
    }
  }

  function readSearchFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_SEARCH_FAVORITES) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter((id) => WEB_SEARCH_OPTION_IDS.has(id));
    } catch {
      return [];
    }
  }

  function writeSearchFavorites(ids) {
    try {
      localStorage.setItem(STORAGE_SEARCH_FAVORITES, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }

  function readSearchOpenInNewWindow() {
    try {
      return localStorage.getItem(STORAGE_SEARCH_NEW_WINDOW) === "1";
    } catch {
      return false;
    }
  }

  function writeSearchOpenInNewWindow(enabled) {
    try {
      localStorage.setItem(STORAGE_SEARCH_NEW_WINDOW, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function toggleSearchFavorite(id) {
    if (!WEB_SEARCH_OPTION_IDS.has(id)) return readSearchFavorites();
    const set = new Set(readSearchFavorites());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = [...set];
    writeSearchFavorites(next);
    return next;
  }

  function resolveWebSearchEngineIdForSubmit(pickerApi) {
    const fromPicker = String(pickerApi?.getSelectedId?.() || "").trim();
    if (Object.prototype.hasOwnProperty.call(WEB_SEARCH_ENGINES, fromPicker)) {
      return fromPicker;
    }
    const detected = detectSearchEngineIdFromPage();
    if (detected && WEB_SEARCH_ENGINES[detected]) return detected;
    return readWebSearchEngineId();
  }

  function resolveSearchEngineIdForDisplay() {
    const detected = detectSearchEngineIdFromPage();
    const saved = readWebSearchEngineId();
    return detected && WEB_SEARCH_OPTION_IDS.has(detected) ? detected : saved;
  }

  const DEFAULT_SEARCH_PICKER_ICON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  function resolveBrandIconUrl(itemId) {
    const resolveExtensionUrl = (path) => {
      try {
        return chrome.runtime?.getURL ? chrome.runtime.getURL(path) : "";
      } catch {
        return "";
      }
    };
    return CSC?.getIconUrl?.(itemId, resolveExtensionUrl) || "";
  }

  function applyDefaultPickerIcon(iconWrap) {
    iconWrap.classList.add("asc-brand-search-picker-icon--default");
    iconWrap.innerHTML = DEFAULT_SEARCH_PICKER_ICON_SVG;
  }

  function populateSearchServiceIcon(iconWrap, itemId) {
    iconWrap.replaceChildren();
    iconWrap.classList.remove("asc-brand-search-picker-icon--default", "asc-brand-search-picker-icon--brand");
    const iconUrl = resolveBrandIconUrl(itemId);
    const isLocalBrand = Boolean(CSC?.getIconLocalPath?.(itemId));
    if (iconUrl) {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.width = 16;
      img.height = 16;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      if (isLocalBrand) {
        iconWrap.classList.add("asc-brand-search-picker-icon--brand");
      }
      img.addEventListener(
        "error",
        () => {
          iconWrap.classList.remove("asc-brand-search-picker-icon--brand");
          applyDefaultPickerIcon(iconWrap);
        },
        { once: true }
      );
      iconWrap.append(img);
    } else {
      applyDefaultPickerIcon(iconWrap);
    }
  }

  function appendBrandPickerIcon(parent, itemId) {
    const iconWrap = document.createElement("span");
    iconWrap.className = "asc-brand-search-picker-icon";
    iconWrap.setAttribute("aria-hidden", "true");
    populateSearchServiceIcon(iconWrap, itemId);
    parent.append(iconWrap);
  }

  function createBrandSearchPicker() {
    const wrap = document.createElement("div");
    wrap.className = "asc-brand-search-picker";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-brand-search-picker-btn";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.title = "Выбрать сервис поиска";

    const btnIcon = document.createElement("span");
    btnIcon.className = "asc-brand-search-picker-btn-icon asc-brand-search-picker-icon";
    btnIcon.setAttribute("aria-hidden", "true");

    const labelEl = document.createElement("span");
    labelEl.className = "asc-brand-search-picker-label";
    labelEl.textContent = CSC?.getShortLabel?.(readWebSearchEngineId(), "Google") || "Google";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("class", "asc-brand-search-picker-chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("aria-hidden", "true");
    const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    chevronPath.setAttribute("d", "M7 10l5 5 5-5");
    chevronPath.setAttribute("fill", "none");
    chevronPath.setAttribute("stroke", "currentColor");
    chevronPath.setAttribute("stroke-width", "2");
    chevronPath.setAttribute("stroke-linecap", "round");
    chevron.append(chevronPath);

    btn.append(btnIcon, labelEl, chevron);
    populateSearchServiceIcon(btnIcon, readWebSearchEngineId());

    const pop = document.createElement("div");
    pop.className = "asc-brand-search-picker-pop";
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Сервисы поиска");

    const filterInput = document.createElement("input");
    filterInput.type = "search";
    filterInput.className = "asc-brand-search-picker-filter";
    filterInput.placeholder = "Найти сервис…";
    filterInput.setAttribute("aria-label", "Фильтр списка");

    const body = document.createElement("div");
    body.className = "asc-brand-search-picker-body";

    const footer = document.createElement("div");
    footer.className = "asc-brand-search-picker-footer";

    const newWindowLabel = document.createElement("label");
    newWindowLabel.className = "asc-brand-search-picker-newwin";

    const newWindowCheck = document.createElement("input");
    newWindowCheck.type = "checkbox";
    newWindowCheck.className = "asc-brand-search-picker-newwin-input";
    newWindowCheck.checked = readSearchOpenInNewWindow();
    newWindowCheck.addEventListener("change", () => {
      writeSearchOpenInNewWindow(newWindowCheck.checked);
    });

    const newWindowText = document.createElement("span");
    newWindowText.textContent = "Открывать запрос в новом окне";

    newWindowLabel.append(newWindowCheck, newWindowText);
    footer.append(newWindowLabel);

    pop.append(filterInput, body, footer);
    wrap.append(btn, pop);

    let selectedId = readWebSearchEngineId();
    let filterText = "";
    let open = false;

    const SEARCH_PICKER_GAP = 8;
    const SEARCH_PICKER_HEIGHT_ESTIMATE = 320;

    /** Как у панели инструментов: вверх, если сверху мало места — вниз. */
    function updateSearchPickerPopDirection() {
      const anchorRect = wrap.getBoundingClientRect();
      const measured = pop.hidden
        ? SEARCH_PICKER_HEIGHT_ESTIMATE
        : Math.max(
            120,
            Math.ceil(pop.getBoundingClientRect().height || 0),
            Math.ceil(pop.scrollHeight || 0)
          );
      const maxPop = Math.min(360, Math.ceil(window.innerHeight * 0.58));
      const popH = Math.min(maxPop, measured);
      const need = popH + SEARCH_PICKER_GAP + 12;
      const spaceAbove = anchorRect.top;
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      let expandDown = false;
      if (spaceAbove < need) {
        expandDown = spaceBelow >= need || spaceBelow > spaceAbove;
      }
      wrap.classList.toggle("is-pop-down", expandDown);
    }

    function setOpen(next) {
      open = Boolean(next);
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-open", open);
      if (open) {
        filterInput.value = "";
        filterText = "";
        renderList();
        window.requestAnimationFrame(() => {
          updateSearchPickerPopDirection();
          filterInput.focus();
        });
      } else {
        wrap.classList.remove("is-pop-down");
      }
    }

    function setSelectedId(id, persist) {
      if (!WEB_SEARCH_OPTION_IDS.has(id)) return;
      if (persist && !CSC?.isEnabled?.(id)) return;
      selectedId = id;
      labelEl.textContent = CSC?.getShortLabel?.(id, id) || id;
      populateSearchServiceIcon(btnIcon, selectedId);
      const fullLabel = CSC?.getItem?.(id)?.label || labelEl.textContent;
      btn.title = `Сервис: ${fullLabel}`;
      if (persist) {
        try {
          localStorage.setItem(STORAGE_SEARCH_ENGINE, id);
        } catch {
          // ignore
        }
      }
      renderList();
    }

    function syncFromPage() {
      setSelectedId(resolveSearchEngineIdForDisplay(), false);
    }

    function normalizeFilter(s) {
      return String(s || "")
        .trim()
        .toLowerCase();
    }

    function itemMatchesFilter(item) {
      const q = normalizeFilter(filterText);
      if (!q) return true;
      const hay = `${item.label} ${item.shortLabel} ${item.id}`.toLowerCase();
      return hay.includes(q);
    }

    function renderSection(title, items) {
      if (!items.length) return null;
      const section = document.createElement("div");
      section.className = "asc-brand-search-picker-section";
      const head = document.createElement("div");
      head.className = "asc-brand-search-picker-section-head";
      head.textContent = title;
      section.append(head);
      const list = document.createElement("div");
      list.className = "asc-brand-search-picker-list";
      const favorites = new Set(readSearchFavorites());
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "asc-brand-search-picker-item";
        if (item.id === selectedId) row.classList.add("is-selected");
        if (!CSC?.isEnabled?.(item.id)) row.classList.add("is-soon");
        appendBrandPickerIcon(row, item.id);
        const pick = document.createElement("button");
        pick.type = "button";
        pick.className = "asc-brand-search-picker-item-main";
        pick.dataset.engineId = item.id;
        const labelEl = document.createElement("span");
        labelEl.className = "asc-brand-search-picker-item-label";
        labelEl.textContent = item.label;
        pick.append(labelEl);
        if (!CSC?.isEnabled?.(item.id)) {
          const soonEl = document.createElement("span");
          soonEl.className = "asc-brand-search-picker-soon";
          soonEl.textContent = "скоро";
          pick.append(soonEl);
        }
        pick.addEventListener("click", (event) => {
          event.stopPropagation();
          if (!CSC?.isEnabled?.(item.id)) return;
          setSelectedId(item.id, true);
          setOpen(false);
        });
        const fav = document.createElement("button");
        fav.type = "button";
        fav.className = "asc-brand-search-picker-fav";
        fav.title = favorites.has(item.id) ? "Убрать из избранного" : "В избранное";
        fav.setAttribute(
          "aria-label",
          favorites.has(item.id) ? "Убрать из избранного" : "В избранное"
        );
        fav.textContent = favorites.has(item.id) ? "★" : "☆";
        fav.classList.toggle("is-on", favorites.has(item.id));
        fav.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleSearchFavorite(item.id);
          renderList();
        });
        row.append(pick, fav);
        list.append(row);
      }
      section.append(list);
      return section;
    }

    function renderList() {
      body.replaceChildren();
      if (!CSC?.ITEMS) return;
      const items = CSC.ITEMS.filter(itemMatchesFilter);
      const favIds = new Set(readSearchFavorites());
      const favItems = items.filter((item) => favIds.has(item.id));
      const favSection = renderSection("Избранное", favItems);
      if (favSection) body.append(favSection);
      for (const cat of CSC.CATEGORIES) {
        const catItems = items.filter((item) => item.category === cat.id && !favIds.has(item.id));
        const section = renderSection(cat.label, catItems);
        if (section) body.append(section);
      }
      if (open) {
        window.requestAnimationFrame(() => updateSearchPickerPopDirection());
      }
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!open);
    });

    filterInput.addEventListener("input", () => {
      filterText = filterInput.value;
      renderList();
    });

    filterInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        btn.focus();
      }
    });

    for (const eventName of ["pointerdown", "mousedown", "click", "dblclick"]) {
      pop.addEventListener(eventName, (event) => event.stopPropagation());
    }

    return {
      wrap,
      pop,
      btn,
      getSelectedId: () => selectedId,
      setSelectedId,
      syncFromPage,
      setOpen,
      isOpen: () => open,
      updatePopDirection: updateSearchPickerPopDirection
    };
  }

  function bindSearchPickerPageSync(pickerApi) {
    if (!pickerApi || pickerApi.wrap?.dataset?.ascPageSyncBound === "1") return;
    pickerApi.wrap.dataset.ascPageSyncBound = "1";

    const run = () => pickerApi.syncFromPage();
    run();

    window.addEventListener("pageshow", run);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run();
    });

    let lastHref = location.href;
    const onNavigate = () => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      run();
    };
    window.addEventListener("popstate", onNavigate);

    const { pushState, replaceState } = history;
    history.pushState = function ascSearchPushState(...args) {
      const result = pushState.apply(this, args);
      onNavigate();
      return result;
    };
    history.replaceState = function ascSearchReplaceState(...args) {
      const result = replaceState.apply(this, args);
      onNavigate();
      return result;
    };
  }

  let brandSearchPicker = null;

  function openWebSearch(query) {
    const q = String(query || "").trim();
    if (!q) return;
    const engineId = resolveWebSearchEngineIdForSubmit(brandSearchPicker);
    const build = WEB_SEARCH_ENGINES[engineId];
    if (!build) {
      setStatus("Поиск для этого сервиса скоро", "error");
      return;
    }
    const url = build(q);
    const detectedOnPage = detectSearchEngineIdFromPage();
    const crossEngine =
      Boolean(detectedOnPage) && detectedOnPage !== engineId;
    const forceNewWindow = readSearchOpenInNewWindow() || crossEngine;
    const sameTab =
      !forceNewWindow && isWebSearchEngineHost(engineId);
    if (sameTab) {
      window.location.assign(url);
      setStatus("Поиск…", "ok");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Поиск открыт", "ok");
  }
  const MAX_PAGE_LEN = 4000;
  const BASE_BOTTOM = 18;
  const EDGE_MARGIN = 12;
  const DRAG_THRESHOLD = 5;
  const SNAP_DISTANCE = 10;
  const TOOLBAR_EXPAND_GAP = 8;
  const TOOLBAR_EXPAND_ESTIMATE = 196;

  const BRAND_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">' +
    '<defs><linearGradient id="asc-bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c026d3"/></linearGradient>' +
    '<linearGradient id="asc-sheen-grad" x1="0%" y1="0%" x2="0%" y2="100%">' +
    '<stop offset="0%" stop-color="#fff" stop-opacity="0.28"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
    '<rect width="64" height="64" rx="14" fill="url(#asc-bg)"/>' +
    '<rect class="asc-brand-sheen" width="64" height="64" rx="14" fill="url(#asc-sheen-grad)"/>' +
    '<rect x="13" y="15" width="38" height="26" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>' +
    '<circle cx="19.5" cy="21.5" r="2.2" fill="#fecaca"/><circle cx="26.5" cy="21.5" r="2.2" fill="#fde68a"/><circle cx="33.5" cy="21.5" r="2.2" fill="#bbf7d0"/>' +
    '<rect x="17" y="27" width="30" height="3.5" rx="1.75" fill="rgba(255,255,255,0.42)"/>' +
    '<rect x="17" y="33" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>' +
    '<path d="M14 50 L22 50 L26 42 L30 54 L34 46 L38 50 L50 50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  const ICONS = {
    element:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
    page:
      '<svg viewBox="0 0 24 24"><path d="M7 4h7l5 5v11H7z"/><path d="M14 4v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    selection:
      '<svg viewBox="0 0 24 24"><path d="M5 6h14M12 6v12M9 18h6"/></svg>',
    screenshot:
      '<svg viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>',
    forms:
      '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    clipboard:
      '<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="5" y="4" width="14" height="16" rx="2"/></svg>',
    compose:
      '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    download:
      '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>',
    annotate:
      '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    storage:
      '<svg viewBox="0 0 24 24"><path d="M20 7H4V5a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.4.6l1.8 1.8A2 2 0 0 0 13.8 6H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M10 11h4"/></svg>',
    collapse: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M8 14l4-4 4 4M8 10l4-4 4 4"/></svg>',
    panel:
      '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>',
    openCms:
      '<svg viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };

  const SELECTION_PROMPTS = [
    {
      key: "prompt-read",
      label: "Прочитай",
      title: "Прочитай этот текст",
      build: (sel) => `Прочитай этот текст:\n\n${sel}`
    },
    {
      key: "prompt-explain",
      label: "Объясни",
      title: "Объясни простыми словами",
      build: (sel) => `Объясни простыми словами:\n\n${sel}`
    },
    {
      key: "prompt-notes",
      label: "Конспект",
      title: "Сделай краткий конспект",
      build: (sel) => `Сделай краткий конспект:\n\n${sel}`
    },
    {
      key: "prompt-translate",
      label: "Перевод",
      title: "Переведи на русский",
      build: (sel) => `Переведи на русский:\n\n${sel}`
    },
    {
      key: "prompt-task",
      label: "Задача",
      title: "Преврати в задачу для CMS",
      build: (sel) => `Преврати это в задачу для CMS (заголовок + шаги):\n\n${sel}`
    }
  ];

  const PAGE_MENU = [
    { head: "Страница" },
    { key: "page", label: "Заголовок и ссылка", hint: "Название страницы и URL" },
    { key: "page-url-copy", label: "Копировать ссылку", hint: "URL страницы в буфер (кириллица, не %D0%…)" },
    { key: "clean", label: "Текст страницы", hint: "Статья абзацами, без меню и рекламы" },
    { key: "markdown", label: "Как Markdown", hint: "Заголовки, ссылки и списки в MD" }
  ];

  const PANEL_IDEAS_TODO = `Вот что ещё часто окупается для такой капсулы (кратко):

**Контекст страницы**
- «Спросить агента про эту вкладку» — title + URL + выделенный текст в compose
- Быстрое копирование ссылки / markdown-ссылки / «чистый» URL
- TL;DR / выжимка видимого текста (с лимитом символов)

**Навигация и вкладки**
- Закрепить / заметка к вкладке (локально или в CMS)
- История поиска с капсулы (не только избранные сервисы)
- «Открыть в…» — та же ссылка в другом браузере/профиле (если применимо)

**Работа с CMS**
- Быстрый inbox / последние страницы workspace без полного перехода
- Создать заметку / задачу из выделения
- Статус: какой агент/workspace активен (иконка + tooltip)

**Захват и ввод**
- Область скриншота (у вас уже есть полный — crop удобен)
- Запись короткого voice-to-text в буфер или в поиск
- OCR выделенной области → текст в буфер

**Удобство панели**
- Горячая клавиша показать/скрыть капсулу
- «Не мешать» — авто-прозрачность / сдвиг к краю при скролле
- Запомнить позицию отдельно для домена (опционально)

**Поиск (раз уже есть)**
- Agent CMS / semantic search по workspace, когда будет API
- Повтор последнего запроса по клику на лупу с пустым полем
- Детект «мы уже на этом поисковике» — вы уже частично сделали

**Надёжность**
- Офлайн-индикатор CMS / переподключение voice
- Мини-лог последнего действия (скрин ок / ошибка / копия)

Если приоритизировать три «самых полезных» под ваш стек: **контекст вкладки в агента**, **crop скрин**, **быстрый доступ к workspace/inbox из CMS**.`;

  const FORM_MENU = [
    { head: "Формы" },
    {
      key: "form-edit",
      label: "Вставить/заменить/изменить",
      hint: "Контекст полей формы — помочь заполнить или изменить"
    },
    {
      key: "form-passwords",
      label: "Пароли (найти в хранилище)",
      hint: "Подобрать пароль из vault Agent CMS под эту страницу"
    }
  ];

  const TEXT_MENU = [
    { head: "Выделение" },
    { key: "selection", label: "Вставить выделение" },
    { sep: true },
    { head: "Промпты" },
    { key: "prompt-read", label: "Прочитай" },
    { key: "prompt-explain", label: "Объясни" },
    { key: "prompt-notes", label: "Конспект" },
    { key: "prompt-translate", label: "Перевод" },
    { key: "prompt-task", label: "Задача" }
  ];

  const SCREENSHOT_KINDS = [
    { id: "fullpage", label: "Вся страница", hint: "Длинный скрин всей страницы" },
    { id: "screen", label: "Видимая область", hint: "То, что сейчас видно на экране" },
    { id: "region", label: "Выбранная область", hint: "Нарисуйте прямоугольник на странице" },
    { id: "element", label: "Выбранный блок", hint: "Клик по элементу на странице" }
  ];

  const SCREENSHOT_TARGETS = [
    {
      id: "compose",
      icon: "compose",
      headerLabel: "В чат",
      actionLabel: "Вставить",
      hint: "Вставить в чат Agent CMS"
    },
    {
      id: "clipboard",
      icon: "clipboard",
      headerLabel: "В буфер",
      actionLabel: "Скопировать",
      hint: "Скопировать картинку в буфер"
    },
    {
      id: "download",
      icon: "download",
      headerLabel: "PNG",
      actionLabel: "Скачать",
      hint: "Сохранить PNG на диск"
    },
    {
      id: "storage",
      icon: "storage",
      headerLabel: "Хранилище",
      actionLabel: "Сохранить",
      hint: "В хранилище Agent CMS (скоро)"
    },
    {
      id: "annotate",
      icon: "annotate",
      headerLabel: "Разметка",
      actionLabel: "Отметить",
      hint: "Превью и пометки перед отправкой"
    }
  ];

  function screenshotActionKey(kindId, targetId) {
    const base = kindId === "screen" ? "screenshot" : `screenshot-${kindId}`;
    return `${base}-${targetId}`;
  }

  function runScreenshotFromMenuKey(key) {
    for (const kind of SCREENSHOT_KINDS) {
      for (const target of SCREENSHOT_TARGETS) {
        if (screenshotActionKey(kind.id, target.id) !== key) continue;
        const options = { destination: target.id };
        if (kind.id === "region") options.region = true;
        else if (kind.id === "element") options.element = true;
        else if (kind.id === "fullpage") options.fullPage = true;
        void runScreenshot(options);
        return true;
      }
    }
    return false;
  }

  const root = document.createElement("div");
  root.id = "agent-shell-companion-toolbar";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Agent CMS Toolbar");

  const actions = document.createElement("div");
  actions.className = "asc-actions";
  const menus = [];
  let panelIdeasTodo = null;
  let companionPomodoroDock = null;
  let pickerActive = false;
  let offsetX = 0;
  let offsetY = 0;
  let dragState = null;
  function createBtn(key, label, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `asc-btn asc-btn--${key}`;
    btn.title = title;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `${ICONS[key]}<span class="asc-label">${label}</span>`;
    return btn;
  }

  const brandCluster = document.createElement("div");
  brandCluster.className = "asc-brand-cluster";
  brandCluster.title =
    "Клик — инструменты · двойной клик — боковая панель (открыть/свернуть) · перетащите";
  brandCluster.setAttribute("role", "button");
  brandCluster.tabIndex = 0;
  brandCluster.setAttribute("aria-expanded", "false");
  brandCluster.setAttribute(
    "aria-label",
    "Agent CMS Toolbar — клик: инструменты, двойной клик: боковая панель открыть или свернуть"
  );

  const brand = document.createElement("div");
  brand.className = "asc-brand";
  brand.innerHTML = `<span class="asc-brand-icon" aria-hidden="true">${BRAND_ICON_SVG}</span><span class="asc-brand-label">Agent CMS Toolbar</span>`;

  brandCluster.append(brand);

  companionPomodoroDock =
    typeof globalThis.createCompanionPomodoroDock === "function"
      ? globalThis.createCompanionPomodoroDock()
      : null;

  const brandDockDivider = document.createElement("span");
  brandDockDivider.className = "asc-brand-dock-divider";
  brandDockDivider.setAttribute("aria-hidden", "true");

  const viewportShotBtn = createBtn(
    "screenshot",
    "Скрин",
    "Скриншот видимой области — в буфер обмена"
  );
  viewportShotBtn.classList.add("asc-btn--viewport-shot", "asc-btn--icon-only");

  function readMediaHoverSaveEnabledSetting() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "COMPANION_GET_SETTINGS" }, (response) => {
          if (!chrome.runtime.lastError && response && typeof response === "object") {
            resolve(response.mediaHoverSaveEnabled !== false);
            return;
          }
          chrome.storage.local.get(["mediaHoverSaveEnabled"], (stored) => {
            resolve(stored.mediaHoverSaveEnabled !== false);
          });
        });
      } catch {
        resolve(true);
      }
    });
  }

  function createMediaHoverDockToggle() {
    const wrap = document.createElement("div");
    wrap.className = "asc-media-dock-toggle-wrap";
    wrap.title = "Панель на картинках: скачать и копировать URL";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-media-dock-toggle";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", "true");
    btn.setAttribute(
      "aria-label",
      "Панель на картинках при наведении — включить или выключить"
    );

    const track = document.createElement("span");
    track.className = "asc-media-dock-toggle-track";
    track.setAttribute("aria-hidden", "true");

    const icon = document.createElement("span");
    icon.className = "asc-media-dock-toggle-icon";
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 16l4.5-4.5a1 1 0 0 1 1.4 0L14 16"/><path d="M12 12l2-2a1 1 0 0 1 1.4 0L20 14"/></svg>';

    const thumb = document.createElement("span");
    thumb.className = "asc-media-dock-toggle-thumb";
    thumb.append(icon);

    track.append(thumb);
    btn.append(track);
    wrap.append(btn);

    function setToggleOn(on) {
      const enabled = Boolean(on);
      btn.classList.toggle("is-on", enabled);
      btn.setAttribute("aria-checked", enabled ? "true" : "false");
      btn.title = enabled
        ? "Панель на картинках: вкл. — нажмите, чтобы выключить"
        : "Панель на картинках: выкл. — нажмите, чтобы включить";
      wrap.title = btn.title;
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const next = !btn.classList.contains("is-on");
      setToggleOn(next);
      try {
        chrome.storage.local.set({ mediaHoverSaveEnabled: next });
      } catch {
        // ignore
      }
    });

    for (const eventName of ["pointerdown", "mousedown", "dblclick"]) {
      wrap.addEventListener(eventName, (event) => event.stopPropagation());
    }

    void readMediaHoverSaveEnabledSetting().then(setToggleOn);

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.mediaHoverSaveEnabled) return;
        setToggleOn(changes.mediaHoverSaveEnabled.newValue !== false);
      });
    } catch {
      // ignore
    }

    return wrap;
  }

  const mediaHoverDockToggle = createMediaHoverDockToggle();

  const companionCrosshairDock =
    typeof globalThis.createCompanionCrosshairDock === "function"
      ? globalThis.createCompanionCrosshairDock()
      : null;

  const openCmsBtn = createBtn(
    "openCms",
    "CMS",
    "Открыть Agent CMS в браузере"
  );
  openCmsBtn.classList.add("asc-btn--open-cms", "asc-btn--icon-only");

  const cmsDockDivider = document.createElement("span");
  cmsDockDivider.className = "asc-brand-dock-divider";
  cmsDockDivider.setAttribute("aria-hidden", "true");

  const webSearchForm = document.createElement("form");
  webSearchForm.className = "asc-brand-search";
  webSearchForm.setAttribute("role", "search");
  webSearchForm.title = "Поиск в интернете — откроется в новой вкладке";

  brandSearchPicker = createBrandSearchPicker();
  bindSearchPickerPageSync(brandSearchPicker);
  brandSearchPicker.syncFromPage();

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "asc-brand-search-input";
  searchInput.placeholder = "Поиск…";
  searchInput.maxLength = 500;
  searchInput.setAttribute("aria-label", "Поисковая фраза");
  searchInput.setAttribute("enterkeyhint", "search");

  const searchSubmitBtn = document.createElement("button");
  searchSubmitBtn.type = "submit";
  searchSubmitBtn.className = "asc-brand-search-submit";
  searchSubmitBtn.title = "Искать в новой вкладке";
  searchSubmitBtn.setAttribute("aria-label", "Искать в новой вкладке");
  searchSubmitBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  webSearchForm.append(searchInput, brandSearchPicker.wrap, searchSubmitBtn);

  function setBrandSearchExpanded(expanded) {
    webSearchForm.classList.toggle("is-search-expanded", expanded);
  }

  searchInput.addEventListener("focus", () => setBrandSearchExpanded(true));

  webSearchForm.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      const root = webSearchForm.getRootNode();
      const active =
        root && typeof root.activeElement !== "undefined"
          ? root.activeElement
          : document.activeElement;
      if (active && webSearchForm.contains(active)) return;
      if (brandSearchPicker?.isOpen?.()) return;
      setBrandSearchExpanded(false);
    });
  });

  webSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openWebSearch(searchInput.value);
  });

  for (const eventName of ["pointerdown", "mousedown", "click", "dblclick"]) {
    webSearchForm.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  }

  function closeMenus(except) {
    for (const menu of menus) {
      if (menu.wrap === except) continue;
      menu.wrap.classList.remove("is-open");
      menu.btn.setAttribute("aria-expanded", "false");
    }
    panelIdeasTodo?.setOpen(false);
    companionPomodoroDock?.closePop?.();
  }

  function createPanelIdeasTodoModal(shellRef) {
    const wrap = document.createElement("div");
    wrap.className = "asc-panel-todo-trigger";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-btn asc-btn--panel-todo asc-btn--icon-only";
    btn.title = "Идеи для панели (TODO)";
    btn.setAttribute("aria-label", "Идеи для панели — TODO");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="asc-panel-todo-qmark" aria-hidden="true">?</span>';

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "asc-panel-todo-backdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-label", "Закрыть окно TODO");

    const dialog = document.createElement("div");
    dialog.className = "asc-panel-todo-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "asc-panel-todo-title");
    dialog.hidden = true;

    const head = document.createElement("div");
    head.className = "asc-panel-todo-head";

    const title = document.createElement("h2");
    title.className = "asc-panel-todo-title";
    title.id = "asc-panel-todo-title";
    title.textContent = "TODO — идеи для панели";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "asc-panel-todo-close";
    closeBtn.title = "Закрыть";
    closeBtn.setAttribute("aria-label", "Закрыть");
    closeBtn.textContent = "×";

    const body = document.createElement("pre");
    body.className = "asc-panel-todo-body";
    body.textContent = PANEL_IDEAS_TODO;

    head.append(title, closeBtn);
    dialog.append(head, body);
    shellRef.append(backdrop, dialog);
    wrap.append(btn);

    let open = false;

    function setOpen(next) {
      open = Boolean(next);
      backdrop.hidden = !open;
      dialog.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-active", open);
      root.classList.toggle("asc-panel-todo-open", open);
      if (open) {
        for (const menu of menus) {
          menu.wrap.classList.remove("is-open");
          menu.btn.setAttribute("aria-expanded", "false");
        }
        closeBtn.focus();
      }
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!open);
    });
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(false);
      btn.focus();
    });
    backdrop.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(false);
      btn.focus();
    });

    for (const eventName of ["pointerdown", "mousedown", "click", "dblclick"]) {
      dialog.addEventListener(eventName, (event) => event.stopPropagation());
    }

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !open) return;
      event.stopPropagation();
      setOpen(false);
      btn.focus();
    });

    return { wrap, btn, setOpen, isOpen: () => open };
  }

  function createMenu(key, label, title, items) {
    const wrap = document.createElement("div");
    wrap.className = "asc-menu";
    const btn = createBtn(key, label, title);
    btn.classList.add("asc-btn--menu");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    const pop = document.createElement("div");
    pop.className = "asc-menu-pop";
    pop.setAttribute("role", "menu");
    for (const item of items) {
      if (item.head) {
        const head = document.createElement("div");
        head.className = "asc-menu-head";
        head.textContent = item.head;
        pop.append(head);
        continue;
      }
      if (item.sep) {
        const line = document.createElement("div");
        line.className = "asc-menu-sep";
        pop.append(line);
        continue;
      }
      const option = document.createElement("button");
      option.type = "button";
      option.className = "asc-menu-item";
      option.textContent = item.label;
      if (item.hint) option.title = item.hint;
      option.setAttribute("role", "menuitem");
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        closeMenus();
        handleMenuAction(item.key);
      });
      pop.append(option);
    }
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = !wrap.classList.contains("is-open");
      closeMenus(open ? wrap : null);
      wrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    wrap.append(btn, pop);
    menus.push({ wrap, pop, btn });
    return wrap;
  }

  function createScreenshotMenu() {
    const wrap = document.createElement("div");
    wrap.className = "asc-menu asc-menu--screenshot";
    const btn = createBtn("screenshot", "Скриншот", "Скриншот: что снять и куда");
    btn.classList.add("asc-btn--menu");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");

    const pop = document.createElement("div");
    pop.className = "asc-menu-pop asc-menu-pop--screenshot";
    pop.setAttribute("role", "menu");

    const head = document.createElement("div");
    head.className = "asc-shot-compact-head";
    const headSpacer = document.createElement("span");
    headSpacer.className = "asc-shot-compact-head-spacer";
    head.append(headSpacer);
    for (const target of SCREENSHOT_TARGETS) {
      const col = document.createElement("span");
      col.className = "asc-shot-compact-col";
      col.innerHTML =
        `<span class="asc-shot-compact-col-ico" aria-hidden="true">${ICONS[target.icon]}</span>` +
        `<span class="asc-shot-compact-col-label">${target.headerLabel}</span>`;
      head.append(col);
    }
    pop.append(head);

    const body = document.createElement("div");
    body.className = "asc-shot-compact";

    for (const kind of SCREENSHOT_KINDS) {
      const row = document.createElement("div");
      row.className = "asc-shot-compact-row";
      const label = document.createElement("span");
      label.className = "asc-shot-compact-label";
      label.textContent = kind.label;
      label.title = kind.hint;
      row.append(label);

      for (const target of SCREENSHOT_TARGETS) {
        const key = screenshotActionKey(kind.id, target.id);
        const action = document.createElement("button");
        action.type = "button";
        action.className = "asc-shot-compact-btn";
        action.innerHTML =
          `<span class="asc-shot-compact-btn-ico" aria-hidden="true">${ICONS[target.icon]}</span>` +
          `<span class="asc-shot-compact-btn-text">${target.actionLabel}</span>`;
        action.title = `${kind.hint} → ${target.hint}`;
        action.setAttribute("role", "menuitem");
        action.setAttribute("aria-label", `${kind.label}: ${target.actionLabel}`);
        action.addEventListener("click", (event) => {
          event.stopPropagation();
          closeMenus();
          handleMenuAction(key);
        });
        row.append(action);
      }
      body.append(row);
    }

    pop.append(body);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = !wrap.classList.contains("is-open");
      closeMenus(open ? wrap : null);
      wrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    wrap.append(btn, pop);
    menus.push({ wrap, pop, btn });
    return wrap;
  }

  function createClipboardHistoryMenu() {
    const wrap = document.createElement("div");
    wrap.className = "asc-menu asc-menu--clipboard";
    const btn = createBtn("clipboard", "Буфер", "История буфера обмена");
    btn.classList.add("asc-btn--menu");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    const pop = document.createElement("div");
    pop.className = "asc-menu-pop asc-menu-pop--clipboard";
    pop.setAttribute("role", "menu");
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = !wrap.classList.contains("is-open");
      closeMenus(open ? wrap : null);
      wrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) void renderClipboardHistoryMenu(pop);
    });
    wrap.append(btn, pop);
    menus.push({ wrap, pop, btn });
    return wrap;
  }

  const left = document.createElement("div");
  left.className = "asc-cluster asc-cluster--left";
  const elementBtn = createBtn("element", "Захват", "Выбрать блок на странице (Esc — выключить)");
  left.append(
    elementBtn,
    createScreenshotMenu(),
    createMenu("forms", "Формы", "Формы на странице", FORM_MENU)
  );

  const divider = document.createElement("span");
  divider.className = "asc-divider";
  divider.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "asc-cluster asc-cluster--right";
  right.append(
    createMenu("page", "Страница", "Вставить страницу", PAGE_MENU),
    createMenu("selection", "Промпт", "Выделение и промпты", TEXT_MENU),
    createClipboardHistoryMenu()
  );

  const collapseBtn = createBtn("collapse", "Свернуть", "Свернуть панель");
  collapseBtn.classList.add("asc-btn--collapse", "asc-btn--icon-only");

  actions.append(left, divider, right, collapseBtn);

  const status = document.createElement("span");
  status.className = "asc-status";
  status.setAttribute("aria-live", "polite");

  const brandDock = document.createElement("div");
  brandDock.className = "asc-brand-dock";
  brandDock.append(
    brandCluster,
    ...(companionPomodoroDock ? [companionPomodoroDock.wrap] : []),
    brandDockDivider,
    viewportShotBtn,
    ...(companionCrosshairDock ? [companionCrosshairDock.wrap] : []),
    mediaHoverDockToggle,
    cmsDockDivider,
    openCmsBtn,
    webSearchForm
  );

  const toolbarPanel = document.createElement("div");
  toolbarPanel.className = "asc-toolbar-panel";
  toolbarPanel.append(actions);

  const shell = document.createElement("div");
  shell.className = "asc-shell";
  shell.append(brandDock, toolbarPanel, status);

  panelIdeasTodo = createPanelIdeasTodoModal(shell);
  right.append(panelIdeasTodo.wrap);

  const shadow = root.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = String(globalThis.__agentShellToolbarCss || "");
  shadow.append(style, shell);
  document.documentElement.appendChild(root);

  function closeBrandSearchPickerIfOutside(event) {
    if (!brandSearchPicker?.isOpen?.()) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(brandSearchPicker.wrap)) return;
    brandSearchPicker.setOpen(false);
  }

  document.addEventListener("pointerdown", closeBrandSearchPickerIfOutside, true);
  document.addEventListener("mousedown", closeBrandSearchPickerIfOutside, true);

  function toggleExpanded() {
    setExpanded(!root.classList.contains("is-expanded"));
  }

  function measureToolbarPanelHeight() {
    if (!root.classList.contains("is-expanded")) return TOOLBAR_EXPAND_ESTIMATE;
    return Math.max(
      TOOLBAR_EXPAND_ESTIMATE,
      Math.ceil(toolbarPanel.scrollHeight || 0),
      Math.ceil(toolbarPanel.getBoundingClientRect().height || 0)
    );
  }

  /** Панель инструментов над капсулой; если сверху мало места — под капсулой. */
  function updateToolbarExpandDirection() {
    const stackRect = brandDock.getBoundingClientRect();
    const panelH = measureToolbarPanelHeight();
    const need = panelH + TOOLBAR_EXPAND_GAP + EDGE_MARGIN;
    const spaceAbove = stackRect.top;
    const spaceBelow = window.innerHeight - stackRect.bottom;
    let expandDown = false;
    if (spaceAbove < need) {
      expandDown = spaceBelow >= need || spaceBelow > spaceAbove;
    }
    root.classList.toggle("asc-expand-down", expandDown);
  }

  function setExpanded(expanded) {
    const next = Boolean(expanded);
    if (next) updateToolbarExpandDirection();
    root.classList.toggle("is-expanded", next);
    brandCluster.setAttribute("aria-expanded", next ? "true" : "false");
    window.requestAnimationFrame(() => {
      updateToolbarExpandDirection();
      applyOffset({ x: offsetX, y: offsetY }, false);
    });
    try {
      localStorage.setItem(STORAGE_EXPANDED, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (!next) closeMenus();
  }

  function setStatus(text, kind) {
    status.textContent = text || "";
    status.dataset.kind = kind || "";
    status.classList.toggle("is-on", Boolean(text));
    window.clearTimeout(setStatus._timer);
    if (text) {
      setStatus._timer = window.setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
        status.classList.remove("is-on");
      }, 3200);
    }
  }

  function normalizeLines(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function pageRoot() {
    return document.querySelector("article") || document.querySelector("main") || document.body;
  }

  function extractPageCleanText(maxLen = MAX_PAGE_LEN) {
    const meta = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const body = normalizeLines(pageRoot()?.innerText || "");
    const text = body || normalizeLines(meta);
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen).trimEnd()}…`;
  }

  function extractPagePlainExcerpt(maxLen = MAX_PAGE_LEN) {
    const meta = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const article = pageRoot()?.innerText || "";
    const text = String(article || meta)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLen);
    return text;
  }

  function escapeMarkdownText(text) {
    return String(text || "").replace(/([\\`*_[\]()#+\-.!|>])/g, "\\$1");
  }

  let decodeUrls = true;
  let clipboardHistoryEnabled = false;
  let copyDecodeAttached = false;
  let addressBarReplacing = false;

  function readDecodeUrlsSetting(stored = {}) {
    const reader = globalThis.CompanionUrls?.readDecodeUrlsSetting;
    return typeof reader === "function" ? reader(stored) : stored.decodeUrls !== false;
  }

  function decodeUrlText(raw) {
    const value = String(raw || "").trim();
    if (!value) return value;
    const decode = globalThis.CompanionUrls?.decodeReadableUrl;
    if (typeof decode !== "function") return value;
    let decoded = decode(value);
    if ((!decoded || decoded === value) && /^https?:\/\//i.test(value)) {
      try {
        decoded = decodeURI(value);
      } catch {
        // ignore
      }
    }
    return decoded || value;
  }

  function normalizeUrlForCompare(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      const parsed = new URL(decodeUrlText(value));
      return `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return value;
    }
  }

  function isCurrentPageUrl(candidate) {
    const value = String(candidate || "").trim();
    if (!value) return false;
    if (value === location.href) return true;
    return normalizeUrlForCompare(value) === normalizeUrlForCompare(location.href);
  }

  function formatCompanionUrl(raw) {
    const value = String(raw || "").trim();
    if (!value || !decodeUrls) return value;
    return decodeUrlText(value);
  }

  function currentPageUrl() {
    return formatCompanionUrl(location.href);
  }

  function resolveAbsoluteUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      return formatCompanionUrl(new URL(value, location.href).href);
    } catch {
      return formatCompanionUrl(value);
    }
  }

  function writeClipboardSync(text) {
    const value = String(text || "");
    if (!value) return false;
    const node = document.createElement("textarea");
    node.value = value;
    node.setAttribute("readonly", "");
    node.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(node);
    node.focus();
    node.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      // ignore
    }
    node.remove();
    return ok;
  }

  function syncUrlDecodeListeners() {
    if (decodeUrls || clipboardHistoryEnabled) {
      if (!copyDecodeAttached) {
        document.addEventListener("copy", onCopyDecodeUrl, true);
        copyDecodeAttached = true;
      }
      return;
    }
    if (copyDecodeAttached) {
      document.removeEventListener("copy", onCopyDecodeUrl, true);
      copyDecodeAttached = false;
    }
  }

  function replaceAddressBarUrlIfEncoded() {
    if (!decodeUrls || addressBarReplacing) return;
    const href = location.href;
    if (!/%[0-9A-Fa-f]{2}/.test(href)) return;

    const decoded = decodeUrlText(href);
    if (!decoded || decoded === href) return;

    try {
      const before = new URL(href);
      const after = new URL(decoded);
      if (before.origin !== after.origin) return;
      if (before.protocol !== after.protocol) return;
    } catch {
      return;
    }

    addressBarReplacing = true;
    try {
      history.replaceState(history.state, document.title, decoded);
    } catch {
      // Some sites block replaceState for decoded paths.
    } finally {
      addressBarReplacing = false;
    }
  }

  function isToolbarCopyTarget(target) {
    return target instanceof Element && Boolean(target.closest("#agent-shell-companion-toolbar"));
  }

  function isSensitiveCopyTarget(target) {
    if (!(target instanceof Element)) return false;
    const field = target.closest("input, textarea");
    if (!field) return false;
    if (field.type === "password") return true;
    if (String(field.autocomplete || "").includes("password")) return true;
    return false;
  }

  async function recordClipboardHistory(
    text,
    { kind = "text", thumbDataUrl = "", imageDataUrl = "" } = {}
  ) {
    if (!clipboardHistoryEnabled) return;
    const body = String(text || "").trim();
    if (!body && kind !== "image") return;
    if (kind === "image" && !body && !imageDataUrl && !thumbDataUrl) return;
    try {
      await sendRuntimeMessage({
        type: "COMPANION_CLIPBOARD_HISTORY_ADD",
        entry: {
          kind,
          text: body || "[Изображение]",
          thumbDataUrl: String(thumbDataUrl || ""),
          imageDataUrl: String(imageDataUrl || ""),
          sourceUrl: location.href,
          pageTitle: document.title || ""
        }
      });
    } catch {
      // ignore
    }
  }

  async function insertClipboardHistoryItem(item) {
    if (item?.kind === "image" && item.imageDataUrl) {
      setStatus("Вставка…", "busy");
      const upload = await sendRuntimeMessage({
        type: "COMPANION_UPLOAD_TAB_SCREENSHOT",
        dataUrl: item.imageDataUrl,
        tabUrl: formatCompanionUrl(location.href)
      });
      if (upload?.ok && upload.text) {
        void insertIntoCompose(upload.text);
        return;
      }
    }
    void insertIntoCompose(item?.text || "");
  }

  function createClipboardHistoryRow(item) {
    const row = document.createElement("div");
    row.className = "asc-clip-item";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "asc-clip-item-main";
    main.title = "Вставить в чат";
    main.setAttribute("role", "menuitem");

    if (item.kind === "image" && item.thumbDataUrl) {
      const thumb = document.createElement("img");
      thumb.className = "asc-clip-thumb";
      thumb.src = item.thumbDataUrl;
      thumb.alt = "";
      main.append(thumb);
    }

    const label = document.createElement("span");
    label.className = "asc-clip-label";
    label.textContent = item.preview || item.text || "Запись";
    main.append(label);

    main.addEventListener("click", (event) => {
      event.stopPropagation();
      closeMenus();
      void insertClipboardHistoryItem(item);
    });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "asc-clip-item-copy";
    copyBtn.title = "Снова в буфер";
    copyBtn.setAttribute("aria-label", "Снова в буфер");
    copyBtn.textContent = "⧉";
    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeMenus();
      if (item.kind === "image" && item.imageDataUrl) {
        void copyScreenshotToClipboard(item.imageDataUrl)
          .then(() => setStatus("Скопировано", "ok"))
          .catch((error) => setStatus(error?.message || "Не удалось скопировать", "error"));
        return;
      }
      if (item.kind === "image") {
        setStatus("Изображение — только в чат", "error");
        return;
      }
      if (writeClipboardSync(item.text || "")) {
        setStatus("Скопировано", "ok");
        return;
      }
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(item.text || "").then(
          () => setStatus("Скопировано", "ok"),
          () => setStatus("Не удалось скопировать", "error")
        );
      }
    });

    row.append(main, copyBtn);
    return row;
  }

  async function renderClipboardHistoryMenu(pop) {
    pop.replaceChildren();

    const head = document.createElement("div");
    head.className = "asc-menu-head";
    head.textContent = "История буфера";
    pop.append(head);

    if (!clipboardHistoryEnabled) {
      const empty = document.createElement("div");
      empty.className = "asc-clip-empty";
      empty.textContent = "Выключено — включите в настройках расширения";
      pop.append(empty);
      return;
    }

    let items = [];
    try {
      const response = await sendRuntimeMessage({ type: "COMPANION_CLIPBOARD_HISTORY_LIST" });
      items = response?.items || [];
    } catch {
      items = [];
    }

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "asc-clip-empty";
      empty.textContent = "Пока пусто — скопируйте текст на странице";
      pop.append(empty);
      return;
    }

    for (const item of items) {
      pop.append(createClipboardHistoryRow(item));
    }

    const sep = document.createElement("div");
    sep.className = "asc-menu-sep";
    pop.append(sep);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "asc-menu-item asc-menu-item--muted";
    clearBtn.textContent = "Очистить";
    clearBtn.setAttribute("role", "menuitem");
    clearBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeMenus();
      void sendRuntimeMessage({ type: "COMPANION_CLIPBOARD_HISTORY_CLEAR" }).then(() => {
        setStatus("История очищена", "ok");
      });
    });
    pop.append(clearBtn);
  }

  function onCopyDecodeUrl(event) {
    if (isToolbarCopyTarget(event.target) || isSensitiveCopyTarget(event.target)) return;

    let text = "";
    try {
      text = String(event.clipboardData?.getData("text/plain") || "").trim();
    } catch {
      // ignore
    }
    if (!text) text = String(window.getSelection?.()?.toString() || "").trim();

    let finalText = text;
    if (decodeUrls && text) {
      const looksLikeUrl =
        /^https?:\/\//i.test(text) ||
        text.startsWith(location.origin) ||
        isCurrentPageUrl(text);
      if (looksLikeUrl && /%[0-9A-Fa-f]{2}/.test(text)) {
        const decoded = decodeUrlText(text);
        if (decoded && decoded !== text) {
          event.preventDefault();
          event.clipboardData.setData("text/plain", decoded);
          finalText = decoded;
        }
      }
    }

    if (clipboardHistoryEnabled && finalText) {
      void recordClipboardHistory(finalText);
    }
  }

  async function loadCompanionSettings() {
    try {
      const response = await sendRuntimeMessage({ type: "COMPANION_GET_SETTINGS" });
      if (response && typeof response === "object") {
        decodeUrls = response.decodeUrls !== false;
        clipboardHistoryEnabled = Boolean(response.clipboardHistoryEnabled);
        syncUrlDecodeListeners();
        replaceAddressBarUrlIfEncoded();
        return;
      }
    } catch {
      // fall through
    }
    try {
      const stored = await chrome.storage.local.get([
        "decodeUrls",
        "decodeUrlsInCompanion",
        "decodeUrlsOnCopy",
        "clipboardHistoryEnabled"
      ]);
      decodeUrls = readDecodeUrlsSetting(stored);
      clipboardHistoryEnabled = Boolean(stored.clipboardHistoryEnabled);
    } catch {
      // ignore
    }
    syncUrlDecodeListeners();
    replaceAddressBarUrlIfEncoded();
  }

  function nodeToMarkdown(node, depth = 0) {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) {
      return String(node.textContent || "").replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = /** @type {Element} */ (node);
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "IFRAME") return "";
    if (el.closest?.("#agent-shell-companion-toolbar, .cms-page-picker-root")) return "";

    if (tag === "H1") return `\n\n# ${el.innerText.trim()}\n\n`;
    if (tag === "H2") return `\n\n## ${el.innerText.trim()}\n\n`;
    if (tag === "H3") return `\n\n### ${el.innerText.trim()}\n\n`;
    if (tag === "H4") return `\n\n#### ${el.innerText.trim()}\n\n`;
    if (tag === "H5") return `\n\n##### ${el.innerText.trim()}\n\n`;
    if (tag === "H6") return `\n\n###### ${el.innerText.trim()}\n\n`;

    if (tag === "A") {
      const href = resolveAbsoluteUrl(el.getAttribute("href") || "");
      const label = String(el.innerText || href).replace(/\s+/g, " ").trim();
      if (!href) return label;
      return `[${escapeMarkdownText(label || href)}](${href})`;
    }

    if (tag === "IMG") {
      const src = resolveAbsoluteUrl(el.getAttribute("src") || el.getAttribute("data-src") || "");
      const alt = String(el.getAttribute("alt") || el.getAttribute("title") || "image").trim();
      if (!src) return "";
      return `![${escapeMarkdownText(alt)}](${src})`;
    }

    if (tag === "LI") {
      const parentTag = el.parentElement?.tagName || "";
      const bullet = parentTag === "OL" ? "1." : "-";
      const body = Array.from(el.childNodes)
        .map((child) => nodeToMarkdown(child, depth + 1))
        .join("")
        .trim();
      return body ? `\n${bullet} ${body}` : "";
    }

    if (tag === "UL" || tag === "OL") {
      const items = Array.from(el.children)
        .map((child) => nodeToMarkdown(child, depth + 1))
        .join("")
        .trim();
      return items ? `\n\n${items}\n\n` : "";
    }

    if (tag === "P" || tag === "BLOCKQUOTE" || tag === "PRE") {
      const body = Array.from(el.childNodes)
        .map((child) => nodeToMarkdown(child, depth + 1))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      return body ? `\n\n${body}\n\n` : "";
    }

    if (tag === "BR") return "\n";

    return Array.from(el.childNodes)
      .map((child) => nodeToMarkdown(child, depth + 1))
      .join("");
  }

  function extractPageMarkdown(maxLen = MAX_PAGE_LEN) {
    const body = normalizeLines(nodeToMarkdown(pageRoot()));
    const title = String(document.title || location.hostname).trim();
    const pageUrl = currentPageUrl();
    const header = `# ${title}\n\n[${pageUrl}](${pageUrl})\n\n`;
    const text = `${header}${body}`.trim();
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen).trimEnd()}…`;
  }

  function buildPagePayload(mode = "plain") {
    const title = document.title || location.hostname;
    const url = currentPageUrl();
    if (mode === "markdown") {
      const body = extractPageMarkdown();
      return ["[Страница · Markdown]", url, `Заголовок: ${title}`, "---", body].join("\n");
    }
    if (mode === "clean") {
      const body = extractPageCleanText();
      return ["[Страница · Чище]", url, `Заголовок: ${title}`, "---", body].join("\n");
    }
    const excerpt = extractPagePlainExcerpt();
    const lines = ["[Страница]", url, `Заголовок: ${title}`];
    if (excerpt) lines.push("---", excerpt);
    return lines.join("\n");
  }

  function readSelectionText() {
    return String(window.getSelection?.()?.toString() || "").trim();
  }

  function buildSelectionPayload(selection = readSelectionText()) {
    if (!selection) return null;
    return ["[Выделение]", currentPageUrl(), `Заголовок: ${document.title || location.hostname}`, "---", selection].join(
      "\n"
    );
  }

  function isFormFieldElement(el) {
    if (window.PagePickerExtract?.isFormField) {
      return window.PagePickerExtract.isFormField(el);
    }
    return Boolean(
      el?.matches?.(
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="file"]), textarea, select'
      )
    );
  }

  function isPasswordFormField(field) {
    if (!field) return false;
    if (String(field.type || "").toLowerCase() === "password") return true;
    if (String(field.autocomplete || "").toLowerCase().includes("password")) return true;
    const label = formFieldLabel(field).toLowerCase();
    return /парол|password|passwort/i.test(label) || /парол|password/i.test(String(field.name || ""));
  }

  function formFieldLabel(field) {
    if (!field) return "поле";
    const id = String(field.id || "").trim();
    if (id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        const text = String(labelEl?.innerText || labelEl?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        if (text) return text;
      } catch {
        // ignore invalid selector
      }
    }
    const wrapped = field.closest("label");
    if (wrapped) {
      const text = String(wrapped.innerText || wrapped.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      if (text) return text;
    }
    return (
      String(field.getAttribute("aria-label") || "").trim() ||
      String(field.getAttribute("placeholder") || "").trim() ||
      String(field.getAttribute("name") || "").trim() ||
      id ||
      "поле"
    );
  }

  function readFormFieldValue(field) {
    if (window.PagePickerExtract?.extractFormFieldValue) {
      return String(window.PagePickerExtract.extractFormFieldValue(field) || "").trim();
    }
    return String(field?.value ?? "").trim();
  }

  function describeFormFieldLine(field, { maskPasswords = true } = {}) {
    const label = formFieldLabel(field);
    const type = String(field.type || field.tagName || "field").toLowerCase();
    if (maskPasswords && isPasswordFormField(field)) {
      return `- ${label} (${type}): [пароль — не передаём]`;
    }
    if (type === "checkbox") {
      return `- ${label} (checkbox): ${field.checked ? "включён" : "выключен"}`;
    }
    if (type === "radio") {
      return `- ${label} (radio): ${field.checked ? "выбран" : "не выбран"}`;
    }
    const value = readFormFieldValue(field);
    return `- ${label} (${type}): ${value || "—"}`;
  }

  function collectPageFormFields() {
    const fields = [];
    const seen = new Set();

    function pushField(el) {
      if (!isFormFieldElement(el)) return;
      if (seen.has(el)) return;
      if (el.closest?.("#agent-shell-companion-toolbar, .cms-page-picker-root")) return;
      seen.add(el);
      fields.push(el);
    }

    const active = document.activeElement;
    if (isFormFieldElement(active)) {
      const form = active.closest("form");
      if (form) {
        form.querySelectorAll("input, textarea, select").forEach(pushField);
      } else {
        pushField(active);
      }
      if (fields.length) return fields;
    }

    for (const form of document.querySelectorAll("form")) {
      if (form.closest("#agent-shell-companion-toolbar")) continue;
      form.querySelectorAll("input, textarea, select").forEach(pushField);
      if (fields.length >= 48) break;
    }

    return fields.slice(0, 48);
  }

  function buildFormFieldsBlock({ maskPasswords = true } = {}) {
    const fields = collectPageFormFields();
    if (!fields.length) {
      return "На странице не найдено полей формы (или они в недоступном фрейме).";
    }
    return fields.map((field) => describeFormFieldLine(field, { maskPasswords })).join("\n");
  }

  function buildFormEditPayload() {
    const title = document.title || location.hostname;
    const url = currentPageUrl();
    const fieldsBlock = buildFormFieldsBlock({ maskPasswords: true });
    return [
      "[Формы · вставить / заменить / изменить]",
      url,
      `Заголовок: ${title}`,
      "---",
      "Помоги вставить, заменить или изменить значения полей формы на этой странице.",
      "Пароли в контекст не передаются — предложи безопасный способ или запроси у пользователя.",
      "",
      "Текущие поля:",
      fieldsBlock
    ].join("\n");
  }

  function buildFormPasswordsPayload() {
    const title = document.title || location.hostname;
    const url = currentPageUrl();
    let host = location.hostname;
    try {
      host = new URL(url).hostname || host;
    } catch {
      // ignore
    }
    const fieldsBlock = buildFormFieldsBlock({ maskPasswords: true });
    return [
      "[Формы · пароли из хранилища]",
      url,
      `Заголовок: ${title}`,
      `Домен: ${host}`,
      "---",
      "Найди в хранилище Agent CMS подходящие пароли и секреты для этого сайта или формы.",
      "Используй vault, заметки с секретами и метки паролей; сопоставь с полями ниже.",
      "",
      "Поля на странице:",
      fieldsBlock
    ].join("\n");
  }

  async function copyPageUrlToClipboard() {
    const url = currentPageUrl();
    if (writeClipboardSync(url)) {
      void recordClipboardHistory(url);
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      void recordClipboardHistory(url);
      return;
    }
    await new Promise((resolve, reject) => {
      const onCopy = (event) => {
        event.preventDefault();
        event.clipboardData.setData("text/plain", url);
        resolve();
      };
      document.addEventListener("copy", onCopy, { once: true, capture: true });
      const copied = document.execCommand("copy");
      if (!copied) {
        document.removeEventListener("copy", onCopy, { capture: true });
        reject(new Error("Буфер обмена недоступен"));
      }
    });
  }

  function insertIntoCompose(text) {
    const body = String(text || "").trim();
    if (!body) return Promise.resolve({ ok: false, error: "Пустой текст" });
    setStatus("Вставка…", "busy");
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "COMPANION_COMPOSE_INSERT", text: body, join: "newline" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus("Ошибка расширения", "error");
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (!response?.ok) {
          setStatus(response?.error || "Не удалось вставить", "error");
          resolve(response || { ok: false });
          return;
        }
        setStatus("Вставлено", "ok");
        resolve(response);
      });
    });
  }

  function openAgentCmsTab() {
    chrome.runtime.sendMessage({ type: "COMPANION_OPEN_CMS_TAB" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus(response?.error || "Не удалось открыть Agent CMS", "error");
        return;
      }
      setStatus(response.sameTab ? "Agent CMS…" : "Agent CMS открыт", "ok");
    });
  }

  function toggleSidePanel() {
    chrome.runtime.sendMessage({ type: "COMPANION_TOGGLE_PANEL" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus(response?.error || "Не удалось переключить панель", "error");
        return;
      }
      setStatus(response.open ? "Панель открыта" : "Панель свернута", "ok");
    });
  }

  function setPickerActive(next) {
    pickerActive = Boolean(next);
    elementBtn.classList.toggle("is-active", pickerActive);
    elementBtn.setAttribute("aria-pressed", pickerActive ? "true" : "false");
  }

  function togglePagePicker() {
    const next = !pickerActive;
    chrome.runtime.sendMessage(
      { type: "COMPANION_PAGE_PICKER_SET", active: next, useSenderTab: true },
      (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          setStatus(response?.error || "Не удалось включить выбор", "error");
          return;
        }
        setPickerActive(next);
        setStatus(next ? "Выбор элемента" : "Выбор выключен", "ok");
      }
    );
  }

  function applySelectionPrompt(item) {
    const selection = readSelectionText();
    if (!selection) {
      setStatus("Сначала выделите текст", "error");
      return;
    }
    void insertIntoCompose(item.build(selection));
  }

  function handleMenuAction(key) {
    if (key === "page") {
      void insertIntoCompose(buildPagePayload("plain"));
      return;
    }
    if (key === "page-url-copy") {
      closeMenus();
      setStatus("Копирование…", "busy");
      void copyPageUrlToClipboard()
        .then(() => setStatus("Ссылка скопирована", "ok"))
        .catch((error) => setStatus(error?.message || "Не удалось скопировать", "error"));
      return;
    }
    if (key === "clean") {
      void insertIntoCompose(buildPagePayload("clean"));
      return;
    }
    if (key === "markdown") {
      void insertIntoCompose(buildPagePayload("markdown"));
      return;
    }
    if (key === "form-edit") {
      void insertIntoCompose(buildFormEditPayload());
      return;
    }
    if (key === "form-passwords") {
      void insertIntoCompose(buildFormPasswordsPayload());
      return;
    }
    if (key === "selection") {
      const payload = buildSelectionPayload();
      if (!payload) {
        setStatus("Нет выделения", "error");
        return;
      }
      void insertIntoCompose(payload);
      return;
    }
    if (runScreenshotFromMenuKey(key)) return;
    const prompt = SELECTION_PROMPTS.find((item) => item.key === key);
    if (prompt) applySelectionPrompt(prompt);
  }

  function waitPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(resolve, 40);
        });
      });
    });
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false });
      });
    });
  }

  async function cropScreenshotDataUrl(dataUrl, rect) {
    const dpr = window.devicePixelRatio || 1;
    const blob = await (await fetch(String(dataUrl || ""))).blob();
    const bitmap = await createImageBitmap(blob);
    const sx = Math.max(0, Math.round(rect.left * dpr));
    const sy = Math.max(0, Math.round(rect.top * dpr));
    const sw = Math.min(bitmap.width - sx, Math.max(1, Math.round(rect.width * dpr)));
    const sh = Math.min(bitmap.height - sy, Math.max(1, Math.round(rect.height * dpr)));
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Не удалось обрезать скриншот");
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    bitmap.close();
    const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    const bytes = new Uint8Array(await out.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }

  function isScreenshotElementExcluded(el) {
    if (!el) return true;
    if (
      el.closest(
        "#agent-shell-companion-toolbar, .asc-screenshot-element-root, .asc-screenshot-region-root, script, style, noscript, iframe"
      )
    ) {
      return true;
    }
    const host = el.getRootNode?.()?.host;
    if (host?.id === "agent-shell-companion-toolbar") return true;
    if (host?.closest?.("#agent-shell-companion-toolbar, .asc-screenshot-element-root")) return true;
    return false;
  }

  function extractElementTextForScreenshot(el) {
    if (!el) return "";
    try {
      return String(el.innerText || el.textContent || "").trim();
    } catch {
      return "";
    }
  }

  function elementAtPointForScreenshot(x, y) {
    return window.PagePickerExtract?.deepElementFromPoint?.(x, y) || document.elementFromPoint(x, y);
  }

  function resolveScreenshotElement(raw) {
    if (!raw || isScreenshotElementExcluded(raw)) return null;

    if (window.PagePickerExtract?.resolveTextBlockTarget) {
      const block = window.PagePickerExtract.resolveTextBlockTarget(raw, {
        isExcluded: isScreenshotElementExcluded,
        extractText: extractElementTextForScreenshot,
        isFormField: (el) => window.PagePickerExtract?.isFormField?.(el)
      });
      if (block) return block;
    }

    const visual = raw.closest?.(
      "img, picture, video, canvas, svg, table, pre, article, section, main, aside, figure, [role='article']"
    );
    if (visual && !isScreenshotElementExcluded(visual)) return visual;

    let el = raw;
    while (el && el !== document.body) {
      if (isScreenshotElementExcluded(el)) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width >= 24 && rect.height >= 24) return el;
      el = el.parentElement;
    }
    return isScreenshotElementExcluded(raw) ? null : raw;
  }

  function elementCropRect(el) {
    if (!el?.getBoundingClientRect) return null;
    const rect = el.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const width = right - left;
    const height = bottom - top;
    if (width < 8 || height < 8) return null;
    return { left, top, width, height };
  }

  function pickScreenshotElement() {
    return new Promise((resolve) => {
      const rootNode = document.createElement("div");
      rootNode.className = "asc-screenshot-element-root";
      rootNode.setAttribute("aria-hidden", "true");

      const hint = document.createElement("div");
      hint.className = "asc-screenshot-element-hint";
      hint.textContent = "Наведите на блок и кликните · Esc — отмена";

      const highlight = document.createElement("div");
      highlight.className = "asc-screenshot-element-highlight";

      rootNode.append(hint, highlight);
      document.documentElement.classList.add("asc-screenshot-element-active");
      document.body.appendChild(rootNode);

      let hoveredTarget = null;

      function hideHighlight() {
        highlight.style.display = "none";
      }

      function showHighlight(target) {
        const rect = elementCropRect(target);
        if (!rect) {
          hideHighlight();
          return;
        }
        highlight.style.display = "block";
        highlight.style.left = `${rect.left}px`;
        highlight.style.top = `${rect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
      }

      function cleanup(result) {
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("click", onClick, true);
        rootNode.remove();
        document.documentElement.classList.remove("asc-screenshot-element-active");
        globalThis.syncCompanionCrosshair?.();
        resolve(result);
      }

      function onKeyDown(event) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        cleanup(null);
      }

      function onPointerMove(event) {
        const raw = elementAtPointForScreenshot(event.clientX, event.clientY);
        const target = resolveScreenshotElement(raw);
        if (target === hoveredTarget) return;
        hoveredTarget = target;
        if (target) showHighlight(target);
        else hideHighlight();
      }

      function onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const raw = elementAtPointForScreenshot(event.clientX, event.clientY);
        const target = resolveScreenshotElement(raw);
        const rect = target ? elementCropRect(target) : null;
        cleanup(rect);
      }

      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("pointermove", onPointerMove, true);
      document.addEventListener("click", onClick, true);
    });
  }

  function pickScreenshotRegion() {
    const MIN_SIZE = 12;
    return new Promise((resolve) => {
      const rootNode = document.createElement("div");
      rootNode.className = "asc-screenshot-region-root";
      rootNode.setAttribute("aria-hidden", "true");

      const hint = document.createElement("div");
      hint.className = "asc-screenshot-region-hint";
      hint.textContent = "Выделите область · Esc — отмена";

      const box = document.createElement("div");
      box.className = "asc-screenshot-region-box";

      const sizeLabel = document.createElement("div");
      sizeLabel.className = "asc-screenshot-region-size";
      sizeLabel.hidden = true;

      rootNode.append(hint, box, sizeLabel);
      document.documentElement.classList.add("asc-screenshot-region-active");
      document.body.appendChild(rootNode);

      let startX = 0;
      let startY = 0;
      let dragging = false;

      function cleanup(result) {
        document.removeEventListener("keydown", onKeyDown, true);
        rootNode.removeEventListener("pointerdown", onPointerDown, true);
        rootNode.removeEventListener("pointermove", onPointerMove, true);
        rootNode.removeEventListener("pointerup", onPointerUp, true);
        rootNode.remove();
        document.documentElement.classList.remove("asc-screenshot-region-active");
        globalThis.syncCompanionCrosshair?.();
        resolve(result);
      }

      function setBox(left, top, width, height) {
        const visible = width > 0 && height > 0;
        box.style.display = visible ? "block" : "none";
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        if (!visible) {
          sizeLabel.hidden = true;
          return;
        }
        const w = Math.round(width);
        const h = Math.round(height);
        sizeLabel.textContent = `${w} × ${h}`;
        sizeLabel.hidden = false;
        const gap = 6;
        const margin = 8;
        const labelW = sizeLabel.offsetWidth || 72;
        const labelH = sizeLabel.offsetHeight || 22;
        let lx = left + width - labelW;
        let ly = top + height + gap;
        if (ly + labelH > window.innerHeight - margin) {
          ly = top - labelH - gap;
        }
        if (ly < margin) {
          ly = top + Math.max(gap, height - labelH - gap);
        }
        if (lx + labelW > window.innerWidth - margin) {
          lx = window.innerWidth - labelW - margin;
        }
        if (lx < margin) lx = margin;
        sizeLabel.style.left = `${lx}px`;
        sizeLabel.style.top = `${ly}px`;
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cleanup(null);
        }
      }

      function onPointerDown(event) {
        if (event.button !== 0) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        setBox(startX, startY, 0, 0);
        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!dragging) return;
        const left = Math.min(startX, event.clientX);
        const top = Math.min(startY, event.clientY);
        const width = Math.abs(event.clientX - startX);
        const height = Math.abs(event.clientY - startY);
        setBox(left, top, width, height);
        event.preventDefault();
      }

      function onPointerUp(event) {
        if (!dragging || event.button !== 0) return;
        dragging = false;
        const left = Math.min(startX, event.clientX);
        const top = Math.min(startY, event.clientY);
        const width = Math.abs(event.clientX - startX);
        const height = Math.abs(event.clientY - startY);
        if (width < MIN_SIZE || height < MIN_SIZE) {
          cleanup(null);
          return;
        }
        cleanup({ left, top, width, height });
        event.preventDefault();
      }

      document.addEventListener("keydown", onKeyDown, true);
      rootNode.addEventListener("pointerdown", onPointerDown, true);
      rootNode.addEventListener("pointermove", onPointerMove, true);
      rootNode.addEventListener("pointerup", onPointerUp, true);
    });
  }

  async function dataUrlToPng(dataUrl) {
    const source = String(dataUrl || "").trim();
    if (!source.startsWith("data:image/")) {
      throw new Error("Некорректный скриншот");
    }
    if (source.startsWith("data:image/png")) return source;

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Не удалось подготовить изображение"));
          return;
        }
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("Не удалось подготовить изображение"));
      image.src = source;
    });
  }

  async function copyImageBlobToClipboard(imageBlob) {
    if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlob })]);
      return;
    }

    await new Promise((resolve, reject) => {
      const onCopy = (event) => {
        event.preventDefault();
        try {
          event.clipboardData.items.add(imageBlob, "image/png");
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      document.addEventListener("copy", onCopy, { once: true, capture: true });
      const copied = document.execCommand("copy");
      if (!copied) {
        document.removeEventListener("copy", onCopy, { capture: true });
        reject(new Error("Буфер обмена недоступен"));
      }
    });
  }

  async function dataUrlToJpeg(dataUrl, quality = 0.88) {
    const pngDataUrl = await dataUrlToPng(dataUrl);
    const blob = await (await fetch(pngDataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Не удалось подготовить изображение");
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const out = await canvas.convertToBlob({ type: "image/jpeg", quality });
    const bytes = new Uint8Array(await out.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }

  async function makeImageThumb(dataUrl, maxSize = 120) {
    const source = String(dataUrl || "").trim();
    if (!source.startsWith("data:image/")) return "";
    const blob = await (await fetch(source)).blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return "";
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.72 });
    const bytes = new Uint8Array(await out.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }

  async function recordScreenshotInClipboardHistory(dataUrl) {
    try {
      const jpegDataUrl = await dataUrlToJpeg(dataUrl);
      const thumbDataUrl = await makeImageThumb(jpegDataUrl);
      void recordClipboardHistory(`[Изображение] ${currentPageUrl()}`, {
        kind: "image",
        thumbDataUrl,
        imageDataUrl: jpegDataUrl
      });
    } catch {
      void recordClipboardHistory(`[Изображение] ${currentPageUrl()}`, { kind: "image" });
    }
  }

  function buildScreenshotFilename(kind = "screen") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `agent-shell-${kind}-${stamp}.png`;
  }

  async function downloadScreenshot(dataUrl, { kind = "screen" } = {}) {
    const pngDataUrl = await dataUrlToPng(dataUrl);
    const blob = await (await fetch(pngDataUrl)).blob();
    if (!blob?.size) throw new Error("Пустой скриншот");

    const filename = buildScreenshotFilename(kind);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  const FULLPAGE_MAX_SLICES = 50;
  const FULLPAGE_MAX_HEIGHT = 24000;

  function getPageScrollMetrics() {
    const root = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0, window.innerWidth),
      scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight || 0, window.innerHeight),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  function buildFullPageScrollPositions(metrics) {
    const viewportH = Math.max(1, metrics.viewportHeight);
    const maxScroll = Math.max(0, metrics.scrollHeight - viewportH);
    if (maxScroll <= 0) return [0];

    const positions = [0];
    let y = 0;
    while (y < maxScroll && positions.length < FULLPAGE_MAX_SLICES - 1) {
      y += viewportH;
      if (y > maxScroll) y = maxScroll;
      if (positions[positions.length - 1] !== y) positions.push(y);
      if (y >= maxScroll) break;
    }
    if (positions[positions.length - 1] !== maxScroll) {
      if (positions.length >= FULLPAGE_MAX_SLICES) positions[positions.length - 1] = maxScroll;
      else positions.push(maxScroll);
    }
    return positions;
  }

  function hideFixedElementsForCapture() {
    const hidden = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof Element)) continue;
      if (el.closest("#agent-shell-companion-toolbar, #agent-companion-media-save")) continue;
      let position = "";
      try {
        position = getComputedStyle(el).position;
      } catch {
        continue;
      }
      if (position !== "fixed" && position !== "sticky") continue;
      hidden.push({ el, visibility: el.style.visibility });
      el.style.setProperty("visibility", "hidden", "important");
    }
    return () => {
      for (const item of hidden) {
        if (item.visibility) item.el.style.visibility = item.visibility;
        else item.el.style.removeProperty("visibility");
      }
    };
  }

  async function stitchFullPageSlices(slices, metrics) {
    const dpr = metrics.devicePixelRatio || 1;
    const canvasW = Math.max(1, Math.round(metrics.viewportWidth * dpr));
    const canvasH = Math.max(1, Math.round(metrics.scrollHeight * dpr));
    if (canvasH > 16384) {
      throw new Error("Страница слишком длинная для склейки (лимит ~16 000 px)");
    }

    const canvas = new OffscreenCanvas(canvasW, canvasH);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Не удалось склеить скриншот");

    for (const slice of slices) {
      const blob = await (await fetch(String(slice.dataUrl || ""))).blob();
      const bitmap = await createImageBitmap(blob);
      const destY = Math.round(Math.max(0, slice.scrollY) * dpr);
      const remainingCss = Math.max(0, metrics.scrollHeight - slice.scrollY);
      const drawHeight = Math.min(Math.round(remainingCss * dpr), bitmap.height, canvasH - destY);
      if (drawHeight <= 0) {
        bitmap.close();
        continue;
      }
      ctx.drawImage(bitmap, 0, 0, bitmap.width, drawHeight, 0, destY, bitmap.width, drawHeight);
      bitmap.close();
    }

    const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
    const bytes = new Uint8Array(await out.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }

  async function captureFullPageScreenshot() {
    const metrics = getPageScrollMetrics();
    if (metrics.scrollHeight > FULLPAGE_MAX_HEIGHT) {
      throw new Error(`Страница слишком длинная (>${FULLPAGE_MAX_HEIGHT}px)`);
    }

    const positions = buildFullPageScrollPositions(metrics);
    if (positions.length > FULLPAGE_MAX_SLICES) {
      throw new Error("Слишком много фрагментов — укоротите страницу или используйте «Область»");
    }

    const originalScroll = { x: window.scrollX, y: window.scrollY };
    const restoreFixed = hideFixedElementsForCapture();
    document.documentElement.classList.add("asc-capturing-fullpage");

    try {
      const slices = [];
      for (let i = 0; i < positions.length; i += 1) {
        setStatus(`Скрин страницы ${i + 1}/${positions.length}…`, "busy");
        window.scrollTo(0, positions[i]);
        await waitPaint();
        await new Promise((resolve) => window.setTimeout(resolve, 120));

        const capture = await sendRuntimeMessage({ type: "COMPANION_CAPTURE_TAB_SCREENSHOT" });
        if (!capture?.ok || !capture.dataUrl) {
          throw new Error(capture?.error || "Не удалось сделать фрагмент скрина");
        }

        slices.push({
          dataUrl: capture.dataUrl,
          scrollY: window.scrollY
        });
      }

      setStatus("Склейка…", "busy");
      return {
        dataUrl: await stitchFullPageSlices(slices, metrics),
        tabUrl: location.href
      };
    } finally {
      window.scrollTo(originalScroll.x, originalScroll.y);
      restoreFixed();
      document.documentElement.classList.remove("asc-capturing-fullpage");
    }
  }

  async function copyScreenshotToClipboard(dataUrl) {
    const pngDataUrl = await dataUrlToPng(dataUrl);
    const blob = await (await fetch(pngDataUrl)).blob();
    if (!blob?.size) throw new Error("Пустой скриншот");
    const imageBlob =
      blob.type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });

    try {
      await copyImageBlobToClipboard(imageBlob);
      return;
    } catch (localError) {
      const response = await sendRuntimeMessage({
        type: "COMPANION_CLIPBOARD_WRITE_IMAGE",
        dataUrl: pngDataUrl
      });
      if (response?.ok) return;
      throw new Error(response?.error || localError?.message || "Не удалось скопировать");
    }
  }

  async function deliverScreenshotData(dataUrl, destination, shotKind, capture) {
    if (destination === "clipboard") {
      try {
        await copyScreenshotToClipboard(dataUrl);
        void recordScreenshotInClipboardHistory(dataUrl);
        setStatus("Скопировано", "ok");
      } catch (error) {
        setStatus(error?.message || "Не удалось скопировать", "error");
      }
      return;
    }

    if (destination === "download") {
      try {
        await downloadScreenshot(dataUrl, { kind: shotKind });
        setStatus("Скачано", "ok");
      } catch (error) {
        setStatus(error?.message || "Не удалось скачать", "error");
      }
      return;
    }

    if (destination === "storage") {
      setStatus("Хранилище — скоро (TODO)", "ok");
      return;
    }

    const upload = await sendRuntimeMessage({
      type: "COMPANION_UPLOAD_TAB_SCREENSHOT",
      dataUrl,
      tabUrl: formatCompanionUrl(capture.tabUrl || location.href)
    });
    if (!upload?.ok) {
      setStatus(upload?.error || "Не удалось сохранить скрин", "error");
      return;
    }
    if (upload.text) {
      void insertIntoCompose(upload.text);
      return;
    }
    setStatus("Скриншот готов", "ok");
  }

  async function runScreenshot({
    region = false,
    element = false,
    fullPage = false,
    destination = "compose"
  } = {}) {
    closeMenus();
    setStatus(
      element ? "Выберите блок…" : region ? "Выделите область…" : fullPage ? "Скрин страницы…" : "Скриншот…",
      "busy"
    );

    let cropRect = null;
    let shotKind = "screen";
    if (element) {
      cropRect = await pickScreenshotElement();
      shotKind = "block";
      if (!cropRect) {
        setStatus("Отменено", "ok");
        return;
      }
    } else if (region) {
      cropRect = await pickScreenshotRegion();
      shotKind = "region";
      if (!cropRect) {
        setStatus("Отменено", "ok");
        return;
      }
    }

    setStatus("Скриншот…", "busy");
    let capture;
    let dataUrl;
    document.documentElement.classList.add("asc-capturing-viewport");
    try {
      if (fullPage) {
        shotKind = "fullpage";
        try {
          capture = await captureFullPageScreenshot();
        } catch (error) {
          setStatus(error?.message || "Не удалось сделать скрин страницы", "error");
          return;
        }
      } else {
        await waitPaint();
        capture = await sendRuntimeMessage({ type: "COMPANION_CAPTURE_TAB_SCREENSHOT" });
        if (!capture?.ok || !capture.dataUrl) {
          setStatus(capture?.error || "Не удалось сделать скрин", "error");
          return;
        }
      }

      dataUrl = capture.dataUrl;
      if (cropRect) {
        try {
          dataUrl = await cropScreenshotDataUrl(dataUrl, cropRect);
        } catch (error) {
          setStatus(error?.message || "Не удалось обрезать", "error");
          return;
        }
      }
    } finally {
      document.documentElement.classList.remove("asc-capturing-viewport");
      globalThis.syncCompanionCrosshair?.();
    }

    let finalDestination = destination;
    if (destination === "annotate") {
      setStatus("Разметка…", "busy");
      const editor = globalThis.openScreenshotAnnotateEditor;
      if (typeof editor !== "function") {
        setStatus("Редактор разметки недоступен", "error");
        return;
      }
      const edited = await editor(dataUrl);
      if (!edited?.dataUrl || !edited.destination) {
        setStatus("Отменено", "ok");
        return;
      }
      dataUrl = edited.dataUrl;
      finalDestination = edited.destination;
    }

    await deliverScreenshotData(dataUrl, finalDestination, shotKind, capture);
  }

  function readStoredOffset() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_OFFSET) || "");
      const x = Number(raw?.x);
      const y = Number(raw?.y);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    } catch {
      // ignore
    }
    return { x: 0, y: 0 };
  }

  function clampOffset(x, y) {
    const rect = root.getBoundingClientRect();
    const width = Math.max(40, rect.width || 40);
    const height = Math.max(40, rect.height || 40);
    const maxX = Math.max(0, (window.innerWidth - width) / 2 - EDGE_MARGIN);
    const maxY = Math.max(0, window.innerHeight - height - BASE_BOTTOM - EDGE_MARGIN);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(0, y))
    };
  }

  function applyOffset(next, persist) {
    const clamped = clampOffset(Number(next?.x) || 0, Number(next?.y) || 0);
    offsetX = clamped.x;
    offsetY = clamped.y;
    root.style.setProperty("--asc-x", `${offsetX}px`);
    root.style.setProperty("--asc-y", `${offsetY}px`);
    window.requestAnimationFrame(() => {
      updateToolbarExpandDirection();
      if (brandSearchPicker?.isOpen?.()) {
        brandSearchPicker.updatePopDirection?.();
      }
    });
    if (!persist) return;
    try {
      if (Math.abs(offsetX) < SNAP_DISTANCE) offsetX = 0;
      if (offsetY < SNAP_DISTANCE) offsetY = 0;
      root.style.setProperty("--asc-x", `${offsetX}px`);
      root.style.setProperty("--asc-y", `${offsetY}px`);
      localStorage.setItem(STORAGE_OFFSET, JSON.stringify({ x: offsetX, y: offsetY }));
    } catch {
      // ignore
    }
  }

  function isBrandTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(".asc-brand-cluster"));
  }

  let blockToggleAfterDrag = false;
  let brandClickDelayTimer = null;

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (!isBrandTarget(event.target)) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetX,
      originY: offsetY,
      moved: false
    };
  }

  function onPointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = dragState.startY - event.clientY;
    if (!dragState.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragState.moved = true;
      root.classList.add("is-dragging");
      closeMenus();
    }
    applyOffset({ x: dragState.originX + dx, y: dragState.originY + dy }, false);
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const moved = dragState.moved;
    dragState = null;
    root.classList.remove("is-dragging");
    if (moved) {
      blockToggleAfterDrag = true;
      applyOffset({ x: offsetX, y: offsetY }, true);
    }
  }

  brandCluster.addEventListener("click", (event) => {
    event.stopPropagation();
    if (blockToggleAfterDrag) {
      blockToggleAfterDrag = false;
      return;
    }
    if (brandClickDelayTimer) window.clearTimeout(brandClickDelayTimer);
    brandClickDelayTimer = window.setTimeout(() => {
      brandClickDelayTimer = null;
      toggleExpanded();
    }, 220);
  });

  brandCluster.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (brandClickDelayTimer) {
      window.clearTimeout(brandClickDelayTimer);
      brandClickDelayTimer = null;
    }
    blockToggleAfterDrag = true;
    toggleSidePanel();
  });

  brandCluster.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    toggleExpanded();
  });

  collapseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setExpanded(false);
  });

  viewportShotBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    void runScreenshot({ region: false, destination: "clipboard" });
  });

  openCmsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openAgentCmsTab();
  });

  elementBtn.addEventListener("click", togglePagePicker);

  shell.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => {
    applyOffset({ x: offsetX, y: offsetY }, true);
    updateToolbarExpandDirection();
    if (brandSearchPicker?.isOpen?.()) {
      brandSearchPicker.updatePopDirection?.();
    }
  });

  document.addEventListener(
    "click",
    (event) => {
      if (event.composedPath().includes(root)) return;
      closeMenus();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (brandSearchPicker?.isOpen?.()) {
      brandSearchPicker.setOpen(false);
      return;
    }
    const anyOpen = menus.some((menu) => menu.wrap.classList.contains("is-open"));
    if (anyOpen) {
      closeMenus();
      return;
    }
    if (pickerActive) {
      setPickerActive(false);
      try {
        chrome.runtime.sendMessage({
          type: "COMPANION_PAGE_PICKER_SET",
          active: false,
          useSenderTab: true
        });
      } catch {
        // ignore
      }
      return;
    }
    if (root.classList.contains("is-expanded")) setExpanded(false);
  });

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "COMPANION_PAGE_PICKER_STATE") {
        setPickerActive(Boolean(message.active));
      }
    });
  } catch {
    // ignore
  }

  applyOffset(readStoredOffset(), false);
  try {
    setExpanded(localStorage.getItem(STORAGE_EXPANDED) === "1");
  } catch {
    setExpanded(false);
  }

  void loadCompanionSettings();
  window.addEventListener("pageshow", () => replaceAddressBarUrlIfEncoded());

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.decodeUrls) {
        decodeUrls = changes.decodeUrls.newValue !== false;
        syncUrlDecodeListeners();
        replaceAddressBarUrlIfEncoded();
      }
      if (changes.clipboardHistoryEnabled) {
        clipboardHistoryEnabled = Boolean(changes.clipboardHistoryEnabled.newValue);
        syncUrlDecodeListeners();
      }
    });
  } catch {
    // ignore
  }
})();
