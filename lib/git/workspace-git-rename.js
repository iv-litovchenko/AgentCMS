const path = require("path");
const fs = require("fs/promises");
const { runGitInRepo, resolveGitWorktreeRelativePath } = require("./workspace-git-module");

function isPathInsideDirectory(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function pathsEqualCaseInsensitive(a, b) {
  if (!a || !b) return false;
  return path.resolve(String(a)).toLowerCase() === path.resolve(String(b)).toLowerCase();
}

function isCaseOnlyPathRename(fromAbsolute, toAbsolute) {
  const fromResolved = path.resolve(fromAbsolute);
  const toResolved = path.resolve(toAbsolute);
  return fromResolved !== toResolved && pathsEqualCaseInsensitive(fromResolved, toResolved);
}

async function folderHasGitRepo(dirAbsolute) {
  try {
    await fs.access(path.join(dirAbsolute, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function gitMv(repoAbsolute, fromRel, toRel) {
  return runGitInRepo(repoAbsolute, ["mv", "-f", "--", fromRel, toRel]);
}

/**
 * Prefer `git mv` inside agent workspace repo so status shows rename, not delete+untracked.
 * Falls back to filesystem rename when there is no repo, paths are outside repo, or git mv fails.
 */
async function renamePathCaseAwareGitOrFs(repoAbsolute, fromAbsolute, toAbsolute, fsRename) {
  const fromResolved = path.resolve(fromAbsolute);
  const toResolved = path.resolve(toAbsolute);
  if (fromResolved === toResolved) return toAbsolute;

  const repo = repoAbsolute ? path.resolve(repoAbsolute) : "";
  if (!repo || !(await folderHasGitRepo(repo))) {
    return fsRename(fromAbsolute, toAbsolute);
  }
  if (!isPathInsideDirectory(repo, fromResolved) || !isPathInsideDirectory(repo, toResolved)) {
    return fsRename(fromAbsolute, toAbsolute);
  }

  const fromRel = path.relative(repo, fromResolved).replace(/\\/g, "/");
  const toRel = path.relative(repo, toResolved).replace(/\\/g, "/");
  if (!fromRel || fromRel.startsWith("..") || toRel.startsWith("..")) {
    return fsRename(fromAbsolute, toAbsolute);
  }

  const fromGitRel = await resolveGitWorktreeRelativePath(repo, fromRel);

  if (isCaseOnlyPathRename(fromAbsolute, toAbsolute)) {
    const tempName = `.case-rename-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempRel = path.posix.join(path.posix.dirname(fromRel.replace(/\\/g, "/")), tempName);
    let step = await gitMv(repo, fromGitRel, tempRel);
    if (step.code !== 0) return fsRename(fromAbsolute, toAbsolute);
    step = await gitMv(repo, tempRel, toRel);
    if (step.code !== 0) return fsRename(fromAbsolute, toAbsolute);
    return toAbsolute;
  }

  const result = await gitMv(repo, fromGitRel, toRel);
  if (result.code === 0) return toAbsolute;
  return fsRename(fromAbsolute, toAbsolute);
}

module.exports = {
  renamePathCaseAwareGitOrFs,
  folderHasGitRepo
};
