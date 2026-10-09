const path = require("path");
const fs = require("fs/promises");
const { softDeleteWorkspacePath } = require("../workspace-recycler/service");
const {
  normalizeStorageSlotKey,
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  isInternalBundleSlot,
  STORAGE_SLOT_ROUTING
} = require("../config/storage-slot-routing");

function normalizeRelativeFilePath(input) {
  const normalized = path.normalize(String(input || "")).replace(/^(\.\.[\/\\])+/, "");
  if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  return normalized;
}

function toSidecarRelativePath(sourceRel) {
  const normalized = normalizeRelativeFilePath(sourceRel);
  if (!normalized || normalized.endsWith("/") || normalized.endsWith("\\")) return null;
  const posixPath = normalized.replace(/\\/g, "/");
  const lastSlash = posixPath.lastIndexOf("/");
  const dir = lastSlash >= 0 ? `${posixPath.slice(0, lastSlash + 1)}` : "";
  const filename = lastSlash >= 0 ? posixPath.slice(lastSlash + 1) : posixPath;
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  if (!base) return null;
  return `${dir}${base}.sidecar.md`;
}

function resolveSidecarAbsoluteFromSourceAbsolute(sourceAbsolute) {
  if (!sourceAbsolute) return null;
  const sourceDir = path.resolve(path.dirname(sourceAbsolute));
  const fileName = path.basename(sourceAbsolute);
  const dotIndex = fileName.lastIndexOf(".");
  const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  if (!stem) return null;
  const sidecarAbsolute = path.join(sourceDir, `${stem}.sidecar.md`);
  if (path.resolve(path.dirname(sidecarAbsolute)) !== sourceDir) return null;
  return sidecarAbsolute;
}

function isSidecarSourceFileName(fileName) {
  const base = path.basename(String(fileName || ""));
  const lower = base.toLowerCase();
  if (!base) return false;
  if (lower.endsWith(".sidecar.md")) return false;
  if (lower === "manifest.md" || lower === "_registration.md") return false;
  if (lower === "sidecar.md") return false;
  return true;
}

function slotKeyFromStorageFolder(folder) {
  const name = String(folder || "").trim();
  for (const spec of STORAGE_SLOT_ROUTING) {
    if (spec.storageFolder === name) return spec.slotKey;
  }
  return null;
}

function inferSlotKeyFromSourceRel(sourceRel) {
  const normalized = String(sourceRel || "").replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)awn-storage\/([^/]+)\//);
  if (!match) return null;
  return slotKeyFromStorageFolder(match[1]);
}

function guessMimeType(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".py": "text/x-python",
    ".js": "text/javascript",
    ".json": "application/json",
    ".html": "text/html",
    ".htm": "text/html",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".zip": "application/zip"
  };
  return map[ext] || "application/octet-stream";
}

function splitSidecarContent(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) {
    return { properties: {}, propertiesRaw: "", body: text.trim() };
  }
  return {
    propertiesRaw: match[1] || "",
    body: (match[2] || "").trim(),
    properties: {}
  };
}

function joinSidecarContent(propertiesRaw, body) {
  const props = String(propertiesRaw || "").trim();
  const description = String(body ?? "");
  if (!props) return description;
  return `---\n${props}\n---\n${description}`;
}

