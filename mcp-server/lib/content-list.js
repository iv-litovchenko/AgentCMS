import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseListQueryFromArgs,
  listQueryToHttpParams,
  DEFAULT_LIST_LIMIT
} = require("../../lib/content/contents-list-pagination.js");
const {
  resolveSlotsListAddress,
  formatPublicPlacement,
  logicalPathFromManifest
} = require("../../lib/config/content-placement.js");
const {
  slotKeyToStorageFolder,
  isStoragePageLikeKind
} = require("../../lib/config/storage-slot-routing.js");

function buildListQuery(args, listMode) {
  const query = parseListQueryFromArgs(args);
  query.listMode = listMode === "preview" ? "entries" : listMode;
  if (listMode === "preview") {
    query.includeBody = true;
    if (query.maxBodyChars == null) query.maxBodyChars = args.maxBodyChars ?? 800;
  }
  if (query.limit == null && listMode !== "all") query.limit = DEFAULT_LIST_LIMIT;
  if (args.legacyFull) {
    query.listMode = "all";
    query.legacyFull = true;
  }
  return query;
}

function attachPlacement(result, placementOut) {
  return { placement: placementOut, ...result };
}

async function listContentWithMode(client, args, listMode) {
  const query = buildListQuery(args, listMode);
  const httpParams = listQueryToHttpParams(query);

  const rootList =
    args.placement?.kind === "root" || (!args.placement && args.path != null && !args.slot);
  if (rootList) {
    const rawPath = String(args.placement?.path ?? args.path ?? ".")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .trim();
    const slash = rawPath.lastIndexOf("/");
    const folder =
      !rawPath || rawPath === "." ? "." : slash === -1 ? rawPath : rawPath.slice(0, slash);
    const depth = args.depth != null ? String(args.depth) : "1";
    const data = await client.get("/api/workspace/fs/list", {
      path: folder,
      depth,
      ...httpParams,
      ...(args.includeBody ? { includeBody: "true" } : {}),
      ...(args.maxBodyChars != null ? { maxBodyChars: String(args.maxBodyChars) } : {})
    });
    return attachPlacement(
      {
        ...data,
        hint: data.hint || "Directory listing; content_read kind=root for file body."
      },
      { kind: "root", path: folder }
    );
  }

  const slot = String(args.slot || args.placement?.slot || "inbox").trim();
  const listAddr = args.placement
    ? resolveSlotsListAddress({
        placement: { kind: args.placement.kind, path: args.placement.path }
      })
    : resolveSlotsListAddress({ path: args.path });
  const { manifestPath, kind } = listAddr;
  const folder = isStoragePageLikeKind(kind)
    ? slotKeyToStorageFolder(slot)
    : ["files", "assets"].includes(slot)
      ? slot
      : slotKeyToStorageFolder(slot);
  const placementOut = formatPublicPlacement(kind, manifestPath, slot);

  if (kind === "database" && slot === "data") {
    const store = logicalPathFromManifest("database", manifestPath);
    const data = await client.get("/api/awn-databases/records", { store, ...httpParams });
    return attachPlacement(data, placementOut);
  }

  if (kind === "channel" && (slot === "files" || slot === "assets")) {
    const data = await client.get("/api/agent/channels/items", {
      path: manifestPath,
      folder,
      ...httpParams
    });
    return attachPlacement(data, placementOut);
  }

  if (kind === "media") {
    const data = await client.get("/api/media", { path: manifestPath, folder, ...httpParams });
    const { content, ...lean } = data || {};
    return attachPlacement(lean, placementOut);
  }

  if (kind === "channel") {
    const data = await client.get("/api/storage/files", {
      path: manifestPath,
      folder,
      ...httpParams
    });
    return attachPlacement(data, placementOut);
  }

  const data = await client.get("/api/storage/files", {
    path: manifestPath,
    folder,
    ...httpParams
  });
  return attachPlacement(data, placementOut);
}

export function listContentEntries(client, args) {
  return listContentWithMode(client, args, "entries");
}

export function listContentSections(client, args) {
  return listContentWithMode(client, args, "sections");
}

export function listContentTree(client, args) {
  const maxDepth = args.maxDepth ?? 3;
  return listContentWithMode(client, { ...args, maxDepth }, "tree");
}

export function listContentPreview(client, args) {
  return listContentWithMode(client, args, "preview");
}

export function listContentItemsFull(client, args) {
  return listContentWithMode(client, { ...args, legacyFull: true }, "all");
}

/** @deprecated use listContentEntries */
export function listContentItems(client, args) {
  if (args.legacyFull || args.listMode === "all") return listContentItemsFull(client, args);
  return listContentEntries(client, args);
}
