"use strict";

const EDITOR_ROOT = "editor";
const RESOURCES_ROOT = "_resources";

/** @deprecated use RESOURCES_ROOT */
const SHARED_ROOT = RESOURCES_ROOT;

const APP_ROOT_PREFIXES = ["editor/", "commander/", "shell/", "examples/", `${RESOURCES_ROOT}/`];

/** Root URLs browsers still request; rewritten to canonical paths. */
const ROOT_URL_REWRITES = {
  "404.html": `/${RESOURCES_ROOT}/404.html`,
  "maintenance.html": `/${RESOURCES_ROOT}/maintenance.html`,
  "favicon.svg": `/${RESOURCES_ROOT}/favicon.svg`,
  "favicon.png": `/${RESOURCES_ROOT}/favicon.png`,
  "apple-touch-icon.png": `/${RESOURCES_ROOT}/apple-touch-icon.png`
};

/**
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

  for (const prefix of APP_ROOT_PREFIXES) {
    if (normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) {
      return normalized;
    }
  }

  return normalized;
}

/**
 * @param {string} reqPath
 * @returns {string}
 */
function rewritePublicRequestPath(reqPath) {
  let raw = String(reqPath || "/");
  const normalized = raw.replace(/\/+$/, "") || "/";
  if (normalized === "/chat") return "/shell/";

  const leaf = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const rootRewrite = ROOT_URL_REWRITES[leaf];
  if (rootRewrite) return rootRewrite;

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
  const normalized = String(urlPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (normalized === "404.html" || normalized === "maintenance.html") {
    return `${RESOURCES_ROOT}/${normalized}`;
  }
  return mapPublicUrlPathToDisk(normalized);
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
