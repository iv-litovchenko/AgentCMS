"use strict";

const EDITOR_ROOT = "editor";
const RESOURCES_ROOT = "_resources";

/** @deprecated use RESOURCES_ROOT */
const SHARED_ROOT = RESOURCES_ROOT;

/** Legacy URL prefixes → {@link RESOURCES_ROOT} on disk. */
const RESOURCES_URL_LEGACY_PREFIXES = ["shared/", "_shared/"];

const EDITOR_ROOT_FILES = new Set([
  "index.html",
  "index2.html",
  "preview.html",
  "main.js",
  "styles.css",
  "image-missing.svg"
]);

const RESOURCES_ROOT_FILES = new Set([
  "favicon.svg",
  "favicon.png",
  "apple-touch-icon.png",
  "404.html",
  "maintenance.html"
]);

/**
 * Maps a URL path (no leading slash, normalized) to a path relative to `public/`.
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
  if (normalized.startsWith(`${RESOURCES_ROOT}/`)) return normalized;

  for (const legacyPrefix of RESOURCES_URL_LEGACY_PREFIXES) {
    if (normalized.startsWith(legacyPrefix)) {
      return `${RESOURCES_ROOT}/${normalized.slice(legacyPrefix.length)}`;
    }
  }

  if (normalized.startsWith("commander/")) return normalized;
  if (normalized.startsWith("shell/")) return normalized;
  if (normalized.startsWith("examples/")) return normalized;

  if (normalized.startsWith("cms/")) {
    return `${RESOURCES_ROOT}/${normalized}`;
  }

  if (RESOURCES_ROOT_FILES.has(normalized)) {
    return `${RESOURCES_ROOT}/${normalized}`;
  }

  if (EDITOR_ROOT_FILES.has(normalized)) return `${EDITOR_ROOT}/${normalized}`;
  if (normalized.startsWith("js/")) return `${EDITOR_ROOT}/${normalized}`;
  if (normalized.startsWith("assets/")) return `${EDITOR_ROOT}/${normalized}`;

  if (normalized.startsWith("vendor/")) {
    return `${RESOURCES_ROOT}/vendor/${normalized.slice("vendor/".length)}`;
  }

  return normalized;
}

/**
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

function getResourcesVendorDiskPath(relativeFromVendor = "") {
  const tail = String(relativeFromVendor || "").replace(/^\/+/, "");
  return tail ? `${RESOURCES_ROOT}/vendor/${tail}` : `${RESOURCES_ROOT}/vendor`;
}

/** @deprecated use getResourcesVendorDiskPath */
function getSharedVendorDiskPath(relativeFromVendor = "") {
  return getResourcesVendorDiskPath(relativeFromVendor);
}

function resolvePublicDiskPath(urlPath) {
  return mapPublicUrlPathToDisk(urlPath);
}

module.exports = {
  EDITOR_ROOT,
  RESOURCES_ROOT,
  SHARED_ROOT,
  mapPublicUrlPathToDisk,
  resolvePublicDiskPath,
  rewritePublicRequestPath,
  getEditorIndexDiskPath,
  getEditorJsDiskPath,
  getResourcesVendorDiskPath,
  getSharedVendorDiskPath
};
