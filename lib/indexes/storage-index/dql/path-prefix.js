function pathMatchesFromPrefix(recordPath, prefix) {
  const p = String(recordPath || "").replace(/\\/g, "/");
  const from = String(prefix || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!from) return true;
  if (p.startsWith(from)) return true;
  if (p.startsWith(`csv:${from}`)) return true;
  if (from.startsWith("csv:") && p.startsWith(from)) return true;
  return false;
}

function compileFromPrefixSql(prefix) {
  const from = String(prefix || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!from) return { sql: "1=1", params: [] };
  if (from.startsWith("csv:")) {
    return {
      sql: "(r.path LIKE ? ESCAPE '\\')",
      params: [`${from}%`]
    };
  }
  return {
    sql: "(r.path LIKE ? ESCAPE '\\' OR r.path LIKE ? ESCAPE '\\')",
    params: [`${from}%`, `csv:${from}%`]
  };
}

module.exports = { pathMatchesFromPrefix, compileFromPrefixSql };
