/** MCP placement.slot for git clone tree under awn-repositories/{slug}/ (not awn-storage/). */
const REPOSITORY_CLONE_ROOT_SLOT = "root";

function isRepositoryCloneRootSlot(raw) {
  return (
    String(raw || "")
      .trim()
      .toLowerCase() === REPOSITORY_CLONE_ROOT_SLOT
  );
}

function repositoryFolderRelFromManifest(manifestRelPath) {
  return String(manifestRelPath || "")
    .replace(/\\/g, "/")
    .replace(/\/manifest\.md$/i, "")
    .replace(/\/+$/, "");
}

function resolveRepositoryCloneWorkspacePath(manifestRelPath, ref) {
  const base = repositoryFolderRelFromManifest(manifestRelPath);
  const rel = String(ref || "")
    .trim()
    .replace(/^\/+/, "");
  if (!rel) return null;
  return `${base}/${rel}`.replace(/\/+/g, "/");
}

function listAllowedRepositoryPlacementSlots() {
  return [REPOSITORY_CLONE_ROOT_SLOT, "files", "assets"];
}

/**
 * @param {string} rawSlot
 * @param {{ isRepositoryContainer: boolean }} ctx
 */
function resolveRepositoryClonePlacementSlot(rawSlot, ctx) {
  const raw = String(rawSlot || "").trim();
  if (!raw) return null;

  if (isRepositoryCloneRootSlot(raw)) {
    if (!ctx.isRepositoryContainer) {
      return {
        ok: false,
        error: 'Slot "root" is only for placement.kind repository (clone files under awn-repositories/{slug}/).',
        allowedSlots: []
      };
    }
    return { ok: true, slotKey: REPOSITORY_CLONE_ROOT_SLOT, publicSlot: REPOSITORY_CLONE_ROOT_SLOT };
  }

  return null;
}

module.exports = {
  REPOSITORY_CLONE_ROOT_SLOT,
  isRepositoryCloneRootSlot,
  repositoryFolderRelFromManifest,
  resolveRepositoryCloneWorkspacePath,
  listAllowedRepositoryPlacementSlots,
  resolveRepositoryClonePlacementSlot
};
