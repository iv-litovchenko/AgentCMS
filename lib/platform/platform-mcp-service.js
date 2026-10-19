const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { projectRel } = require("../paths/agent-cms");
const { AGENT_CMS_CORE_REL } = require("./platform-sources");
const { getProductVersion } = require("../version/product-version");
const { getMcpVersion } = require("../version/mcp-version");
const { getPlatformSettings } = require("../config/settings-store");
const { loadRegistryEntriesWithMigration } = require("../workspace/ws-list-bridge");
const {
  getAgentCmsPorts,
  hydrateProcessEnvFromRoot,
  isHttpToHttpsRedirectEnabled,
  buildLocalhostUrls
} = require("../config/agent-cms-ports");
const { getLanIPv4 } = require("../runtime/lan-ip");
const { isTlsConfigured, usesTrustedDevCert } = require("../http/https-redirect");
const { toRepoRelativePath } = require("../paths/agent-facing-path");
const {
  getGlobalPlatformMdDirAbs,
  resolveGlobalPlatformMdAbs,
  globalPlatformMdDisplayPath,
  normalizeGlobalPlatformMdFileName,
  isGlobalPlatformMdFileName
} = require("../paths/global-platform-md");

const MAX_READ_BYTES = 2_000_000;
const MAX_WRITE_BYTES = 600_000;
const REPO_ROOT_DOC_EXT = ".md";

const PROTOTYPE_CONFIG_ITEMS = [
  { id: "data-index", title: "Platform catalog index", path: "data/index.json", kind: "catalog" },
  { id: "editor-agent", title: "Editor agent persona", path: "data/agents/editor-agent.yaml", kind: "agent-persona" },
  { id: "support-agent", title: "Support agent persona", path: "data/agents/support-agent.yaml", kind: "agent-persona" },
  { id: "publish-flow", title: "Publish workflow", path: "data/workflows/publish-flow.yaml", kind: "workflow" },
  {
    id: "global-settings-prototype",
    title: "Global settings prototype",
    path: "data/settings/global.yaml",
    kind: "settings-prototype"
  },
  {
    id: "knowledge-product-guide",
    title: "Product guide",
    path: "data/knowledge/product-guide.md",
    kind: "knowledge"
  }
];

function fileKindFromName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (!ext) return "file";
  const map = {
    ".md": "markdown",
    ".json": "json",
    ".js": "javascript",
    ".mjs": "javascript",
    ".ts": "typescript",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".command": "shell",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".webp": "image"
  };
  return map[ext] || ext.slice(1) || "file";
}

function normalizeRepoRootFileName(raw) {
  const trimmed = String(raw || "").trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("/") || trimmed.includes("..")) return null;
  const base = path.basename(trimmed);
  if (!base || base === "." || base === "..") return null;
  return base;
}

function isRepoRootMarkdownName(fileName) {
  return path.extname(String(fileName || "")).toLowerCase() === REPO_ROOT_DOC_EXT;
}

function resolveRepoRootFileAbsolute(projectRoot, fileName, { markdownOnly = true } = {}) {
  const base = normalizeRepoRootFileName(fileName);
  if (!base) return { error: "Invalid path: use a single file name in the repository root" };
  if (markdownOnly && !isRepoRootMarkdownName(base)) {
    return { error: `Only ${REPO_ROOT_DOC_EXT} files in the repository root are allowed` };
  }
  const root = path.resolve(projectRoot || process.cwd());
  const absolute = path.join(root, base);
  const rel = path.relative(root, absolute);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return { error: "Path escapes repository root" };
  }
  return { base, absolute, path: base };
}

async function listPlatformDocs(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  const files = [];
  const seen = new Set();

  async function pushMdFromDir(dirAbs, pathForList) {
    let entries = [];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isRepoRootMarkdownName(entry.name)) continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      const absolute = path.join(dirAbs, entry.name);
      let sizeBytes = 0;
      try {
        const stat = await fs.stat(absolute);
        sizeBytes = stat.size;
      } catch {
        // keep size 0
      }
      files.push({
        name: entry.name,
        path: pathForList(entry.name),
        sizeBytes,
        kind: fileKindFromName(entry.name)
      });
    }
  }

  await pushMdFromDir(getGlobalPlatformMdDirAbs(root), (name) => globalPlatformMdDisplayPath(name));
  await pushMdFromDir(root, (name) => name);

  files.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return {
    ok: true,
    repoRoot: toRepoRelativePath(root, root) || ".",
    files,
    count: files.length,
    hint: `Markdown: ${globalPlatformMdDisplayPath("*.md")} (platform docs) and repository root. Content: read_platform_doc({ path: basename }).`
  };
}

