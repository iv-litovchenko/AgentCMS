function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

async function syncWorkspaceIndexFile(
  semanticService,
  storageService,
  fulltextService,
  relPath,
  linkService,
  entityService
) {
  const path = normalizeRelPath(relPath);
  if (!path) return { ok: false, reason: "empty_path" };

  const [semantic, storage, fulltext, link, entity] = await Promise.all([
    semanticService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) })),
    storageService
      ? storageService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
      : Promise.resolve({ ok: true, skipped: true, reason: "batched_elsewhere" }),
    fulltextService
      ? fulltextService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
      : Promise.resolve({ ok: false, skipped: true }),
    linkService
      ? linkService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
      : Promise.resolve({ ok: false, skipped: true }),
    entityService
      ? entityService.updateFile(path).catch((error) => ({ ok: false, error: String(error.message || error) }))
      : Promise.resolve({ ok: false, skipped: true })
  ]);

  return { ok: true, path, semantic, storage, fulltext, link, entity };
}

module.exports = { syncWorkspaceIndexFile, normalizeRelPath };
