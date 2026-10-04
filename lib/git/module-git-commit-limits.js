const path = require("path");
const fs = require("fs/promises");

const MODULE_GIT_COMMIT_MAX_BATCH_MB_DEFAULT = 250;

const MODULE_GIT_BATCH_MAX_FILE_MB_DEFAULT = {
  records: 1,
  "records-history": 1,
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

/** 0 — проверка отключена; пустое значение — дефолт 250 МБ. */
function parseCommitMaxBatchSizeMb(value) {
  if (value === 0 || value === "0") return 0;
  if (value == null || String(value).trim() === "") return MODULE_GIT_COMMIT_MAX_BATCH_MB_DEFAULT;
  const num = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return MODULE_GIT_COMMIT_MAX_BATCH_MB_DEFAULT;
  return Math.min(10240, Math.max(1, num));
}

function commitMaxBatchBytesFromMb(maxBatchMb) {
  const mb = parseCommitMaxBatchSizeMb(maxBatchMb);
  if (mb <= 0) return 0;
  return Math.round(mb * 1024 * 1024);
}

function normalizeBatchExtension(entry) {
  return String(entry || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
}

function basenameMatchesConfigBatchExtras(filePath) {
  const base = path.posix.basename(String(filePath || "").replace(/\\/g, "/"));
  const lower = base.toLowerCase();
  if (lower === ".gitignore") return true;
  if (lower === ".env" || lower.startsWith(".env.")) return true;
  if (lower.endsWith(".lock")) return true;
  return false;
}

function changeMatchesCommitBatch(change, batch) {
  if (!change || !batch) return false;
  const batchId = String(batch.id || "");
  const extSet = new Set(
    (Array.isArray(batch.extensions) ? batch.extensions : [])
      .map(normalizeBatchExtension)
      .filter(Boolean)
  );
  const paths = [change.path, change.oldPath]
    .filter(Boolean)
    .map(normalizeChangePathValue);
  for (const filePath of paths) {
    if (batchId === "configs" && basenameMatchesConfigBatchExtras(filePath)) {
      return true;
    }
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (ext && extSet.has(ext)) return true;
  }
  return false;
}

function resolveChangeCommitBatch(change, batches) {
  for (const batch of batches || []) {
    if (changeMatchesCommitBatch(change, batch)) return batch;
  }
  return null;
}

function normalizeChangePathValue(filePath) {
  return String(filePath || "")
    .normalize("NFC")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/\\(["\\])/g, "$1")
    .replace(/\\/g, "/");
}

function extensionLabelForOutOfBatchChange(change) {
  const paths = [change?.path, change?.oldPath].filter(Boolean);
  for (const filePath of paths) {
    const normalized = normalizeChangePathValue(filePath);
    const ext = path.extname(normalized).slice(1).toLowerCase();
    if (ext) return ext.replace(/[^a-z0-9._-]+/g, "");
    const base = path.posix.basename(normalized);
    if (base.startsWith(".")) return base.toLowerCase();
    if (base) return "без ext";
  }
  return "без ext";
}

function summarizeOutOfBatchGitChanges(allChanges, batches) {
  const list = Array.isArray(allChanges) ? allChanges : [];
  const batchList = Array.isArray(batches) ? batches : [];
  const extensionCounts = new Map();
  const changes = [];
  let count = 0;
  for (const change of list) {
    if (resolveChangeCommitBatch(change, batchList)) continue;
    count += 1;
    changes.push(change);
    const label = extensionLabelForOutOfBatchChange(change);
    extensionCounts.set(label, (extensionCounts.get(label) || 0) + 1);
  }
  const extensions = [...extensionCounts.keys()].sort((a, b) => a.localeCompare(b, "ru"));
  return {
    count,
    extensions,
    extensionCounts: Object.fromEntries(extensionCounts),
    changes
  };
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
    if (!batch) {
      commitAllowed = false;
      if (!commitBlockedReason) {
        commitBlockedReason = "Нет партии для этого файла — не попадёт в batched commit";
      }
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

async function computeChangesStagedByteTotal(changes, repoAbsolute) {
  let total = 0;
  for (const change of Array.isArray(changes) ? changes : []) {
    if (change?.kind === "deleted") continue;
    let size = change?.sizeBytes;
    if (size == null && repoAbsolute) {
      size = await statChangeFileBytes(repoAbsolute, change);
    }
    const bytes = Number(size);
    if (Number.isFinite(bytes) && bytes > 0) total += bytes;
  }
  return total;
}

function buildCommitBatchTotalSizeError({ totalBytes, maxBatchBytes, batchLabel = "" }) {
  const maxBatchMb =
    Math.round((maxBatchBytes / (1024 * 1024)) * 100) / 100;
  const label = String(batchLabel || "").trim();
  const prefix = label ? `Партия «${label}»: ` : "";
  return `${prefix}${formatGitFileSizeLabel(totalBytes)} — больше лимита одного коммита (${maxBatchMb} МБ). Уберите файлы или разбейте коммит.`;
}

async function assertChangesWithinCommitBatchTotalLimit(
  changes,
  maxBatchBytes,
  repoAbsolute,
  { batchLabel = "" } = {}
) {
  const limit = Number(maxBatchBytes) || 0;
  if (limit <= 0) {
    return { ok: true, totalBytes: 0 };
  }
  const totalBytes = await computeChangesStagedByteTotal(changes, repoAbsolute);
  if (totalBytes <= limit) {
    return { ok: true, totalBytes };
  }
  const error = new Error(
    buildCommitBatchTotalSizeError({ totalBytes, maxBatchBytes: limit, batchLabel })
  );
  error.code = "COMMIT_BATCH_TOTAL_SIZE_EXCEEDED";
  error.totalBytes = totalBytes;
  error.maxBatchBytes = limit;
  throw error;
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
  MODULE_GIT_COMMIT_MAX_BATCH_MB_DEFAULT,
  MODULE_GIT_BATCH_MAX_FILE_MB_DEFAULT,
  parseBatchMaxFileSizeMb,
  parseCommitMaxBatchSizeMb,
  commitMaxBatchBytesFromMb,
  computeChangesStagedByteTotal,
  assertChangesWithinCommitBatchTotalLimit,
  changeMatchesCommitBatch,
  resolveChangeCommitBatch,
  summarizeOutOfBatchGitChanges,
  statChangeFileBytes,
  formatGitFileSizeLabel,
  enrichGitChangesWithCommitLimits,
  filterChangesWithinBatchSizeLimit
};
