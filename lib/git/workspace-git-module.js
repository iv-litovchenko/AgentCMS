const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { parseGitStatusPorcelain } = require("./git-porcelain");

const execFileAsync = promisify(execFile);

const MODULE_GIT_DEFAULT_EXTENSIONS = ["md", "txt", "csv", "yml", "yaml"];

function normalizeGitExtensions(input) {
  const fallback = [...MODULE_GIT_DEFAULT_EXTENSIONS];
  if (input == null || input === "") return fallback;
  const rawList = Array.isArray(input) ? input : String(input).split(/[,\s]+/);
  const list = rawList
    .map((entry) => String(entry || "").trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  return list.length ? list : fallback;
}

function changeMatchesExtensions(change, extensionSet) {
  const pathExt = path.extname(change.path || "").slice(1).toLowerCase();
  if (pathExt && extensionSet.has(pathExt)) return true;
  const oldExt = path.extname(change.oldPath || "").slice(1).toLowerCase();
  if (oldExt && extensionSet.has(oldExt)) return true;
  return false;
}

function filterChangesByExtensions(changes, extensions) {
  const extensionSet = new Set(normalizeGitExtensions(extensions));
  return (Array.isArray(changes) ? changes : []).filter((change) => changeMatchesExtensions(change, extensionSet));
}

function countGitChangesByKind(changes) {
  const list = Array.isArray(changes) ? changes : [];
  return {
    total: list.length,
    staged: list.filter((item) => item.kind === "staged").length,
    modified: list.filter((item) => item.kind === "modified").length,
    untracked: list.filter((item) => item.kind === "untracked").length,
    deleted: list.filter((item) => item.kind === "deleted").length,
    renamed: list.filter((item) => item.kind === "renamed").length,
    conflict: list.filter((item) => item.kind === "conflict").length
  };
}

async function runGitInRepo(repoAbsolute, args) {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["-C", repoAbsolute, ...args], {
      maxBuffer: 4 * 1024 * 1024
    });
    return { stdout: String(stdout || ""), stderr: String(stderr || ""), code: 0 };
  } catch (error) {
    return {
      stdout: String(error.stdout || ""),
      stderr: String(error.stderr || error.message || ""),
      code: typeof error.code === "number" ? error.code : 1
    };
  }
}

async function gitDiffForChange(repoAbsolute, change) {
  const filePath = change.path;
  if (!filePath) return "";

  if (change.kind === "untracked") {
    const result = await runGitInRepo(repoAbsolute, ["diff", "--no-index", "/dev/null", filePath]);
    if (result.stdout) return result.stdout;
    return result.stderr || "";
  }

  const result = await runGitInRepo(repoAbsolute, ["diff", "HEAD", "--", filePath]);
  return result.stdout || "";
}

async function buildModuleGitDiff(repoAbsolute, options = {}) {
  const normalizedExtensions = normalizeGitExtensions(options.extensions);
  const maxBytesRaw = Number(options.maxBytes);
  const maxBytes = Number.isFinite(maxBytesRaw) ? Math.min(2_000_000, Math.max(1024, maxBytesRaw)) : 500_000;

  const statusResult = await runGitInRepo(repoAbsolute, [
    "status",
    "--porcelain=v1",
    "-b",
    "--untracked-files=all"
  ]);
  if (statusResult.code !== 0) {
    throw new Error(statusResult.stderr || "git status failed");
  }

  const parsed = parseGitStatusPorcelain(statusResult.stdout);
  let changes = filterChangesByExtensions(parsed.changes, normalizedExtensions);

  const pathFilter = String(options.path || "").trim().replace(/\\/g, "/");
  if (pathFilter) {
    changes = changes.filter((change) => change.path === pathFilter || change.oldPath === pathFilter);
  }

  const files = [];
  let combinedDiff = "";
  let truncated = false;

  for (const change of changes) {
    if (truncated) break;
    const diffText = await gitDiffForChange(repoAbsolute, change);
    const entry = {
      path: change.path,
      oldPath: change.oldPath || "",
      kind: change.kind,
      diff: diffText
    };
    files.push(entry);

    const chunk = diffText ? `${diffText}\n` : "";
    if (combinedDiff.length + chunk.length > maxBytes) {
      const remaining = maxBytes - combinedDiff.length;
      if (remaining > 0) {
        combinedDiff += chunk.slice(0, remaining);
      }
      truncated = true;
      break;
    }
    combinedDiff += chunk;
  }

  return {
    extensions: normalizedExtensions,
    path: pathFilter || null,
    fileCount: files.length,
    files,
    diff: combinedDiff,
    truncated,
    maxBytes
  };
}

async function commitModuleGitChanges(repoAbsolute, { message, extensions } = {}) {
  const normalizedExtensions = normalizeGitExtensions(extensions);
  const statusResult = await runGitInRepo(repoAbsolute, [
    "status",
    "--porcelain=v1",
    "-b",
    "--untracked-files=all"
  ]);
  if (statusResult.code !== 0) {
    throw new Error(statusResult.stderr || "git status failed");
  }

  const parsed = parseGitStatusPorcelain(statusResult.stdout);
  const targets = filterChangesByExtensions(parsed.changes, normalizedExtensions);
  const conflicts = targets.filter((item) => item.kind === "conflict");
  if (conflicts.length) {
    throw new Error(
      `Git: ${conflicts.length} conflict(s) in filtered files — resolve before commit`
    );
  }

  const paths = new Set();
  for (const change of targets) {
    if (change.path) paths.add(change.path);
    if (change.oldPath) paths.add(change.oldPath);
  }

  const stagedPaths = [...paths].sort();
  if (!stagedPaths.length) {
    return {
      committed: false,
      hash: "",
      shortHash: "",
      stagedPaths,
      extensions: normalizedExtensions,
      reason: "nothing_to_commit"
    };
  }

  for (const filePath of stagedPaths) {
    const addResult = await runGitInRepo(repoAbsolute, ["add", "--", filePath]);
    if (addResult.code !== 0) {
      throw new Error(addResult.stderr || `git add failed for ${filePath}`);
    }
  }

  const commitMessage = String(message || "").trim();
  if (!commitMessage) {
    throw new Error("Commit message is required");
  }

  const commitResult = await runGitInRepo(repoAbsolute, ["commit", "-m", commitMessage]);
  if (commitResult.code !== 0) {
    const detail = `${commitResult.stderr}\n${commitResult.stdout}`.trim();
    if (/nothing to commit/i.test(detail)) {
      return {
        committed: false,
        hash: "",
        shortHash: "",
        stagedPaths,
        extensions: normalizedExtensions,
        reason: "nothing_to_commit"
      };
    }
    throw new Error(detail || "git commit failed");
  }

  const hashResult = await runGitInRepo(repoAbsolute, ["rev-parse", "HEAD"]);
  const hash = hashResult.stdout.trim();
  return {
    committed: true,
    hash,
    shortHash: hash.slice(0, 7),
    stagedPaths,
    extensions: normalizedExtensions,
    stdout: commitResult.stdout.trim()
  };
}

module.exports = {
  MODULE_GIT_DEFAULT_EXTENSIONS,
  normalizeGitExtensions,
  filterChangesByExtensions,
  countGitChangesByKind,
  buildModuleGitDiff,
  commitModuleGitChanges,
  runGitInRepo
};
