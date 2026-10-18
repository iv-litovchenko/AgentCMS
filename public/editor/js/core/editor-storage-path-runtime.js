/**
 * Storage root path helpers (refactor 14 — slice from main.js).
 */
(function initEditorStoragePathRuntime(global) {
  const STORAGE_ROOT_FOLDER = "awn-storage";
  const LEGACY_STORAGE_ROOT_FOLDER = "storage";
  const STORAGE_ROOT_PATH_PREFIX_RE = /^(?:awn-storage|storage)\//i;
  const STORAGE_ASSETS_PATH_PREFIX_RE = /^(?:awn-storage|storage)\/assets\//i;

  function escapeStorageRootRegex(folder) {
    return String(folder || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getStorageRootPathAlternationPattern() {
    return `(?:${escapeStorageRootRegex(STORAGE_ROOT_FOLDER)}|${escapeStorageRootRegex(LEGACY_STORAGE_ROOT_FOLDER)})`;
  }

  function isStorageRootRelativePath(relPath) {
    return STORAGE_ROOT_PATH_PREFIX_RE.test(String(relPath || "").replace(/\\/g, "/"));
  }

  function stripStorageRootPrefix(relPath) {
    return String(relPath || "").replace(/\\/g, "/").replace(STORAGE_ROOT_PATH_PREFIX_RE, "");
  }

  function stripStorageAssetsPrefix(relPath) {
    return String(relPath || "").replace(/\\/g, "/").replace(STORAGE_ASSETS_PATH_PREFIX_RE, "");
  }

  function findStorageAssetsMarkerIndex(relPath) {
    const normalized = String(relPath || "").toLowerCase();
    return Math.max(
      normalized.indexOf("/awn-storage/editor/assets/"),
      normalized.indexOf("/storage/editor/assets/")
    );
  }

  function findStorageRootMarkerIndex(relPath) {
    const normalized = String(relPath || "").toLowerCase();
    return Math.max(
      normalized.indexOf("/awn-storage/"),
      normalized.indexOf("/storage/")
    );
  }

  const STORAGE_FOLDER_NAME = STORAGE_ROOT_FOLDER;
  const STORAGE_FOLDER_REGEX = "(?:awn-storage|storage)/[^/]+";
  const STORAGE_SLOT_REGEX = "(?:awn-storage|storage)/([^/]+)";

  global.STORAGE_ROOT_FOLDER = STORAGE_ROOT_FOLDER;
  global.LEGACY_STORAGE_ROOT_FOLDER = LEGACY_STORAGE_ROOT_FOLDER;
  global.STORAGE_ROOT_PATH_PREFIX_RE = STORAGE_ROOT_PATH_PREFIX_RE;
  global.STORAGE_ASSETS_PATH_PREFIX_RE = STORAGE_ASSETS_PATH_PREFIX_RE;
  global.STORAGE_FOLDER_NAME = STORAGE_FOLDER_NAME;
  global.STORAGE_FOLDER_REGEX = STORAGE_FOLDER_REGEX;
  global.STORAGE_SLOT_REGEX = STORAGE_SLOT_REGEX;
  global.escapeStorageRootRegex = escapeStorageRootRegex;
  global.getStorageRootPathAlternationPattern = getStorageRootPathAlternationPattern;
  global.isStorageRootRelativePath = isStorageRootRelativePath;
  global.stripStorageRootPrefix = stripStorageRootPrefix;
  global.stripStorageAssetsPrefix = stripStorageAssetsPrefix;
  global.findStorageAssetsMarkerIndex = findStorageAssetsMarkerIndex;
  global.findStorageRootMarkerIndex = findStorageRootMarkerIndex;
})(typeof globalThis !== "undefined" ? globalThis : window);
