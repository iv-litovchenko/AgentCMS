function normalizeFromPrefix(prefix) {
  return String(prefix || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function pathMatchesSinglePrefix(recordPath, from) {
  const p = String(recordPath || "").replace(/\\/g, "/");
  if (!from) return true;
  if (p.startsWith(from)) return true;
  if (p.startsWith(`csv:${from}`)) return true;
  if (from.startsWith("csv:") && p.startsWith(from)) return true;
  return false;
}

function pathMatchesFromPrefix(recordPath, prefix) {
  const raw = normalizeFromPrefix(prefix);
  if (!raw) return true;
  if (raw.includes("|")) {
    return raw
      .split("|")
      .map((part) => normalizeFromPrefix(part))
      .filter(Boolean)
      .some((part) => pathMatchesSinglePrefix(recordPath, part));
  }
  return pathMatchesSinglePrefix(recordPath, raw);
}

function compileSingleFromPrefixSql(from) {
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

function compileFromPrefixSql(prefix) {
  const raw = normalizeFromPrefix(prefix);
  if (!raw) return { sql: "1=1", params: [] };
  if (!raw.includes("|")) return compileSingleFromPrefixSql(raw);
  const parts = raw.split("|").map((part) => normalizeFromPrefix(part)).filter(Boolean);
  const compiled = parts.map((part) => compileSingleFromPrefixSql(part));
  return {
    sql: compiled
      .map((item) => (item.sql === "1=1" ? item.sql : `(${item.sql})`))
      .join(" OR "),
    params: compiled.flatMap((item) => item.params)
  };
}

module.exports = { pathMatchesFromPrefix, compileFromPrefixSql };
