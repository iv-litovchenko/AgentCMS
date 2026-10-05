const { parseTypeYaml } = require("../../awn/awn-yaml-utils");
const { projectTaxonomyIndexFields, resolveTaxonomyFromFrontmatter } = require("../../awn/awn-taxonomy-service");

function extractFrontmatterBlock(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : "";
}

function flattenFrontmatterValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function extractFrontmatterParsed(content, options = {}) {
  const block = extractFrontmatterBlock(content);
  if (!block.trim()) return {};
  const parsed = parseTypeYaml(block);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const agentRoot = options.agentRoot || "";
  const projectRoot = options.projectRoot || process.cwd();
  const flat = {};
  for (const [key, value] of Object.entries(parsed)) {
    flat[key] = flattenFrontmatterValue(value);
  }

  const taxonomy = resolveTaxonomyFromFrontmatter(parsed, agentRoot, projectRoot);
  if (Object.keys(taxonomy).length) {
    flat["awn-taxonomy"] = flattenFrontmatterValue(taxonomy);
    Object.assign(flat, projectTaxonomyIndexFields(taxonomy));
  }

  return flat;
}

/** Extract YAML frontmatter block and parse flat key → string values. */
function extractFrontmatter(content, options = {}) {
  return extractFrontmatterParsed(content, options);
}

module.exports = { extractFrontmatter, extractFrontmatterParsed, extractFrontmatterBlock };
