import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseListQueryFromArgs,
  listQueryToHttpParams,
  DEFAULT_LIST_LIMIT,
  getDefaultListMaxDepth,
  isListPreviewAllowed
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
const { resolveRootListFolderPath } = require("../../lib/content/root-list-folder-path.js");
const {
  isRepositoryCloneRootSlot,
  repositoryFolderRelFromManifest
} = require("../../lib/config/repository-clone-placement.js");

function buildListQuery(args, listMode) {
  const query = parseListQueryFromArgs(args);
  query.listMode = listMode === "preview" ? "entries" : listMode;
  if (listMode === "preview") {
    if (!isListPreviewAllowed()) {
      throw new Error("List preview disabled (AGENT_CMS_LIST_ALLOW_PREVIEW=0)");
    }
    query.includeBody = true;
    if (query.maxBodyChars == null) query.maxBodyChars = args.maxBodyChars ?? 800;
  }
  if (listMode === "tree" && query.maxDepth == null) {
    query.maxDepth = args.maxDepth ?? getDefaultListMaxDepth();
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
    const rawPath = String(args.placement?.path ?? args.path ?? ".").trim();
    const folder = resolveRootListFolderPath(rawPath);
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
        hint:
          data.hint ||
          "Directory listing (kind=root). File body: content_read { kind: root, path: \"<file>\" }. awn-repositories: list clone with path = repo folder (e.g. awn-repositories/my-repo)."
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
  const placementOut = formatPublicPlacement(kind, manifestPath, slot);

  if (kind === "repository" && isRepositoryCloneRootSlot(slot)) {
    const folder = repositoryFolderRelFromManifest(manifestPath);
    const parent = String(args.parent || "")
      .trim()
      .replace(/^\/+/, "");
    const listPath = resolveRootListFolderPath(parent ? `${folder}/${parent}` : folder);
    const depth = args.depth != null ? String(args.depth) : "1";
    const data = await client.get("/api/workspace/fs/list", {
      path: listPath,
      depth,
      ...httpParams,
      ...(args.includeBody ? { includeBody: "true" } : {}),
      ...(args.maxBodyChars != null ? { maxBodyChars: String(args.maxBodyChars) } : {})
    });
    return attachPlacement(
      {
        ...data,
        hint:
          data.hint ||
          "Repository clone tree (slot root). File: content_read { kind: repository, slot: root, ref }. Hub storage: slot files|assets."
      },
      placementOut
    );
  }

  const folder = isStoragePageLikeKind(kind)
    ? slotKeyToStorageFolder(slot)
    : ["files", "assets"].includes(slot)
      ? slot
      : slotKeyToStorageFolder(slot);
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

/** Same placement/filters as contents_list (entries); returns total only (limit=1 on API). */
export async function countContentEntries(client, args) {
  const result = await listContentWithMode(
    client,
    { ...args, limit: 1, offset: 0, cursor: undefined },
    "entries"
  );
  const out = {
    placement: result.placement,
    total: Number(result.total) || 0,
    exists: result.exists !== false,
    listMode: "entries",
    hint:
      "File/entry count in slot (md + binary + csv). Filters match contents_list. List items: contents_list."
  };
  if (result.parent != null && String(result.parent).trim()) {
    out.parent = result.parent;
  }
  if (args.q) out.q = String(args.q);
  if (args.ext) out.ext = String(args.ext);
  if (args.status) out.status = String(args.status);
  if (args.tags) out.tags = String(args.tags);
  if (args.entryType) out.entryType = String(args.entryType);
  return out;
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
