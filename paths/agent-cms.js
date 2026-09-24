const path = require("path");

const ROOT = ".agent-cms";

const rel = {
  root: ROOT,
  settings: {
    dir: `${ROOT}/settings`,
    platform: `${ROOT}/settings/platform.yml`,
    workspace: `${ROOT}/settings/workspace.yml`,
    user: `${ROOT}/settings/user.yml`,
    integrations: `${ROOT}/settings/integrations.yml`,
    integrationsDir: `${ROOT}/settings/integrations`
  },
  indexes: {
    dir: `${ROOT}/cache/indexes`,
    semantic: `${ROOT}/cache/indexes/semantic`,
    storage: `${ROOT}/cache/indexes/storage`,
    fulltext: `${ROOT}/cache/indexes/fulltext`,
    link: `${ROOT}/cache/indexes/link`,
    ocr: `${ROOT}/cache/indexes/ocr`,
    lastRunJson: `${ROOT}/cache/indexes/last-run.json`,
    lastRunFiles: `${ROOT}/cache/indexes/last-run-files.txt`
  },
  cache: {
    dir: `${ROOT}/cache`,
    indexes: `${ROOT}/cache/indexes`,
    mediaThumbs: `${ROOT}/cache/media-thumbs`,
    menu: `${ROOT}/cache/menu`,
    shellCamera: `${ROOT}/cache/shell-camera`,
    shellScreen: `${ROOT}/cache/shell-screen`
  },
  journal: {
    dir: `${ROOT}/journal`
  },
  state: {
    dir: `${ROOT}/state`,
    uiContext: `${ROOT}/state/ui-context.json`,
    activity: `${ROOT}/state/activity.jsonl`,
    activityArchive: `${ROOT}/state/activity-archive.jsonl`,
    navRegistry: `${ROOT}/state/nav-registry`,
    shell: `${ROOT}/state/shell.json`,
    composeDraft: `${ROOT}/state/compose-draft.md`
  },
  digest: {
    dir: `${ROOT}/digest`,
    workspaceDigest: `${ROOT}/digest/workspace-digest.md`
  },
  wsList: {
    agents: `${ROOT}/ws-list-agents.json`,
    groups: `${ROOT}/ws-list-groups.json`
  }
};

const shellLegacy = {
  root: ".agent-shell",
  settings: ".agent-shell/settings.json",
  state: ".agent-shell/state.json",
  composeDraft: ".agent-shell/compose-draft.md",
  camera: ".agent-shell/camera",
  screen: ".agent-shell/screen"
};

const projectRel = {
  settings: {
    dir: `${ROOT}/settings`,
    platform: `${ROOT}/settings/platform.yml`
  }
};

const legacy = {
  workspaceSettings: "settings.yml",
  platformSettings: `${ROOT}/settings/global.yml`,
  userSettings: `${ROOT}/settings/user-settings.yml`,
  userSettingsRoot: `${ROOT}/user-settings.yml`,
  integrations: `${ROOT}/integrations.yml`,
  integrationsDir: `${ROOT}/integrations`,
  semanticIndex: `${ROOT}/semantic-index`,
  storageIndex: `${ROOT}/storage-index`,
  fulltextIndex: `${ROOT}/fulltext-index`,
  linkIndex: `${ROOT}/link-index`,
  ocrIndex: `${ROOT}/ocr-index`,
  menuCache: `${ROOT}/menu-cache`,
  uiContext: `${ROOT}/ui-context.json`,
  activity: `${ROOT}/activity.jsonl`,
  activityArchive: `${ROOT}/activity-archive.jsonl`,
  navRegistry: `${ROOT}/nav-registry`,
  navFlagsRegistry: `${ROOT}/nav-flags-registry.json`,
  navFocusRegistry: `${ROOT}/nav-focus-registry.json`,
  navMainRegistry: `${ROOT}/nav-main-registry.json`,
  indexesSemantic: `${ROOT}/indexes/semantic`,
  indexesStorage: `${ROOT}/indexes/storage`,
  indexesFulltext: `${ROOT}/indexes/fulltext`,
  indexesLink: `${ROOT}/indexes/link`,
  indexesOcr: `${ROOT}/indexes/ocr`,
  indexesDir: `${ROOT}/indexes`
};

function abs(agentRoot, relPath) {
  return path.join(agentRoot, relPath);
}

function settingsDir(agentRoot) {
  return abs(agentRoot, rel.settings.dir);
}

function userSettingsAbs(agentRoot) {
  return abs(agentRoot, rel.settings.user);
}

function platformSettingsAbs(projectRoot) {
  return abs(projectRoot, projectRel.settings.platform);
}

function wsListAgentsAbs(projectRoot) {
  return abs(projectRoot, rel.wsList.agents);
}

function wsListGroupsAbs(projectRoot) {
  return abs(projectRoot, rel.wsList.groups);
}

function integrationsAbs(agentRoot) {
  return abs(agentRoot, rel.settings.integrations);
}

function indexDir(agentRoot, kind) {
  const key = String(kind || "").trim();
  const relPath = rel.indexes[key];
  if (!relPath) throw new Error(`Unknown agent-cms index kind: ${kind}`);
  return abs(agentRoot, relPath);
}

function cacheDir(agentRoot, kind) {
  const key = String(kind || "").trim();
  const relPath = rel.cache[key] || rel.cache.dir;
  return abs(agentRoot, relPath);
}

function journalDir(agentRoot) {
  return abs(agentRoot, rel.journal.dir);
}

function stateDir(agentRoot) {
  return abs(agentRoot, rel.state.dir);
}

function navRegistryDir(agentRoot) {
  return abs(agentRoot, rel.state.navRegistry);
}

const SHELL_SNAPSHOT_DOMAINS = {
  camera: "shellCamera",
  screen: "shellScreen"
};

function shellSnapshotCacheRel(domain) {
  const key = SHELL_SNAPSHOT_DOMAINS[String(domain || "").trim()];
  if (!key) throw new Error(`Unknown shell snapshot domain: ${domain}`);
  return rel.cache[key];
}

function shellSnapshotCacheDir(agentRoot, domain) {
  return abs(agentRoot, shellSnapshotCacheRel(domain));
}

function rewriteShellSnapshotRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (normalized.startsWith(shellLegacy.camera + "/")) {
    return normalized.replace(shellLegacy.camera, rel.cache.shellCamera);
  }
  if (normalized.startsWith(shellLegacy.screen + "/")) {
    return normalized.replace(shellLegacy.screen, rel.cache.shellScreen);
  }
  return normalized;
}

module.exports = {
  ROOT,
  rel,
  projectRel,
  legacy,
  platformSettingsAbs,
  wsListAgentsAbs,
  wsListGroupsAbs,
  /** @deprecated use platformSettingsAbs */
  globalSettingsAbs: platformSettingsAbs,
  shellLegacy,
  abs,
  settingsDir,
  userSettingsAbs,
  integrationsAbs,
  indexDir,
  cacheDir,
  journalDir,
  stateDir,
  navRegistryDir,
  shellSnapshotCacheRel,
  shellSnapshotCacheDir,
  rewriteShellSnapshotRelPath
};
