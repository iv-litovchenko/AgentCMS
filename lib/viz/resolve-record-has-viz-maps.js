const fs = require("fs/promises");
const path = require("path");
const { resolveStorageBundleAbsoluteFromSlotFolderAbsolute } = require("../record-materials");
const { buildRecordVizAssetsRelPath } = require("./viz-map-paths");

const VIZ_FILE_RE = /\.viz\.md$/i;

function normalizeRecordRel(fileRelativePath) {
  return String(fileRelativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function isSkippedRecordFileForVizIndicator(normalized, baseName, { isAreaManifestFileName, isTopicManifestFileName }) {
  if (!normalized.toLowerCase().endsWith(".md")) return true;
  if (VIZ_FILE_RE.test(normalized)) return true;
  if (typeof isAreaManifestFileName === "function" && isAreaManifestFileName(baseName)) return true;
  if (typeof isTopicManifestFileName === "function" && isTopicManifestFileName(baseName)) return true;
  return false;
}

async function directoryHasVizMapFiles(dirAbsolute) {
  try {
    const entries = await fs.readdir(dirAbsolute);
    return entries.some((name) => VIZ_FILE_RE.test(name));
  } catch {
    return false;
  }
}

async function legacyColocatedRecordHasVizMaps(dirAbsolute, stem) {
  const slug = String(stem || "").trim();
  if (!slug) return false;
  const prefix = `${slug.toLowerCase()}.`;
  try {
    const entries = await fs.readdir(dirAbsolute);
    return entries.some((name) => VIZ_FILE_RE.test(name) && name.toLowerCase().startsWith(prefix));
  } catch {
    return false;
  }
}

/**
 * @param {string} folderAbsolute — slot folder (manifest parent)
 * @param {string} fileRelativePath — record .md rel path
 * @param {{ awnId?: string|null, isAreaManifestFileName?, isTopicManifestFileName? }} options
 */
async function resolveRecordHasVizMaps(folderAbsolute, fileRelativePath, options = {}) {
  const normalized = normalizeRecordRel(fileRelativePath);
  const baseName = path.basename(normalized);
  if (isSkippedRecordFileForVizIndicator(normalized, baseName, options)) return false;

  const fileAbsolute = path.join(folderAbsolute, normalized);
  const dirAbsolute = path.dirname(fileAbsolute);
  const stem = baseName.replace(/\.md$/i, "");

  const awnId = options.awnId != null ? String(options.awnId || "").trim() : null;
  if (awnId) {
    const bundleAbsolute = resolveStorageBundleAbsoluteFromSlotFolderAbsolute(folderAbsolute);
    if (bundleAbsolute) {
      const vizRel = buildRecordVizAssetsRelPath(awnId);
      if (vizRel) {
        const vizAbsolute = path.join(bundleAbsolute, ...vizRel.split("/"));
        if (await directoryHasVizMapFiles(vizAbsolute)) return true;
      }
    }
  }

  return legacyColocatedRecordHasVizMaps(dirAbsolute, stem);
}

module.exports = {
  resolveRecordHasVizMaps
};
