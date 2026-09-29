const fs = require("fs/promises");
const path = require("path");

const READ_STATE_FILE = "read.json";
const READ_CONTENT_FILE = "read-content.json";

function isReadStateServiceFileName(name) {
  const base = String(name || "").trim().toLowerCase();
  return base === READ_STATE_FILE || base === READ_CONTENT_FILE;
}

function normalizeReadContentPath(input) {
  return String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .trim();
}

async function readJsonFileSafe(absolutePath, fallback) {
  try {
    const raw = await fs.readFile(absolutePath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (error) {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(absolutePath, payload) {
  await fs.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

async function readNodePageReadState(nodeDirAbsolute) {
  const data = await readJsonFileSafe(path.join(nodeDirAbsolute, READ_STATE_FILE), null);
  if (!data) return { read: false, exists: false };
  return { read: Boolean(data.read), exists: true, at: data.at || null };
}

async function writeNodePageReadState(nodeDirAbsolute, read = true) {
  const payload = {
    read: Boolean(read),
    at: new Date().toISOString()
  };
  await writeJsonFile(path.join(nodeDirAbsolute, READ_STATE_FILE), payload);
  return payload;
}

async function readNodeReadContentPaths(nodeDirAbsolute) {
  const data = await readJsonFileSafe(path.join(nodeDirAbsolute, READ_CONTENT_FILE), null);
  const paths = Array.isArray(data?.paths)
    ? data.paths.map((item) => normalizeReadContentPath(item)).filter(Boolean)
    : [];
  return { paths, exists: Boolean(data) };
}

async function markNodeReadContentPath(nodeDirAbsolute, contentPath) {
  const normalized = normalizeReadContentPath(contentPath);
  if (!normalized) return { paths: [], added: false };

  const current = await readNodeReadContentPaths(nodeDirAbsolute);
  const paths = [...current.paths];
  if (!paths.includes(normalized)) paths.push(normalized);
  paths.sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));

  const payload = {
    paths,
    updatedAt: new Date().toISOString()
  };
  await writeJsonFile(path.join(nodeDirAbsolute, READ_CONTENT_FILE), payload);
  return { paths, added: !current.paths.includes(normalized) };
}

async function clearNodeReadContentPath(nodeDirAbsolute, contentPath) {
  const normalized = normalizeReadContentPath(contentPath);
  if (!normalized) return { paths: [], removed: false };

  const current = await readNodeReadContentPaths(nodeDirAbsolute);
  const paths = current.paths.filter((item) => item !== normalized);
  const payload = {
    paths,
    updatedAt: new Date().toISOString()
  };
  await writeJsonFile(path.join(nodeDirAbsolute, READ_CONTENT_FILE), payload);
  return { paths, removed: current.paths.length !== paths.length };
}

async function readFolderReadState(folderAbsolute) {
  const data = await readJsonFileSafe(path.join(folderAbsolute, READ_STATE_FILE), null);
  if (!data) return { read: false, paths: [], exists: false };
  const paths = Array.isArray(data.paths)
    ? data.paths.map((item) => normalizeReadContentPath(item)).filter(Boolean)
    : [];
  return {
    read: Boolean(data.read),
    paths,
    exists: true,
    at: data.at || null
  };
}

async function markFolderReadPath(folderAbsolute, relativePath, { markFolderRead = false } = {}) {
  const normalized = normalizeReadContentPath(relativePath);
  const current = await readFolderReadState(folderAbsolute);
  const paths = [...current.paths];
  if (normalized && !paths.includes(normalized)) paths.push(normalized);
  paths.sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));

  const payload = {
    read: markFolderRead ? true : current.read,
    paths,
    at: new Date().toISOString()
  };
  await writeJsonFile(path.join(folderAbsolute, READ_STATE_FILE), payload);
  return payload;
}

async function writeFolderPageReadState(folderAbsolute, read = true) {
  const current = await readFolderReadState(folderAbsolute);
  const payload = {
    read: Boolean(read),
    paths: current.paths,
    at: new Date().toISOString()
  };
  await writeJsonFile(path.join(folderAbsolute, READ_STATE_FILE), payload);
  return payload;
}

module.exports = {
  READ_STATE_FILE,
  READ_CONTENT_FILE,
  isReadStateServiceFileName,
  normalizeReadContentPath,
  readNodePageReadState,
  writeNodePageReadState,
  readNodeReadContentPaths,
  markNodeReadContentPath,
  clearNodeReadContentPath,
  readFolderReadState,
  markFolderReadPath,
  writeFolderPageReadState
};
