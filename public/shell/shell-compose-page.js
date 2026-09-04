/** Compose «Страница» — карточка текущей страницы (заготовка контекста). */

export const COMPOSE_PAGE_OPTION_KEY = "page";

function readMeta(name) {
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return String(el?.getAttribute("content") || "").trim();
}

function readFaviconHref() {
  const icon =
    document.querySelector('link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]');
  if (!icon) return "";
  try {
    return new URL(icon.getAttribute("href") || "", window.location.href).href;
  } catch {
    return String(icon.getAttribute("href") || "").trim();
  }
}

function readCanonicalHref() {
  const link = document.querySelector('link[rel="canonical"][href]');
  if (!link) return "";
  try {
    return new URL(link.getAttribute("href") || "", window.location.href).href;
  } catch {
    return "";
  }
}

export function collectLocalPageSnapshot() {
  let hostname = "";
  let pathname = "";
  try {
    const url = new URL(window.location.href);
    hostname = url.hostname;
    pathname = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // ignore
  }

  const title = String(document.title || "").trim();
  const description =
    readMeta("og:description") || readMeta("description") || readMeta("twitter:description");
  const siteName = readMeta("og:site_name") || hostname;
  const imageUrl = readMeta("og:image") || readMeta("twitter:image");

  return {
    url: window.location.href,
    hostname,
    pathname,
    title: title || hostname || window.location.href,
    description,
    siteName,
    faviconUrl: readFaviconHref(),
    canonicalUrl: readCanonicalHref() || window.location.href,
    imageUrl,
    source: "local-document"
  };
}

