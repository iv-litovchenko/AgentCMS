/** Keys where explicit `false` carries API meaning and must be preserved. */
const KEEP_FALSE_KEYS = new Set([
  "active",
  "default",
  "editing",
  "enabled",
  "exists",
  "filled",
  "flexible",
  "folderExists",
  "hasManifest",
  "hasPreview",
  "manifestFound",
  "ok",
  "orchestrator",
  "overwrite",
  "parallel",
  "registryEditable",
  "slotsDisabled",
  "slotsFlexible",
  "stale",
  "success",
  "truncated",
  "virtual"
]);

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
}

export function compactMcpResponse(value) {
  if (Array.isArray(value)) {
    return value.map(compactMcpResponse).filter((item) => !isEmptyValue(item));
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      if (raw === false && !KEEP_FALSE_KEYS.has(key)) continue;
      if (isEmptyValue(raw)) continue;
      const compacted = compactMcpResponse(raw);
      if (isEmptyValue(compacted)) continue;
      out[key] = compacted;
    }
    return out;
  }

  return value;
}
