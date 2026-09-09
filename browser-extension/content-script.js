(function initAgentShellCompanionToolbar() {
  if (window.__agentShellCompanionMounted) return;
  window.__agentShellCompanionMounted = true;

  const STORAGE_EXPANDED = "asc-toolbar-expanded";
  const MAX_PAGE_LEN = 4000;

  const BRAND_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">' +
    '<defs><linearGradient id="asc-bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c026d3"/></linearGradient>' +
    '<linearGradient id="asc-shine" x1="0%" y1="0%" x2="0%" y2="100%">' +
    '<stop offset="0%" stop-color="#fff" stop-opacity="0.28"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
    '<rect width="64" height="64" rx="14" fill="url(#asc-bg)"/>' +
    '<rect width="64" height="64" rx="14" fill="url(#asc-shine)"/>' +
    '<rect x="13" y="15" width="38" height="26" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>' +
    '<circle cx="19.5" cy="21.5" r="2.2" fill="#fecaca"/><circle cx="26.5" cy="21.5" r="2.2" fill="#fde68a"/><circle cx="33.5" cy="21.5" r="2.2" fill="#bbf7d0"/>' +
    '<rect x="17" y="27" width="30" height="3.5" rx="1.75" fill="rgba(255,255,255,0.42)"/>' +
    '<rect x="17" y="33" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>' +
    '<path d="M14 50 L22 50 L26 42 L30 54 L34 46 L38 50 L50 50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  const SELECTION_PROMPTS = [
    {
      label: "Объясни",
      title: "Объясни простыми словами",
      build: (sel) => `Объясни простыми словами:\n\n${sel}`
    },
    {
      label: "Конспект",
      title: "Сделай краткий конспект",
      build: (sel) => `Сделай краткий конспект:\n\n${sel}`
    },
    {
      label: "Перевод",
      title: "Переведи на русский",
      build: (sel) => `Переведи на русский:\n\n${sel}`
    },
    {
      label: "Задача",
      title: "Преврати в задачу для CMS",
      build: (sel) => `Преврати это в задачу для CMS (заголовок + шаги):\n\n${sel}`
    }
  ];

  const root = document.createElement("div");
  root.id = "agent-shell-companion-toolbar";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Agent Shell Companion");

  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "asc-brand";
  brand.title = "Открыть Agent Shell";
  brand.setAttribute("aria-label", "Открыть Agent Shell");
  brand.innerHTML = BRAND_ICON_SVG;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "asc-btn asc-btn--toggle";
  toggleBtn.innerHTML =
    '<span class="asc-btn-icon asc-toggle-icon" aria-hidden="true">▸</span><span class="asc-btn-label asc-toggle-label">Ещё</span>';
  toggleBtn.title = "Показать кнопки";
  toggleBtn.setAttribute("aria-expanded", "false");
  toggleBtn.setAttribute("aria-label", "Развернуть панель");

  const actions = document.createElement("div");
  actions.className = "asc-actions";

  const elementBtn = createBtn("asc-btn--element", "⌖", "Элемент", "Выбрать блок на странице (Esc — выключить)");
  const pageBtn = createBtn("asc-btn--page", "📄", "Страница", "Вставить информацию о странице в поле ввода");
  const cleanBtn = createBtn("asc-btn--clean", "✨", "Чище", "Вставить текст страницы с сохранением абзацев");
  const markdownBtn = createBtn("asc-btn--markdown", "MD", "Markdown", "Вставить страницу в формате Markdown");
  const selectionBtn = createBtn("asc-btn--selection", "✂️", "Выделение", "Вставить выделенный текст в поле ввода");
  const screenshotBtn = createBtn("asc-btn--screenshot", "📷", "Скрин", "Скриншот вкладки в поле ввода");

  const promptWrap = document.createElement("div");
  promptWrap.className = "asc-menu";
  const promptBtn = createBtn("asc-btn--prompts", "⚡", "Промпты", "Быстрые промпты для выделенного текста");
  promptBtn.classList.add("asc-btn--menu");
  const promptPop = document.createElement("div");
  promptPop.className = "asc-menu-pop hidden";
  promptPop.setAttribute("role", "menu");
  for (const item of SELECTION_PROMPTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-menu-item";
    btn.textContent = item.label;
    btn.title = item.title;
    btn.setAttribute("role", "menuitem");
    btn.addEventListener("click", () => {
      closePromptMenu();
      applySelectionPrompt(item);
    });
    promptPop.append(btn);
  }
  promptWrap.append(promptBtn, promptPop);

  const status = document.createElement("span");
  status.className = "asc-status";
  status.setAttribute("aria-live", "polite");

  actions.append(elementBtn, pageBtn, cleanBtn, markdownBtn, selectionBtn, screenshotBtn, promptWrap);
  root.append(brand, toggleBtn, actions, status);
  document.documentElement.appendChild(root);

  let pickerActive = false;
  let promptOpen = false;

  function createBtn(className, icon, label, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `asc-btn ${className}`;
    btn.title = title;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `<span class="asc-btn-icon" aria-hidden="true">${icon}</span><span class="asc-btn-label">${label}</span>`;
    return btn;
  }

  function setExpanded(expanded) {
    const next = Boolean(expanded);
    root.classList.toggle("is-expanded", next);
    toggleBtn.setAttribute("aria-expanded", next ? "true" : "false");
    toggleBtn.title = next ? "Свернуть панель" : "Развернуть панель";
    toggleBtn.setAttribute("aria-label", next ? "Свернуть панель" : "Развернуть панель");
    const icon = toggleBtn.querySelector(".asc-toggle-icon");
    const label = toggleBtn.querySelector(".asc-toggle-label");
    if (icon) icon.textContent = next ? "▾" : "▸";
    if (label) label.textContent = next ? "Свернуть" : "Ещё";
    try {
      localStorage.setItem(STORAGE_EXPANDED, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (!next) closePromptMenu();
  }

  function setStatus(text, kind) {
    status.textContent = text || "";
    status.dataset.kind = kind || "";
    if (text) {
      window.clearTimeout(setStatus._timer);
      setStatus._timer = window.setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
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

  function closePromptMenu() {
    promptOpen = false;
    promptPop.classList.add("hidden");
    promptBtn.setAttribute("aria-expanded", "false");
  }

  function togglePromptMenu() {
    if (!readSelectionText()) {
      setStatus("Сначала выделите текст", "error");
      return;
    }
    promptOpen = !promptOpen;
    promptPop.classList.toggle("hidden", !promptOpen);
    promptBtn.setAttribute("aria-expanded", promptOpen ? "true" : "false");
  }

  function applySelectionPrompt(item) {
    const selection = readSelectionText();
    if (!selection) {
      setStatus("Нет выделения", "error");
      return;
    }
    void insertIntoCompose(item.build(selection));
  }

  brand.addEventListener("click", openPanel);

  toggleBtn.addEventListener("click", () => {
    setExpanded(!root.classList.contains("is-expanded"));
  });

  elementBtn.addEventListener("click", togglePagePicker);

  pageBtn.addEventListener("click", () => {
    void insertIntoCompose(buildPagePayload("plain"));
  });

  cleanBtn.addEventListener("click", () => {
    void insertIntoCompose(buildPagePayload("clean"));
  });

  markdownBtn.addEventListener("click", () => {
    void insertIntoCompose(buildPagePayload("markdown"));
  });

  selectionBtn.addEventListener("click", () => {
    const payload = buildSelectionPayload();
    if (!payload) {
      setStatus("Нет выделения", "error");
      return;
    }
    void insertIntoCompose(payload);
  });

  screenshotBtn.addEventListener("click", () => {
    setStatus("Скриншот…", "busy");
    chrome.runtime.sendMessage({ type: "COMPANION_CAPTURE_TAB_SCREENSHOT" }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Ошибка расширения", "error");
        return;
      }
      if (!response?.ok) {
        setStatus(response?.error || "Не удалось сделать скрин", "error");
        return;
      }
      if (response.text) {
        void insertIntoCompose(response.text);
        return;
      }
      setStatus("Скриншот готов", "ok");
    });
  });

  promptBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePromptMenu();
  });

  document.addEventListener(
    "click",
    (event) => {
      if (!promptOpen) return;
      if (promptWrap.contains(event.target)) return;
      closePromptMenu();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePromptMenu();
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

  try {
    setExpanded(localStorage.getItem(STORAGE_EXPANDED) === "1");
  } catch {
    setExpanded(false);
  }
})();
