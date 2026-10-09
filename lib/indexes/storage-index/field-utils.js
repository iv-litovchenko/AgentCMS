const RECORD_META_KEYS = new Set([
  "lineCountTotal",
  "lineCountBody",
  "fileSize",
  "fileMtimeMs",
  "contentHash"
]);

/** Read flat or enriched field value from a storage-index record. */
function getRecordFieldValue(record, key) {
  if (RECORD_META_KEYS.has(key)) {
    return record?.[key];
  }
  const entry = record?.fields?.[key];
  if (entry != null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry) {
    return entry.value;
  }
  return entry;
}

/** Flat key → value map for filters and legacy consumers. */
function flattenRecordFields(record) {
  const flat = {};
  for (const [key, entry] of Object.entries(record?.fields || {})) {
    flat[key] = getRecordFieldValue(record, key);
  }
  return flat;
}

function normalizeFieldMeta(entry) {
  if (entry == null) return null;
  if (typeof entry !== "object" || Array.isArray(entry)) {
    return { value: entry, type: null, title: null, contexts: [] };
  }
  if ("value" in entry) {
    return {
      value: entry.value,
      type: entry.type ?? null,
      title: entry.title ?? null,
      contexts: Array.isArray(entry.contexts) ? entry.contexts : entry.context ? [entry.context] : []
    };
  }
  return { value: entry, type: null, title: null, contexts: [] };
}

module.exports = {
  getRecordFieldValue,
  flattenRecordFields,
  normalizeFieldMeta
};
