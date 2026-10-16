/**
 * MCP placement → manifest path + slot + ref.
 * Public kinds: topic | channel | media | database | repository | root
 * (internal: page = topic, hub prefixes added from slug path).
 */

const {
  AWN_CHANNELS_ROOT_FOLDER,
  AWN_MEDIA_LIBRARIES_ROOT_FOLDER,
  AWN_DATABASE_ROOT_FOLDER,
  AWN_REPOSITORIES_ROOT_FOLDER
} = require("./manifest-paths");

const PLACEMENT_KINDS = ["page", "channel", "media", "database", "repository", "root"];

/** Internal routing kind for topic tree is `page`. Public API: `topic` (G6). Legacy input `page` accepted. */
const PLACEMENT_KIND_ALIASES = {
  tree: "root",
  topic: "page",
  page: "page",
  infoblock: "database",
  store: "database"
};

const CHANNEL_MANIFEST_PREFIX = `${AWN_CHANNELS_ROOT_FOLDER}/`;
const MEDIA_MANIFEST_PREFIX = `${AWN_MEDIA_LIBRARIES_ROOT_FOLDER}/`;
const DATABASE_MANIFEST_PREFIX = `${AWN_DATABASE_ROOT_FOLDER}/`;
const REPOSITORY_MANIFEST_PREFIX = `${AWN_REPOSITORIES_ROOT_FOLDER}/`;

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

function stripManifestSuffix(rel) {
  return stripLeadingSlash(rel).replace(/\/manifest\.md$/i, "").replace(/\/$/, "");
}

function stripKnownHubPrefix(relPath, prefix) {
  let p = stripManifestSuffix(relPath);
  const normPrefix = String(prefix || "").replace(/\/$/, "") + "/";
  if (p.toLowerCase().startsWith(normPrefix.toLowerCase())) {
    p = p.slice(normPrefix.length);
  }
  return p.replace(/^\/+/, "");
}

function normalizePageManifestPath(path) {
  return ensureManifestSuffix(path);
}

function normalizeChannelManifestPath(path) {
  const slug = stripKnownHubPrefix(path, AWN_CHANNELS_ROOT_FOLDER);
  return ensureManifestSuffix(`${AWN_CHANNELS_ROOT_FOLDER}/${slug}`);
}

function normalizeMediaManifestPath(path) {
  const slug = stripKnownHubPrefix(path, AWN_MEDIA_LIBRARIES_ROOT_FOLDER);
  return ensureManifestSuffix(`${AWN_MEDIA_LIBRARIES_ROOT_FOLDER}/${slug}`);
}

function normalizeDatabaseManifestPath(path) {
  let slug = stripKnownHubPrefix(path, AWN_DATABASE_ROOT_FOLDER);
  slug = stripKnownHubPrefix(slug, "awn-database");
  return ensureManifestSuffix(`${AWN_DATABASE_ROOT_FOLDER}/${slug}`);
}

function normalizeRepositoryManifestPath(path) {
  const slug = stripKnownHubPrefix(path, AWN_REPOSITORIES_ROOT_FOLDER);
  return ensureManifestSuffix(`${AWN_REPOSITORIES_ROOT_FOLDER}/${slug}`);
}

function hubStorageWorkspacePath(manifestPath, folder, file) {
  const manifest = ensureManifestSuffix(manifestPath);
  const base = manifest.replace(/\/manifest\.md$/i, "");
  const slot = folder === "assets" ? "assets" : "files";
  const relFile = stripLeadingSlash(file);
  return `${base}/awn-storage/${slot}/${relFile}`;
}

function normalizePlacementKind(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return PLACEMENT_KIND_ALIASES[key] || key;
}

function publicPlacementKind(kind) {
  return kind === "page" ? "topic" : kind;
}

function logicalPathFromManifest(kind, manifestPath) {
  const base = stripManifestSuffix(manifestPath);
  if (kind === "database") return stripKnownHubPrefix(base, AWN_DATABASE_ROOT_FOLDER);
  if (kind === "repository") return stripKnownHubPrefix(base, AWN_REPOSITORIES_ROOT_FOLDER);
  if (kind === "channel") return stripKnownHubPrefix(base, AWN_CHANNELS_ROOT_FOLDER);
  if (kind === "media") return stripKnownHubPrefix(base, AWN_MEDIA_LIBRARIES_ROOT_FOLDER);
  return base;
}

function formatPublicPlacement(kind, manifestPath, slot, ref) {
  const out = {
    kind: publicPlacementKind(kind),
    path: logicalPathFromManifest(kind, manifestPath)
  };
  if (slot) out.slot = slot;
  if (ref) out.ref = ref;
  return out;
}

function inferHubKindFromPagePath(rawPath) {
  const p = stripManifestSuffix(rawPath).toLowerCase();
  if (p.startsWith(`${AWN_DATABASE_ROOT_FOLDER.toLowerCase()}/`) || p === AWN_DATABASE_ROOT_FOLDER.toLowerCase()) {
    return "database";
  }
  if (p.startsWith(`${AWN_REPOSITORIES_ROOT_FOLDER.toLowerCase()}/`) || p === AWN_REPOSITORIES_ROOT_FOLDER.toLowerCase()) {
    return "repository";
  }
  if (p.startsWith(`${AWN_CHANNELS_ROOT_FOLDER.toLowerCase()}/`)) return "channel";
  if (p.startsWith(`${AWN_MEDIA_LIBRARIES_ROOT_FOLDER.toLowerCase()}/`)) return "media";
  return null;
}

