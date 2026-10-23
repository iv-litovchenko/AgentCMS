/**
 * Переключатель приложений платформы (app-* URLs из /api/platform/apps?ui=1).
 */
(function initHeaderUiApps() {
  const toggleBtn = document.getElementById("header-ui-apps-btn");
  const menuNode = document.getElementById("header-ui-apps-menu");
  const listNode = document.getElementById("header-ui-apps-list");
  if (!toggleBtn || !menuNode || !listNode) return;

  const ICON_BASE = "/editor/assets/platform-apps";
  const APP_ICON_FILE = {
    chat: "voice.svg",
    commander: "commander.svg",
    control: "control.svg"
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

  function renderApps(apps) {
    listNode.replaceChildren();
    if (!apps.length) {
      const empty = document.createElement("p");
      empty.className = "header-ui-apps-empty";
      empty.textContent = "Нет приложений в реестре";
      listNode.appendChild(empty);
      return;
    }
    for (const app of apps) {
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
    const response = await fetch("/api/platform/apps?ui=1", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.apps)) {
      throw new Error(data.error || "apps_load_failed");
    }
    renderApps(data.apps);
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
