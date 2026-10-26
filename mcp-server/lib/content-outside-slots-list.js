import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveSlotsListAddress,
  formatPublicPlacement,
  logicalPathFromManifest,
  normalizePlacementKind,
  publicPlacementKind
} = require("../../lib/config/content-placement.js");

function resolveOutsideSlotsPlacement(args) {
  const placement = args?.placement;
  if (!placement || typeof placement !== "object") {
    throw new Error("placement is required (kind + path; no slot)");
  }
  const path = String(placement.path || "").trim();
  if (!path) throw new Error("placement.path is required");

  const kindNorm = normalizePlacementKind(placement.kind || "topic");
  if (kindNorm === "root") {
    throw new Error("contents_outside_slots_list does not support kind=root — use a container (topic, channel, …)");
  }

  const listAddr = resolveSlotsListAddress({ placement: { ...placement, path } });
  const manifestPath = listAddr.manifestPath;
  const logicalPath = logicalPathFromManifest(listAddr.kind, manifestPath);
  const hubRel = manifestPath.replace(/\/manifest\.md$/i, "");
  const outPlacement = formatPublicPlacement(listAddr.kind, manifestPath, "", "");
  outPlacement.path = logicalPath;

  return {
    kind: listAddr.kind,
    manifestPath,
    logicalPath,
    hubRel,
    placement: outPlacement,
    publicKind: publicPlacementKind(listAddr.kind)
  };
}

/**
 * Files/folders in container root or awn-storage/ that are not in declared slots (UI: «вне слотов»).
 */
export async function listOutsideSlotsContent(client, args) {
  const { kind, manifestPath, logicalPath, hubRel, placement } = resolveOutsideSlotsPlacement(args);

  let payload;
  if (kind === "channel" || kind === "media") {
    payload = await client.get("/api/agent/hub-outside-structure", { path: hubRel });
  } else if (kind === "database") {
    payload = await client.get("/api/agent/iblock-outside-structure", { store: logicalPath });
  } else {
    payload = await client.get("/api/agent/page-outside-slots", { path: manifestPath });
  }

  if (payload?.error) {
    const err = new Error(String(payload.error));
    err.status = payload.status;
    throw err;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    model: "outside-slots",
    hint:
      "Entries outside declared slots (not contents_list). Resolve: move into a slot folder or remove. Flexible topics: usually empty — use placement.slot flexible for normal awn-storage/ access.",
    placement,
    items,
    total: payload.count ?? items.length,
    ...payload
  };
}
