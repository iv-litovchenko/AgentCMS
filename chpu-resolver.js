/**
 * CHPU: /{agent}/{workspace-path}/[~view] — без .md в URL.
 * View: последний сегмент `~inbox`, legacy: суффикс `@inbox` на последнем сегменте.
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

const APP_ROUTE_VIEW_IDS = new Set([
  "navigation",
  "overview",
  "entry-overview",
  "description",
  "internal",
  "external",
  "tabular",
  "media",
  "temp",
  "todo",
  "configs",
  "env",
  "scripts",
  "artefacts",
  "assets",
  "repository",
  "inbox",
  "note",
  "thread",
  "quick-notes",
  "references",
  "node-preview",
  "graph",
  "mindmap",
  "list"
]);

async function fileExists(absolute) {
  try {
    await fs.access(absolute);
    return true;
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
    return { path: "", view: null };
  }

  const segments = normalized.split("/").filter(Boolean);
  let view = null;
  if (segments.length) {
    const last = segments[segments.length - 1];
    if (last.startsWith("~") && last.length > 1) {
      const viewCandidate = last.slice(1);
      const normalizedView = viewCandidate === "quick-notes" ? "note" : viewCandidate;
      if (APP_ROUTE_VIEW_IDS.has(normalizedView)) {
        view = normalizedView;
        segments.pop();
      }
    } else {
      const atIndex = last.lastIndexOf("@");
      if (atIndex > 0) {
        const viewCandidate = last.slice(atIndex + 1);
        const normalizedView = viewCandidate === "quick-notes" ? "note" : viewCandidate;
        if (APP_ROUTE_VIEW_IDS.has(normalizedView)) {
          view = normalizedView;
          const head = last.slice(0, atIndex);
          if (head) segments[segments.length - 1] = head;
          else segments.pop();
        }
      }
    }
  }

  return { path: segments.join("/"), view };
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
  const { path: chpuPath, view } = splitChpuPath(rawPath);

  if (!chpuPath) {
    return { kind: "agentHome", workspacePath: "", view: view || null };
  }

  const system = await resolveSystemFile(agentRootResolved, chpuPath);
  if (system) return system;

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
      if (view) storageResolved.view = view;
      return storageResolved;
    }
  }

  const manifestRel = `${chpuPath}/${MANIFEST_FILE}`.replace(/\\/g, "/");
  const manifestAbs = path.join(agentRootResolved, manifestRel);
  if (manifestAbs.startsWith(agentRootResolved) && (await fileExists(manifestAbs))) {
    return {
      kind: "manifest",
      topicManifestPath: manifestRel,
      workspacePath: chpuPath,
      view: view || null
    };
  }

  const directMd = await tryMarkdownFile(agentRootResolved, chpuPath);
  if (directMd) {
    return {
      kind: "file",
      workspacePath: chpuPath,
      fileRelPath: directMd.mdRel,
      view: view || null
    };
  }

  return {
    kind: "unknown",
    workspacePath: chpuPath,
    view: view || null
  };
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
