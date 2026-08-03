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
  // Preferred CHPU (no .md) + with extension + short/lowercase legacy aliases
  ["agents", "AGENTS.md"],
  ["agents.md", "AGENTS.md"],
  ["skill", "SKILL.md"],
  ["skill.md", "SKILL.md"],
  ["note", "NOTE.md"],
  ["note.md", "NOTE.md"],
  ["notes", "NOTE.md"],
  ["notes.md", "NOTE.md"],
  ["todo", "TODO.md"],
  ["todo.md", "TODO.md"],
  ["readme", "README.md"],
  ["readme.md", "README.md"],
  [".env", ".env"],
  ["env", ".env"],
  [".gitignore", ".gitignore"],
  ["gitignore", ".gitignore"]
]);

const SYSTEM_FILE_TO_CHPU_PATH = new Map([
  ["AGENTS.md", "AGENTS"],
  ["SKILL.md", "SKILL"],
  ["NOTE.md", "NOTE"],
  ["TODO.md", "TODO"],
  ["README.md", "README"],
  [".env", ".env"],
  [".gitignore", ".gitignore"]
]);

const CORE_SYSTEM_FILE_NAMES = new Set([
  "AGENTS.md",
  "SKILL.md",
  "NOTE.md",
  "TODO.md",
  ".env",
  ".gitignore"
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
  "preview",
  "all",
  "images",
  "audio",
  "video",
  "documents",
  "archives",
  "other",
  "folder"
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
  const raw = String(chpuPath || "").trim();
  if (!raw || raw.includes("/") || raw.includes("\\")) return null;

  const key = raw.toLowerCase();
  let canonical = SYSTEM_FILE_CHPU_ALIASES.get(key) || null;

  if (!canonical) {
    // Prefer exact / case-insensitive match only for core system files.
    try {
      const entries = await fs.readdir(agentRoot, { withFileTypes: true });
      const hit = entries.find(
        (entry) => entry?.isFile?.() && String(entry.name || "").toLowerCase() === key
      );
      if (hit && CORE_SYSTEM_FILE_NAMES.has(hit.name)) canonical = hit.name;
    } catch {
      // ignore
    }
  }

  if (!canonical || !CORE_SYSTEM_FILE_NAMES.has(canonical)) return null;

  const absolute = path.join(agentRoot, canonical);
  if (!absolute.startsWith(agentRoot)) return null;
  return {
    kind: "systemFile",
    systemFile: canonical,
    workspacePath: SYSTEM_FILE_TO_CHPU_PATH.get(canonical) || canonical,
    view: null,
    exists: await fileExists(absolute)
  };
}

async function resolveRootAdoptFile(agentRoot, chpuPath) {
  const raw = String(chpuPath || "").trim();
  if (!raw || raw.includes("/") || raw.includes("\\")) return null;
  if (raw.toLowerCase() === "manifest.md") return null;

  let name = null;
  const key = raw.toLowerCase();
  try {
    const entries = await fs.readdir(agentRoot, { withFileTypes: true });
    const hit = entries.find(
      (entry) => entry?.isFile?.() && String(entry.name || "").toLowerCase() === key
    );
    if (hit) name = hit.name;
  } catch {
    return null;
  }
  if (!name || CORE_SYSTEM_FILE_NAMES.has(name)) return null;

  return {
    kind: "adoptFile",
    filePath: name,
    folderPath: ".",
    workspacePath: name,
    title: name
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

async function resolveAwnDataPath(agentRoot, chpuPath) {
  const normalized = String(chpuPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!/^awn-data(?:\/|$)/i.test(normalized)) return null;

  const segments = normalized.split("/").filter(Boolean);
  for (let len = segments.length; len >= 1; len -= 1) {
    const dirRel = segments.slice(0, len).join("/");
    const storeContractAbs = path.join(agentRoot, dirRel, "manifest.store.md");
    const legacyStoreAbs = path.join(agentRoot, dirRel, "_store.md");
    const hasStore =
      (storeContractAbs.startsWith(agentRoot) && (await fileExists(storeContractAbs))) ||
      (legacyStoreAbs.startsWith(agentRoot) && (await fileExists(legacyStoreAbs)));
    if (!hasStore) continue;

    const tail = segments.slice(len);
    const recordId = tail.length ? tail.join("/").replace(/\.md$/i, "") : null;
    const storeRel = dirRel.replace(/^awn-data\/?/i, "");
    const workspacePath = recordId ? `${dirRel}/${recordId}` : dirRel;
    return {
      kind: "awnDataStore",
      storeRel,
      recordId,
      workspacePath
    };
  }

  const rootAbs = path.join(agentRoot, "awn-data");
  if (normalized === "awn-data" && (await isDirectory(rootAbs))) {
    return { kind: "awnDataRoot", workspacePath: "awn-data" };
  }

  return null;
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

const CHPU_FLAT_SLOT_FOLDER_NAMES = [
  ...new Set([...Object.keys(SLOT_FOLDER_TO_MODE), "main", "inbox", "thread", "notes", "quick-notes"])
];

function normalizeMalformedChpuStoragePath(chpuPath) {
  let path = String(chpuPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!path || /\/(?:awn-storage|storage)\//i.test(path)) return path;

  const todoSlotMatch = path.match(
    new RegExp(`^(.*)/todo/(${CHPU_FLAT_SLOT_FOLDER_NAMES.join("|")})/(.+)$`, "i")
  );
  if (todoSlotMatch) {
    path = `${todoSlotMatch[1]}/${STORAGE_ROOT_FOLDER}/${todoSlotMatch[2]}/${todoSlotMatch[3]}`.replace(
      /\/+$/,
      ""
    );
    return path;
  }

  if (/\/main$/i.test(path)) {
    return `${path.replace(/\/main$/i, "")}/${STORAGE_ROOT_FOLDER}/main`;
  }

  return path;
}

async function resolveChpuPath(agentRoot, rawPath) {
  const agentRootResolved = path.resolve(agentRoot);
  const { path: splitPath, views } = splitChpuPath(rawPath);
  const chpuPath = normalizeMalformedChpuStoragePath(splitPath);

  if (!chpuPath) {
    return attachChpuViews({ kind: "agentHome", workspacePath: "" }, views);
  }

  const system = await resolveSystemFile(agentRootResolved, chpuPath);
  if (system) return attachChpuViews(system, views);

  const rootAdopt = await resolveRootAdoptFile(agentRootResolved, chpuPath);
  if (rootAdopt) return attachChpuViews(rootAdopt, views);

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

  const awnDataResolved = await resolveAwnDataPath(agentRootResolved, chpuPath);
  if (awnDataResolved) return attachChpuViews(awnDataResolved, views);

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

  const folderAbs = path.join(agentRootResolved, chpuPath);
  if (folderAbs.startsWith(agentRootResolved) && (await isDirectory(folderAbs))) {
    const areaManifestAbs = path.join(folderAbs, MANIFEST_FILE);
    const hasAreaManifest = await fileExists(areaManifestAbs);
    if (!hasAreaManifest) {
      return attachChpuViews(
        {
          kind: "adoptFolder",
          folderPath: chpuPath.replace(/\\/g, "/"),
          workspacePath: chpuPath.replace(/\\/g, "/"),
          title: path.basename(chpuPath)
        },
        views
      );
    }
  }

  const fileAbs = path.join(agentRootResolved, chpuPath);
  if (fileAbs.startsWith(agentRootResolved) && (await fileExists(fileAbs))) {
    try {
      const stat = await fs.stat(fileAbs);
      if (stat.isFile()) {
        const normalized = chpuPath.replace(/\\/g, "/");
        const baseName = path.basename(normalized);
        if (String(baseName).toLowerCase() === "manifest.md") {
          // workspace root manifest is handled elsewhere
        } else {
          const parentRel = path.posix.dirname(normalized);
          const isRootFile = !parentRel || parentRel === ".";
          if (isRootFile) {
            if (!CORE_SYSTEM_FILE_NAMES.has(baseName)) {
              return attachChpuViews(
                {
                  kind: "adoptFile",
                  filePath: baseName,
                  folderPath: ".",
                  workspacePath: baseName,
                  title: baseName
                },
                views
              );
            }
          } else {
            const parentAbs = path.join(agentRootResolved, parentRel);
            const areaManifestAbs = path.join(parentAbs, MANIFEST_FILE);
            if (!(await fileExists(areaManifestAbs))) {
              return attachChpuViews(
                {
                  kind: "adoptFile",
                  filePath: normalized,
                  folderPath: parentRel,
                  workspacePath: normalized,
                  title: baseName
                },
                views
              );
            }
          }
        }
      }
    } catch {
      // fall through to unknown
    }
  }

  const todoTopicMatch = chpuPath.match(/^(.*)\/todo$/i);
  if (todoTopicMatch && !/\/(?:awn-storage|storage)\//i.test(chpuPath)) {
    const topicDir = todoTopicMatch[1].replace(/\/$/, "");
    const manifestRel = `${topicDir}/${MANIFEST_FILE}`.replace(/\\/g, "/");
    const manifestAbs = path.join(agentRootResolved, manifestRel);
    if (manifestAbs.startsWith(agentRootResolved) && (await fileExists(manifestAbs))) {
      const todoViews = views.includes("todo") ? views : [...views, "todo"];
      return attachChpuViews(
        {
          kind: "manifest",
          topicManifestPath: manifestRel,
          workspacePath: topicDir
        },
        todoViews
      );
    }
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
  SYSTEM_FILE_TO_CHPU_PATH,
  SLOT_FOLDER_TO_MODE,
  splitChpuPath,
  resolveChpuPath,
  workspacePathFromFileRel,
  isChpuReservedRootSegment
};
