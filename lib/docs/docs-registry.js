const path = require("path");
const fs = require("fs/promises");

const DOC_VERSIONS = ["0.0.0", "0.0.1", "0.0.2"];
const DEFAULT_DOC_VERSION = "0.0.2";

const apiByVersion = {
  "0.0.0": () => require("../../docs/api-0.0.0"),
  "0.0.1": () => require("../../docs/api-0.0.1"),
  "0.0.2": () => require("../../docs/api-0.0.2")
};

const mcpByVersion = {
  "0.0.0": () => require("../../docs/mcp-0.0.0"),
  "0.0.1": () => require("../../docs/mcp-0.0.1"),
  "0.0.2": () => require("../../docs/mcp-0.0.2")
};

const DOCS_AGENT_FOLDER = "agent-cms-core";
const DOCS_TOPIC_DIR = "dokumentatsii";
const DOCS_MAIN_SLOT = "awn-storage/main";
const REPO_ROOT = path.join(__dirname, "../..");
const USER_DOCS_DIR = path.join(REPO_ROOT, "workspaces", DOCS_AGENT_FOLDER, DOCS_TOPIC_DIR, DOCS_MAIN_SLOT);
const PLATFORM_AGENT_ROOT = path.join(REPO_ROOT, "workspaces", DOCS_AGENT_FOLDER);
const PLATFORM_GLOBAL_GUIDE_PREFIX = "platform-global:";
const PLATFORM_GLOBAL_USER_GUIDE_FILES = [
  "GLOBAL_MCP_DOC.md",
  "GLOBAL_RESPONSE_STYLE.md",
  "GLOBAL_MARKDOWN_SHOWCASE.md"
];
const PLATFORM_GLOBAL_USER_GUIDE_LABELS = {
  "GLOBAL_MCP_DOC.md": "GLOBAL MCP Doc",
  "GLOBAL_RESPONSE_STYLE.md": "GLOBAL Response Style",
  "GLOBAL_MARKDOWN_SHOWCASE.md": "Markdown Showcase"
};
const PUBLIC_IMAGES_DIR = path.join(
  REPO_ROOT,
  "workspaces",
  DOCS_AGENT_FOLDER,
  DOCS_TOPIC_DIR,
  "awn-storage/assets"
);
const DOCUMENTATION_AGENT_ID = DOCS_AGENT_FOLDER;

function normalizeDocVersion(version) {
  const value = String(version || "").trim();
  return DOC_VERSIONS.includes(value) ? value : DEFAULT_DOC_VERSION;
}

function getApiDocs(version) {
  const v = normalizeDocVersion(version);
  return apiByVersion[v]();
}

function getMcpDocs(version) {
  const v = normalizeDocVersion(version);
  return mcpByVersion[v]();
}

