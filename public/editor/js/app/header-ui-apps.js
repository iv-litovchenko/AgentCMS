/**
 * Переключатель приложений платформы (app-* URLs из /api/platform/apps?ui=1).
 */
(function initHeaderUiApps() {
  const toggleBtn = document.getElementById("header-ui-apps-btn");
  const menuNode = document.getElementById("header-ui-apps-menu");
  const listNode = document.getElementById("header-ui-apps-list");
  const edgeGroupNode = document.getElementById("header-ui-apps-edge-group");
  const edgeListNode = document.getElementById("header-ui-apps-edge-list");
  if (!toggleBtn || !menuNode || !listNode) return;

  const ICON_BASE = "/editor/assets/platform-apps";
  const UI_APP_ORDER = ["control", "chat", "commander", "docs"];
  const APP_ICON_FILE = {
    chat: "voice.svg",
    commander: "commander.svg",
    control: "control.svg",
    docs: "reference.svg"
  };

  let loaded = false;

  function closeMenu() {
    menuNode.classList.add("hidden");
    toggleBtn.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menuNode.classList.remove("hidden");
    toggleBtn.classList.add("is-open");
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function formatMeta(app) {
    const path = String(app.publicPath || "").trim();
    if (path && path !== "/") return path;
    const url = String(app.publicUrl || "").trim();
    try {
      return new URL(url).pathname || url;
    } catch {
      return url;
    }
  }

  function sortUiApps(apps) {
    const order = new Map(UI_APP_ORDER.map((id, index) => [id, index]));
    return [...apps].sort((a, b) => {
      const ai = order.get(String(a.appId || "").trim()) ?? 99;
      const bi = order.get(String(b.appId || "").trim()) ?? 99;
      return ai - bi;
    });
  }

  function renderEdgeServices(services) {
    if (!edgeListNode) return;
    edgeListNode.replaceChildren();
    const qwenpaw = (services || []).find((row) => String(row.serviceId || row.slug || "").trim() === "qwenpaw");
    if (!qwenpaw) {
      if (edgeGroupNode) edgeGroupNode.classList.add("hidden");
      return;
    }
    if (edgeGroupNode) edgeGroupNode.classList.remove("hidden");
    const running = qwenpaw.running !== false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "header-ui-apps-menu-item header-ui-apps-menu-item--qwenpaw";
    btn.setAttribute("role", "menuitem");
    btn.innerHTML = `
        <span class="header-ui-apps-menu-icon header-ui-apps-menu-icon--emoji" aria-hidden="true">${String(qwenpaw.icon || "🐾")}</span>
        <span class="header-ui-apps-menu-copy">
          <span class="header-ui-apps-menu-label-row">
            <span class="header-ui-apps-menu-label"></span>
            <span class="header-ui-apps-menu-dot${running ? " is-on" : " is-off"}" title="${running ? "В сети" : "Не отвечает"}"></span>
          </span>
          <span class="header-ui-apps-menu-meta"></span>
        </span>
        <span class="header-ui-apps-menu-open" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2.5H11.5V9.5M11.5 2.5L2.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>`;
    btn.querySelector(".header-ui-apps-menu-label").textContent = qwenpaw.title || "QwenPaw";
    const metaHost = (() => {
      try {
        return new URL(String(qwenpaw.publicUrl || "")).host;
      } catch {
        return "qwenpaw";
      }
    })();
    btn.querySelector(".header-ui-apps-menu-meta").textContent = metaHost;
    btn.addEventListener("click", () => {
      const target = String(qwenpaw.publicUrl || "").trim();
      if (target) window.open(target, "_blank", "noopener,noreferrer");
      closeMenu();
    });
    edgeListNode.appendChild(btn);
  }

  function renderApps(apps) {
    listNode.replaceChildren();
    const sorted = sortUiApps(apps);
    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.className = "header-ui-apps-empty";
      empty.textContent = "Нет приложений в реестре";
      listNode.appendChild(empty);
      return;
    }
    for (const app of sorted) {
      const appId = String(app.appId || "").trim();
      const iconFile = APP_ICON_FILE[appId] || "cms.svg";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `header-ui-apps-menu-item header-ui-apps-menu-item--${appId || "app"}`;
      btn.setAttribute("role", "menuitem");
      const running = app.running !== false;
      btn.innerHTML = `
        <img class="header-ui-apps-menu-icon" src="${ICON_BASE}/${iconFile}" alt="" width="32" height="32" loading="lazy" decoding="async" />
        <span class="header-ui-apps-menu-copy">
          <span class="header-ui-apps-menu-label-row">
            <span class="header-ui-apps-menu-label"></span>
            <span class="header-ui-apps-menu-dot${running ? " is-on" : " is-off"}" title="${running ? "В сети" : "Не отвечает"}"></span>
          </span>
          <span class="header-ui-apps-menu-meta"></span>
        </span>
        <span class="header-ui-apps-menu-open" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2.5H11.5V9.5M11.5 2.5L2.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>`;
      btn.querySelector(".header-ui-apps-menu-label").textContent = app.title || appId || "App";
      btn.querySelector(".header-ui-apps-menu-meta").textContent = formatMeta(app);
      btn.addEventListener("click", () => {
        const target = String(app.publicUrl || app.publicPath || "").trim();
        if (target) window.open(target, "_blank", "noopener,noreferrer");
        closeMenu();
      });
      listNode.appendChild(btn);
    }
  }

  async function ensureLoaded() {
    if (loaded) return;
    const [appsRes, servicesRes] = await Promise.all([
      fetch("/api/platform/apps?ui=1", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/platform/services", { credentials: "same-origin", cache: "no-store" })
    ]);
    const data = await appsRes.json().catch(() => ({}));
    if (!appsRes.ok || !Array.isArray(data.apps)) {
      throw new Error(data.error || "apps_load_failed");
    }
    renderApps(data.apps);
    const servicesData = await servicesRes.json().catch(() => ({}));
    if (servicesRes.ok && Array.isArray(servicesData.services)) {
      renderEdgeServices(servicesData.services);
    } else if (edgeGroupNode) {
      edgeGroupNode.classList.add("hidden");
    }
    loaded = true;
  }

  toggleBtn.addEventListener("click", async () => {
    const open = toggleBtn.classList.contains("is-open");
    if (open) {
      closeMenu();
      return;
    }
    try {
      await ensureLoaded();
      openMenu();
    } catch {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (menuNode.contains(target) || target.closest("#header-ui-apps-btn")) return;
    closeMenu();
  });

  const companionBtn = document.getElementById("companion-docs-btn");
  if (companionBtn) {
    companionBtn.addEventListener("click", () => closeMenu());
  }
})();
