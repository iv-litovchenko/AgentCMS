const fs = require("fs/promises");
const path = require("path");
const {
  rel,
  projectRel,
  projectLegacy,
  legacy,
  shellLegacy,
  abs,
  rewriteShellSnapshotRelPath
} = require("./paths/agent-cms");
const {
  AWN_DATABASE_ROOT_FOLDER,
  LEGACY_AWN_DATABASE_ROOT_FOLDER
} = require("./config/manifest-paths");

const MIGRATION_PAIRS = [
  [legacy.userSettingsRoot, legacy.userSettings],
  [legacy.userSettings, rel.settings.user],
  [legacy.integrations, rel.settings.integrations],
  [legacy.integrationsDir, rel.settings.integrationsDir],
  [legacy.semanticIndex, rel.indexes.semantic],
  [legacy.storageIndex, rel.indexes.storage],
  [legacy.fulltextIndex, rel.indexes.fulltext],
  [legacy.linkIndex, rel.indexes.link],
  [legacy.ocrIndex, rel.indexes.ocr],
  [legacy.indexesSemantic, rel.indexes.semantic],
  [legacy.indexesStorage, rel.indexes.storage],
  [legacy.indexesFulltext, rel.indexes.fulltext],
  [legacy.indexesLink, rel.indexes.link],
  [legacy.indexesOcr, rel.indexes.ocr],
  [legacy.menuCache, rel.cache.menu],
  [legacy.uiContext, rel.state.uiContext],
  [legacy.activity, rel.state.activity],
  [legacy.activityArchive, rel.state.activityArchive],
  [legacy.navRegistry, rel.state.navRegistry],
  [legacy.navFlagsRegistry, path.join(rel.state.dir, "nav-flags-registry.json")],
  [legacy.navFocusRegistry, path.join(rel.state.dir, "nav-focus-registry.json")],
  [legacy.navMainRegistry, path.join(rel.state.dir, "nav-main-registry.json")],
  [shellLegacy.state, rel.state.shell],
  [shellLegacy.composeDraft, rel.state.composeDraft],
  [shellLegacy.camera, rel.cache.shellCamera],
  [shellLegacy.screen, rel.cache.shellScreen]
];

const SUPERSEDED_LEGACY_DIRS = [
  legacy.semanticIndex,
  legacy.storageIndex,
  legacy.fulltextIndex,
  legacy.linkIndex,
  legacy.ocrIndex,
  legacy.menuCache,
  legacy.indexesSemantic,
  legacy.indexesStorage,
  legacy.indexesFulltext,
  legacy.indexesLink,
  legacy.indexesOcr,
  legacy.indexesDir
];

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function moveIfNeeded(agentRoot, fromRel, toRel) {
  const fromAbsolute = abs(agentRoot, fromRel);
  const toAbsolute = abs(agentRoot, toRel);
  if (!(await pathExists(fromAbsolute))) return false;
  if (await pathExists(toAbsolute)) return false;
  await fs.mkdir(path.dirname(toAbsolute), { recursive: true });
  await fs.rename(fromAbsolute, toAbsolute);
  return true;
}

async function removeSupersededLegacyDirs(agentRoot) {
  const removed = [];
  for (const legacyRel of SUPERSEDED_LEGACY_DIRS) {
    const legacyAbsolute = abs(agentRoot, legacyRel);
    if (!(await pathExists(legacyAbsolute))) continue;
    await fs.rm(legacyAbsolute, { recursive: true, force: true });
    removed.push(legacyRel);
  }
  return removed;
}

