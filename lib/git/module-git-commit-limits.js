const path = require("path");
const fs = require("fs/promises");
const { filterChangesByExtensions } = require("./workspace-git-module");

const MODULE_GIT_BATCH_MAX_FILE_MB_DEFAULT = {
  records: 1,
  images: 5,
  sources: 5,
  documents: 5,
  media: 5,
  archives: 5,
  other: 5,
  configs: 1
};

function parseBatchMaxFileSizeMb(value, batchId) {
  const fallback = MODULE_GIT_BATCH_MAX_FILE_MB_DEFAULT[String(batchId || "").trim()] ?? 1;
  const num = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(512, Math.max(0.001, num));
}

function resolveChangeCommitBatch(change, batches) {
  for (const batch of batches || []) {
    const matched = filterChangesByExtensions([change], batch.extensions || []);
    if (matched.length) return batch;
  }
  return null;
}

async function statChangeFileBytes(repoAbsolute, change) {
  if (!change || change.kind === "deleted") return 0;
  const rel = String(change.path || "").replace(/\\/g, "/");
  if (!rel) return null;
  const abs = path.join(repoAbsolute, rel);
  try {
    const st = await fs.stat(abs);
    if (!st.isFile()) return 0;
    return st.size;
  } catch {
    return null;
  }
}

function formatGitFileSizeLabel(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function enrichGitChangesWithCommitLimits(changes, batches, repoAbsolute) {
  const list = Array.isArray(changes) ? changes : [];
  const result = [];
  for (const change of list) {
    const batch = resolveChangeCommitBatch(change, batches);
    const maxFileSizeMb = batch
      ? batch.maxFileSizeMb ?? parseBatchMaxFileSizeMb("", batch.id)
      : parseBatchMaxFileSizeMb("", "records");
    const maxFileBytes =
      batch?.maxFileBytes ?? Math.round(parseBatchMaxFileSizeMb(maxFileSizeMb, batch?.id) * 1024 * 1024);
    const sizeBytes = await statChangeFileBytes(repoAbsolute, change);
    let commitAllowed = true;
    let commitBlockedReason = "";
    if (change.kind !== "deleted" && sizeBytes != null && sizeBytes > maxFileBytes) {
      commitAllowed = false;
      commitBlockedReason = `Не попадёт в коммит — больше ${maxFileSizeMb} МБ`;
    }
    result.push({
      ...change,
      sizeBytes: sizeBytes ?? null,
      sizeLabel: sizeBytes == null ? "—" : formatGitFileSizeLabel(sizeBytes),
      commitBatchId: batch?.id || "",
      commitBatchLabel: batch?.label || "",
      maxFileSizeMb,
      maxFileBytes,
      commitAllowed,
      commitBlockedReason
    });
  }
  return result;
}

async function filterChangesWithinBatchSizeLimit(changes, maxFileBytes, repoAbsolute) {
  const limit = Number(maxFileBytes) || 0;
  if (limit <= 0) return Array.isArray(changes) ? changes : [];
  const out = [];
  for (const change of changes || []) {
    if (change.kind === "deleted") {
      out.push(change);
      continue;
    }
    const size = await statChangeFileBytes(repoAbsolute, change);
    if (size == null || size <= limit) out.push(change);
  }
  return out;
}

module.exports = {
  MODULE_GIT_BATCH_MAX_FILE_MB_DEFAULT,
  parseBatchMaxFileSizeMb,
  resolveChangeCommitBatch,
  statChangeFileBytes,
  formatGitFileSizeLabel,
  enrichGitChangesWithCommitLimits,
  filterChangesWithinBatchSizeLimit
};
