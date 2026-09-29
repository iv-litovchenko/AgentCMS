function normalizeWorkspaceIndexRelPath(value) {
  return String(value || "").replace(/\\/g, "/").trim();
}

/** True when two workspace-relative paths denote the same file (case-insensitive). */
function isSameWorkspaceIndexPath(leftRel, rightRel) {
  const left = normalizeWorkspaceIndexRelPath(leftRel).toLowerCase();
  const right = normalizeWorkspaceIndexRelPath(rightRel).toLowerCase();
  return Boolean(left && right && left === right);
}

module.exports = {
  normalizeWorkspaceIndexRelPath,
  isSameWorkspaceIndexPath
};
