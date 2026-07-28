const path = require("path");
const { MANIFEST_FILE, isManifestMdRelPath } = require("./manifest-paths");
const { INTERNAL_SLOT_KEYS } = require("./page-slots-api");

function slotToFolder(slot) {
  if (slot === "note") return "notes";
  if (slot === "script") return "scripts";
  return slot;
}

function isInternalSlot(slot) {
  return INTERNAL_SLOT_KEYS.has(String(slot || "").trim());
}

function isMediaSlot(slot) {
  return slot === "media" || slot === "assets";
}

function normalizePageManifestRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim().replace(/^\/+/, "");
  if (!normalized) return "";
  if (isManifestMdRelPath(normalized)) return normalized;
  const trimmed = normalized.replace(/\/$/, "");
  return trimmed ? `${trimmed}/${MANIFEST_FILE}` : MANIFEST_FILE;
}

function createExistsApi(deps) {
  const {
    normalizeWorkspacePath,
    isManifestMdAbsolute,
    fileExists,
    resolveApiManifestAbsolute,
    readInternalMemoryContent,
    readTodoContent,
    readTabularMemoryContent,
    resolveExternalFileOpContext,
    resolveStorageFileAbsolute,
    resolveUploadedMediaFileAbsolute
  } = deps;

  async function checkPageExists(relPath) {
    const manifestRel = normalizePageManifestRel(relPath);
    if (!manifestRel) return { path: "", exists: false };

    const absolute = normalizeWorkspacePath(manifestRel);
    if (!absolute || !isManifestMdAbsolute(absolute)) {
      return { path: manifestRel, exists: false };
    }

    return {
      path: manifestRel,
      exists: await fileExists(absolute)
    };
  }

  async function checkContentExists(relPath, slot, ref) {
    const slotKey = String(slot || "").trim();
    if (!slotKey) {
      return { path: relPath, slot: slotKey, ref: ref || null, driver: null, exists: false };
    }

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) {
      return { path: relPath, slot: slotKey, ref: ref || null, driver: null, exists: false };
    }

    if (isInternalSlot(slotKey)) {
      let payload;
      if (slotKey === "main-single-csv") {
        payload = await readTabularMemoryContent(relPath);
      } else if (slotKey === "todo-single" || slotKey === "todo") {
        payload = await readTodoContent(relPath);
      } else {
        payload = await readInternalMemoryContent(relPath);
      }
      return {
        path: relPath,
        slot: slotKey,
        driver: "internal",
        ref: null,
        exists: Boolean(payload?.exists)
      };
    }

    const normalizedRef = String(ref || "").trim();
    if (!normalizedRef) {
      return { path: relPath, slot: slotKey, driver: "external", ref: null, exists: false };
    }

    if (slotKey === "main") {
      const ctx = await resolveExternalFileOpContext(relPath, normalizedRef);
      return {
        path: relPath,
        slot: slotKey,
        driver: "external",
        ref: ctx.normalizedRelFile ? ctx.normalizedRelFile.replace(/\\/g, "/") : normalizedRef,
        exists: !ctx.error
      };
    }

    if (isMediaSlot(slotKey)) {
      const fileAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, normalizedRef);
      return {
        path: relPath,
        slot: slotKey,
        driver: "external",
        ref: normalizedRef,
        exists: Boolean(fileAbsolute && (await fileExists(fileAbsolute)))
      };
    }

    const resolved = await resolveStorageFileAbsolute(nodeAbsolute, slotToFolder(slotKey), normalizedRef);
    const fileAbsolute = resolved && !resolved.error ? resolved.fileAbsolute : null;
    return {
      path: relPath,
      slot: slotKey,
      driver: "external",
      ref: normalizedRef,
      exists: Boolean(fileAbsolute && (await fileExists(fileAbsolute)))
    };
  }

  return {
    checkPageExists,
    checkContentExists
  };
}

module.exports = {
  createExistsApi,
  slotToFolder,
  isInternalSlot,
  isMediaSlot,
  normalizePageManifestRel
};
