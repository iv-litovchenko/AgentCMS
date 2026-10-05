(function initCompanionBookmarksDraft(global) {
  if (global.__companionBookmarksDraftInit) return;
  if (window !== window.top) return;
  global.__companionBookmarksDraftInit = true;

  const STORAGE_KEY = "companionBookmarksDraft";
  const MAX_ITEMS = 48;
  const HTML_CLASS = "asc-bookmarks-draft-active";

  const BOOKMARK_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v14l-7-4-7 4V6a2 2 0 0 1 2-2z"/></svg>';

  const SVG_CLOSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function bookmarksOverlayMount() {
    return document.documentElement || document.body;
  }

  function removeStaleBookmarkOverlays(keep) {
    for (const node of document.querySelectorAll(".asc-bookmarks-draft-root")) {
      if (keep && node === keep) continue;
      node.remove();
    }
  }

  const BOOKMARKS_TABS = [
    { id: "bookmarks", label: "Закладки" },
    { id: "history", label: "История" },
    { id: "downloads", label: "Загрузки" }
  ];

  const PREVIEW_EXAMPLE = {
    url: "https://www.youtube.com/watch?v=IPEGHLql7D0&list=RDIPEGHLql7D0&start_radio=1",
    videoId: "IPEGHLql7D0",
    site: "YouTube",
    title: "Видео на YouTube",
    note: "Превью с обложкой — как вставка ссылки в Telegram или WhatsApp"
  };

  function sendRuntime(payload) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          resolve(response && typeof response === "object" ? response : { ok: false });
        });
      } catch {
        resolve({ ok: false });
      }
    });
  }

  function youtubeThumbUrls(videoId) {
    const id = String(videoId || "").trim();
    return [
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    ];
  }

  function applyPreviewImage(img, dataUrl) {
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth < 160 || probe.naturalHeight < 90) {
          resolve(false);
          return;
        }
        img.src = dataUrl;
        img.classList.remove("is-loading", "is-broken");
        img.classList.add("is-loaded");
        const thumb = img.closest(".asc-bookmarks-draft-preview-card-thumb");
        thumb?.classList.remove("is-loading");
        thumb?.classList.add("is-loaded");
        resolve(true);
      };
      probe.onerror = () => resolve(false);
      probe.src = dataUrl;
    });
  }

  async function loadPreviewImage(img, urls) {
    for (const url of urls) {
      const res = await sendRuntime({ type: "COMPANION_FETCH_IMAGE_DATA_URL", url });
      if (res?.ok && res.dataUrl) {
        const ok = await applyPreviewImage(img, res.dataUrl);
        if (ok) return true;
      }
    }
    img.classList.add("is-broken");
    img.classList.remove("is-loading", "is-loaded");
    img.removeAttribute("src");
    const thumb = img.closest(".asc-bookmarks-draft-preview-card-thumb");
    thumb?.classList.remove("is-loaded");
    thumb?.classList.remove("is-loading");
    return false;
  }

  function appendBookmarkPreviewExample(container) {
    const wrap = document.createElement("div");
    wrap.className = "asc-bookmarks-draft-preview-sample";

    const label = document.createElement("p");
    label.className = "asc-bookmarks-draft-preview-sample-label";
    label.textContent = "Пример оформления (макет)";

    const card = document.createElement("a");
    card.className = "asc-bookmarks-draft-preview-card";
    card.href = PREVIEW_EXAMPLE.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.title = PREVIEW_EXAMPLE.url;

    const img = document.createElement("img");
    img.className = "asc-bookmarks-draft-preview-card-img is-loading";
    img.alt = "Превью видео YouTube";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    const body = document.createElement("div");
    body.className = "asc-bookmarks-draft-preview-card-body";

    const site = document.createElement("span");
    site.className = "asc-bookmarks-draft-preview-card-site";
    site.textContent = PREVIEW_EXAMPLE.site;

    const title = document.createElement("span");
    title.className = "asc-bookmarks-draft-preview-card-title";
    title.textContent = PREVIEW_EXAMPLE.title;

    const note = document.createElement("span");
    note.className = "asc-bookmarks-draft-preview-card-note";
    note.textContent = PREVIEW_EXAMPLE.note;

    const urlLine = document.createElement("span");
    urlLine.className = "asc-bookmarks-draft-preview-card-url";
    urlLine.textContent = "youtube.com · watch?v=IPEGHLql7D0";

    body.append(site, title, note, urlLine);

    const thumb = document.createElement("span");
    thumb.className = "asc-bookmarks-draft-preview-card-thumb is-loading";
    thumb.append(img);

    card.append(thumb, body);
    wrap.append(label, card);
    container.append(wrap);
    void loadPreviewImage(img, youtubeThumbUrls(PREVIEW_EXAMPLE.videoId));
  }

  function readBookmarks() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (stored) => {
          const list = stored?.[STORAGE_KEY];
          resolve(Array.isArray(list) ? list : []);
        });
      } catch {
        resolve([]);
      }
    });
  }

  function writeBookmarks(list) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: list }, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  function pageBookmarkPayload() {
    return {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: String(location.href || ""),
      title: String(document.title || "").trim() || location.href,
      savedAt: Date.now()
    };
  }

  function formatSavedAt(ts) {
    try {
      return new Intl.DateTimeFormat("ru", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(ts));
    } catch {
      return "";
    }
  }

  function filterItems(items, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.title || ""} ${item.url || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function createCompanionBookmarksDraft() {
    const wrap = document.createElement("div");
    wrap.className = "asc-bookmarks-draft-trigger";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-btn asc-btn--bookmarks-draft asc-btn--icon-only";
    btn.title = "Закладки";
    btn.setAttribute("aria-label", "Закладки");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `${BOOKMARK_SVG}<span class="asc-label">Закладки</span>`;

    wrap.append(btn);

    let overlayRoot = null;
    let items = [];
    let filterQuery = "";
    let activeTab = "bookmarks";
    let ui = null;
    let unbindPageContext = null;

    function setTriggerOpen(on) {
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    }

    function closeWindow() {
      if (!overlayRoot) return;
      unbindPageContext?.();
      unbindPageContext = null;
      overlayRoot.remove();
      overlayRoot = null;
      ui = null;
      document.documentElement.classList.remove(HTML_CLASS);
      document.removeEventListener("keydown", onKeyDown, true);
      setTriggerOpen(false);
      globalThis.syncCompanionCrosshair?.();
    }

    function onKeyDown(event) {
      if (event.key !== "Escape" || !overlayRoot) return;
      event.preventDefault();
      event.stopPropagation();
      closeWindow();
      btn.focus();
    }

    function setStatus(text) {
      if (ui?.statusEl) ui.statusEl.textContent = text || "";
    }

    function renderList() {
      if (!ui?.list) return;
      const list = ui.list;
      list.innerHTML = "";
      const visible = filterItems(items, filterQuery);

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "asc-bookmarks-draft-empty";
        empty.textContent = "Пока пусто — сохранение страниц скоро включим.";
        list.append(empty);
        appendBookmarkPreviewExample(list);
        return;
      }

      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "asc-bookmarks-draft-empty";
        empty.textContent = filterQuery
          ? `Ничего не найдено: «${filterQuery}»`
          : "Нет закладок";
        list.append(empty);
        return;
      }

      for (const item of visible) {
        const row = document.createElement("div");
        row.className = "asc-bookmarks-draft-item";

        const main = document.createElement("button");
        main.type = "button";
        main.className = "asc-bookmarks-draft-item-main";
        main.title = item.url;

        const rowTitle = document.createElement("span");
        rowTitle.className = "asc-bookmarks-draft-item-title";
        rowTitle.textContent = item.title || item.url;

        const rowMeta = document.createElement("span");
        rowMeta.className = "asc-bookmarks-draft-item-meta";
        rowMeta.textContent = `${formatSavedAt(item.savedAt)} · ${item.url}`;

        main.append(rowTitle, rowMeta);
        main.addEventListener("click", () => {
          try {
            window.open(item.url, "_blank", "noopener,noreferrer");
          } catch {
            location.href = item.url;
          }
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "asc-bookmarks-draft-item-remove";
        removeBtn.title = "Удалить";
        removeBtn.setAttribute("aria-label", "Удалить закладку");
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () => {
          void removeItem(item.id);
        });

        row.append(main, removeBtn);
        list.append(row);
      }
    }

    async function load() {
      items = await readBookmarks();
      items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      renderList();
    }

    async function persist(next) {
      items = next;
      await writeBookmarks(items.slice(0, MAX_ITEMS));
      renderList();
    }

    async function saveCurrentPage() {
      const payload = pageBookmarkPayload();
      if (!/^https?:/i.test(payload.url)) {
        setStatus("Сохраняем только http(s)-страницы.");
        return;
      }
      if (items.some((entry) => entry.url === payload.url)) {
        setStatus("Эта страница уже в списке.");
        return;
      }
      await persist([payload, ...items].slice(0, MAX_ITEMS));
      setStatus("Страница добавлена.");
    }

    async function removeItem(id) {
      await persist(items.filter((entry) => entry.id !== id));
      setStatus("Удалено.");
    }

    function openWindow() {
      if (overlayRoot) return;

      removeStaleBookmarkOverlays(null);

      const root = document.createElement("div");
      root.className = "asc-bookmarks-draft-root";
      root.setAttribute("role", "presentation");

      const backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "asc-bookmarks-draft-backdrop";
      backdrop.setAttribute("aria-label", "Закрыть окно закладок");

      const dialog = document.createElement("div");
      dialog.className = "asc-bookmarks-draft-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "asc-bookmarks-draft-title");

      const head = document.createElement("div");
      head.className = "asc-bookmarks-draft-head";

      const title = document.createElement("h2");
      title.className = "asc-bookmarks-draft-title";
      title.id = "asc-bookmarks-draft-title";
      title.textContent = "Сохранённое";

      const closeHeadBtn = document.createElement("button");
      closeHeadBtn.type = "button";
      closeHeadBtn.className = "asc-bookmarks-draft-close";
      closeHeadBtn.title = "Закрыть";
      closeHeadBtn.setAttribute("aria-label", "Закрыть");
      closeHeadBtn.innerHTML = SVG_CLOSE;

      head.append(title, closeHeadBtn);

      const tabsBar = document.createElement("div");
      tabsBar.className = "asc-bookmarks-draft-tabs";
      tabsBar.setAttribute("role", "tablist");
      tabsBar.setAttribute("aria-label", "Разделы");

      const tabButtons = new Map();
      for (const tab of BOOKMARKS_TABS) {
        const tabBtn = document.createElement("button");
        tabBtn.type = "button";
        tabBtn.className = "asc-bookmarks-draft-tab";
        tabBtn.dataset.tab = tab.id;
        tabBtn.setAttribute("role", "tab");
        tabBtn.setAttribute("aria-selected", tab.id === activeTab ? "true" : "false");
        tabBtn.id = `asc-bookmarks-draft-tab-${tab.id}`;
        tabBtn.textContent = tab.label;
        if (tab.id === activeTab) tabBtn.classList.add("is-active");
        tabsBar.append(tabBtn);
        tabButtons.set(tab.id, tabBtn);
      }

      const tools = document.createElement("div");
      tools.className = "asc-bookmarks-draft-tools";

      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.className = "asc-bookmarks-draft-search";
      searchInput.placeholder = "Поиск по названию или URL…";
      searchInput.setAttribute("aria-label", "Поиск закладок");
      searchInput.autocomplete = "off";
      searchInput.value = filterQuery;

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "asc-bookmarks-draft-tool asc-bookmarks-draft-tool--primary";
      saveBtn.textContent = "Сохранить эту страницу";
      saveBtn.disabled = true;
      saveBtn.title = "Скоро — пока только просмотр заготовки";

      tools.append(searchInput, saveBtn);

      const bodyWrap = document.createElement("div");
      bodyWrap.className = "asc-bookmarks-draft-body-wrap";

      const mainCol = document.createElement("div");
      mainCol.className = "asc-bookmarks-draft-main";

      const listHead = document.createElement("p");
      listHead.className = "asc-bookmarks-draft-list-head";
      listHead.textContent = "Сохранено локально";

      const list = document.createElement("div");
      list.className = "asc-bookmarks-draft-list";

      const statusEl = document.createElement("p");
      statusEl.className = "asc-bookmarks-draft-status";
      statusEl.setAttribute("aria-live", "polite");

      mainCol.append(listHead, list, statusEl);

      const aside = document.createElement("aside");
      aside.className = "asc-bookmarks-draft-aside";

      const intro = document.createElement("p");
      intro.className = "asc-bookmarks-draft-intro";
      intro.textContent =
        "Заготовка: список вкладок на устройстве. Дальше — папки, теги и синхронизация с хранилищем Agent CMS.";

      const roadmap = document.createElement("div");
      roadmap.className = "asc-bookmarks-draft-roadmap";
      roadmap.innerHTML =
        "<p class=\"asc-bookmarks-draft-roadmap-title\">TODO</p>" +
        "<ul class=\"asc-bookmarks-draft-roadmap-list\">" +
        "<li>Сохранять в выбранное хранилище</li>" +
        "<li>Группы: работа / личное / позже</li>" +
        "<li>Заметка и выделение со страницы</li>" +
        "<li>Импорт из браузера</li>" +
        "</ul>";

      aside.append(intro, roadmap);
      bodyWrap.append(mainCol, aside);

      const panelBookmarks = document.createElement("div");
      panelBookmarks.className = "asc-bookmarks-draft-tab-panel";
      panelBookmarks.dataset.tab = "bookmarks";
      panelBookmarks.setAttribute("role", "tabpanel");
      panelBookmarks.setAttribute("aria-labelledby", "asc-bookmarks-draft-tab-bookmarks");
      panelBookmarks.append(bodyWrap);

      const panelHistory = document.createElement("div");
      panelHistory.className = "asc-bookmarks-draft-tab-panel";
      panelHistory.dataset.tab = "history";
      panelHistory.setAttribute("role", "tabpanel");
      panelHistory.setAttribute("aria-labelledby", "asc-bookmarks-draft-tab-history");
      panelHistory.hidden = activeTab !== "history";
      panelHistory.innerHTML =
        "<div class=\"asc-bookmarks-draft-tab-placeholder\">" +
        "<p class=\"asc-bookmarks-draft-empty\">История посещений — заготовка.</p>" +
        "<p class=\"asc-bookmarks-draft-tab-placeholder-note\">" +
        "Позже: недавние сайты, поиск по дате и синхронизация с историей браузера." +
        "</p></div>";

      const panelDownloads = document.createElement("div");
      panelDownloads.className = "asc-bookmarks-draft-tab-panel";
      panelDownloads.dataset.tab = "downloads";
      panelDownloads.setAttribute("role", "tabpanel");
      panelDownloads.setAttribute("aria-labelledby", "asc-bookmarks-draft-tab-downloads");
      panelDownloads.hidden = activeTab !== "downloads";
      panelDownloads.innerHTML =
        "<div class=\"asc-bookmarks-draft-tab-placeholder\">" +
        "<p class=\"asc-bookmarks-draft-empty\">Загрузки — заготовка.</p>" +
        "<p class=\"asc-bookmarks-draft-tab-placeholder-note\">" +
        "Позже: список файлов из chrome.downloads, фильтры и быстрый переход к файлу." +
        "</p></div>";

      const tabPanels = document.createElement("div");
      tabPanels.className = "asc-bookmarks-draft-tab-panels";
      tabPanels.append(panelBookmarks, panelHistory, panelDownloads);

      function applyActiveTab() {
        for (const [id, tabBtn] of tabButtons) {
          const on = id === activeTab;
          tabBtn.classList.toggle("is-active", on);
          tabBtn.setAttribute("aria-selected", on ? "true" : "false");
        }
        for (const panel of tabPanels.children) {
          const on = panel.dataset.tab === activeTab;
          panel.hidden = !on;
          panel.classList.toggle("is-active", on);
        }
        tools.classList.toggle("asc-bookmarks-draft-tools--hidden", activeTab !== "bookmarks");
      }

      const pagePanel =
        typeof globalThis.createCompanionBookmarksPagePanel === "function"
          ? globalThis.createCompanionBookmarksPagePanel()
          : null;
      if (pagePanel) unbindPageContext = pagePanel.unbind;

      const foot = document.createElement("div");
      foot.className = "asc-bookmarks-draft-foot";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "asc-bookmarks-draft-btn asc-bookmarks-draft-btn--ghost";
      cancelBtn.textContent = "Закрыть";

      const storageBtn = document.createElement("button");
      storageBtn.type = "button";
      storageBtn.className = "asc-bookmarks-draft-btn asc-bookmarks-draft-btn--todo";
      storageBtn.textContent = "В хранилище CMS";
      storageBtn.title = "Синхронизация с Agent CMS — скоро (TODO)";

      foot.append(cancelBtn, storageBtn);

      dialog.append(head, tabsBar, tools, tabPanels, ...(pagePanel ? [pagePanel.el] : []), foot);
      root.append(backdrop, dialog);
      bookmarksOverlayMount().appendChild(root);
      document.documentElement.classList.add(HTML_CLASS);
      globalThis.syncCompanionCrosshair?.();

      overlayRoot = root;
      ui = { list, statusEl, searchInput, applyActiveTab };
      setTriggerOpen(true);

      applyActiveTab();

      for (const [id, tabBtn] of tabButtons) {
        tabBtn.addEventListener("click", () => {
          if (activeTab === id) return;
          activeTab = id;
          applyActiveTab();
          if (activeTab === "bookmarks") {
            window.requestAnimationFrame(() => {
              try {
                searchInput.focus({ preventScroll: true });
              } catch {
                searchInput.focus();
              }
            });
          }
        });
      }

      void load();
      setStatus("");

      if (activeTab === "bookmarks") {
        window.requestAnimationFrame(() => {
          try {
            searchInput.focus({ preventScroll: true });
          } catch {
            searchInput.focus();
          }
        });
      }

      const close = () => {
        closeWindow();
        btn.focus();
      };

      backdrop.addEventListener("click", close);
      closeHeadBtn.addEventListener("click", close);
      cancelBtn.addEventListener("click", close);
      saveBtn.addEventListener("click", () => {
        void saveCurrentPage();
      });
      storageBtn.addEventListener("click", () => {
        setStatus("Хранилище CMS — скоро (TODO).");
      });

      searchInput.addEventListener("input", () => {
        filterQuery = searchInput.value;
        renderList();
      });

      document.addEventListener("keydown", onKeyDown, true);
    }

    for (const eventName of ["pointerdown", "mousedown", "dblclick"]) {
      wrap.addEventListener(eventName, (event) => event.stopPropagation());
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (overlayRoot) closeWindow();
      else openWindow();
    });

    return {
      wrap,
      btn,
      open: openWindow,
      close: closeWindow,
      isOpen: () => Boolean(overlayRoot)
    };
  }

  global.createCompanionBookmarksDraft = createCompanionBookmarksDraft;
})(globalThis);
