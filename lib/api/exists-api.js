const path = require("path");
const { MANIFEST_FILE, isManifestMdRelPath } = require("../config/manifest-paths");
const { INTERNAL_SLOT_KEYS } = require("./page-slots-api");
const {
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  normalizeStorageSlotKey,
  publicSlotResponseFields
} = require("../config/storage-slot-routing");
const { validateContentSlotAccess } = require("./slot-placement-guard");
const {
  isRepositoryCloneRootSlot,
  repositoryFolderRelFromManifest
} = require("../config/repository-clone-placement");

function slotToFolder(slot) {
  return slotKeyToStorageFolder(slot);
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
    readRoadmapContent,
    readLogContent,
    readTabularMemoryContent,
    resolveExternalFileOpContext,
    resolveStorageFileAbsolute,
    resolveUploadedMediaFileAbsolute,
    statNodeFileMeta,
    manifestRelFromAbsolute,
    projectRoot,
    agentRoot,
    readManifestAwnType,
    getTopicSlotsFlexible
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

  async function resolvePolicyCheckedSlotKey(manifestRel, slot) {
    const slotRaw = String(slot || "").trim();
    if (!slotRaw) return { slotKey: "", policyDenied: false };
    if (!projectRoot || !agentRoot || !readManifestAwnType) {
      return { slotKey: normalizeStorageSlotKey(slotRaw), policyDenied: false };
    }
    const verdict = await validateContentSlotAccess({
      projectRoot: projectRoot(),
      agentRoot: agentRoot(),
      manifestRelPath: manifestRel,
      slotKey: slotRaw,
      getAwnType: readManifestAwnType,
      getTopicSlotsFlexible
    });
    if (!verdict.ok) {
      return {
        slotKey: normalizeStorageSlotKey(slotRaw),
        policyDenied: true,
        error: verdict.error,
        allowedSlots: verdict.allowedSlots,
        slotsTemplate: verdict.slotsTemplate
      };
    }
    return { slotKey: verdict.slotKey || normalizeStorageSlotKey(slotRaw), policyDenied: false };
  }

  async function resolveContentFileAbsolute(relPath, slot, ref) {
    const manifestRel = normalizePageManifestRel(relPath);
    const policy = await resolvePolicyCheckedSlotKey(manifestRel, slot);
    if (policy.policyDenied) return null;
    const slotKey = policy.slotKey;
    if (!slotKey) return null;

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return null;

    if (isInternalSlot(slotKey)) {
      let payload;
      if (slotKey === "main-single-csv") {
        payload = await readTabularMemoryContent(relPath);
      } else if (slotKey === "todo-single" || slotKey === "todo") {
        payload = await readTodoContent(relPath);
      } else {
        payload = await readInternalMemoryContent(relPath);
      }
      if (!payload?.exists || !payload.path) return null;
      return normalizeWorkspacePath(payload.path);
    }

    const normalizedRef = String(ref || "").trim();
    if (!normalizedRef) return null;

    if (isExternalMemorySlot(slotKey)) {
      const ctx = await resolveExternalFileOpContext(relPath, normalizedRef);
      if (ctx.error || !ctx.fileAbsolute) return null;
      return ctx.fileAbsolute;
    }

    if (isMediaSlot(slotKey)) {
      return (await resolveUploadedMediaFileAbsolute(nodeAbsolute, normalizedRef)) || null;
    }

    const resolved = await resolveStorageFileAbsolute(nodeAbsolute, slotToFolder(slotKey), normalizedRef);
    if (!resolved || resolved.error || !resolved.fileAbsolute) return null;
    return resolved.fileAbsolute;
  }

  function withPublicSlotFields(payload, rawSlot, diskFolder) {
    if (!payload || typeof payload !== "object") return payload;
    const fields = publicSlotResponseFields(rawSlot, diskFolder);
    return { ...payload, ...fields };
  }

  async function checkContentExists(relPath, slot, ref) {
    const slotRaw = String(slot || "").trim();
    const manifestRel = normalizePageManifestRel(relPath);
    const policy = await resolvePolicyCheckedSlotKey(manifestRel, slotRaw);
    const slotKey = policy.slotKey;
    if (!slotKey) {
      return { path: relPath, slot: "", slotKey: "", ref: ref || null, driver: null, exists: false };
    }
    if (policy.policyDenied) {
      return {
        path: manifestRel,
        slot: slotRaw,
        ref: ref || null,
        driver: null,
        exists: false,
        policyDenied: true,
        error: policy.error,
        allowedSlots: policy.allowedSlots,
        slotsTemplate: policy.slotsTemplate
      };
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
      return withPublicSlotFields(
        {
          path: relPath,
          driver: "internal",
          ref: null,
          exists: Boolean(payload?.exists)
        },
        slotKey
      );
    }

    const normalizedRef = String(ref || "").trim();
    if (isRepositoryCloneRootSlot(slotRaw) && normalizedRef) {
      const folderRel = repositoryFolderRelFromManifest(manifestRel);
      const fileRel = `${folderRel}/${normalizedRef.replace(/^\/+/, "")}`.replace(/\\/g, "/");
      const absolute = normalizeWorkspacePath(fileRel);
      const exists = absolute ? await fileExists(absolute) : false;
      return withPublicSlotFields(
        {
          path: manifestRel,
          driver: "repository-clone",
          ref: normalizedRef,
          exists
        },
        slotRaw
      );
    }

    if (!normalizedRef) {
      return withPublicSlotFields(
        { path: relPath, driver: "external", ref: null, exists: false },
        slotKey
      );
    }

    if (isExternalMemorySlot(slotKey)) {
      const ctx = await resolveExternalFileOpContext(relPath, normalizedRef);
      return withPublicSlotFields(
        {
          path: relPath,
          driver: "external",
          ref: ctx.normalizedRelFile ? ctx.normalizedRelFile.replace(/\\/g, "/") : normalizedRef,
          exists: !ctx.error
        },
        slotKey,
        slotToFolder("memory")
      );
    }

    if (isMediaSlot(slotKey)) {
      const fileAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, normalizedRef);
      return withPublicSlotFields(
        {
          path: relPath,
          driver: "external",
          ref: normalizedRef,
          exists: Boolean(fileAbsolute && (await fileExists(fileAbsolute)))
        },
        slotKey
      );
    }

    const storageFolder = slotToFolder(slotKey);
    const resolved = await resolveStorageFileAbsolute(nodeAbsolute, storageFolder, normalizedRef);
    const fileAbsolute = resolved && !resolved.error ? resolved.fileAbsolute : null;
    return withPublicSlotFields(
      {
        path: relPath,
        driver: "external",
        ref: normalizedRef,
        exists: Boolean(fileAbsolute && (await fileExists(fileAbsolute)))
      },
      slotKey,
      storageFolder
    );
  }

  async function getContentMeta(relPath, slot, ref) {
    const existsPayload = await checkContentExists(relPath, slot, ref);
    if (!existsPayload.exists) {
      return { ...existsPayload, file: null };
    }

    const absolute = await resolveContentFileAbsolute(relPath, slot, ref);
    const fileMeta = absolute && statNodeFileMeta ? await statNodeFileMeta(absolute) : null;
    const filePath =
      absolute && manifestRelFromAbsolute
        ? manifestRelFromAbsolute(absolute)
        : existsPayload.ref || null;

    const workspacePath = filePath || null;
    return {
      ...existsPayload,
      ...(workspacePath ? { workspacePath } : {}),
      file: fileMeta
        ? {
            ...fileMeta,
            path: workspacePath || existsPayload.ref || null
          }
        : null
    };
  }

  return {
    checkPageExists,
    checkContentExists,
    getContentMeta
  };
}

module.exports = {
  createExistsApi,
  slotToFolder,
  isInternalSlot,
  isMediaSlot,
  normalizePageManifestRel
};
