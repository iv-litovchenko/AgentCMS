function applyDqlParams(dql, params = {}) {
  let out = String(dql || "");
  if (!out || !params || typeof params !== "object") return out.trim();

  if (params.limit != null && params.limit !== "") {
    const limitNum = Math.min(500, Math.max(1, Math.floor(Number(params.limit) || 50)));
    out = out.replace(/\bLIMIT\s+\$limit\b/gi, `LIMIT ${limitNum}`);
  }

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue == null || rawValue === "") continue;
    if (key === "limit") continue;
    const value = String(rawValue);
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\$${escaped}\\b`, "g"), value);
    out = out.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), value);
  }
  return out.trim();
}

module.exports = { applyDqlParams };
