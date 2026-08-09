const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { getAwnDataPayload } = require("./awn-data-loader");
const { normalizeSystemFileRequestName } = require("./manifest-paths");

const TEMPLATES_STORE_REL = "templates";

function getPlatformAgentRoot(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function normalizeTargetFile(name) {
  return normalizeSystemFileRequestName(String(name || "").trim());
}

function readFm(fm, ...keys) {
  for (const key of keys) {
    const value = fm?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function recordToTemplateDef(record) {
  if (!record) return null;
  const fm = record.frontmatter || {};
  const status = readFm(fm, "awn-status", "status").toLowerCase();
  if (status === "done") return null;

  const targetFile = normalizeTargetFile(readFm(fm, "awn-target-file", "target-file", "targetFile"));
  if (!targetFile) return null;

  const body = String(record.body || "").trim();
  if (!body) return null;

  return {
    id: String(record.id || "").trim(),
    targetFile,
    title: readFm(fm, "awn-title", "title") || record.title || targetFile,
    hintTitle: readFm(fm, "awn-hint-title", "hint-title", "hintTitle", "awn-title", "title") || record.title || "",
    hintText: readFm(fm, "awn-hint-text", "hint-text", "hintText"),
    body,
    relPath: String(record.relPath || "").replace(/\\/g, "/")
  };
}

function loadSystemFileTemplatesFromAwnData(projectRoot) {
  const agentRoot = getPlatformAgentRoot(projectRoot);
  if (!agentRoot) return {};

  const payload = getAwnDataPayload(agentRoot, projectRoot, TEMPLATES_STORE_REL);
  const records = payload.store?.records || [];
  const byTarget = {};

  for (const record of records) {
    const template = recordToTemplateDef(record);
    if (!template) continue;
    byTarget[template.targetFile] = template;
  }

  return byTarget;
}

module.exports = {
  TEMPLATES_STORE_REL,
  loadSystemFileTemplatesFromAwnData
};
