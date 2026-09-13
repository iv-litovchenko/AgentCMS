const fs = require("fs/promises");
const path = require("path");

const INDEX_DIR = ".agent-cms/ocr-index";
const MANIFEST_FILE = "manifest.json";

function getIndexPaths(agentRoot) {
  const dir = path.join(agentRoot, INDEX_DIR);
  return { dir, file: path.join(dir, MANIFEST_FILE) };
}

async function loadManifest(agentRoot) {
  const { file } = getIndexPaths(agentRoot);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveManifest(agentRoot, manifest) {
  const { dir, file } = getIndexPaths(agentRoot);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

module.exports = { INDEX_DIR, getIndexPaths, loadManifest, saveManifest };