export async function fetchPageLinkPreview(apiFetch, url) {
  const target = String(url || "").trim();
  if (!target || typeof apiFetch !== "function") return null;
  try {
    const data = await apiFetch(`/api/web/preview?url=${encodeURIComponent(target)}`, {
      timeoutMs: 12000
    });
    if (!data || data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export function mergePagePreview(local, remote) {
  if (!remote) return { ...local, previewStatus: "local" };
  return {
    url: remote.finalUrl || remote.canonicalUrl || local.url,
    hostname: local.hostname,
    pathname: local.pathname,
    title: String(remote.title || local.title || "").trim(),
    description: String(remote.description || local.description || "").trim(),
    siteName: String(remote.siteName || local.siteName || "").trim(),
    faviconUrl: local.faviconUrl,
    canonicalUrl: String(remote.canonicalUrl || local.canonicalUrl || local.url).trim(),
    imageUrl: String(remote.imageUrl || local.imageUrl || "").trim(),
    source: "link-preview",
    previewStatus: "remote"
  };
}

export function formatPageContextBlock(snapshot) {
  if (!snapshot) return "";
  const lines = [];
  if (snapshot.title) lines.push(`Заголовок: ${snapshot.title}`);
  if (snapshot.url) lines.push(`URL: ${snapshot.url}`);
  if (snapshot.canonicalUrl && snapshot.canonicalUrl !== snapshot.url) {
    lines.push(`Канонический URL: ${snapshot.canonicalUrl}`);
  }
  if (snapshot.siteName) lines.push(`Сайт: ${snapshot.siteName}`);
  if (snapshot.pathname) lines.push(`Путь: ${snapshot.pathname}`);
  if (snapshot.description) lines.push(`Описание: ${snapshot.description}`);
  if (snapshot.faviconUrl) lines.push(`Favicon: ${snapshot.faviconUrl}`);
  if (!lines.length) return "";
  return `[Контекст страницы]\n${lines.join("\n")}\n[/Контекст страницы]`;
}

function renderPagePreviewCard(container, snapshot, { escapeHtml, loading = false } = {}) {
  if (!container || !snapshot) return;
  container.replaceChildren();

  const card = document.createElement("article");
  card.className = "shell-compose-page-card";

  if (snapshot.imageUrl) {
    const hero = document.createElement("img");
    hero.className = "shell-compose-page-image";
    hero.src = snapshot.imageUrl;
    hero.alt = "";
    hero.loading = "lazy";
    hero.referrerPolicy = "no-referrer";
    card.append(hero);
  }

  const body = document.createElement("div");
  body.className = "shell-compose-page-card-body";

  const head = document.createElement("div");
  head.className = "shell-compose-page-card-head";

  if (snapshot.faviconUrl) {
    const favicon = document.createElement("img");
    favicon.className = "shell-compose-page-favicon";
    favicon.src = snapshot.faviconUrl;
    favicon.alt = "";
    favicon.loading = "lazy";
    favicon.referrerPolicy = "no-referrer";
    head.append(favicon);
  }

  const site = document.createElement("span");
  site.className = "shell-compose-page-site";
  site.textContent = snapshot.siteName || snapshot.hostname || "Страница";
  head.append(site);
  body.append(head);

  const title = document.createElement("h3");
  title.className = "shell-compose-page-title";
  title.textContent = snapshot.title || "Без заголовка";
  body.append(title);

  const url = document.createElement("p");
  url.className = "shell-compose-page-url";
  url.textContent = snapshot.url || "";
  body.append(url);

  if (snapshot.description) {
    const desc = document.createElement("p");
    desc.className = "shell-compose-page-desc";
    desc.textContent = snapshot.description;
    body.append(desc);
  }

  const meta = document.createElement("dl");
  meta.className = "shell-compose-page-meta";
  const rows = [
    ["Путь", snapshot.pathname || "—"],
    ["Канон.", snapshot.canonicalUrl || "—"],
    ["Источник", loading ? "загрузка…" : snapshot.source === "link-preview" ? "OpenGraph" : "DOM"]
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    meta.append(dt, dd);
  }
  body.append(meta);
  card.append(body);
  container.append(card);
}

export function createShellComposePageContext({
  nodes = {},
  apiFetch,
  readComposeOptionToggles,
  writeComposeOptionToggles,
  applyComposeOptionToggles,
  escapeHtml
} = {}) {
  let cachedSnapshot = null;

  function syncToggleUi(enabled) {
    nodes.composePageEnabled?.toggleAttribute("checked", Boolean(enabled));
    if (nodes.composePageEnabled) nodes.composePageEnabled.checked = Boolean(enabled);
    document
      .querySelectorAll("[data-compose-action='page-preview']")
      .forEach((btn) => btn.setAttribute("aria-pressed", enabled ? "true" : "false"));
    applyComposeOptionToggles?.();
  }

  function readEnabled() {
    return Boolean(readComposeOptionToggles?.()?.[COMPOSE_PAGE_OPTION_KEY]);
  }

  function writeEnabled(enabled) {
    const map = { ...(readComposeOptionToggles?.() || {}) };
    map[COMPOSE_PAGE_OPTION_KEY] = Boolean(enabled);
    writeComposeOptionToggles?.(map);
    syncToggleUi(Boolean(enabled));
  }

  async function refreshPreview() {
    const card = nodes.composePageCard;
    if (!card) return;
    const local = collectLocalPageSnapshot();
    renderPagePreviewCard(card, local, { escapeHtml, loading: true });
    const remote = await fetchPageLinkPreview(apiFetch, local.url);
    cachedSnapshot = mergePagePreview(local, remote);
    renderPagePreviewCard(card, cachedSnapshot, { escapeHtml, loading: false });
    if (nodes.composePageStatus) {
      nodes.composePageStatus.textContent = remote
        ? "Карточка собрана через OpenGraph/meta (как превью ссылки)."
        : "Пока только локальные meta из текущего документа Shell.";
    }
  }

  async function openPreview(triggerBtn = null) {
    const dialog = nodes.composePageDialog;
    if (!dialog) return;
    syncToggleUi(readEnabled());
    await refreshPreview();
    triggerBtn?.setAttribute("aria-expanded", "true");
    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } catch {
      dialog.setAttribute("open", "");
    }
  }

  function closePreview() {
    const dialog = nodes.composePageDialog;
    if (!dialog) return;
    dialog.close?.();
    dialog.removeAttribute("open");
    document
      .querySelectorAll("[data-compose-action='page-preview']")
      .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  }

  function appendPageContextIfEnabled(body) {
    const text = String(body || "").trim();
    if (!text || !readEnabled()) return text;
    if (!cachedSnapshot) cachedSnapshot = collectLocalPageSnapshot();
    const block = formatPageContextBlock(cachedSnapshot);
    if (!block || text.includes("[Контекст страницы]")) return text;
    return `${text}\n\n${block}`;
  }

  function bindUi() {
    document.querySelectorAll("[data-compose-action='page-preview']").forEach((btn) => {
      if (btn.dataset.shellBound === "1") return;
      btn.dataset.shellBound = "1";
      btn.addEventListener("click", () => {
        void openPreview(btn);
      });
    });

    nodes.composePageEnabled?.addEventListener("change", () => {
      writeEnabled(Boolean(nodes.composePageEnabled.checked));
    });

    nodes.composePageClose?.addEventListener("click", () => closePreview());
    nodes.composePageDialog?.addEventListener("close", () => closePreview());
    nodes.composePageDialog?.addEventListener("cancel", () => closePreview());
    syncToggleUi(readEnabled());
  }

  return {
    bindUi,
    openPreview,
    closePreview,
    refreshPreview,
    appendPageContextIfEnabled,
    getCachedSnapshot: () => cachedSnapshot || collectLocalPageSnapshot()
  };
}
