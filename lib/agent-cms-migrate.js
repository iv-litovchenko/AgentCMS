const fs = require("fs/promises");
const path = require("path");
const { rel, legacy, abs } = require("../paths/agent-cms");

const MIGRATION_PAIRS = [
  [legacy.userSettings, rel.settings.userSettings],
  [legacy.integrations, rel.settings.integrations],
  [legacy.integrationsDir, rel.settings.integrationsDir],
  [legacy.semanticIndex, rel.indexes.semantic],
  [legacy.storageIndex, rel.indexes.storage],
  [legacy.fulltextIndex, rel.indexes.fulltext],
  [legacy.linkIndex, rel.indexes.link],
  [legacy.ocrIndex, rel.indexes.ocr],
  [legacy.menuCache, rel.cache.menu],
  [legacy.uiContext, rel.state.uiContext],
  [legacy.activity, rel.state.activity],
  [legacy.activityArchive, rel.state.activityArchive],
  [legacy.navRegistry, rel.state.navRegistry],
  [legacy.navFlagsRegistry, path.join(rel.state.dir, "nav-flags-registry.json")],
  [legacy.navFocusRegistry, path.join(rel.state.dir, "nav-focus-registry.json")],
  [legacy.navMainRegistry, path.join(rel.state.dir, "nav-main-registry.json")]
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

async function migrateAgentCmsLayout(agentRoot) {
  if (!agentRoot) return { moved: 0, paths: [] };
  const moved = [];
  for (const [fromRel, toRel] of MIGRATION_PAIRS) {
    if (await moveIfNeeded(agentRoot, fromRel, toRel)) {
      moved.push({ from: fromRel, to: toRel });
    }
  }
  return { moved: moved.length, paths: moved };
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

async function migrateAllAgentCmsLayouts(projectRoot, listAgents = () => []) {
  const roots = await discoverWorkspaceRoots(projectRoot);
  for (const agent of listAgents()) {
    if (agent?.rootAbsolute) roots.add(agent.rootAbsolute);
  }

  const results = [];
  for (const agentRoot of roots) {
    if (!(await pathExists(abs(agentRoot, rel.root)))) continue;
    const result = await migrateAgentCmsLayout(agentRoot);
    if (result.moved > 0) {
      results.push({ agentRoot, ...result });
    }
  }
  return results;
}

module.exports = {
  migrateAgentCmsLayout,
  migrateAllAgentCmsLayouts
};
