"use strict";

const {
  resolveContentPlacement,
  splitContentUploadRef,
  isStoragePageLikeKind,
  formatPublicPlacement,
  inferHubKindFromPagePath
} = require("../config/content-placement");
const { slotKeyToStorageFolder } = require("../config/storage-slot-routing");
const { STORAGE_SUBFOLDER_MEDIA } = require("../config/manifest-paths");

function requireRef(address, operation) {
  if (!String(address.ref || "").trim()) {
    throw Object.assign(new Error(`${operation}: placement.ref is required`), { status: 400 });
  }
}

function assertBinaryUploadPlacement(address, operation) {
  const { isInternalBundleSlot } = require("../config/storage-slot-routing");
  if (isInternalBundleSlot(address.slot)) {
    throw Object.assign(new Error(`${operation} is not supported for internal slot "${address.slot}".`), {
      status: 400
    });
  }
  if (address.kind === "database" && String(address.slot || "").trim() === "data") {
    throw Object.assign(new Error(`${operation} is not supported for database data slot.`), { status: 400 });
  }
  if (address.kind !== "root") {
    requireRef(address, operation);
    const ref = String(address.ref || "").toLowerCase();
    if (ref.endsWith(".md")) {
      throw Object.assign(
        new Error(
          `${operation}: .md is text — use content_write. Example ref: assets/pasted/photo.png`
        ),
        { status: 400 }
      );
    }
  }
}

/**
 * @param {object} input placement or { path, slot, ref }
 * @param {{ createSubdir?: boolean }} [options]
 */
function resolveBinaryUploadTarget(input, options = {}) {
  let placement = input?.placement;
  if (!placement) {
    const path = String(input?.path || "").trim();
    const slot = String(input?.slot || "").trim();
    if (!path || !slot) {
      throw Object.assign(new Error("placement or path+slot is required"), { status: 400 });
    }
    const ref = input?.ref != null ? String(input.ref).trim() : "";
    const inferred = inferHubKindFromPagePath(path);
    const kind = inferred || "topic";
    placement = { kind, path, slot, ref };
  }

  const address = resolveContentPlacement(placement);
  assertBinaryUploadPlacement(address, "binary_upload");

  const createSubdir = options.createSubdir !== false;

  if (address.kind === "root" || address.workspaceFilePath) {
    const relPath = address.workspaceFilePath || address.placement.path;
    return {
      mode: "workspace",
      address,
      placement: address.placement,
      relPath,
      maxBytes: 45 * 1024 * 1024
    };
  }

  const { fileName, subdir } = splitContentUploadRef(address.ref);
  const libraryFolder = isStoragePageLikeKind(address.kind)
    ? slotKeyToStorageFolder(address.slot)
    : ["files", "assets"].includes(address.slot)
      ? address.slot
      : slotKeyToStorageFolder(address.slot);

  return {
    mode: "media",
    address,
    placement: formatPublicPlacement(address.kind, address.manifestPath, address.slot, address.ref),
    relPath: address.manifestPath,
    contextRel: address.manifestPath,
    fileName,
    libraryFolder: libraryFolder || STORAGE_SUBFOLDER_MEDIA,
    subdir,
    createSubdir,
    channel: address.kind === "channel",
    maxBytes: 10 * 1024 * 1024
  };
}

module.exports = {
  resolveBinaryUploadTarget,
  assertBinaryUploadPlacement
};
