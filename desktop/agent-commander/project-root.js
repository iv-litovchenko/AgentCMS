const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");

function findRepoRoot(startDir) {
  let current = path.resolve(String(startDir || process.cwd()));
  for (let depth = 0; depth < 14; depth += 1) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "agent-cms") return current;
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function commanderIndexPath(projectRoot) {
  return path.join(path.resolve(projectRoot), "public", "commander", "index.html");
}

function hasCommanderPublic(projectRoot) {
  const root = String(projectRoot || "").trim();
  if (!root) return false;
  return fs.existsSync(commanderIndexPath(root));
}

function pushCandidate(list, seen, value) {
  const resolved = path.resolve(String(value || "").trim());
  if (!resolved || seen.has(resolved) || !fs.existsSync(resolved)) return;
  seen.add(resolved);
  list.push(resolved);
}

/**
 * Корень репозитория YamlCMS с public/commander (не копия project в Application Support).
 */
function resolveCommanderProjectRoot(options = {}) {
  const seen = new Set();
  const candidates = [];

  pushCandidate(candidates, seen, options.envRoot);
  pushCandidate(candidates, seen, options.execSearchRoot);
  pushCandidate(candidates, seen, findRepoRoot(options.devFallback || REPO_ROOT));
  pushCandidate(candidates, seen, REPO_ROOT);
  pushCandidate(candidates, seen, options.sharedProjectRoot);

  for (const root of candidates) {
    if (hasCommanderPublic(root)) return root;
  }

  return candidates[0] || path.resolve(REPO_ROOT);
}

module.exports = {
  REPO_ROOT,
  findRepoRoot,
  commanderIndexPath,
  hasCommanderPublic,
  resolveCommanderProjectRoot
};
