const MIME_BY_EXT = {
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".htm": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
};

function guessMimeTypeFromPath(filePath) {
  const raw = String(filePath || "").split("?")[0].trim();
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return "";
  const ext = raw.slice(dot).toLowerCase();
  return MIME_BY_EXT[ext] || "";
}

/**
 * Adds top-level sizeBytes, size, mimeType (from stat file or path guess).
 * @param {object|null|undefined} payload
 */
function enrichContentMetaWithSize(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const file = payload.file && typeof payload.file === "object" ? payload.file : null;
  const pathHint =
    String(payload.workspacePath || file?.path || payload.ref || "")
      .replace(/\\/g, "/")
      .trim();
  const rawSize = file?.size ?? payload.size ?? payload.sizeBytes;
  const sizeBytes =
    rawSize != null && Number.isFinite(Number(rawSize)) && Number(rawSize) >= 0
      ? Number(rawSize)
      : null;
  const mimeType =
    String(file?.mimeType || payload.mimeType || guessMimeTypeFromPath(pathHint) || "").trim() || null;

  return {
    ...payload,
    sizeBytes,
    size: sizeBytes,
    ...(mimeType ? { mimeType } : {})
  };
}

module.exports = {
  enrichContentMetaWithSize,
  guessMimeTypeFromPath
};
