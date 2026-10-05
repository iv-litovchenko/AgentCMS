const path = require("path");
const fs = require("fs");

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 8; depth += 1) {
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

function getSearchRoots() {
  const roots = [__dirname, path.join(__dirname, "..", "..")];

  const envRoot = String(process.env.AGENT_CMS_ROOT || "").trim();
  if (envRoot && fs.existsSync(envRoot)) roots.push(envRoot);

  try {
    const { app } = require("electron");
    if (app?.isPackaged) {
      const fromExec = findRepoRoot(path.dirname(process.execPath));
      if (fromExec) roots.push(fromExec);
    }
  } catch {
    // not running inside Electron main process
  }

  const fromHere = findRepoRoot(__dirname);
  if (fromHere) roots.push(fromHere);

  return [...new Set(roots.map((root) => path.resolve(root)))];
}

function requireRepo(relativePath) {
  let lastError;
  for (const root of getSearchRoots()) {
    const candidate = path.join(root, relativePath);
    try {
      return require(candidate);
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = { requireRepo, findRepoRoot, getSearchRoots };
