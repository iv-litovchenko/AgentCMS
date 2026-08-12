(function initAgentShellCompanionToolbar() {
  if (window.__agentShellCompanionMounted) return;
  window.__agentShellCompanionMounted = true;

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

  const pageBtn = document.createElement("button");
  pageBtn.type = "button";
  pageBtn.className = "asc-btn asc-btn--page";
  pageBtn.innerHTML =
    '<span class="asc-btn-icon" aria-hidden="true">📄</span><span class="asc-btn-label">Страница</span>';
  pageBtn.title = "Отправить URL и текст страницы в Agent Shell";

  const selectionBtn = document.createElement("button");
  selectionBtn.type = "button";
  selectionBtn.className = "asc-btn asc-btn--selection";
  selectionBtn.innerHTML =
    '<span class="asc-btn-icon" aria-hidden="true">✂️</span><span class="asc-btn-label">Выделение</span>';
  selectionBtn.title = "Отправить выделенный текст в Agent Shell";

  const status = document.createElement("span");
  status.className = "asc-status";
  status.setAttribute("aria-live", "polite");

  root.append(brand, pageBtn, selectionBtn, status);
  document.documentElement.appendChild(root);

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

  function extractPageExcerpt(maxLen) {
    const limit = maxLen || 2400;
    const meta = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const article =
      document.querySelector("article")?.innerText ||
      document.querySelector("main")?.innerText ||
      document.body?.innerText ||
      "";
    const text = String(article || meta)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
    return text;
  }

  function buildPagePayload() {
    const title = document.title || location.hostname;
    const excerpt = extractPageExcerpt();
    const lines = ["[Страница]", location.href, `Заголовок: ${title}`];
    if (excerpt) lines.push("---", excerpt);
    return lines.join("\n");
  }

  function buildSelectionPayload() {
    const selection = String(window.getSelection?.()?.toString() || "").trim();
    if (!selection) return null;
    return ["[Выделение]", location.href, `Заголовок: ${document.title || location.hostname}`, "---", selection].join(
      "\n"
    );
  }

  function sendToShell(body) {
    setStatus("Отправка…", "busy");
    chrome.runtime.sendMessage({ type: "COMPANION_SEND_TO_SHELL", body }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Ошибка расширения", "error");
        return;
      }
      if (!response?.ok) {
        setStatus(response?.error || "Ошибка CMS", "error");
        return;
      }
      setStatus("Отправлено", "ok");
    });
  }

  brand.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "COMPANION_OPEN_PANEL" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus("Не удалось открыть панель", "error");
        return;
      }
      setStatus("Панель открыта", "ok");
    });
  });

  pageBtn.addEventListener("click", () => {
    sendToShell(buildPagePayload());
  });

  selectionBtn.addEventListener("click", () => {
    const payload = buildSelectionPayload();
    if (!payload) {
      setStatus("Нет выделения", "error");
      return;
    }
    sendToShell(payload);
  });
})();
