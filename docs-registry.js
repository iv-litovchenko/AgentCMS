const path = require("path");
const fs = require("fs/promises");

const DOC_VERSIONS = ["0.0.0", "0.0.1"];
const DEFAULT_DOC_VERSION = "0.0.1";

const apiByVersion = {
  "0.0.0": () => require("./docs/api-0.0.0"),
  "0.0.1": () => require("./docs/api-0.0.1")
};

const mcpByVersion = {
  "0.0.0": () => require("./docs/mcp-0.0.0"),
  "0.0.1": () => require("./docs/mcp-0.0.1")
};

const USER_DOCS_DIR = path.join(__dirname, "workspaces", "Documentation");
const DOCUMENTATION_AGENT_ID = "documentation";

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

async function getUserDocsMarkdown(version) {
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

function getDocsMeta() {
  const versions = DOC_VERSIONS.map((id) => ({
    id,
    label: getVersionOptionLabel(id),
    isCurrent: id === DEFAULT_DOC_VERSION
  }));
  versions.sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0));
  return {
    defaultVersion: DEFAULT_DOC_VERSION,
    versions
  };
}

module.exports = {
  DOC_VERSIONS,
  DEFAULT_DOC_VERSION,
  DOCUMENTATION_AGENT_ID,
  normalizeDocVersion,
  getApiDocs,
  getMcpDocs,
  getUserDocsMarkdown,
  getDocsMeta,
  getVersionOptionLabel
};
