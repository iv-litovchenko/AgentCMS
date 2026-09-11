(function initAgentShellCompanionToolbar() {
  if (window.__agentShellCompanionMounted) return;
  window.__agentShellCompanionMounted = true;

  const STORAGE_EXPANDED = "asc-toolbar-expanded";
  const STORAGE_OFFSET = "asc-toolbar-offset";
  const MAX_PAGE_LEN = 4000;
  const BASE_BOTTOM = 18;
  const EDGE_MARGIN = 12;
  const DRAG_THRESHOLD = 5;
  const SNAP_DISTANCE = 10;

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
    collapse: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'
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
    { key: "clean", label: "Текст страницы", hint: "Статья абзацами, без меню и рекламы" },
    { key: "markdown", label: "Как Markdown", hint: "Заголовки, ссылки и списки в MD" }
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

  const root = document.createElement("div");
  root.id = "agent-shell-companion-toolbar";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Agent Shell Companion");

  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "asc-brand";
  brand.title = "Развернуть панель";
  brand.setAttribute("aria-label", "Развернуть панель");
  brand.setAttribute("aria-expanded", "false");
  brand.innerHTML = BRAND_ICON_SVG;

  const actions = document.createElement("div");
  actions.className = "asc-actions";
  const menus = [];
  let pickerActive = false;
  let offsetX = 0;
  let offsetY = 0;
  let dragState = null;
  let skipBrandClick = false;

  function createBtn(key, label, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `asc-btn asc-btn--${key}`;
    btn.title = title;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `${ICONS[key]}<span class="asc-label">${label}</span>`;
    return btn;
  }

  function closeMenus(except) {
    for (const menu of menus) {
      if (menu.wrap === except) continue;
      menu.wrap.classList.remove("is-open");
      menu.btn.setAttribute("aria-expanded", "false");
    }
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

  const left = document.createElement("div");
  left.className = "asc-cluster asc-cluster--left";
  const elementBtn = createBtn("element", "Выбор", "Выбрать блок на странице (Esc — выключить)");
  const screenshotBtn = createBtn("screenshot", "Скрин", "Скриншот видимой области");
  left.append(elementBtn, screenshotBtn);

  const divider = document.createElement("span");
  divider.className = "asc-divider";
  divider.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "asc-cluster asc-cluster--right";
  right.append(
    createMenu("page", "Страница", "Вставить страницу", PAGE_MENU),
    createMenu("selection", "Текст", "Выделение и промпты", TEXT_MENU)
  );

  const collapseBtn = createBtn("collapse", "Свернуть", "Свернуть панель");
  collapseBtn.classList.add("asc-btn--collapse");

  actions.append(left, divider, right, collapseBtn);

  const status = document.createElement("span");
  status.className = "asc-status";
  status.setAttribute("aria-live", "polite");

  const shell = document.createElement("div");
  shell.className = "asc-shell";
  shell.append(brand, actions, status);

  const shadow = root.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = String(globalThis.__agentShellToolbarCss || "");
  shadow.append(style, shell);
  document.documentElement.appendChild(root);

  function setExpanded(expanded) {
    const next = Boolean(expanded);
    root.classList.toggle("is-expanded", next);
    brand.setAttribute("aria-expanded", next ? "true" : "false");
    brand.title = next
      ? "Открыть Agent Shell · можно перетащить"
      : "Развернуть панель · можно перетащить";
    brand.setAttribute("aria-label", next ? "Открыть Agent Shell" : "Развернуть панель");
    window.requestAnimationFrame(() => applyOffset({ x: offsetX, y: offsetY }, false));
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

  function resolveAbsoluteUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return value;
    }
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
    const header = `# ${title}\n\n[${location.href}](${location.href})\n\n`;
    const text = `${header}${body}`.trim();
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen).trimEnd()}…`;
  }

  function buildPagePayload(mode = "plain") {
    const title = document.title || location.hostname;
    const url = location.href;
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
    return ["[Выделение]", location.href, `Заголовок: ${document.title || location.hostname}`, "---", selection].join(
      "\n"
    );
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

  function openPanel() {
    chrome.runtime.sendMessage({ type: "COMPANION_OPEN_PANEL" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus("Не удалось открыть панель", "error");
        return;
      }
      setStatus("Панель открыта", "ok");
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
    if (key === "clean") {
      void insertIntoCompose(buildPagePayload("clean"));
      return;
    }
    if (key === "markdown") {
      void insertIntoCompose(buildPagePayload("markdown"));
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

  async function captureViewportScreenshot() {
    closeMenus();
    setStatus("Скриншот…", "busy");
    document.documentElement.classList.add("asc-capturing-viewport");
    try {
      await waitPaint();
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "COMPANION_CAPTURE_TAB_SCREENSHOT" }, (response) => {
          if (chrome.runtime.lastError) {
            setStatus("Ошибка расширения", "error");
            resolve();
            return;
          }
          if (!response?.ok) {
            setStatus(response?.error || "Не удалось сделать скрин", "error");
            resolve();
            return;
          }
          if (response.text) {
            void insertIntoCompose(response.text);
            resolve();
            return;
          }
          setStatus("Скриншот готов", "ok");
          resolve();
        });
      });
    } finally {
      document.documentElement.classList.remove("asc-capturing-viewport");
    }
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

  function isDragHandle(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest(".asc-brand")) return true;
    if (target.closest(".asc-btn, .asc-menu-pop, .asc-menu-item")) return false;
    return Boolean(target.closest(".asc-shell"));
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (!isDragHandle(event.target)) return;
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
      skipBrandClick = true;
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
      applyOffset({ x: offsetX, y: offsetY }, true);
      window.setTimeout(() => {
        skipBrandClick = false;
      }, 0);
    }
  }

  brand.addEventListener("click", (event) => {
    event.stopPropagation();
    if (skipBrandClick) {
      skipBrandClick = false;
      return;
    }
    if (!root.classList.contains("is-expanded")) {
      setExpanded(true);
      return;
    }
    openPanel();
  });

  collapseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setExpanded(false);
  });

  elementBtn.addEventListener("click", togglePagePicker);
  screenshotBtn.addEventListener("click", () => {
    void captureViewportScreenshot();
  });

  shell.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => applyOffset({ x: offsetX, y: offsetY }, true));

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
    const anyOpen = menus.some((menu) => menu.wrap.classList.contains("is-open"));
    if (anyOpen) {
      closeMenus();
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
})();
