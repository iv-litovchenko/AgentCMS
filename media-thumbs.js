const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const THUMB_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
  ".heic"
]);

const DEFAULT_THUMB_MAX = 320;
const MAX_THUMB_MAX = 800;

let sharpModule = null;
let sharpLoadAttempted = false;

function loadSharp() {
  if (sharpLoadAttempted) return sharpModule;
  sharpLoadAttempted = true;
  try {
    sharpModule = require("sharp");
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

function clampThumbMax(raw) {
  const parsed = Number.parseInt(String(raw || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 32) return DEFAULT_THUMB_MAX;
  return Math.min(parsed, MAX_THUMB_MAX);
}

function isThumbCandidateExt(ext) {
  return THUMB_IMAGE_EXTENSIONS.has(String(ext || "").toLowerCase());
}

const AGENT_MEDIA_THUMBS_CACHE_REL = path.join(".agent-cms", "cache", "media-thumbs");

function getThumbCacheDir(agentRoot) {
  return path.join(agentRoot, AGENT_MEDIA_THUMBS_CACHE_REL);
}

function buildThumbCacheFileName(sourceAbsolute, maxSize, mtimeMs) {
  const hash = crypto
    .createHash("sha256")
    .update(`${sourceAbsolute}\0${mtimeMs}\0${maxSize}`)
    .digest("hex");
  return `${hash}.webp`;
}

async function readOrCreateImageThumb(sourceAbsolute, agentRoot, maxSize) {
  const sharp = loadSharp();
  if (!sharp) return null;

  const ext = path.extname(sourceAbsolute).toLowerCase();
  if (!isThumbCandidateExt(ext)) return null;

  const stat = await fs.stat(sourceAbsolute);
  if (!stat.isFile()) return null;

  const clampedMax = clampThumbMax(maxSize);
  const cacheDir = getThumbCacheDir(agentRoot);
  const cacheName = buildThumbCacheFileName(sourceAbsolute, clampedMax, stat.mtimeMs);
  const cacheAbsolute = path.join(cacheDir, cacheName);

  try {
    const cached = await fs.readFile(cacheAbsolute);
    if (cached.length) {
      return { buffer: cached, contentType: "image/webp" };
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const buffer = await sharp(sourceAbsolute)
    .rotate()
    .resize({
      width: clampedMax,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 88 })
    .toBuffer();

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cacheAbsolute, buffer);

  return { buffer, contentType: "image/webp" };
}

function wantsThumbVariant(searchParams) {
  const raw = String(searchParams?.get("thumb") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

module.exports = {
  AGENT_MEDIA_THUMBS_CACHE_REL,
  clampThumbMax,
  getThumbCacheDir,
  isThumbCandidateExt,
  readOrCreateImageThumb,
  wantsThumbVariant,
  DEFAULT_THUMB_MAX
};