async function rewriteShellSnapshotMetaFiles(agentRoot) {
  const cacheDirs = [rel.cache.shellCamera, rel.cache.shellScreen];
  let rewritten = 0;

  for (const cacheRel of cacheDirs) {
    const cacheAbsolute = abs(agentRoot, cacheRel);
    if (!(await pathExists(cacheAbsolute))) continue;
    const entries = await fs.readdir(cacheAbsolute, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const fileAbsolute = path.join(cacheAbsolute, entry.name);
      try {
        const raw = await fs.readFile(fileAbsolute, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed?.path || typeof parsed.path !== "string") continue;
        const nextPath = rewriteShellSnapshotRelPath(parsed.path);
        if (nextPath === parsed.path) continue;
        parsed.path = nextPath;
        await fs.writeFile(fileAbsolute, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
        rewritten += 1;
      } catch {
        // ignore broken meta files
      }
    }
  }

  return rewritten;
}

async function removeEmptyAgentShellDir(agentRoot) {
  const shellAbsolute = path.join(agentRoot, shellLegacy.root);
  if (!(await pathExists(shellAbsolute))) return false;
  const entries = await fs.readdir(shellAbsolute);
  const meaningful = entries.filter((name) => name !== ".DS_Store");
  if (meaningful.length > 0) return false;
  for (const name of entries) {
    await fs.unlink(path.join(shellAbsolute, name)).catch(() => {});
  }
  await fs.rmdir(shellAbsolute).catch(() => {});
  return true;
}

async function migrateAgentCmsLayout(agentRoot) {
  if (!agentRoot) {
    return { moved: 0, paths: [], metaRewritten: 0, shellRemoved: false, legacyRemoved: [] };
  }
  const moved = [];
  for (const [fromRel, toRel] of MIGRATION_PAIRS) {
    if (await moveIfNeeded(agentRoot, fromRel, toRel)) {
      moved.push({ from: fromRel, to: toRel });
    }
  }
  const legacyRemoved = await removeSupersededLegacyDirs(agentRoot);
  const metaRewritten = await rewriteShellSnapshotMetaFiles(agentRoot);
  const shellRemoved = await removeEmptyAgentShellDir(agentRoot);
  return { moved: moved.length, paths: moved, metaRewritten, shellRemoved, legacyRemoved };
}

async function discoverWorkspaceRoots(projectRoot) {
  const roots = new Set();
  const workspacesDir = path.join(projectRoot, "workspaces");
  try {
    const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      roots.add(path.join(workspacesDir, entry.name));
    }
  } catch {
    // no workspaces dir
  }
  return roots;
}

async function workspaceNeedsMigration(agentRoot) {
  const hasCms = await pathExists(abs(agentRoot, rel.root));
  const hasShell = await pathExists(path.join(agentRoot, shellLegacy.root));
  return hasCms || hasShell;
}

async function migrateProjectAgentCmsLayout(projectRoot) {
  const root = String(projectRoot || "").trim();
  if (!root) return { moved: false, from: null, to: null };

  const fromAbsolute = path.join(root, projectLegacy.root);
  const toAbsolute = path.join(root, projectRel.root);
  if (!(await pathExists(fromAbsolute))) {
    return { moved: false, from: projectLegacy.root, to: projectRel.root };
  }
  if (await pathExists(toAbsolute)) {
    return { moved: false, from: projectLegacy.root, to: projectRel.root };
  }

  await fs.rename(fromAbsolute, toAbsolute);
  return { moved: true, from: projectLegacy.root, to: projectRel.root };
}

async function migrateWorkspaceAwnDatabasesFolder(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return { moved: false, from: null, to: null };

  const fromAbsolute = path.join(root, LEGACY_AWN_DATABASE_ROOT_FOLDER);
  const toAbsolute = path.join(root, AWN_DATABASE_ROOT_FOLDER);
  if (!(await pathExists(fromAbsolute))) {
    return { moved: false, from: LEGACY_AWN_DATABASE_ROOT_FOLDER, to: AWN_DATABASE_ROOT_FOLDER };
  }
  if (await pathExists(toAbsolute)) {
    return { moved: false, from: LEGACY_AWN_DATABASE_ROOT_FOLDER, to: AWN_DATABASE_ROOT_FOLDER };
  }

  await fs.rename(fromAbsolute, toAbsolute);
  return { moved: true, from: LEGACY_AWN_DATABASE_ROOT_FOLDER, to: AWN_DATABASE_ROOT_FOLDER };
}

async function migrateAllWorkspaceAwnDatabasesFolders(projectRoot, listAgents = () => []) {
  const roots = await discoverWorkspaceRoots(projectRoot);
  for (const agent of listAgents()) {
    if (agent?.rootAbsolute) roots.add(agent.rootAbsolute);
  }

  const results = [];
  for (const agentRoot of roots) {
    const result = await migrateWorkspaceAwnDatabasesFolder(agentRoot);
    if (result.moved) {
      results.push({ agentRoot, ...result });
    }
  }
  return results;
}

async function migrateAllAgentCmsLayouts(projectRoot, listAgents = () => []) {
  const roots = await discoverWorkspaceRoots(projectRoot);
  for (const agent of listAgents()) {
    if (agent?.rootAbsolute) roots.add(agent.rootAbsolute);
  }

  const results = [];
  for (const agentRoot of roots) {
    if (!(await workspaceNeedsMigration(agentRoot))) continue;
    const result = await migrateAgentCmsLayout(agentRoot);
    if (
      result.moved > 0 ||
      result.metaRewritten > 0 ||
      result.shellRemoved ||
      (result.legacyRemoved && result.legacyRemoved.length > 0)
    ) {
      results.push({ agentRoot, ...result });
    }
  }
  return results;
}

module.exports = {
  migrateAgentCmsLayout,
  migrateProjectAgentCmsLayout,
  migrateWorkspaceAwnDatabasesFolder,
  migrateAllWorkspaceAwnDatabasesFolders,
  migrateAllAgentCmsLayouts
};
