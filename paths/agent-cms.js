const path = require("path");

const ROOT = ".agent-cms";

const rel = {
  root: ROOT,
  settings: {
    dir: `${ROOT}/settings`,
    userSettings: `${ROOT}/settings/user-settings.yml`,
    integrations: `${ROOT}/settings/integrations.yml`,
    integrationsDir: `${ROOT}/settings/integrations`,
    shell: `${ROOT}/settings/shell.json`
  },
  indexes: {
    dir: `${ROOT}/indexes`,
    semantic: `${ROOT}/indexes/semantic`,
    storage: `${ROOT}/indexes/storage`,
    fulltext: `${ROOT}/indexes/fulltext`,
    link: `${ROOT}/indexes/link`,
    ocr: `${ROOT}/indexes/ocr`
  },
  cache: {
    dir: `${ROOT}/cache`,
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

const legacy = {
  userSettings: `${ROOT}/user-settings.yml`,
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
  navMainRegistry: `${ROOT}/nav-main-registry.json`
};

function abs(agentRoot, relPath) {
  return path.join(agentRoot, relPath);
}

function settingsDir(agentRoot) {
  return abs(agentRoot, rel.settings.dir);
}

function userSettingsAbs(agentRoot) {
  return abs(agentRoot, rel.settings.userSettings);
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
  legacy,
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
