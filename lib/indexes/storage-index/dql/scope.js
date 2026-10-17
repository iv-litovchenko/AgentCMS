const { pathMatchesFromPrefix } = require("./path-prefix");

function normalizeScopePrefix(prefix) {
  return String(prefix || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function enforceDqlResultScope(results, scopePrefix) {
  const prefix = normalizeScopePrefix(scopePrefix);
  if (!prefix || !Array.isArray(results)) return results;
  return results.filter((row) => pathMatchesFromPrefix(row?.path, prefix));
}

module.exports = { enforceDqlResultScope, normalizeScopePrefix };