function createSidecarService(deps) {
  const {
    normalizeWorkspacePath,
    getAgentRoot,
    manifestRelFromNodeAbsolute,
    resolveOwningManifestRelFromNodePath,
    resolveApiManifestAbsolute,
    resolveStorageFileAbsolute,
    resolveUploadedMediaFileAbsolute,
    resolveExternalFileOpContext,
    buildSlotContentFileContentForManifest,
    buildStorageLayerRef,
    applyAwnTimestampsToMarkdownContent,
    writeWorkspaceTextFileWithHistory,
    snapshotFileHistoryBeforeWrite,
    recordWorkspaceActivityAsync,
    queueWorkspaceIndexFileSync,
    splitNodeFrontmatter,
    getYamlScalar,
    mergeFrontmatterOverrides
  } = deps;

  async function fileExists(absolute) {
    try {
      const stat = await fs.stat(absolute);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async function resolveSourceContext(payload = {}) {
    const sourcePath = String(payload.sourcePath || "").trim();
    const manifestRel = String(payload.path || "").trim();
    const slot = normalizeStorageSlotKey(payload.slot);
    const file = String(payload.file || "").trim();

    if (sourcePath) {
      const sourceAbsolute = normalizeWorkspacePath(sourcePath);
      if (!sourceAbsolute) return { error: "Invalid or forbidden source path", status: 400 };
      if (!(await fileExists(sourceAbsolute))) {
        return { error: "Source file not found", status: 404 };
      }
      const baseName = path.basename(sourceAbsolute);
      if (!isSidecarSourceFileName(baseName)) {
        return { error: "Sidecar cannot be attached to this file type", status: 400 };
      }
      const sourceRel = manifestRelFromNodeAbsolute(sourceAbsolute);
      const inferredSlot = inferSlotKeyFromSourceRel(sourceRel);
      const ownerManifest =
        resolveOwningManifestRelFromNodePath(sourceRel) ||
        (inferredSlot ? manifestRel : null);
      return {
        sourcePath: sourceRel,
        sourceAbsolute,
        manifestRel: ownerManifest,
        slot: inferredSlot,
        file: path.basename(sourceRel)
      };
    }

    if (manifestRel && slot && file) {
      if (isInternalBundleSlot(slot)) {
        return { error: `Sidecar is not supported for bundle slot "${slot}"`, status: 400 };
      }
      const nodeAbsolute = await resolveApiManifestAbsolute(manifestRel);
      if (!nodeAbsolute) return { error: "Invalid manifest path", status: 400 };

      const normalizedFile = normalizeRelativeFilePath(file);
      if (!normalizedFile) return { error: "Invalid file path", status: 400 };
      if (!isSidecarSourceFileName(path.basename(normalizedFile))) {
        return { error: "Sidecar cannot be attached to this file type", status: 400 };
      }

      if (isExternalMemorySlot(slot)) {
        const ctx = await resolveExternalFileOpContext(manifestRel, normalizedFile);
        if (ctx.error) return ctx;
        return {
          sourcePath: manifestRelFromNodeAbsolute(ctx.fileAbsolute),
          sourceAbsolute: ctx.fileAbsolute,
          manifestRel,
          slot,
          file: ctx.normalizedRelFile.replace(/\\/g, "/")
        };
      }

      if (slot === "media" || slot === "assets") {
        const mediaAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, normalizedFile);
        if (!mediaAbsolute) return { error: "Source file not found", status: 404 };
        return {
          sourcePath: manifestRelFromNodeAbsolute(mediaAbsolute),
          sourceAbsolute: mediaAbsolute,
          manifestRel,
          slot,
          file: normalizedFile.replace(/\\/g, "/")
        };
      }

      const storageFolder = slotKeyToStorageFolder(slot);
      const resolved = await resolveStorageFileAbsolute(nodeAbsolute, storageFolder, normalizedFile);
      if (resolved.error) return resolved;
      return {
        sourcePath: manifestRelFromNodeAbsolute(resolved.fileAbsolute),
        sourceAbsolute: resolved.fileAbsolute,
        manifestRel,
        slot,
        file: resolved.normalizedRelFile.replace(/\\/g, "/")
      };
    }

    return { error: "sourcePath or path+slot+file is required", status: 400 };
  }

  async function resolveSidecarPaths(sourceContext) {
    const sidecarAbsolute = resolveSidecarAbsoluteFromSourceAbsolute(sourceContext.sourceAbsolute);
    if (!sidecarAbsolute) return { error: "Invalid sidecar path", status: 400 };
    if (!sidecarAbsolute.startsWith(getAgentRoot())) {
      return { error: "Sidecar path escapes workspace", status: 400 };
    }

    const sidecarPath = manifestRelFromNodeAbsolute(sidecarAbsolute);
    const sidecarRelInSlot = toSidecarRelativePath(sourceContext.file || path.basename(sourceContext.sourcePath));
    let exists = false;
    if (await fileExists(sidecarAbsolute)) exists = true;

    return {
      ...sourceContext,
      sidecarAbsolute,
      sidecarPath,
      sidecarRelInSlot,
      exists,
      naming: "{stem}.sidecar.md"
    };
  }

  async function resolveSidecar(payload = {}) {
    const sourceContext = await resolveSourceContext(payload);
    if (sourceContext.error) return sourceContext;
    return resolveSidecarPaths(sourceContext);
  }

  async function readSidecar(payload = {}) {
    const resolved = await resolveSidecar(payload);
    if (resolved.error) return resolved;

    let content = "";
    if (resolved.exists) {
      content = await fs.readFile(resolved.sidecarAbsolute, "utf-8");
    }

    const { frontmatter, body } = splitNodeFrontmatter(content);
    return {
      sourcePath: resolved.sourcePath,
      sidecarPath: resolved.sidecarPath,
      sidecar: resolved.sidecarRelInSlot,
      slot: resolved.slot || null,
      manifestPath: resolved.manifestRel || null,
      exists: resolved.exists,
      content,
      propertiesRaw: frontmatter,
      body,
      naming: resolved.naming
    };
  }

  async function buildDefaultSidecarContent(resolved, { title, body, frontmatterOverrides } = {}) {
    const stat = await fs.stat(resolved.sourceAbsolute);
    const safeTitle =
      String(title || "").trim() ||
      path.basename(resolved.sourcePath).replace(path.extname(resolved.sourcePath), "") ||
      "Sidecar";
    const overrides = {
      "awn-mime": guessMimeType(resolved.sourcePath),
      "awn-size": String(stat.size),
      ...(frontmatterOverrides || {})
    };

    if (resolved.manifestRel && resolved.slot && resolved.sidecarRelInSlot) {
      const storageFolder = slotKeyToStorageFolder(resolved.slot);
      const contentWorkspaceRel = buildStorageLayerRef
        ? buildStorageLayerRef(resolved.manifestRel, storageFolder, resolved.sidecarRelInSlot)
        : resolved.sidecarPath;
      return buildSlotContentFileContentForManifest(resolved.manifestRel, safeTitle, resolved.slot, "sidecar", {
        body: body ?? "",
        frontmatterOverrides: overrides,
        contentWorkspaceRel
      });
    }

    const generic = await buildSlotContentFileContentForManifest(resolved.manifestRel || "manifest.md", safeTitle, "media", "sidecar", {
      body: body ?? "",
      frontmatterOverrides: overrides,
      contentWorkspaceRel: resolved.sidecarPath
    });
    return generic;
  }

  async function writeSidecar(payload = {}, { createOnly = false, updateOnly = false } = {}) {
    const resolved = await resolveSidecar(payload);
    if (resolved.error) return resolved;

    if (createOnly && resolved.exists) {
      return { error: "Sidecar already exists. Use write_sidecar to update.", status: 409 };
    }
    if (updateOnly && !resolved.exists) {
      return { error: "Sidecar does not exist. Use create_sidecar first.", status: 404 };
    }

    let content = null;
    if (typeof payload.content === "string") {
      content = payload.content;
    } else if (payload.body !== undefined || payload.properties || payload.frontmatterOverrides) {
      const existing = resolved.exists
        ? await fs.readFile(resolved.sidecarAbsolute, "utf-8")
        : await buildDefaultSidecarContent(resolved, {
            title: payload.title,
            body: payload.body ?? "",
            frontmatterOverrides: payload.properties || payload.frontmatterOverrides
          });
      const { frontmatter, body } = splitNodeFrontmatter(existing);
      let nextFrontmatter = frontmatter;
      const patch = payload.properties || payload.frontmatterOverrides;
      if (patch && typeof patch === "object") {
        nextFrontmatter = mergeFrontmatterOverrides(nextFrontmatter, patch);
      }
      const nextBody = payload.body !== undefined ? String(payload.body) : body;
      content = joinSidecarContent(nextFrontmatter, nextBody);
    } else if (createOnly) {
      content = await buildDefaultSidecarContent(resolved, {
        title: payload.title,
        body: payload.body ?? ""
      });
    } else {
      return { error: "content or body is required", status: 400 };
    }

    const raw = resolved.exists ? await fs.readFile(resolved.sidecarAbsolute, "utf-8").catch(() => "") : "";
    const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
    const stampedContent = applyAwnTimestampsToMarkdownContent(content, diskFrontmatter);
    const historyManifest = resolved.manifestRel || resolveOwningManifestRelFromNodePath(resolved.sidecarPath) || "manifest.md";
    await writeWorkspaceTextFileWithHistory(historyManifest, resolved.sidecarPath, stampedContent);

    return {
      sourcePath: resolved.sourcePath,
      sidecarPath: resolved.sidecarPath,
      sidecar: resolved.sidecarRelInSlot,
      slot: resolved.slot || null,
      manifestPath: resolved.manifestRel || null,
      created: !resolved.exists,
      exists: true,
      content: stampedContent
    };
  }

  async function deleteSidecar(payload = {}) {
    const resolved = await resolveSidecar(payload);
    if (resolved.error) return resolved;
    if (!resolved.exists) {
      return { error: "Sidecar does not exist", status: 404 };
    }

    const historyManifest =
      resolved.manifestRel || resolveOwningManifestRelFromNodePath(resolved.sidecarPath) || "manifest.md";

    if (typeof snapshotFileHistoryBeforeWrite === "function") {
      await snapshotFileHistoryBeforeWrite({
        manifestRelPath: historyManifest,
        targetRelPath: resolved.sidecarPath,
        nextContent: ""
      });
    }

    const agentRoot = typeof getAgentRoot === "function" ? getAgentRoot() : null;
    if (!agentRoot) {
      return { error: "Agent root not available", status: 500 };
    }
    const recycled = await softDeleteWorkspacePath(agentRoot, resolved.sidecarAbsolute, {
      context: { source: "sidecar", sidecarPath: resolved.sidecarPath, sourcePath: resolved.sourcePath }
    });
    if (recycled.error) {
      return { error: recycled.error, status: recycled.status || 400 };
    }

    if (typeof recordWorkspaceActivityAsync === "function") {
      await recordWorkspaceActivityAsync({
        action: "delete",
        path: resolved.sidecarPath,
        manifestPath: historyManifest,
        label: path.basename(resolved.sidecarPath)
      });
    }
    if (typeof queueWorkspaceIndexFileSync === "function") {
      queueWorkspaceIndexFileSync(resolved.sidecarPath);
    }

    return {
      sourcePath: resolved.sourcePath,
      sidecarPath: resolved.sidecarPath,
      sidecar: resolved.sidecarRelInSlot,
      slot: resolved.slot || null,
      manifestPath: resolved.manifestRel || null,
      deleted: true,
      exists: false,
      recycled: true,
      markerId: recycled.markerId,
      markerLabel: recycled.markerLabel,
      recycleName: recycled.recycleName
    };
  }

  return {
    toSidecarRelativePath,
    resolveSidecarAbsoluteFromSourceAbsolute,
    isSidecarSourceFileName,
    resolveSidecar,
    readSidecar,
    writeSidecar,
    createSidecar: (payload) => writeSidecar(payload, { createOnly: true }),
    deleteSidecar
  };
}

module.exports = {
  toSidecarRelativePath,
  resolveSidecarAbsoluteFromSourceAbsolute,
  isSidecarSourceFileName,
  createSidecarService
};