async function readPlatformDoc(projectRoot, fileName, options = {}) {
  const maxBytes = Math.min(
    Math.max(Number(options.maxBytes) || MAX_READ_BYTES, 1024),
    MAX_READ_BYTES
  );

  const globalBase = normalizeGlobalPlatformMdFileName(fileName);
  const globalAbs =
    globalBase && isGlobalPlatformMdFileName(globalBase)
      ? resolveGlobalPlatformMdAbs(projectRoot, globalBase)
      : null;
  const rootResolved = resolveRepoRootFileAbsolute(projectRoot, fileName);

  let absolute = null;
  let listPath = null;
  let baseName = null;

  if (globalAbs) {
    absolute = globalAbs;
    listPath = globalPlatformMdDisplayPath(globalBase);
    baseName = globalBase;
  } else {
    if (rootResolved.error) return { ok: false, error: rootResolved.error };
    absolute = rootResolved.absolute;
    listPath = rootResolved.path;
    baseName = rootResolved.base;
  }

  let stat;
  try {
    stat = await fs.stat(absolute);
  } catch {
    return { ok: false, error: "File not found", path: listPath };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "Not a file", path: listPath };
  }

  const buffer = await fs.readFile(absolute);
  const truncated = buffer.length > maxBytes;
  const content = (truncated ? buffer.subarray(0, maxBytes) : buffer).toString("utf8");
  return {
    ok: true,
    path: listPath,
    name: baseName,
    sizeBytes: stat.size,
    kind: fileKindFromName(baseName),
    content,
    truncated,
    encoding: "utf8"
  };
}

async function writePlatformDoc(projectRoot, fileName, content) {
  const globalBase = normalizeGlobalPlatformMdFileName(fileName);
  const globalAbs =
    globalBase && isGlobalPlatformMdFileName(globalBase)
      ? resolveGlobalPlatformMdAbs(projectRoot, globalBase)
      : null;
  const rootResolved = resolveRepoRootFileAbsolute(projectRoot, fileName);
  const resolved = globalAbs
    ? { absolute: globalAbs, path: globalPlatformMdDisplayPath(globalBase), base: globalBase }
    : rootResolved;
  if (resolved.error) return { ok: false, error: resolved.error };
  if (typeof content !== "string") {
    return { ok: false, error: "content must be a string" };
  }
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_WRITE_BYTES) {
    return {
      ok: false,
      error: `Content too large (${bytes} bytes; max ${MAX_WRITE_BYTES})`,
      path: resolved.path
    };
  }

  await fs.writeFile(resolved.absolute, content, "utf8");
  const stat = await fs.stat(resolved.absolute);
  return {
    ok: true,
    path: resolved.path,
    sizeBytes: stat.size,
    writtenBytes: bytes,
    mode: "replace"
  };
}

function buildPlatformNetworkInfo(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  hydrateProcessEnvFromRoot(root);
  const ports = getAgentCmsPorts();
  const localhostUrls = buildLocalhostUrls(ports, "localhost");
  const lanIp = getLanIPv4(root) || null;
  const lanUrls = lanIp ? buildLocalhostUrls(ports, lanIp) : null;
  const tlsConfigured = isTlsConfigured();
  let tlsMode = "http-only";
  if (tlsConfigured) {
    tlsMode = usesTrustedDevCert() ? "https-mkcert" : "https";
  }
  return {
    ports,
    urls: {
      localhost: localhostUrls,
      ...(lanUrls ? { lan: lanUrls, lanIp } : {})
    },
    tls: {
      mode: tlsMode,
      httpToHttpsRedirect: isHttpToHttpsRedirectEnabled()
    },
    mcp: {
      hint:
        "Cursor MCP: set AGENT_CMS_BASE_URL to editor HTTPS URL (or HTTP if TLS off).",
      suggestedBaseUrl: tlsConfigured ? localhostUrls.editorHttps : localhostUrls.editorHttp
    }
  };
}

async function buildPlatformInfo({ projectRoot, agentId, agentRootRel }) {
  const root = path.resolve(projectRoot || process.cwd());
  const settings = await getPlatformSettings(root);
  return {
    ok: true,
    serverTime: new Date().toISOString(),
    repoRoot: toRepoRelativePath(root, root) || ".",
    cmsVersion: getProductVersion(),
    mcpVersion: getMcpVersion(),
    workspaceId: agentId || null,
    agentId: agentId || null,
    agentRootRel: agentRootRel || null,
    network: buildPlatformNetworkInfo(root),
    platform: {
      "mcp-mode": settings["mcp-mode"] ?? null,
      "maintenance-mode": settings["maintenance-mode"] ?? null,
      "default-locale": settings["default-locale"] ?? null,
      "default-workspace-id": settings["default-workspace-id"] ?? null
    },
    hints: {
      settings: "Values: settings_list / setting_read (scope: platform).",
      ping: "mcp_connection_test returns cmsVersion and mcpVersion only."
    }
  };
}

