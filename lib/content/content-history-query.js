/**
 * Map MCP content placement → GET /api/file/history query (manifestRelPath, mode, file, name).
 */
const path = require("node:path");
const { resolveContentAddress } = require("../config/content-placement.js");
const { slotKeyToStorageFolder, isExternalMemorySlot } = require("../config/storage-slot-routing.js");
const {
  getManifestContainerDirRel,
  resolveOwningManifestRelFromNodePath
} = require("../config/manifest-paths.js");

function posixNorm(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function workspaceTargetRelFromAddress(address) {
  if (address.kind === "root") {
    return posixNorm(address.workspaceFilePath);
  }
  if (address.workspaceFilePath) {
    return posixNorm(address.workspaceFilePath);
  }
  const manifest = posixNorm(address.manifestPath);
  const ref = posixNorm(address.ref);
  if (!ref) {
    throw new Error("placement.ref is required for content history");
  }
  const base = manifest.replace(/\/manifest\.md$/i, "");
  if (isExternalMemorySlot(address.slot)) {
    const folder = slotKeyToStorageFolder(address.slot);
    return path.posix.join(base, folder, ref);
  }
  const folder = slotKeyToStorageFolder(address.slot);
  return path.posix.join(base, "awn-storage", folder, ref);
}

function fileUnderContainer(manifestRelPath, targetRelPath) {
  const containerDir = getManifestContainerDirRel(manifestRelPath);
  const target = posixNorm(targetRelPath);
  if (!containerDir) return "";
  const prefix = `${posixNorm(containerDir)}/`;
  if (!target.startsWith(prefix)) return "";
  return target.slice(prefix.length);
}

/**
 * @param {object} args MCP args (placement or legacy path/slot/ref)
 * @returns {{ manifestRelPath: string, mode: string, file: string, systemName: string, targetRelPath: string, placement: object }}
 */
function resolveContentHistoryQuery(args = {}) {
  const address = resolveContentAddress(args);
  const targetRelPath = workspaceTargetRelFromAddress(address);
  let manifestRelPath =
    resolveOwningManifestRelFromNodePath(targetRelPath) || posixNorm(address.manifestPath);
  if (!manifestRelPath) {
    throw new Error("Cannot resolve manifest for content history");
  }
  manifestRelPath = posixNorm(manifestRelPath);

  if (isExternalMemorySlot(address.slot)) {
    return {
      manifestRelPath,
      mode: "external",
      file: posixNorm(address.ref),
      systemName: "",
      targetRelPath,
      placement: address.placement
    };
  }

  const containerFile = fileUnderContainer(manifestRelPath, targetRelPath);
  if (containerFile) {
    return {
      manifestRelPath,
      mode: "container",
      file: containerFile,
      systemName: "",
      targetRelPath,
      placement: address.placement
    };
  }

  if (targetRelPath === manifestRelPath) {
    return {
      manifestRelPath,
      mode: "description",
      file: "",
      systemName: "",
      targetRelPath,
      placement: address.placement
    };
  }

  return {
    manifestRelPath: targetRelPath,
    mode: "description",
    file: "",
    systemName: "",
    targetRelPath,
    placement: address.placement
  };
}

module.exports = {
  resolveContentHistoryQuery,
  workspaceTargetRelFromAddress
};
