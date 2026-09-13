function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

async function syncWorkspaceIndexFile(semanticService, storageService, fulltextService, relPath) {
  const path = normalizeRelPath(relPath);
  if (!path) return { ok: false, reason: "empty_path" };

  const [semantic, storage, fulltext] = await Promise.all([
    semanticService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) })),
    storageService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) })),
    fulltextService
      ? fulltextService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
      : Promise.resolve({ ok: false, skipped: true })
  ]);

  return { ok: true, path, semantic, storage, fulltext };
}

module.exports = { syncWorkspaceIndexFile, normalizeRelPath };
