const path = require("path");
const { parseAwnId } = require("./workspace-id/service");
const { STORAGE_SUBFOLDER_ASSETS } = require("./config/manifest-paths");

const RECORD_MATERIALS_ASSETS_SUBPATH = `${STORAGE_SUBFOLDER_ASSETS}/materials`;
const RECORD_MATERIALS_FOLDER_NAME = "materials";

const LEGACY_RECORD_MATERIALS_SIBLING_PREFIXES = ["awn-materials-", "awn-parts-", "parts-"];

function isLegacyRecordMaterialsSiblingFolderName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return false;
  return LEGACY_RECORD_MATERIALS_SIBLING_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** @deprecated alias */
function isRecordPartsPackageFolderName(name) {
  return isLegacyRecordMaterialsSiblingFolderName(name);
}

function getLegacyRecordMaterialsFolderNamesForSlug(slug) {
  const normalized = String(slug || "").trim();
  if (!normalized) return [];
  return LEGACY_RECORD_MATERIALS_SIBLING_PREFIXES.map((prefix) => `${prefix}${normalized}`);
}

/** @deprecated alias */
function getRecordMaterialsFolderNamesForSlug(slug) {
  return getLegacyRecordMaterialsFolderNamesForSlug(slug);
}

function getRecordSlugFromLegacySiblingFolderName(name) {
  const raw = String(name || "").trim();
  const lower = raw.toLowerCase();
  for (const prefix of LEGACY_RECORD_MATERIALS_SIBLING_PREFIXES) {
    if (lower.startsWith(prefix)) return raw.slice(prefix.length);
  }
  return "";
}

/** @deprecated alias */
function getRecordSlugFromPartsFolderName(name) {
  return getRecordSlugFromLegacySiblingFolderName(name);
}

function buildRecordMaterialsAssetsRelPath(awnId) {
  const id = parseAwnId(awnId);
  if (!id) return "";
  return `${RECORD_MATERIALS_ASSETS_SUBPATH}/${id}`;
}

function resolveStorageBundleAbsoluteFromSlotFolderAbsolute(slotFolderAbsolute) {
  const resolved = path.resolve(String(slotFolderAbsolute || ""));
  if (!resolved) return "";
  return path.dirname(resolved);
}

function resolveRecordMaterialsFolderAbsolute(bundleAbsolute, awnId) {
  const rel = buildRecordMaterialsAssetsRelPath(awnId);
  if (!rel || !bundleAbsolute) return "";
  return path.join(bundleAbsolute, ...rel.split("/"));
}

function parseRecordMaterialsMetaFromRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  for (let i = 0; i < segments.length - 2; i += 1) {
    if (segments[i] !== STORAGE_SUBFOLDER_ASSETS || segments[i + 1] !== RECORD_MATERIALS_FOLDER_NAME) {
      continue;
    }
    const awnId = parseAwnId(segments[i + 2]);
    if (!awnId) return null;
    const folderRef = segments.slice(0, i + 3).join("/");
    return {
      folderRef,
      awnId,
      layout: "assets",
      parentRecordRef: ""
    };
  }

  for (let i = 0; i < segments.length; i += 1) {
    if (!isLegacyRecordMaterialsSiblingFolderName(segments[i])) continue;
    const slug = getRecordSlugFromLegacySiblingFolderName(segments[i]);
    if (!slug) continue;
    const folderRef = segments.slice(0, i + 1).join("/");
    const parentPrefix = segments.slice(0, i).join("/");
    const parentRecordRef = parentPrefix ? `${parentPrefix}/${slug}.md` : `${slug}.md`;
    return {
      folderRef,
      slug,
      layout: "legacy-sibling",
      parentRecordRef,
      awnId: null
    };
  }

  return null;
}

/** @deprecated alias */
function getRecordPartsMetaFromRelPath(relPath) {
  return parseRecordMaterialsMetaFromRelPath(relPath);
}

function isRecordMaterialsAssetsRootFolderName(name, parentFolderName = "") {
  return (
    String(parentFolderName || "").trim().toLowerCase() === STORAGE_SUBFOLDER_ASSETS &&
    String(name || "").trim().toLowerCase() === RECORD_MATERIALS_FOLDER_NAME
  );
}

