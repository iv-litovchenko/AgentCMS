/**
 * Переключатель языка интерфейса (заготовка): выбор EN/RU, сохранение в localStorage.
 */
(function initHeaderUiLocale() {
  const STORAGE_KEY = "agent-cms-ui-locale";
  const SUPPORTED = new Set(["en", "ru"]);
  const DEFAULT_LOCALE = "ru";

  const toggleBtn = document.getElementById("header-ui-locale-btn");
  const menuNode = document.getElementById("header-ui-locale-menu");
  const flagMountNode = document.getElementById("header-ui-locale-flag-mount");
  const codeNode = document.getElementById("header-ui-locale-code");
  const itemNodes = menuNode
    ? [...menuNode.querySelectorAll(".header-ui-locale-menu-item[data-locale]")]
    : [];

  if (!toggleBtn || !menuNode || !flagMountNode || !itemNodes.length) return;

  let menuOpen = false;
  let locale = readStoredLocale();

  function readStoredLocale() {
    try {
      const stored = String(localStorage.getItem(STORAGE_KEY) || "").trim().toLowerCase();
      if (SUPPORTED.has(stored)) return stored;
    } catch {
      // ignore
    }
    const docLang = String(document.documentElement.lang || "").trim().toLowerCase();
    if (SUPPORTED.has(docLang)) return docLang;
    return DEFAULT_LOCALE;
  }

  function saveLocale(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  function localeCodeLabel(value) {
    return value === "en" ? "EN" : "RU";
  }

  function syncFlagMount() {
    flagMountNode.className = `header-ui-locale-flag header-ui-locale-flag--${locale}`;
  }

  function syncMenuItems() {
    for (const node of itemNodes) {
      const value = String(node.getAttribute("data-locale") || "").toLowerCase();
      const active = value === locale;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-checked", active ? "true" : "false");
    }
  }

  function applyLocale(options = {}) {
    const { persist = true, announce = true } = options;
    if (!SUPPORTED.has(locale)) locale = DEFAULT_LOCALE;
    document.documentElement.lang = locale;
    if (codeNode) codeNode.textContent = localeCodeLabel(locale);
    syncFlagMount();
    syncMenuItems();
    if (persist) saveLocale(locale);
    if (announce) {
      window.dispatchEvent(
        new CustomEvent("agent-cms:ui-locale-change", {
          detail: { locale, stub: true },
        })
      );
    }
  }

  function syncMenuState() {
    toggleBtn.classList.toggle("is-open", menuOpen);
    toggleBtn.setAttribute("aria-expanded", menuOpen ? "true" : "false");
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menuNode.classList.add("hidden");
    syncMenuState();
  }

  function openMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    window.agentCmsCloseHeaderProfileMenu?.();
    menuOpen = true;
    menuNode.classList.remove("hidden");
    syncMenuState();
  }

  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openMenu();
  });

  for (const node of itemNodes) {
    node.addEventListener("click", () => {
      const next = String(node.getAttribute("data-locale") || "").toLowerCase();
      if (!SUPPORTED.has(next) || next === locale) {
        closeMenu();
        return;
      }
      locale = next;
      applyLocale();
      closeMenu();
    });
  }

  document.addEventListener("click", (event) => {
    if (!menuOpen) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (menuNode.contains(target) || target.closest("#header-ui-locale-btn")) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  if (typeof window !== "undefined") {
    window.agentCmsCloseHeaderUiLocaleMenu = closeMenu;
    window.agentCmsGetUiLocale = () => locale;
  }

  applyLocale({ persist: false, announce: false });
})();
