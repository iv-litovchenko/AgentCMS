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

function recordToTemplateDef(record) {
  if (!record) return null;
  const fm = record.frontmatter || {};
  const status = String(fm.status || "open").trim().toLowerCase();
  if (status === "done") return null;

  const targetFile = normalizeTargetFile(fm["target-file"] || fm.targetFile || "");
  if (!targetFile) return null;

  const body = String(record.body || "").trim();
  if (!body) return null;

  return {
    id: String(record.id || "").trim(),
    targetFile,
    title: String(fm.title || record.title || targetFile).trim(),
    hintTitle: String(fm["hint-title"] || fm.hintTitle || fm.title || record.title || "").trim(),
    hintText: String(fm["hint-text"] || fm.hintText || "").trim(),
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
