const path = require("path");

function normalizeSlashes(value) {
  return String(value || "").trim().replace(/\\/g, "/");
}

/**
 * Path for MCP/API responses: repo-relative, never a host absolute path.
 * Outside projectRoot → POSIX relative (e.g. ../Desktop/my-ws).
 */
function toRepoRelativePath(absOrRel, projectRoot = process.cwd()) {
  const raw = normalizeSlashes(absOrRel);
  if (!raw) return "";
  if (!path.isAbsolute(raw)) return raw.replace(/^\/+/, "");
  const root = path.resolve(projectRoot || process.cwd());
  const absolute = path.resolve(raw);
  return normalizeSlashes(path.relative(root, absolute));
}

module.exports = {
  normalizeSlashes,
  toRepoRelativePath
};
