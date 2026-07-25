/**
 * CHPU: /{agent}/{workspace-path}/[~ui-view]
 * Слоты — часть path (awn-storage/inbox/…), ~ — только UI.
 */
const path = require("path");
const fs = require("fs").promises;
const {
  MANIFEST_FILE,
  STORAGE_ROOT_FOLDER,
  STORAGE_SUBFOLDER_BY_MODE
} = require("./manifest-paths");

const SYSTEM_FILE_CHPU_ALIASES = new Map([
  ["agents", "AGENTS.md"],
  ["agents.md", "AGENTS.md"],
  ["note", "NOTE.md"],
  ["note.md", "NOTE.md"],
  ["notes", "NOTE.md"],
  ["notes.md", "NOTE.md"],
  ["todo", "TODO.md"],
  ["todo.md", "TODO.md"],
  ["readme", "README.md"],
  ["readme.md", "README.md"],
  ["env", ".env"],
  ["gitignore", ".gitignore"]
]);

const SLOT_FOLDER_TO_MODE = Object.fromEntries(
  Object.entries(STORAGE_SUBFOLDER_BY_MODE).map(([mode, folder]) => [folder, mode])
);

const CHPU_UI_VIEW_IDS = new Set([
  "edit",
  "nav",
  "map",
  "hub",
  "setup",
  "schema",
  "env",
  "chat",
  "todo",
  "list",
  "preview"
]);

const CHPU_LEGACY_UI_ALIASES = {
  description: "edit",
  edit: "edit",
  navigation: "nav",
  nav: "nav",
  mindmap: "map",
  map: "map",
  overview: "hub",
  hub: "hub",
  configs: "setup",
  setup: "setup",
  "topic-schema": "schema",
  schema: "schema",
  env: "env",
  thread: "chat",
  chat: "chat",
  todo: "todo",
  tasks: "todo",
  list: "list",
  browse: "list",
  "show-list": "list",
  preview: "preview",
  card: "preview",
  toc: "preview",
  "show-preview": "preview",
  "entry-overview": "preview",
  external: null,
  internal: null,
  inbox: null,
  media: null,
  note: null,
  references: null,
  artefacts: null,
  assets: null,
  repository: null,
  scripts: null,
  temp: null
};

const APP_ROUTE_VIEW_IDS = new Set([...CHPU_UI_VIEW_IDS, ...Object.keys(CHPU_LEGACY_UI_ALIASES)]);

function normalizeChpuViewCandidate(candidate) {
  const raw = candidate === "quick-notes" ? "note" : candidate;
  if (CHPU_LEGACY_UI_ALIASES[raw] === null) return raw;
  const aliased = CHPU_LEGACY_UI_ALIASES[raw] ?? raw;
  if (CHPU_UI_VIEW_IDS.has(aliased)) return aliased;
  if (APP_ROUTE_VIEW_IDS.has(raw)) return raw;
  return null;
}

function attachChpuViews(result, views) {
  if (!result) return result;
  const viewList = Array.isArray(views) ? views.filter(Boolean) : [];
  result.views = viewList;
  result.view = viewList[0] || null;
  return result;
}

