function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

async function syncWorkspaceIndexFile(semanticService, storageService, relPath) {
  const path = normalizeRelPath(relPath);
  if (!path) return { ok: false, reason: "empty_path" };

  const [semantic, storage] = await Promise.all([
    semanticService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) })),
    storageService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
  ]);

  return { ok: true, path, semantic, storage };
}

module.exports = { syncWorkspaceIndexFile, normalizeRelPath };
