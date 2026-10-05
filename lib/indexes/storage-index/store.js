const fs = require("fs/promises");
const { rel, indexDir } = require("../../paths/agent-cms");

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
    throw error;
  }
}

async function saveIndex(agentRoot, index) {
  const { dir, file } = getIndexPaths(agentRoot);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}

module.exports = { INDEX_DIR, getIndexPaths, loadIndex, saveIndex };
