const fs = require("fs/promises");
const { rel, indexDir } = require("../../paths/agent-cms");
const { syncStorageIndexSqlite } = require("./sqlite-store");

const INDEX_DIR = rel.indexes.storage;
const INDEX_FILE = "index.json";

function getIndexPaths(agentRoot) {
  const dir = indexDir(agentRoot, "storage");
  return { dir, file: `${dir}/${INDEX_FILE}` };
}

async function loadIndex(agentRoot) {
  const { file } = getIndexPaths(agentRoot);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    if (error instanceof SyntaxError || error?.name === "SyntaxError") {
      const backup = `${file}.corrupt-${Date.now()}`;
      try {
        await fs.rename(file, backup);
      } catch {
        // ignore backup failure; rebuild will overwrite
      }
      return null;
    }
    throw error;
  }
}

async function saveIndex(agentRoot, index, options = {}) {
  const { dir, file } = getIndexPaths(agentRoot);
  await fs.mkdir(dir, { recursive: true });
  const payload = `${JSON.stringify(index)}\n`;
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, payload, "utf-8");
  await fs.rename(tempFile, file);

  if (!options.sqliteEnabled) return;

  const batchSize = options.batchSize;
  const snapshot = index;
  setImmediate(() => {
    try {
      syncStorageIndexSqlite(agentRoot, snapshot, batchSize);
    } catch (error) {
      console.error("[storage-index] sqlite sync failed:", error);
    }
  });
}

module.exports = { INDEX_DIR, getIndexPaths, loadIndex, saveIndex };
