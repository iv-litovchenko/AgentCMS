/**
 * REFACTOR-20 — sync route hint before main.js (index.html boot).
 * Mirrors parseAppRoute() landing vs workspace for landing-chunk boot only.
 */
(function initEditorBootRoute(global) {
  const CHPU_RESERVED = new Set(["api", "shell", "vendor", "a", "editor", "chat", "commander", "control"]);

  function normalizePathname(pathname) {
    return String(pathname || "/").replace(/\/+$/, "") || "/";
  }

  /** True only for global home `/` (landing orbit/grid/flow). */
  function needsLandingChunkAtBoot(pathname = global.location?.pathname) {
    const normalized = normalizePathname(pathname);
    if (normalized === "/" || normalized === "/index.html") return true;
    return false;
  }

  /** Workspace CHPU / agent home — do not preload landing-runtime on F5. */
  function isWorkspaceBootRoute(pathname = global.location?.pathname) {
    if (needsLandingChunkAtBoot(pathname)) return false;
    const normalized = normalizePathname(pathname);
    const parts = normalized.split("/").filter(Boolean);
    if (!parts.length) return false;
    if (parts[0] === "a" && parts[1]) return true;
    const head = decodeURIComponent(parts[0] || "").trim().toLowerCase();
    if (CHPU_RESERVED.has(head)) return false;
    if (head.startsWith("app-")) return false;
    return true;
  }

  global.AgentCmsBootRoute = {
    needsLandingChunkAtBoot,
    isWorkspaceBootRoute,
    normalizePathname
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
