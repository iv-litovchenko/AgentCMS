"use strict";

/** @typedef {"editor"|"shared"|"shell"|"commander"|"examples"|"platform"} PublicAppKind */

const EDITOR_ROOT = "editor";
const SHARED_ROOT = "shared";

const EDITOR_ROOT_FILES = new Set([
  "index.html",
  "index2.html",
  "preview.html",
  "main.js",
  "styles.css",
  "image-missing.svg"
]);

const SHARED_ROOT_FILES = new Set(["favicon.svg", "favicon.png", "apple-touch-icon.png"]);

const PLATFORM_ROOT_FILES = new Set(["404.html", "maintenance.html"]);

/**
 * Maps a URL path segment (no leading slash, normalized) to a path relative to `public/`.
 * @param {string} urlPath
 * @returns {string}
 */
function mapPublicUrlPathToDisk(urlPath) {
  const normalized = String(urlPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!normalized || normalized === "index.html") {
    return `${EDITOR_ROOT}/index.html`;
  }

  if (normalized.startsWith(`${EDITOR_ROOT}/`)) return normalized;
  if (normalized.startsWith(`${SHARED_ROOT}/`)) return normalized;
  if (normalized.startsWith("commander/")) return normalized;
  if (normalized.startsWith("shell/")) return normalized;
  if (normalized.startsWith("examples/")) return normalized;
  if (normalized.startsWith("cms/")) return normalized;

  if (PLATFORM_ROOT_FILES.has(normalized)) return normalized;

  if (EDITOR_ROOT_FILES.has(normalized)) return `${EDITOR_ROOT}/${normalized}`;
  if (normalized.startsWith("js/")) return `${EDITOR_ROOT}/${normalized}`;
  if (normalized.startsWith("assets/")) return `${EDITOR_ROOT}/${normalized}`;

  if (normalized.startsWith("vendor/")) {
    return `${SHARED_ROOT}/vendor/${normalized.slice("vendor/".length)}`;
  }
  if (SHARED_ROOT_FILES.has(normalized)) return `${SHARED_ROOT}/${normalized}`;

  return normalized;
}

/**
 * Optional HTTP path rewrite before URL→disk mapping (chat alias, shell SPA).
 * @param {string} reqPath
 * @returns {string}
 */
function rewritePublicRequestPath(reqPath) {
  const raw = String(reqPath || "/");
  const normalized = raw.replace(/\/+$/, "") || "/";
  if (normalized === "/chat") return "/shell/";
  return raw;
}

function getEditorIndexDiskPath() {
  return `${EDITOR_ROOT}/index.html`;
}

function getEditorJsDiskPath(relativeFromJs = "") {
  const tail = String(relativeFromJs || "").replace(/^\/+/, "");
  return tail ? `${EDITOR_ROOT}/js/${tail}` : `${EDITOR_ROOT}/js`;
}

function getSharedVendorDiskPath(relativeFromVendor = "") {
  const tail = String(relativeFromVendor || "").replace(/^\/+/, "");
  return tail ? `${SHARED_ROOT}/vendor/${tail}` : `${SHARED_ROOT}/vendor`;
}

module.exports = {
  EDITOR_ROOT,
  SHARED_ROOT,
  mapPublicUrlPathToDisk,
  rewritePublicRequestPath,
  getEditorIndexDiskPath,
  getEditorJsDiskPath,
  getSharedVendorDiskPath
};