function isRecordMaterialsPerRecordFolderName(name, parentSegments = []) {
  const segments = Array.isArray(parentSegments) ? parentSegments : [];
  const len = segments.length;
  if (len < 2) return false;
  return (
    String(segments[len - 2] || "").toLowerCase() === STORAGE_SUBFOLDER_ASSETS &&
    String(segments[len - 1] || "").toLowerCase() === RECORD_MATERIALS_FOLDER_NAME &&
    Boolean(parseAwnId(name))
  );
}

function shouldSkipLegacyRecordMaterialsSiblingDirectory(name) {
  return isLegacyRecordMaterialsSiblingFolderName(name);
}

function shouldSkipLegacyRecordMaterialsSiblingForCollect(name, options = {}) {
  if (options.includeRecordPartsPackages) return false;
  return shouldSkipLegacyRecordMaterialsSiblingDirectory(name);
}

function shouldSkipRecordMaterialsAssetsDirectory(name, parentFolderName = "", options = {}) {
  if (options.includeRecordPartsPackages) return false;
  if (isRecordMaterialsAssetsRootFolderName(name, parentFolderName)) return true;
  return false;
}

function shouldSkipRecordMaterialsForCollect(name, parentRel, options = {}) {
  if (options.includeRecordPartsPackages) return false;
  const parent = String(parentRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  const entry = String(name || "").trim();
  if (isLegacyRecordMaterialsSiblingFolderName(entry)) return true;
  if (parent === STORAGE_SUBFOLDER_ASSETS && entry.toLowerCase() === RECORD_MATERIALS_FOLDER_NAME) {
    return true;
  }
  return false;
}

function buildRecordPartsFolderTitle(label, hasManifest = false) {
  const text = String(label || "").trim() || "запись";
  return hasManifest ? `Доп. материалы (${text})` : `Доп. материалы — ${text}`;
}

function isRecordPartsFolderManifestRelPath(relPath, manifestFileName, isAreaManifestFileName) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!parseRecordMaterialsMetaFromRelPath(normalized)) return false;
  const base = path.basename(normalized);
  return (
    base.toLowerCase() === String(manifestFileName || "").toLowerCase() ||
    (typeof isAreaManifestFileName === "function" && isAreaManifestFileName(base))
  );
}

function storageRelativeRecordRefFromWorkspacePath(workspacePath, bundleStoragePrefix) {
  const normalized = String(workspacePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const prefix = String(bundleStoragePrefix || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/$/, "");
  if (!normalized || !prefix) return "";
  const marker = `/${prefix}/`;
  const idx = normalized.indexOf(marker);
  if (idx === -1) return "";
  const tail = normalized.slice(idx + marker.length);
  const slotMatch = tail.match(/^(main|inbox|references|notes|media|artefacts|repository|scripts|templates|base|notebooklm|agent-queue|discussion|quick-notes|note)\/(.+\.md)$/i);
  if (!slotMatch) return "";
  return `${slotMatch[1]}/${slotMatch[2]}`;
}

module.exports = {
  RECORD_MATERIALS_ASSETS_SUBPATH,
  RECORD_MATERIALS_FOLDER_NAME,
  LEGACY_RECORD_MATERIALS_SIBLING_PREFIXES,
  isLegacyRecordMaterialsSiblingFolderName,
  isRecordPartsPackageFolderName,
  getLegacyRecordMaterialsFolderNamesForSlug,
  getRecordMaterialsFolderNamesForSlug,
  getRecordSlugFromLegacySiblingFolderName,
  getRecordSlugFromPartsFolderName,
  buildRecordMaterialsAssetsRelPath,
  resolveStorageBundleAbsoluteFromSlotFolderAbsolute,
  resolveRecordMaterialsFolderAbsolute,
  parseRecordMaterialsMetaFromRelPath,
  getRecordPartsMetaFromRelPath,
  isRecordMaterialsAssetsRootFolderName,
  isRecordMaterialsPerRecordFolderName,
  shouldSkipLegacyRecordMaterialsSiblingDirectory,
  shouldSkipLegacyRecordMaterialsSiblingForCollect,
  shouldSkipRecordMaterialsAssetsDirectory,
  shouldSkipRecordMaterialsForCollect,
  buildRecordPartsFolderTitle,
  isRecordPartsFolderManifestRelPath,
  storageRelativeRecordRefFromWorkspacePath
};
