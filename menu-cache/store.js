const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");

const CACHE_DIR = ".agent-cms/menu-cache";
const MODEL = "workspace-menu-cache-v1";

function cacheFileName(maxDepth) {
  const depth = Number.isFinite(maxDepth) ? Math.floor(maxDepth) : "all";
  return `menu-d${depth}.json`;
}

function cacheAbsolute(agentRoot, maxDepth) {
  return path.join(agentRoot, CACHE_DIR, cacheFileName(maxDepth));
}

async function loadMenuCache(agentRoot, maxDepth) {
  if (!agentRoot) return null;
  try {
    const raw = await fs.readFile(cacheAbsolute(agentRoot, maxDepth), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.model !== MODEL || !parsed.menu) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveMenuCache(agentRoot, maxDepth, menu) {
  if (!agentRoot || !menu) return;
  const dir = path.join(agentRoot, CACHE_DIR);
  await fs.mkdir(dir, { recursive: true });
  const payload = {
    model: MODEL,
    maxDepth: Number.isFinite(maxDepth) ? Math.floor(maxDepth) : null,
    builtAt: new Date().toISOString(),
    menu
  };
  await fs.writeFile(cacheAbsolute(agentRoot, maxDepth), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function invalidateMenuCacheSync(agentRoot) {
  if (!agentRoot) return;
  const dir = path.join(agentRoot, CACHE_DIR);
  try {
    for (const name of fsSync.readdirSync(dir)) {
      if (name.startsWith("menu-d") && name.endsWith(".json")) {
        fsSync.unlinkSync(path.join(dir, name));
      }
    }
  } catch {
    // no cache yet
  }
}

module.exports = {
  CACHE_DIR,
  MODEL,
  loadMenuCache,
  saveMenuCache,
  invalidateMenuCacheSync
};
