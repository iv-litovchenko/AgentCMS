function applyDqlParams(dql, params = {}) {
  let out = String(dql || "");
  if (!out || !params || typeof params !== "object") return out.trim();

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue == null || rawValue === "") continue;
    const value = String(rawValue);
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\$${escaped}\\b`, "g"), value);
    out = out.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), value);
  }
  return out.trim();
}

module.exports = { applyDqlParams };
