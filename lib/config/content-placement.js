/**
 * MCP placement → manifest path + slot + ref (page | channel | media | root).
 * root — workspace-relative file path without container+slot (AGENTS.md, …).
 */

const PLACEMENT_KINDS = ["page", "channel", "media", "root"];

/** tree — deprecated, use root; topic — MCP name for page (topic manifest). */
const PLACEMENT_KIND_ALIASES = { tree: "root", topic: "page" };

const CHANNEL_MANIFEST_PREFIX = "awn-channels/";
const MEDIA_MANIFEST_PREFIX = "awn-media/";

/** Slots addressed via workspace fs (hub files/assets trees), not /api/storage/markdown. */
const HUB_LIBRARY_FOLDER_SLOTS = new Set(["files", "assets"]);

function stripLeadingSlash(raw) {
  return String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function ensureManifestSuffix(rel) {
  const p = stripLeadingSlash(rel).replace(/\/$/, "");
  if (/\/manifest\.md$/i.test(p)) return p;
  return `${p}/manifest.md`;
}

function normalizePageManifestPath(path) {
  return ensureManifestSuffix(path);
}

function normalizeChannelManifestPath(path) {
  let manifest = stripLeadingSlash(path);
  if (!manifest.startsWith(CHANNEL_MANIFEST_PREFIX)) {
    manifest = `${CHANNEL_MANIFEST_PREFIX}${manifest}`;
  }
  return ensureManifestSuffix(manifest);
}

function normalizeMediaManifestPath(path) {
  let manifest = stripLeadingSlash(path);
  if (!manifest.startsWith(MEDIA_MANIFEST_PREFIX)) {
    manifest = `${MEDIA_MANIFEST_PREFIX}${manifest}`;
  }
  return ensureManifestSuffix(manifest);
}

function hubStorageWorkspacePath(manifestPath, folder, file) {
  const manifest = ensureManifestSuffix(manifestPath);
  const base = manifest.replace(/\/manifest\.md$/i, "");
  const slot = folder === "assets" ? "assets" : "files";
  const relFile = stripLeadingSlash(file);
  return `${base}/awn-storage/${slot}/${relFile}`;
}

/**
 * @param {object} placement
 * @returns {{ kind: string, manifestPath: string, slot: string, ref: string, workspaceFilePath: string | null, placement: object }}
 */
function normalizePlacementKind(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return PLACEMENT_KIND_ALIASES[key] || key;
}

function normalizeRootWorkspacePath(path) {
  const rel = stripLeadingSlash(path);
  if (!rel) throw new Error("placement.path is required for root");
  if (rel.endsWith("/")) throw new Error("placement.path for root must be a file path, not a directory");
  return rel;
}

function resolveContentPlacement(placement) {
  if (!placement || typeof placement !== "object") {
    throw new Error("placement is required");
  }
  const kind = normalizePlacementKind(placement.kind);
  if (!PLACEMENT_KINDS.includes(kind)) {
    throw new Error(`placement.kind must be one of: topic, ${PLACEMENT_KINDS.join(", ")}`);
  }

  if (kind === "root") {
    const workspaceFilePath = normalizeRootWorkspacePath(placement.path);
    return {
      kind: "root",
      manifestPath: null,
      slot: "",
      ref: "",
      workspaceFilePath,
      placement: { kind: "root", path: workspaceFilePath }
    };
  }

  const slot = String(placement.slot || "").trim();
  if (!slot) throw new Error("placement.slot is required");
  const ref = placement.ref != null ? String(placement.ref).trim() : "";

  let manifestPath;
  if (kind === "page") {
    manifestPath = normalizePageManifestPath(placement.path);
  } else if (kind === "channel") {
    manifestPath = normalizeChannelManifestPath(placement.path);
  } else {
    manifestPath = normalizeMediaManifestPath(placement.path);
  }

  let workspaceFilePath = null;
  if ((kind === "channel" || kind === "media") && HUB_LIBRARY_FOLDER_SLOTS.has(slot)) {
    if (!ref) throw new Error("placement.ref is required for channel/media files|assets slots");
    workspaceFilePath = hubStorageWorkspacePath(manifestPath, slot, ref);
  }

  return {
    kind,
    manifestPath,
    slot,
    ref,
    workspaceFilePath,
    placement: { kind, path: manifestPath, slot, ...(ref ? { ref } : {}) }
  };
}

/**
 * Legacy MCP args: { path, slot, ref } → page placement.
 */
function resolveContentAddress(args) {
  if (args?.placement) {
    const placement = { ...args.placement };
    if (placement.kind !== "root") {
      if (!placement.ref && args.ref) placement.ref = args.ref;
      if (!placement.slot && args.slot) placement.slot = args.slot;
    }
    return resolveContentPlacement(placement);
  }
  const path = String(args?.path || "").trim();
  const slot = String(args?.slot || "").trim();
  if (!path || !slot) {
    throw new Error("Either placement or path+slot is required");
  }
  const ref = args?.ref != null ? String(args.ref).trim() : "";
  return resolveContentPlacement({ kind: "page", path, slot, ref });
}

function splitContentUploadRef(fileRef) {
  const normalized = stripLeadingSlash(fileRef);
  const slash = normalized.lastIndexOf("/");
  if (slash === -1) {
    return { fileName: normalized, subdir: "" };
  }
  return {
    fileName: normalized.slice(slash + 1),
    subdir: normalized.slice(0, slash)
  };
}

function resolveSlotsListAddress(args) {
  if (args?.placement) {
    const { kind, path } = args.placement;
    if (!path) throw new Error("placement.path is required");
    const kindNorm = String(kind || "page").trim().toLowerCase();
    if (kindNorm === "channel") {
      return { manifestPath: normalizeChannelManifestPath(path), kind: "channel" };
    }
    if (kindNorm === "media") {
      return { manifestPath: normalizeMediaManifestPath(path), kind: "media" };
    }
    return { manifestPath: normalizePageManifestPath(path), kind: "page" };
  }
  const path = String(args?.path || "").trim();
  if (!path) throw new Error("path or placement is required");
  return { manifestPath: normalizePageManifestPath(path), kind: "page" };
}

module.exports = {
  PLACEMENT_KINDS,
  PLACEMENT_KIND_ALIASES,
  HUB_LIBRARY_FOLDER_SLOTS,
  normalizePlacementKind,
  normalizeRootWorkspacePath,
  normalizePageManifestPath,
  normalizeChannelManifestPath,
  normalizeMediaManifestPath,
  hubStorageWorkspacePath,
  resolveContentPlacement,
  resolveContentAddress,
  resolveSlotsListAddress,
  splitContentUploadRef
};
