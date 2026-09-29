const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { rel, cacheDir } = require("../paths/agent-cms");

const CACHE_DIR = rel.cache.menu;
const MODEL = "workspace-menu-cache-v1";

function cacheFileName(maxDepth) {
  const depth = Number.isFinite(maxDepth) ? Math.floor(maxDepth) : "all";
  return `menu-d${depth}.json`;
}

function cacheAbsolute(agentRoot, maxDepth) {
  return path.join(cacheDir(agentRoot, "menu"), cacheFileName(maxDepth));
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
  const dir = cacheDir(agentRoot, "menu");
  await fs.mkdir(dir, { recursive: true });
  const payload = {
    model: MODEL,
    builtAt: new Date().toISOString(),
    maxDepth: Number.isFinite(maxDepth) ? Math.floor(maxDepth) : null,
    menu
  };
  await fs.writeFile(cacheAbsolute(agentRoot, maxDepth), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function invalidateMenuCacheSync(agentRoot) {
  if (!agentRoot) return;
  const dir = cacheDir(agentRoot, "menu");
  try {
    if (!fsSync.existsSync(dir)) return;
    for (const entry of fsSync.readdirSync(dir)) {
      if (entry.startsWith("menu-d") && entry.endsWith(".json")) {
        fsSync.unlinkSync(path.join(dir, entry));
      }
    }
  } catch {
    // ignore
  }
}

module.exports = {
  CACHE_DIR,
  MODEL,
  loadMenuCache,
  saveMenuCache,
  invalidateMenuCacheSync
};
