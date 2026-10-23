/**
 * Переключатель приложений платформы (app-* URLs из /api/platform/apps?ui=1).
 */
(function initHeaderUiApps() {
  const toggleBtn = document.getElementById("header-ui-apps-btn");
  const menuNode = document.getElementById("header-ui-apps-menu");
  const listNode = document.getElementById("header-ui-apps-list");
  if (!toggleBtn || !menuNode || !listNode) return;

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

  function renderApps(apps) {
    listNode.replaceChildren();
    for (const app of apps) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "header-ui-locale-menu-item";
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = `
        <span class="header-ui-locale-menu-copy">
          <span class="header-ui-locale-menu-label"></span>
          <span class="header-ui-locale-menu-meta"></span>
        </span>`;
      btn.querySelector(".header-ui-locale-menu-label").textContent = app.title || app.appId;
      btn.querySelector(".header-ui-locale-menu-meta").textContent = app.publicUrl || app.publicPath || "";
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
})();
