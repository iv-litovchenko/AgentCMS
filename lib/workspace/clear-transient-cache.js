const fsp = require("fs/promises");
const path = require("path");
const { rel } = require("../paths/agent-cms");
const { AWN_WORKSPACE_TEMP_FOLDER } = require("../config/manifest-paths");

function isInsideAgentRoot(agentRoot, absolutePath) {
  const root = path.resolve(agentRoot);
  const absolute = path.resolve(absolutePath);
  if (absolute === root) return true;
  const relPath = path.relative(root, absolute);
  return relPath && !relPath.startsWith("..") && !path.isAbsolute(relPath);
}

async function clearDirectoryContents(absoluteDir) {
  let removedEntries = 0;
  try {
    const entries = await fsp.readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(absoluteDir, entry.name);
      await fsp.rm(child, { recursive: true, force: true });
      removedEntries += 1;
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { removedEntries: 0, existed: false };
    }
    throw error;
  }
  return { removedEntries, existed: true };
}

/**
 * Удаляет содержимое `.agent-cms/cache/` и `awn-temp/` в корне workspace.
 * Сами каталоги сохраняются.
 */
async function clearWorkspaceTransientCache(agentRoot) {
  const root = path.resolve(String(agentRoot || "").trim());
  if (!root) {
    throw new Error("Workspace root is required");
  }

  const targetDefs = [
    { key: "agentCmsCache", relPath: rel.cache.dir },
    { key: "awnTemp", relPath: AWN_WORKSPACE_TEMP_FOLDER }
  ];

  const targets = {};
  let removedEntries = 0;

  for (const def of targetDefs) {
    const normalizedRel = String(def.relPath || "").replace(/\\/g, "/").replace(/\/+$/, "");
    const absolute = path.join(root, ...normalizedRel.split("/").filter(Boolean));
    if (!isInsideAgentRoot(root, absolute)) {
      throw new Error(`Refusing path outside workspace: ${normalizedRel}`);
    }
    const result = await clearDirectoryContents(absolute);
    targets[def.key] = {
      path: normalizedRel,
      removedEntries: result.removedEntries,
      existed: result.existed
    };
    removedEntries += result.removedEntries;
  }

  return { ok: true, removedEntries, targets };
}

module.exports = {
  clearWorkspaceTransientCache
};
