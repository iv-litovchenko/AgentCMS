const fs = require("fs");
const path = require("path");

function getBundledProjectRoot() {
  return path.join(__dirname, "..", "..");
}

function getWritableProjectRoot(app) {
  if (!app.isPackaged) {
    return getBundledProjectRoot();
  }
  return path.join(app.getPath("userData"), "project");
}

function copyRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;

  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyRecursiveSync(path.join(source, entry.name), path.join(target, entry.name));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function ensureWritableProject(app) {
  const bundledRoot = getBundledProjectRoot();
  const writableRoot = getWritableProjectRoot(app);

  if (!app.isPackaged) {
    return writableRoot;
  }

  const seedMarker = path.join(writableRoot, ".project-seeded");
  if (fs.existsSync(seedMarker)) {
    return writableRoot;
  }

  fs.mkdirSync(writableRoot, { recursive: true });

  const registryTarget = path.join(writableRoot, "awn-agents.json");
  const registrySource = path.join(bundledRoot, "awn-agents.json");
  if (fs.existsSync(registrySource)) {
    fs.copyFileSync(registrySource, registryTarget);
  }

  const workspacesSource = path.join(bundledRoot, "workspaces");
  const workspacesTarget = path.join(writableRoot, "workspaces");
  if (fs.existsSync(workspacesSource)) {
    copyRecursiveSync(workspacesSource, workspacesTarget);
  }

  fs.writeFileSync(seedMarker, `${new Date().toISOString()}\n`, "utf-8");
  console.info(`Seeded writable project at ${writableRoot}`);
  return writableRoot;
}

module.exports = {
  getBundledProjectRoot,
  getWritableProjectRoot,
  ensureWritableProject
};
