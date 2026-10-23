const { STORAGE_SUBFOLDER_ASSETS, getNamedStorageSlotDirRel } = require("../config/manifest-paths");
const { parseAwnId } = require("../workspace-id/service");

const RECORD_VIZ_ASSETS_SUBPATH = `${STORAGE_SUBFOLDER_ASSETS}/viz`;
const RECORD_VIZ_FOLDER_NAME = "viz";

function normalizeRel(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function buildRecordVizAssetsRelPath(awnId) {
  const id = parseAwnId(awnId);
  if (!id) return "";
  return `${RECORD_VIZ_ASSETS_SUBPATH}/${id}`;
}

function buildVizMapCanonicalFileName(kind) {
  const kindId = String(kind || "").trim().toLowerCase();
  if (!kindId) return "";
  return `${kindId}.viz.md`;
}

/** Path inside storage bundle: assets/viz/{awn-id}/{kind}.viz.md (same layer as materials). */
function buildVizMapCanonicalRelPath(awnId, kind) {
  const folder = buildRecordVizAssetsRelPath(awnId);
  const fileName = buildVizMapCanonicalFileName(kind);
  if (!folder || !fileName) return "";
  return `${folder}/${fileName}`;
}

/** @deprecated Early canon at workspace root — read/migrate only. Prefer buildVizMapWorkspaceRelPath. */
function buildVizMapWorkspaceRootLegacyRelPath(awnId, kind) {
  return buildVizMapCanonicalRelPath(awnId, kind);
}

/** Full workspace-relative path: {topic}/awn-storage/assets/viz/{awn-id}/{kind}.viz.md */
function buildVizMapWorkspaceRelPath(hostAboutRel, awnId, kind) {
  const host = normalizeRel(hostAboutRel);
  const slotDir = getNamedStorageSlotDirRel(host);
  const bundleRel = buildVizMapCanonicalRelPath(awnId, kind);
  if (!slotDir || !bundleRel) return "";
  return `${slotDir}/${bundleRel}`;
}

/** @deprecated colocated layout — read/migrate only */
function buildVizMapLegacyColocatedRelPath(aboutRel, kind) {
  const about = normalizeRel(aboutRel);
  const kindId = String(kind || "").trim().toLowerCase();
  if (!about || !kindId) return "";
  const path = require("path");
  const dir = path.posix.dirname(about);
  const file = path.posix.basename(about);
  const stem = file.replace(/\.[^./]+$/i, "") || "map";
  const fileName = `${stem}.${kindId}.viz.md`;
  return dir && dir !== "." ? `${dir}/${fileName}` : fileName;
}

function parseRecordVizMetaFromRelPath(relPath) {
  const normalized = normalizeRel(relPath);
  const segments = normalized.split("/").filter(Boolean);
  for (let i = 0; i < segments.length - 2; i += 1) {
    if (segments[i] !== STORAGE_SUBFOLDER_ASSETS || segments[i + 1] !== RECORD_VIZ_FOLDER_NAME) {
      continue;
    }
    const awnId = parseAwnId(segments[i + 2]);
    if (!awnId) return null;
    const folderRef = segments.slice(0, i + 3).join("/");
    const fileName = segments[segments.length - 1] || "";
    const prefix = segments.slice(0, i).join("/").toLowerCase();
    const layout = prefix.includes("awn-storage") ? "bundle-assets" : "workspace-root-assets";
    return { folderRef, awnId, layout, fileName };
  }
  return null;
}

function isRecordVizAssetsPath(relPath) {
  return Boolean(parseRecordVizMetaFromRelPath(relPath));
}

module.exports = {
  RECORD_VIZ_ASSETS_SUBPATH,
  RECORD_VIZ_FOLDER_NAME,
  buildRecordVizAssetsRelPath,
  buildVizMapCanonicalRelPath,
  buildVizMapWorkspaceRelPath,
  buildVizMapWorkspaceRootLegacyRelPath,
  buildVizMapCanonicalFileName,
  buildVizMapLegacyColocatedRelPath,
  parseRecordVizMetaFromRelPath,
  isRecordVizAssetsPath
};