function splitMarkdownFrontmatter(markdown) {
  const raw = String(markdown ?? "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: raw };
  return { frontmatter: match[1], body: match[2] };
}

function getYamlScalarFromFrontmatter(frontmatter, key) {
  const fm = String(frontmatter || "");
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = fm.match(
    new RegExp(`^${escaped}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]*))`, "m")
  );
  if (!match) return "";
  return String(match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function normalizeUserGuideRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return "";
  if (normalized.startsWith(PLATFORM_GLOBAL_GUIDE_PREFIX)) {
    const fileName = normalized.slice(PLATFORM_GLOBAL_GUIDE_PREFIX.length).trim();
    return PLATFORM_GLOBAL_USER_GUIDE_FILES.includes(fileName) ? normalized : "";
  }
  if (!/\.md$/i.test(normalized)) return "";
  if (/(?:^|\/)comments\//i.test(normalized)) return "";
  if (/(?:^|\/)history\//i.test(normalized)) return "";
  return normalized;
}

function parsePlatformGlobalGuideFile(relPath) {
  const normalized = normalizeUserGuideRelPath(relPath);
  if (!normalized || !normalized.startsWith(PLATFORM_GLOBAL_GUIDE_PREFIX)) return "";
  return normalized.slice(PLATFORM_GLOBAL_GUIDE_PREFIX.length).trim();
}

async function loadPlatformGlobalUserGuides() {
  const guides = [];
  for (const fileName of PLATFORM_GLOBAL_USER_GUIDE_FILES) {
    const abs = path.join(PLATFORM_AGENT_ROOT, fileName);
    let markdown = "";
    try {
      markdown = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const { frontmatter, body } = splitMarkdownFrontmatter(markdown);
    const fromFm = getYamlScalarFromFrontmatter(frontmatter, "awn-name");
    const h1 = String(body || "").match(/^#\s+(.+)$/m);
    const fromTitle = h1 ? String(h1[1]).trim() : "";
    const awnName =
      fromFm ||
      PLATFORM_GLOBAL_USER_GUIDE_LABELS[fileName] ||
      humanizeGuideFileName(fileName);
    guides.push({
      path: `${PLATFORM_GLOBAL_GUIDE_PREFIX}${fileName}`,
      awnName,
      label: PLATFORM_GLOBAL_USER_GUIDE_LABELS[fileName] || awnName
    });
  }
  return guides;
}

function humanizeGuideFileName(fileName) {
  return String(fileName || "")
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

async function walkUserGuideMdRelPaths(dirAbs, relPrefix = "") {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const paths = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (/^(comments|history|node_modules)$/i.test(entry.name)) continue;
      paths.push(...(await walkUserGuideMdRelPaths(path.join(dirAbs, entry.name), rel)));
      continue;
    }
    if (entry.isFile() && /\.md$/i.test(entry.name)) {
      paths.push(rel);
    }
  }
  return paths;
}

const DEFAULT_USER_GUIDE_PATH = "user-docs-0.0.2.md";

async function getUserDocsIndex() {
  const platformGuides = await loadPlatformGlobalUserGuides();
  const relPaths = await walkUserGuideMdRelPaths(USER_DOCS_DIR);
  const guides = [...platformGuides];
  for (const relPath of relPaths) {
    const abs = path.join(USER_DOCS_DIR, relPath);
    let markdown = "";
    try {
      markdown = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const { frontmatter } = splitMarkdownFrontmatter(markdown);
    const awnName =
      getYamlScalarFromFrontmatter(frontmatter, "awn-name") ||
      humanizeGuideFileName(path.basename(relPath));
    guides.push({ path: relPath, awnName });
  }
  guides.sort((a, b) => a.awnName.localeCompare(b.awnName, "ru"));
  const nameCounts = new Map();
  for (const guide of guides) {
    nameCounts.set(guide.awnName, (nameCounts.get(guide.awnName) || 0) + 1);
  }
  for (const guide of guides) {
    if (guide.path.startsWith(PLATFORM_GLOBAL_GUIDE_PREFIX)) continue;
    guide.label =
      (nameCounts.get(guide.awnName) || 0) > 1
        ? `${guide.awnName} · ${guide.path}`
        : guide.awnName;
  }
  const defaultPath = guides.some((g) => g.path === DEFAULT_USER_GUIDE_PATH)
    ? DEFAULT_USER_GUIDE_PATH
    : guides[0]?.path || "";
  return {
    model: "user-docs-index",
    dir: USER_DOCS_DIR.replace(/\\/g, "/"),
    defaultPath,
    guideCount: guides.length,
    guides
  };
}

async function getUserGuideMarkdown(relPath) {
  const rel = normalizeUserGuideRelPath(relPath);
  if (!rel) throw new Error("Invalid guide path");
  const platformFile = parsePlatformGlobalGuideFile(rel);
  if (platformFile) {
    const abs = path.join(PLATFORM_AGENT_ROOT, platformFile);
    const root = path.resolve(PLATFORM_AGENT_ROOT);
    const resolved = path.resolve(abs);
    if (!resolved.startsWith(root)) throw new Error("Invalid guide path");
    return fs.readFile(resolved, "utf8");
  }
  const abs = path.join(USER_DOCS_DIR, rel);
  const root = path.resolve(USER_DOCS_DIR);
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(root)) throw new Error("Invalid guide path");
  return fs.readFile(resolved, "utf8");
}

async function getUserDocsMarkdown(version) {
  const pathParam = normalizeUserGuideRelPath(version);
  if (pathParam) return getUserGuideMarkdown(pathParam);
  const v = normalizeDocVersion(version);
  const filePath = path.join(USER_DOCS_DIR, `user-docs-${v}.md`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    if (v !== DEFAULT_DOC_VERSION) {
      return getUserDocsMarkdown(DEFAULT_DOC_VERSION);
    }
    const legacy = path.join(USER_DOCS_DIR, "user-docs.md");
    return fs.readFile(legacy, "utf8");
  }
}

function getVersionOptionLabel(id) {
  if (id === DEFAULT_DOC_VERSION) return `Актуальная (${id})`;
  return `Предыдущая (${id})`;
}

function countApiEndpoints(doc) {
  return (doc?.groups || []).reduce((total, group) => total + (group.endpoints || []).length, 0);
}

function countMcpTools(doc) {
  return (doc?.groups || []).reduce((total, group) => total + (group.tools || []).length, 0);
}

function getDocsMeta() {
  const versions = [...DOC_VERSIONS].reverse().map((id) => ({
    id,
    label: getVersionOptionLabel(id),
    isCurrent: id === DEFAULT_DOC_VERSION,
    apiEndpointCount: countApiEndpoints(getApiDocs(id)),
    mcpToolCount: countMcpTools(getMcpDocs(id))
  }));
  return {
    defaultVersion: DEFAULT_DOC_VERSION,
    versions
  };
}

function getPublicImagesDir() {
  return PUBLIC_IMAGES_DIR;
}

function resolveDocumentationTopicPath(relPath) {
  const rel = String(relPath || "").replace(/^\/+/, "");
  if (!rel) return `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}`;
  if (rel.startsWith(`${DOCS_TOPIC_DIR}/`)) return rel;
  return `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}/${rel}`;
}

function isDocumentationTopicMdRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const mainPrefix = `${DOCS_TOPIC_DIR}/${DOCS_MAIN_SLOT}/`;
  if (!normalized.startsWith(mainPrefix)) return false;
  if (!normalized.toLowerCase().endsWith(".md")) return false;
  if (/(?:^|\/)comments\//i.test(normalized)) return false;
  return true;
}

module.exports = {
  DOC_VERSIONS,
  DEFAULT_DOC_VERSION,
  DOCUMENTATION_AGENT_ID,
  DOCS_AGENT_FOLDER,
  DOCS_TOPIC_DIR,
  USER_DOCS_DIR,
  PUBLIC_IMAGES_DIR,
  normalizeDocVersion,
  getApiDocs,
  getMcpDocs,
  getUserDocsMarkdown,
  getUserGuideMarkdown,
  getUserDocsIndex,
  DEFAULT_USER_GUIDE_PATH,
  getDocsMeta,
  getVersionOptionLabel,
  getPublicImagesDir,
  resolveDocumentationTopicPath,
  isDocumentationTopicMdRelPath
};