function normalizeRootWorkspacePath(path) {
  const rel = stripLeadingSlash(path);
  if (!rel) throw new Error("placement.path is required for root");
  if (rel.endsWith("/")) throw new Error("placement.path for root must be a file path, not a directory");
  return rel;
}

function isStoragePageLikeKind(kind) {
  return kind === "page" || kind === "database" || kind === "repository";
}

function publicPlacementKindList() {
  return ["topic", "channel", "media", "database", "repository", "root"];
}

/**
 * @param {object} placement
 * @returns {{ kind: string, manifestPath: string, slot: string, ref: string, workspaceFilePath: string | null, placement: object, logicalPath: string }}
 */
function resolveContentPlacement(placement) {
  if (!placement || typeof placement !== "object") {
    throw new Error("placement is required");
  }
  let kind = normalizePlacementKind(placement.kind);
  if (!PLACEMENT_KINDS.includes(kind)) {
    throw new Error(
      `placement.kind must be one of: ${publicPlacementKindList().join(", ")} (legacy input: page → topic)`
    );
  }

  if (kind === "root") {
    const workspaceFilePath = normalizeRootWorkspacePath(placement.path);
    return {
      kind: "root",
      manifestPath: null,
      slot: "",
      ref: "",
      workspaceFilePath,
      logicalPath: workspaceFilePath,
      placement: { kind: "root", path: workspaceFilePath }
    };
  }

  const slot = String(placement.slot || "").trim();
  if (!slot) throw new Error("placement.slot is required");
  const ref = placement.ref != null ? String(placement.ref).trim() : "";

  if (kind === "page") {
    const inferred = inferHubKindFromPagePath(placement.path);
    if (inferred) kind = inferred;
  }

  let manifestPath;
  if (kind === "page") {
    manifestPath = normalizePageManifestPath(placement.path);
  } else if (kind === "channel") {
    manifestPath = normalizeChannelManifestPath(placement.path);
  } else if (kind === "media") {
    manifestPath = normalizeMediaManifestPath(placement.path);
  } else if (kind === "database") {
    manifestPath = normalizeDatabaseManifestPath(placement.path);
  } else {
    manifestPath = normalizeRepositoryManifestPath(placement.path);
  }

  let workspaceFilePath = null;
  if ((kind === "channel" || kind === "media") && HUB_LIBRARY_FOLDER_SLOTS.has(slot)) {
    if (!ref) throw new Error("placement.ref is required for channel/media files|assets slots");
    workspaceFilePath = hubStorageWorkspacePath(manifestPath, slot, ref);
  }

  const logicalPath = logicalPathFromManifest(kind, manifestPath);

  return {
    kind,
    manifestPath,
    slot,
    ref,
    workspaceFilePath,
    logicalPath,
    placement: formatPublicPlacement(kind, manifestPath, slot, ref)
  };
}

/**
 * Legacy MCP args: { path, slot, ref } → page placement (auto hub infer from path prefix).
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
  const inferred = inferHubKindFromPagePath(path);
  const kind = inferred || "topic";
  return resolveContentPlacement({ kind, path, slot, ref });
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
    let kind = normalizePlacementKind(args.placement.kind || "topic");
    const path = args.placement.path;
    if (!path) throw new Error("placement.path is required");
    if (kind === "page") {
      const inferred = inferHubKindFromPagePath(path);
      if (inferred) kind = inferred;
    }
    if (kind === "channel") {
      return { manifestPath: normalizeChannelManifestPath(path), kind: "channel" };
    }
    if (kind === "media") {
      return { manifestPath: normalizeMediaManifestPath(path), kind: "media" };
    }
    if (kind === "database") {
      return { manifestPath: normalizeDatabaseManifestPath(path), kind: "database" };
    }
    if (kind === "repository") {
      return { manifestPath: normalizeRepositoryManifestPath(path), kind: "repository" };
    }
    return { manifestPath: normalizePageManifestPath(path), kind: "page" };
  }
  const path = String(args?.path || "").trim();
  if (!path) throw new Error("path or placement is required");
  const inferred = inferHubKindFromPagePath(path);
  if (inferred === "database") {
    return { manifestPath: normalizeDatabaseManifestPath(path), kind: "database" };
  }
  if (inferred === "repository") {
    return { manifestPath: normalizeRepositoryManifestPath(path), kind: "repository" };
  }
  return { manifestPath: normalizePageManifestPath(path), kind: "page" };
}

module.exports = {
  PLACEMENT_KINDS,
  PLACEMENT_KIND_ALIASES,
  HUB_LIBRARY_FOLDER_SLOTS,
  normalizePlacementKind,
  publicPlacementKind,
  publicPlacementKindList,
  logicalPathFromManifest,
  formatPublicPlacement,
  normalizeRootWorkspacePath,
  normalizePageManifestPath,
  normalizeChannelManifestPath,
  normalizeMediaManifestPath,
  normalizeDatabaseManifestPath,
  normalizeRepositoryManifestPath,
  hubStorageWorkspacePath,
  inferHubKindFromPagePath,
  isStoragePageLikeKind,
  resolveContentPlacement,
  resolveContentAddress,
  resolveSlotsListAddress,
  splitContentUploadRef
};