async function buildPlatformConfigList(projectRoot, { agentsPublicList = [] } = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  loadRegistryEntriesWithMigration(root);

  const workspaceItems = (Array.isArray(agentsPublicList) ? agentsPublicList : []).map((agent) => {
    const relPath = String(agent.path || "").trim();
    const manifestPath = relPath ? `${relPath.replace(/\/+$/, "")}/manifest.md` : "";
    return {
      id: agent.id,
      title: agent.name || agent.id,
      path: manifestPath || relPath,
      kind: "workspace",
      exists: manifestPath ? fsSync.existsSync(path.join(root, manifestPath)) : Boolean(relPath)
    };
  });

  const platformValuesPath = projectRel.settings.platform;
  const registryPath = path.join(AGENT_CMS_CORE_REL, "awn-system/registry.yml");

  const sections = [
    {
      id: "workspaces",
      title: "Реестр хранилищ",
      hint: "Register: workspace_register / workspaces_list",
      items: workspaceItems
    },
    {
      id: "platform-settings",
      title: "Настройки платформы",
      hint: "Значения — settings_list(scope: platform)",
      items: [
        {
          id: "platform-values",
          path: platformValuesPath,
          schemaPath: path.join(AGENT_CMS_CORE_REL, "awn-system/types/settings/platform.yml"),
          kind: "settings",
          exists: fsSync.existsSync(path.join(root, platformValuesPath))
        }
      ]
    },
    {
      id: "system-model",
      title: "CMS-модель (типы, слоты)",
      items: [
        {
          id: "awn-system-registry",
          path: registryPath.replace(/\\/g, "/"),
          kind: "registry",
          exists: fsSync.existsSync(path.join(root, registryPath))
        }
      ]
    },
    {
      id: "agents-workflows",
      title: "Поведение агентов (прототип data/)",
      hint: "Папка data/ пока не подключена к runtime",
      items: PROTOTYPE_CONFIG_ITEMS.map((item) => ({
        ...item,
        exists: fsSync.existsSync(path.join(root, item.path))
      }))
    }
  ];

  const itemCount = sections.reduce((sum, section) => sum + (section.items?.length || 0), 0);
  const missingCount = sections.reduce(
    (sum, section) => sum + (section.items || []).filter((item) => !item.exists).length,
    0
  );

  return {
    ok: true,
    source: "scan",
    repoRoot: toRepoRelativePath(root, root) || ".",
    sections,
    summary: {
      sectionCount: sections.length,
      itemCount,
      missingCount
    }
  };
}

function buildPlatformHealthFromMonitor(monitorPayload, diskPayload = null) {
  const summary = monitorPayload?.summary || {};
  const health = summary.health || "unknown";
  return {
    ok: health === "ok" || health === "stale" || health === "partial",
    health,
    message: summary.message || null,
    agentRoot: monitorPayload?.agentRoot || null,
    indexes: {
      staleTotal: summary.staleTotal ?? null,
      newTotal: summary.newTotal ?? null,
      missingTotal: summary.missingTotal ?? null,
      ocrPending: summary.ocrPending ?? null
    },
    layers: {
      semantic: monitorPayload?.semantic?.health ?? null,
      fulltext: monitorPayload?.fulltext?.health ?? null,
      storage: monitorPayload?.storage?.health ?? null,
      link: monitorPayload?.link?.health ?? null,
      ocr: monitorPayload?.ocr?.health ?? null
    },
    disk: diskPayload,
    hint: "Index health for the active workspace. Call with agentId set to the target vault."
  };
}

async function readRepoRootDiskSummary(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  try {
    const statfs = fsSync.promises?.statfs;
    if (typeof statfs === "function") {
      const stats = await statfs(root);
      const freeBytes = Number(stats.bfree) * Number(stats.bsize);
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      return {
        freeBytes,
        totalBytes,
        path: toRepoRelativePath(root, root) || "."
      };
    }
  } catch {
    // optional
  }
  return null;
}

module.exports = {
  listPlatformDocs,
  readPlatformDoc,
  writePlatformDoc,
  buildPlatformInfo,
  buildPlatformConfigList,
  buildPlatformHealthFromMonitor,
  readRepoRootDiskSummary,
  normalizeRepoRootFileName
};
