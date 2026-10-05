const path = require("path");

function normalizeSearchExtensions(input) {
  if (input == null || input === "") return null;
  if (input instanceof Set) return input.size ? input : null;
  const rawList = Array.isArray(input) ? input : String(input).split(/[,\s\n]+/);
  const set = new Set();
  for (const entry of rawList) {
    let ext = String(entry || "").trim().toLowerCase();
    if (!ext) continue;
    if (!ext.startsWith(".")) ext = `.${ext}`;
    set.add(ext);
  }
  return set.size ? set : null;
}

function searchExtensionTokens(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  const lower = base.toLowerCase();
  const tokens = new Set();
  const ext = path.extname(base).toLowerCase();
  if (ext) tokens.add(ext);
  if (lower.endsWith(".sidecar.md")) tokens.add(".sidecar.md");
  return tokens;
}

function matchesSearchExtensions(relPath, extensionSet) {
  if (!extensionSet || extensionSet.size === 0) return true;
  const tokens = searchExtensionTokens(relPath);
  for (const wanted of extensionSet) {
    if (tokens.has(wanted)) return true;
  }
  return false;
}

function formatSearchExtensionsForResponse(extensionSet) {
  if (!extensionSet || extensionSet.size === 0) return null;
  return [...extensionSet].sort((a, b) => a.localeCompare(b, "en"));
}

module.exports = {
  normalizeSearchExtensions,
  matchesSearchExtensions,
  formatSearchExtensionsForResponse
};
