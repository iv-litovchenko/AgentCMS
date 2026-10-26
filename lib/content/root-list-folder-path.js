/**
 * Folder path for contents_list / workspace fs list when placement.kind=root.
 * Directory paths (e.g. awn-repositories/my-repo) are used as-is.
 * File paths (last segment has an extension) → parent directory.
 */
function resolveRootListFolderPath(rawPath) {
  let trimmed = String(rawPath || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!trimmed || trimmed === ".") return ".";
  if (trimmed.endsWith("/")) {
    trimmed = trimmed.replace(/\/+$/, "");
    return trimmed || ".";
  }
  const last = trimmed.split("/").pop() || "";
  if (/\.[^./\\]+$/.test(last)) {
    const idx = trimmed.lastIndexOf("/");
    return idx === -1 ? "." : trimmed.slice(0, idx);
  }
  return trimmed;
}

module.exports = {
  resolveRootListFolderPath
};