async function fileExists(absolute) {
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(absolute) {
  try {
    const stat = await fs.stat(absolute);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function splitChpuPath(rawPath) {
  const normalized = String(rawPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return { path: "", views: [], view: null };
  }

  const segments = normalized.split("/").filter(Boolean);
  const views = [];
  while (segments.length) {
    const last = segments[segments.length - 1];
    if (last.startsWith("~") && last.length > 1) {
      const normalizedView = normalizeChpuViewCandidate(last.slice(1));
      if (!normalizedView) break;
      views.unshift(normalizedView);
      segments.pop();
      continue;
    }
    break;
  }

  if (!views.length && segments.length) {
    const last = segments[segments.length - 1];
    const atIndex = last.lastIndexOf("@");
    if (atIndex > 0) {
      const normalizedView = normalizeChpuViewCandidate(last.slice(atIndex + 1));
      if (normalizedView) {
        views.push(normalizedView);
        const head = last.slice(0, atIndex);
        if (head) segments[segments.length - 1] = head;
        else segments.pop();
      }
    }
  }

  return { path: segments.join("/"), views, view: views[0] || null };
}

function relFromAbsolute(agentRoot, absolute) {
  return path.relative(agentRoot, absolute).replace(/\\/g, "/");
}

async function resolveSystemFile(agentRoot, chpuPath) {
  const key = String(chpuPath || "").trim().toLowerCase();
  const canonical = SYSTEM_FILE_CHPU_ALIASES.get(key) || null;
  if (!canonical) return null;
  const absolute = path.join(agentRoot, canonical);
  if (!absolute.startsWith(agentRoot)) return null;
  if (!(await fileExists(absolute))) return null;
  return {
    kind: "systemFile",
    systemFile: canonical,
    workspacePath: chpuPath,
    view: null
  };
}

async function tryMarkdownFile(agentRoot, relPath) {
  const mdRel = relPath.endsWith(".md") ? relPath : `${relPath}.md`;
  const absolute = path.join(agentRoot, mdRel);
  if (!absolute.startsWith(agentRoot) || !(await fileExists(absolute))) {
    return null;
  }
  return { mdRel, absolute };
}

async function resolveStorageRecord(agentRoot, topicDir, slotFolder, resourcePath) {
  const topicManifestRel = `${topicDir}/${MANIFEST_FILE}`.replace(/\\/g, "/");
  const topicManifestAbs = path.join(agentRoot, topicManifestRel);
  if (!topicManifestAbs.startsWith(agentRoot) || !(await fileExists(topicManifestAbs))) {
    return null;
  }

  const slotMode = SLOT_FOLDER_TO_MODE[slotFolder] || null;
  if (!slotMode) return null;

  const resource = String(resourcePath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!resource) {
    return {
      kind: "slotView",
      topicManifestPath: topicManifestRel,
      slotFolder,
      contentMode: slotMode,
      workspacePath: `${topicDir}/${STORAGE_ROOT_FOLDER}/${slotFolder}`,
      view: null
    };
  }

  const sectionManifestRel = `${topicDir}/${STORAGE_ROOT_FOLDER}/${slotFolder}/${resource}/${MANIFEST_FILE}`.replace(
    /\\/g,
    "/"
  );
  const sectionManifestAbs = path.join(agentRoot, sectionManifestRel);
  if (sectionManifestAbs.startsWith(agentRoot) && (await fileExists(sectionManifestAbs))) {
    return {
      kind: "section",
      topicManifestPath: topicManifestRel,
      slotFolder,
      contentMode: slotMode,
      resourceRelPathInSlot: `${resource}/${MANIFEST_FILE}`,
      workspacePath: `${topicDir}/${STORAGE_ROOT_FOLDER}/${slotFolder}/${resource}`,
      view: null
    };
  }

  const sectionDirRel = `${topicDir}/${STORAGE_ROOT_FOLDER}/${slotFolder}/${resource}`.replace(/\\/g, "/");
  const sectionDirAbs = path.join(agentRoot, sectionDirRel);
  if (sectionDirAbs.startsWith(agentRoot) && (await isDirectory(sectionDirAbs))) {
    return {
      kind: "section",
      topicManifestPath: topicManifestRel,
      slotFolder,
      contentMode: slotMode,
      resourceRelPathInSlot: resource,
      workspacePath: sectionDirRel,
      view: null
    };
  }

  const resourceRelInSlot = /\.[a-z0-9]+$/i.test(resource) ? resource : `${resource}.md`;
  const recordRel = `${topicDir}/${STORAGE_ROOT_FOLDER}/${slotFolder}/${resourceRelInSlot}`.replace(/\\/g, "/");
  const recordAbs = path.join(agentRoot, recordRel);
  if (recordAbs.startsWith(agentRoot) && (await fileExists(recordAbs))) {
    return {
      kind: "record",
      topicManifestPath: topicManifestRel,
      slotFolder,
      contentMode: slotMode,
      resourceRelPathInSlot: resourceRelInSlot.replace(/\\/g, "/"),
      workspacePath: workspacePathFromFileRel(recordRel),
      view: null
    };
  }

  return null;
}

async function resolveChpuPath(agentRoot, rawPath) {
  const agentRootResolved = path.resolve(agentRoot);
  const { path: chpuPath, views } = splitChpuPath(rawPath);

  if (!chpuPath) {
    return attachChpuViews({ kind: "agentHome", workspacePath: "" }, views);
  }

  const system = await resolveSystemFile(agentRootResolved, chpuPath);
  if (system) return attachChpuViews(system, views);

  const storageMatch = chpuPath.match(/^(.*)\/(?:awn-storage|storage)\/([^/]+)\/?(.*)$/i);
  if (storageMatch) {
    const [, topicDir, slotFolder, resourcePath] = storageMatch;
    const storageResolved = await resolveStorageRecord(
      agentRootResolved,
      topicDir.replace(/\/$/, ""),
      slotFolder,
      resourcePath
    );
    if (storageResolved) {
      return attachChpuViews(storageResolved, views);
    }
  }

  const manifestRel = `${chpuPath}/${MANIFEST_FILE}`.replace(/\\/g, "/");
  const manifestAbs = path.join(agentRootResolved, manifestRel);
  if (manifestAbs.startsWith(agentRootResolved) && (await fileExists(manifestAbs))) {
    return attachChpuViews(
      {
        kind: "manifest",
        topicManifestPath: manifestRel,
        workspacePath: chpuPath
      },
      views
    );
  }

  const directMd = await tryMarkdownFile(agentRootResolved, chpuPath);
  if (directMd) {
    return attachChpuViews(
      {
        kind: "file",
        workspacePath: chpuPath,
        fileRelPath: directMd.mdRel
      },
      views
    );
  }

  return attachChpuViews({ kind: "unknown", workspacePath: chpuPath }, views);
}

function workspacePathFromFileRel(fileRelPath) {
  return String(fileRelPath || "")
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "");
}

function isChpuReservedRootSegment(segment) {
  const value = String(segment || "").trim().toLowerCase();
  return (
    !value ||
    value === "api" ||
    value === "shell" ||
    value === "vendor" ||
    value === "a" ||
    value === "index.html"
  );
}

module.exports = {
  APP_ROUTE_VIEW_IDS,
  SYSTEM_FILE_CHPU_ALIASES,
  SLOT_FOLDER_TO_MODE,
  splitChpuPath,
  resolveChpuPath,
  workspacePathFromFileRel,
  isChpuReservedRootSegment
};
