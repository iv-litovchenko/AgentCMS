const path = require("path");
const { getRecordFieldValue } = require("../field-utils");

const VIRTUAL_FIELDS = new Set([
  "path",
  "file.path",
  "file.name",
  "file.folder",
  "file.ext",
  "file.mtime",
  "file.size",
  "file.inlink-count",
  "file.outlink-count",
  "lineCountTotal",
  "lineCountBody"
]);

function normalizeFieldName(field) {
  return String(field || "").trim();
}

function isVirtualField(field) {
  return VIRTUAL_FIELDS.has(normalizeFieldName(field));
}

function getVirtualFieldValue(record, field, linkStats = null) {
  const key = normalizeFieldName(field);
  const filePath = String(record?.path || "").replace(/\\/g, "/");
  if (key === "path" || key === "file.path") return filePath;
  if (key === "file.name") return filePath ? path.posix.basename(filePath) : "";
  if (key === "file.folder") {
    if (!filePath) return "";
    const dir = path.posix.dirname(filePath);
    return dir === "." ? "" : dir;
  }
  if (key === "file.ext") {
    if (!filePath) return "";
    const ext = path.posix.extname(filePath);
    return ext.startsWith(".") ? ext.slice(1) : ext;
  }
  if (key === "file.mtime") {
    const ms = record?.fileMtimeMs;
    return ms != null && Number.isFinite(Number(ms)) ? new Date(Number(ms)).toISOString() : "";
  }
  if (key === "file.size") {
    return record?.fileSize != null ? String(record.fileSize) : "";
  }
  if (key === "lineCountTotal" || key === "lineCountBody") {
    return getRecordFieldValue(record, key);
  }
  if (key === "file.inlink-count") {
    return String(linkStats?.inlinkCount ?? 0);
  }
  if (key === "file.outlink-count") {
    return String(linkStats?.outlinkCount ?? 0);
  }
  return null;
}

function getFieldValue(record, field, linkStats = null) {
  const key = normalizeFieldName(field);
  if (isVirtualField(key) || key.startsWith("file.")) {
    const virtual = getVirtualFieldValue(record, key, linkStats);
    if (virtual != null) return virtual;
  }
  return getRecordFieldValue(record, key);
}

/** Split indexed list fields (tags stored as ", " joined). */
function getFieldValuesForFlatten(record, field) {
  const raw = getFieldValue(record, field);
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

module.exports = {
  VIRTUAL_FIELDS,
  isVirtualField,
  getFieldValue,
  getFieldValuesForFlatten,
  normalizeFieldName
};
