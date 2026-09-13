const path = require("path");
const {
  MANIFEST_FILE,
  parseStorageLayerRef,
  resolveManifestRelFromStorageBundlePath,
  resolveOwningManifestRelFromNodePath,
  isWorkspaceRootManifestRelPath,
  inferAwnTypeFromRelPath,
  normalizeDeclaredManifestTreeType
} = require("./manifest-paths");
const { normalizeStorageSlotKey, getStorageSlotSpec, STORAGE_SLOT_ROUTING } = require("./storage-slot-routing");

function normalizeInputPath(raw) {
  return String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function manifestRelForDir(dirRel) {
  if (!dirRel) return MANIFEST_FILE;
  return `${dirRel}/${MANIFEST_FILE}`;
}

function listDirChainFromStart(startDirRel) {
  const chain = [];
  let dir = String(startDirRel || "").replace(/\\/g, "/");
  if (dir === ".") dir = "";
  while (true) {
    chain.push(dir);
    if (!dir) break;
    const parent = path.posix.dirname(dir);
    dir = parent === "." ? "" : parent;
  }
  return chain;
}

function resolveWalkStartDir(normalized, entryKind) {
  if (!normalized) return "";
  const base = path.posix.basename(normalized);
  if (base.toLowerCase() === MANIFEST_FILE.toLowerCase()) {
    const dir = path.posix.dirname(normalized);
    return dir === "." ? "" : dir;
  }
  if (entryKind === "directory") return normalized;
  if (/\.[^./\\]+$/i.test(base)) {
    const dir = path.posix.dirname(normalized);
    return dir === "." ? "" : dir;
  }
  return normalized;
}

function resolveSlotKeyFromStorageLayer(layer) {
  const normalizedLayer = String(layer || "").trim();
  const spec = STORAGE_SLOT_ROUTING.find(
    (entry) =>
      entry.storageFolder === normalizedLayer ||
      (entry.aliases || []).some((alias) => alias === normalizedLayer)
  );
  return spec ? normalizeStorageSlotKey(spec.slotKey) : normalizeStorageSlotKey(normalizedLayer);
}

/** MCP-facing slot key (main, not internal memory). */
function resolvePublicSlotKey(canonicalKey) {
  const key = normalizeStorageSlotKey(canonicalKey);
  if (key === "memory") return "main";
  const spec = getStorageSlotSpec(key);
  return spec?.slotKey || key;
}

function inferPageKindFromManifest(manifestRel, awnType) {
  const declared = normalizeDeclaredManifestTreeType(awnType);
  if (declared === "workspace") return "ws";
  if (declared === "topic") return "topic";
  if (declared === "area") return "area";
  if (isWorkspaceRootManifestRelPath(manifestRel)) return "ws";
  const typeId = String(awnType || "").trim();
  if (typeId.includes(".topic")) return "topic";
  if (typeId.includes(".ws")) return "ws";
  if (typeId.includes(".area")) return "area";
  const inferred = inferAwnTypeFromRelPath(manifestRel, {
    isAgentRoot: isWorkspaceRootManifestRelPath(manifestRel)
  });
  if (String(inferred).includes(".topic")) return "topic";
  if (String(inferred).includes(".ws")) return "ws";
  return "area";
}

function buildSlotInfo(normalized) {
  const parsed = parseStorageLayerRef(normalized);
  if (parsed) {
    const canonicalKey = resolveSlotKeyFromStorageLayer(parsed.layer);
    return {
      layer: parsed.layer,
      key: canonicalKey,
      mcpKey: resolvePublicSlotKey(canonicalKey),
      ref: parsed.relativePath,
      storagePath: parsed.workspacePath
    };
  }

  const bundle = resolveManifestRelFromStorageBundlePath(normalized);
  if (!bundle) return null;

  const mode = bundle.mode;
  const keyByMode = {
    internal: "main-single",
    tabular: "main-single-csv",
    todo: "todo-single",
    log: "log-single",
    configs: "configs",
    env: "env",
    "node-preview": "preview"
  };

  return {
    layer: mode,
    key: keyByMode[mode] || mode,
    ref: path.posix.basename(bundle.bundlePath),
    bundle: true,
    storagePath: bundle.bundlePath
  };
}

const SLOT_CRUMB_LABELS = {
  main: "Память",
  memory: "Память",
  inbox: "Входящие",
  notes: "Заметки",
  note: "Заметки",
  references: "Источники",
  artefacts: "Артефакты",
  media: "Медиа",
  assets: "Активы",
  repository: "Репозитории",
  scripts: "Скрипты",
  script: "Скрипты",
  discussion: "Дискуссия",
  thread: "Дискуссия",
  dialogs: "Дискуссия",
  comments: "Комментарии",
  history: "История",
  temp: "Временные",
  volume: "Итоги",
  "main-single": "Память (main.md)",
  "main-single-csv": "Память (main.csv)",
  "todo-single": "TODO",
  "log-single": "Журнал",
  configs: "Конфигурации",
  env: ".env",
  preview: "Превью"
};

function resolveSlotCrumbLabel(slot) {
  if (!slot) return "";
  const key = slot.mcpKey || slot.key || slot.layer || "";
  return (
    SLOT_CRUMB_LABELS[key] ||
    SLOT_CRUMB_LABELS[slot.layer] ||
    SLOT_CRUMB_LABELS[slot.key] ||
    key ||
    "Слот"
  );
}

function joinBreadcrumbLabel(crumbs) {
  return crumbs.map((item) => item.label).filter(Boolean).join(" › ");
}

function buildPathUnderFolder(folderPath, suffix) {
  const base = String(folderPath || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const tail = String(suffix || "").replace(/^\/+/, "");
  if (!base || base === ".") return tail;
  if (!tail) return base;
  return `${base}/${tail}`;
}

function buildTailSegments(normalized, entryKind, deepestPageFolder, slot) {
  let tail = normalized;
  const pagePrefix = String(deepestPageFolder || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  if (pagePrefix && pagePrefix !== ".") {
    const prefix = `${pagePrefix}/`;
    if (tail.toLowerCase().startsWith(prefix.toLowerCase())) {
      tail = tail.slice(prefix.length);
    }
  }

  if (slot && !slot.bundle) {
    const storagePrefix = `awn-storage/${slot.layer}/`;
    if (tail.toLowerCase().startsWith(storagePrefix.toLowerCase())) {
      tail = tail.slice(storagePrefix.length);
    }
    const parts = tail.split("/").filter(Boolean);
    if (!parts.length) return { folders: [], fileName: null, isManifest: false };
    if (entryKind === "directory") return { folders: parts, fileName: null, isManifest: false };
    const fileName = parts.pop();
    return { folders: parts, fileName, isManifest: false };
  }

  if (slot?.bundle) {
    return {
      folders: [],
      fileName: path.posix.basename(normalized),
      isManifest: false
    };
  }

  const parts = tail.split("/").filter(Boolean);
  if (!parts.length) return { folders: [], fileName: null, isManifest: false };

  if (parts[parts.length - 1].toLowerCase() === MANIFEST_FILE.toLowerCase()) {
    return { folders: parts.slice(0, -1), fileName: null, isManifest: true };
  }

  if (entryKind === "directory") {
    return { folders: parts, fileName: null, isManifest: false };
  }

  const fileName = parts.pop();
  return { folders: parts, fileName, isManifest: false };
}

function buildBreadcrumbs({ normalized, entryKind, ancestors, slot }) {
  const crumbs = [];
  const pageChain = [...ancestors].reverse();

  for (const page of pageChain) {
    crumbs.push({
      kind: page.kind,
      label: page.title,
      path: page.folderPath === "." ? "." : page.folderPath,
      manifestPath: page.manifestPath,
      folderPath: page.folderPath
    });
  }

  const deepestPage = pageChain[pageChain.length - 1] || null;
  const deepestFolder = deepestPage?.folderPath === "." ? "" : deepestPage?.folderPath || "";

  if (slot) {
    const slotPath = slot.storagePath
      ? buildPathUnderFolder(deepestFolder, `awn-storage/${slot.layer}`)
      : buildPathUnderFolder(deepestFolder, `awn-storage/${slot.layer}`);
    crumbs.push({
      kind: "slot",
      label: resolveSlotCrumbLabel(slot),
      path: slotPath,
      slot: slot.mcpKey || slot.key,
      layer: slot.layer
    });
  }

  const { folders, fileName, isManifest } = buildTailSegments(
    normalized,
    entryKind,
    deepestFolder,
    slot
  );

  let tailBase = deepestFolder;
  if (slot && !slot.bundle) {
    tailBase = buildPathUnderFolder(deepestFolder, `awn-storage/${slot.layer}`);
  }

  for (const folderName of folders) {
    tailBase = buildPathUnderFolder(tailBase, folderName);
    crumbs.push({
      kind: "folder",
      label: folderName,
      path: tailBase
    });
  }

  if (fileName && !isManifest) {
    crumbs.push({
      kind: entryKind === "directory" ? "folder" : "file",
      label: fileName,
      path: normalized,
      ref: slot?.ref || (entryKind === "file" ? fileName : undefined)
    });
  } else if (entryKind === "directory" && !fileName && !isManifest) {
    const dirPath = normalized;
    const lastCrumb = crumbs[crumbs.length - 1];
    if (!lastCrumb || lastCrumb.path !== dirPath) {
      crumbs.push({
        kind: "folder",
        label: path.posix.basename(dirPath) || dirPath,
        path: dirPath
      });
    }
  }

  if (isManifest && deepestPage) {
    const target = crumbs.find((item) => item.manifestPath === deepestPage.manifestPath);
    if (target) target.current = true;
  } else if (crumbs.length) {
    crumbs[crumbs.length - 1].current = true;
  }

  return {
    items: crumbs,
    label: joinBreadcrumbLabel(crumbs)
  };
}

function pickTopicAreaWorkspace(ancestors) {
  const topic = ancestors.find((item) => item.kind === "topic") || null;
  let area = null;
  if (topic) {
    const topicIndex = ancestors.findIndex((item) => item.manifestPath === topic.manifestPath);
    area = ancestors.slice(topicIndex + 1).find((item) => item.kind === "area") || null;
  } else {
    area = ancestors.find((item) => item.kind === "area") || null;
  }
  const workspace = ancestors.find((item) => item.kind === "ws") || null;
  return { topic, area, workspace };
}

function buildMcpHints({ topic, owningManifestPath, slot }) {
  const slotKey = slot?.mcpKey || slot?.key;
  if (topic && slotKey && slot?.ref && !slot.bundle) {
    return { path: topic.manifestPath, slot: slotKey, ref: slot.ref };
  }
  if (topic) return { path: topic.manifestPath };
  if (owningManifestPath) return { path: owningManifestPath };
  return null;
}

/**
 * Resolve workspace-relative path → manifest ancestor chain, topic/area/workspace, slot/ref.
 * @param {string} inputPath
 * @param {object} deps
 */
async function buildWorkspacePathResolvePayload(inputPath, deps) {
  const normalized = normalizeInputPath(inputPath);
  if (!normalized) {
    return { error: "path is required", status: 400 };
  }

  const absolute = deps.normalizeWorkspacePath(normalized);
  let exists = false;
  let entryKind = "unknown";
  if (absolute) {
    try {
      const stat = await deps.fs.stat(absolute);
      exists = true;
      entryKind = stat.isDirectory() ? "directory" : "file";
    } catch {
      exists = false;
    }
  }

  const walkStartDir = resolveWalkStartDir(normalized, entryKind);
  const ancestors = [];

  for (const dirRel of listDirChainFromStart(walkStartDir)) {
    const manifestRel = manifestRelForDir(dirRel);
    const manifestAbsolute = deps.normalizeWorkspacePath(manifestRel);
    if (!manifestAbsolute || !(await deps.nodePathExists(manifestAbsolute))) continue;

    let frontmatter = "";
    try {
      ({ frontmatter } = await deps.readNodeFrontmatterContent(manifestRel));
    } catch {
      frontmatter = "";
    }

    const rawType = deps.getYamlScalar(frontmatter, "awn-type") || "";
    const catalog = deps.loadTypeCatalog(deps.getProjectRoot(), deps.getAgentRoot());
    const awnType = rawType
      ? deps.resolveCanonicalTypeId(String(rawType).trim(), catalog.byId)
      : inferAwnTypeFromRelPath(manifestRel, {
          isAgentRoot: isWorkspaceRootManifestRelPath(manifestRel)
        });
    const title =
      String(deps.getYamlScalar(frontmatter, "awn-name") || "").trim() ||
      (dirRel ? path.posix.basename(dirRel) : "workspace");

    ancestors.push({
      manifestPath: manifestRel,
      folderPath: dirRel || ".",
      kind: inferPageKindFromManifest(manifestRel, awnType),
      awnType: String(awnType || "").trim(),
      title,
      depth: ancestors.length
    });
  }

  const storageOwner = resolveOwningManifestRelFromNodePath(normalized);
  const owningManifestPath =
    storageOwner && /\/manifest\.md$/i.test(storageOwner)
      ? storageOwner
      : ancestors[0]?.manifestPath || null;

  const slot = buildSlotInfo(normalized);
  const { topic, area, workspace } = pickTopicAreaWorkspace(ancestors);
  const breadcrumbs = buildBreadcrumbs({ normalized, entryKind, ancestors, slot });
  const classification = deps.classifySearchResult
    ? await deps.classifySearchResult(normalized)
    : null;
  const mcp = buildMcpHints({ topic, owningManifestPath, slot });

  return {
    version: 1,
    model: "workspace-path-resolve",
    inputPath: normalized,
    exists,
    entryKind,
    owningManifestPath,
    ancestors,
    ancestorsTopDown: [...ancestors].reverse(),
    breadcrumbs: breadcrumbs.items,
    breadcrumbsLabel: breadcrumbs.label,
    topic: topic
      ? {
          manifestPath: topic.manifestPath,
          title: topic.title,
          folderPath: topic.folderPath
        }
      : null,
    area: area
      ? {
          manifestPath: area.manifestPath,
          title: area.title,
          folderPath: area.folderPath
        }
      : null,
    workspace: workspace
      ? {
          manifestPath: workspace.manifestPath,
          title: workspace.title
        }
      : null,
    slot,
    mcp,
    classification,
    hint:
      "breadcrumbs — хлебные крошки сверху вниз (workspace → area → topic → slot → файл). ancestors — те же страницы (manifest), снизу вверх. mcp — готовые path/slot/ref для read_content_*."
  };
}

module.exports = {
  buildWorkspacePathResolvePayload,
  buildBreadcrumbs,
  normalizeInputPath,
  listDirChainFromStart,
  manifestRelForDir
};
