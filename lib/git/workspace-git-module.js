const path = require("path");
const fs = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { parseGitStatusPorcelain } = require("./git-porcelain");

const execFileAsync = promisify(execFile);

const MODULE_GIT_DEFAULT_EXTENSIONS = [
  "md",
  "txt",
  "csv",
  "yml",
  "yaml",
  "json",
  "toml",
  "html",
  "htm",
  "css",
  "scss",
  "js",
  "mjs",
  "ts",
  "sh",
  "xml",
  "ini",
  "cfg",
  "properties",
  "sql",
  "jsonl",
  "ndjson",
  "mdx",
  "py",
  "pyi",
  "rb",
  "go",
  "rs",
  "lock"
];
const MODULE_GIT_EXTRA_BASENAMES = [".gitignore"];

function normalizeGitExtensions(input) {
  const fallback = [...MODULE_GIT_DEFAULT_EXTENSIONS];
  if (input == null || input === "") return fallback;
  const rawList = Array.isArray(input) ? input : String(input).split(/[,\s\n]+/);
  const list = rawList
    .map((entry) => String(entry || "").trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  return list.length ? list : fallback;
}

function basenameMatchesGitModuleExtras(filePath) {
  const base = path.posix.basename(String(filePath || "").replace(/\\/g, "/"));
  const lower = base.toLowerCase();
  if (MODULE_GIT_EXTRA_BASENAMES.some((name) => name.toLowerCase() === lower)) return true;
  if (lower === ".env" || lower.startsWith(".env.")) return true;
  if (lower.endsWith(".lock")) return true;
  return false;
}

function changeMatchesExtensions(change, extensionSet) {
  if (basenameMatchesGitModuleExtras(change.path) || basenameMatchesGitModuleExtras(change.oldPath)) {
    return true;
  }
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

async function runGitInRepo(repoAbsolute, args, options = {}) {
  const configFlags = Array.isArray(options.configFlags) ? options.configFlags : [];
  try {
    const { stdout, stderr } = await execFileAsync(
      "git",
      ["-C", repoAbsolute, ...configFlags, ...args],
      {
        maxBuffer: 4 * 1024 * 1024
      }
    );
    return { stdout: String(stdout || ""), stderr: String(stderr || ""), code: 0 };
  } catch (error) {
    return {
      stdout: String(error.stdout || ""),
      stderr: String(error.stderr || error.message || ""),
      code: typeof error.code === "number" ? error.code : 1
    };
  }
}

async function resolveGitWorktreeRelativePath(repoAbsolute, relPath) {
  const rel = String(relPath || "").replace(/\\/g, "/").trim();
  if (!rel) return rel;
  const variants = new Set([rel]);
  if (process.platform === "darwin") {
    variants.add(rel.normalize("NFD"));
    variants.add(rel.normalize("NFC"));
  }
  for (const candidate of variants) {
    try {
      await fs.access(path.join(repoAbsolute, candidate));
      return candidate;
    } catch {
      // try next Unicode normalization
    }
  }
  return rel;
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

function parseGitRemotesVerbose(stdout) {
  const byName = new Map();
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, kind] = match;
    if (!byName.has(name)) {
      byName.set(name, { name, fetchUrl: "", pushUrl: "" });
    }
    const entry = byName.get(name);
    if (kind === "fetch") entry.fetchUrl = url;
    else entry.pushUrl = url;
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function listModuleGitRemotes(repoAbsolute) {
  const result = await runGitInRepo(repoAbsolute, ["remote", "-v"]);
  if (result.code !== 0) {
    throw new Error(result.stderr || "git remote failed");
  }
  return parseGitRemotesVerbose(result.stdout);
}

async function initModuleGitRepo(repoAbsolute, { branch = "main" } = {}) {
  const gitDir = path.join(repoAbsolute, ".git");
  try {
    await fs.access(gitDir);
    throw new Error("Git repository already exists in workspace root");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const branchName = String(branch || "main").trim() || "main";
  let initResult = await runGitInRepo(repoAbsolute, ["init", "-b", branchName]);
  if (initResult.code !== 0) {
    initResult = await runGitInRepo(repoAbsolute, ["init"]);
    if (initResult.code !== 0) {
      throw new Error(initResult.stderr || "git init failed");
    }
    const checkoutResult = await runGitInRepo(repoAbsolute, ["checkout", "-b", branchName]);
    if (checkoutResult.code !== 0) {
      const switchResult = await runGitInRepo(repoAbsolute, ["switch", "-c", branchName]);
      if (switchResult.code !== 0) {
        throw new Error(checkoutResult.stderr || switchResult.stderr || "failed to create initial branch");
      }
    }
  }

  const branchResult = await runGitInRepo(repoAbsolute, ["branch", "--show-current"]);
  return {
    initialized: true,
    branch: branchResult.stdout.trim() || branchName,
    repoPath: repoAbsolute
  };
}

async function setModuleGitRemote(repoAbsolute, { name = "origin", url } = {}) {
  const remoteName = String(name || "origin").trim() || "origin";
  const remoteUrl = String(url || "").trim();
  if (!remoteUrl) {
    throw new Error("Remote URL is required");
  }

  const listResult = await runGitInRepo(repoAbsolute, ["remote"]);
  const existing = listResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const action = existing.includes(remoteName) ? "set-url" : "add";
  const args = action === "add" ? ["remote", "add", remoteName, remoteUrl] : ["remote", "set-url", remoteName, remoteUrl];
  const result = await runGitInRepo(repoAbsolute, args);
  if (result.code !== 0) {
    throw new Error(result.stderr || `git remote ${action} failed`);
  }
  const remotes = await listModuleGitRemotes(repoAbsolute);
  return { action, name: remoteName, url: remoteUrl, remotes };
}

async function removeModuleGitRemote(repoAbsolute, { name = "origin" } = {}) {
  const remoteName = String(name || "origin").trim() || "origin";
  const result = await runGitInRepo(repoAbsolute, ["remote", "remove", remoteName]);
  if (result.code !== 0) {
    throw new Error(result.stderr || "git remote remove failed");
  }
  const remotes = await listModuleGitRemotes(repoAbsolute);
  return { removed: remoteName, remotes };
}

async function pushModuleGitRepo(repoAbsolute, { remote = "origin", branch, setUpstream = true } = {}) {
  const remoteName = String(remote || "origin").trim() || "origin";
  const branchResult = await runGitInRepo(repoAbsolute, ["branch", "--show-current"]);
  const currentBranch = branchResult.stdout.trim() || "main";
  const targetBranch = String(branch || currentBranch).trim() || currentBranch;

  const args = setUpstream
    ? ["push", "-u", remoteName, targetBranch]
    : ["push", remoteName, targetBranch];
  const result = await runGitInRepo(repoAbsolute, args);
  if (result.code !== 0) {
    throw new Error(`${result.stderr}\n${result.stdout}`.trim() || "git push failed");
  }

  return {
    pushed: true,
    remote: remoteName,
    branch: targetBranch,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

async function pullModuleGitRepo(repoAbsolute, { remote = "origin", branch, rebase = false } = {}) {
  const remoteName = String(remote || "origin").trim() || "origin";
  const branchResult = await runGitInRepo(repoAbsolute, ["branch", "--show-current"]);
  const currentBranch = branchResult.stdout.trim() || "main";
  const targetBranch = String(branch || currentBranch).trim() || currentBranch;
  const useRebase = rebase === true || String(rebase || "").toLowerCase() === "rebase";

  const args = useRebase
    ? ["pull", "--rebase", remoteName, targetBranch]
    : ["pull", remoteName, targetBranch];
  const result = await runGitInRepo(repoAbsolute, args);
  if (result.code !== 0) {
    throw new Error(`${result.stderr}\n${result.stdout}`.trim() || "git pull failed");
  }

  return {
    pulled: true,
    remote: remoteName,
    branch: targetBranch,
    strategy: useRebase ? "rebase" : "merge",
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function buildGitConfigFlagsForAuthor(author) {
  const name = String(author?.name || "").trim();
  const email = String(author?.email || "").trim();
  const flags = [];
  if (name) flags.push("-c", `user.name=${name}`);
  if (email) flags.push("-c", `user.email=${email}`);
  return flags;
}

async function commitModuleGitChanges(
  repoAbsolute,
  {
    message,
    extensions,
    author,
    maxFileBytes = 0,
    maxCommitBatchBytes = 0,
    batchLabel = "",
    commitBatch = null
  } = {}
) {
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
  let targets = parsed.changes;
  if (commitBatch) {
    const { changeMatchesCommitBatch } = require("./module-git-commit-limits");
    targets = targets.filter((change) => changeMatchesCommitBatch(change, commitBatch));
  } else {
    targets = filterChangesByExtensions(targets, normalizedExtensions);
  }
  const matchedCount = targets.length;
  if (Number(maxFileBytes) > 0) {
    const { filterChangesWithinBatchSizeLimit } = require("./module-git-commit-limits");
    targets = await filterChangesWithinBatchSizeLimit(targets, maxFileBytes, repoAbsolute);
  }
  const conflicts = targets.filter((item) => item.kind === "conflict");
  if (conflicts.length) {
    throw new Error(
      `Git: ${conflicts.length} conflict(s) in filtered files — resolve before commit`
    );
  }

  const paths = new Set();
  for (const change of targets) {
    if (change.path) {
      paths.add(await resolveGitWorktreeRelativePath(repoAbsolute, change.path));
    }
    if (change.oldPath) {
      paths.add(await resolveGitWorktreeRelativePath(repoAbsolute, change.oldPath));
    }
  }

  const stagedPaths = [...paths].sort();
  if (!stagedPaths.length) {
    return {
      committed: false,
      hash: "",
      shortHash: "",
      stagedPaths,
      extensions: normalizedExtensions,
      reason: matchedCount > 0 ? "size_limit_filtered" : "nothing_to_commit",
      matchedCount
    };
  }

  if (Number(maxCommitBatchBytes) > 0) {
    const { assertChangesWithinCommitBatchTotalLimit } = require("./module-git-commit-limits");
    await assertChangesWithinCommitBatchTotalLimit(targets, maxCommitBatchBytes, repoAbsolute, {
      batchLabel
    });
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

  const commitResult = await runGitInRepo(repoAbsolute, ["commit", "-m", commitMessage], {
    configFlags: buildGitConfigFlagsForAuthor(author)
  });
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

async function commitModuleGitChangesInBatches(
  repoAbsolute,
  {
    batches = [],
    author,
    branch = "main",
    date = "",
    time = "",
    messageSuffix = "",
    maxCommitBatchBytes = 0
  } = {}
) {
  const { formatCommitBatchMessages } = require("./module-git-commit-batches");
  const prepared = formatCommitBatchMessages(batches, { branch, date, time, messageSuffix });
  const results = [];

  for (const batch of prepared) {
    const result = await commitModuleGitChanges(repoAbsolute, {
      message: batch.message,
      extensions: batch.extensions,
      author,
      maxFileBytes: batch.maxFileBytes || 0,
      maxCommitBatchBytes,
      batchLabel: batch.label || batch.id || "",
      commitBatch: batch
    });
    results.push({
      batchId: batch.id,
      label: batch.label,
      message: batch.message,
      ...result
    });
  }

  const committedResults = results.filter((item) => item.committed);
  const lastCommitted = committedResults[committedResults.length - 1] || null;

  return {
    committed: committedResults.length > 0,
    batchCount: results.length,
    committedBatchCount: committedResults.length,
    batches: results,
    hash: lastCommitted?.hash || "",
    shortHash: lastCommitted?.shortHash || "",
    reason: committedResults.length ? "" : "nothing_to_commit"
  };
}

module.exports = {
  MODULE_GIT_DEFAULT_EXTENSIONS,
  MODULE_GIT_EXTRA_BASENAMES,
  normalizeGitExtensions,
  filterChangesByExtensions,
  countGitChangesByKind,
  buildModuleGitDiff,
  listModuleGitRemotes,
  initModuleGitRepo,
  setModuleGitRemote,
  removeModuleGitRemote,
  pushModuleGitRepo,
  pullModuleGitRepo,
  commitModuleGitChanges,
  commitModuleGitChangesInBatches,
  runGitInRepo,
  resolveGitWorktreeRelativePath
};
