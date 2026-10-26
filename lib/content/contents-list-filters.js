const { normalizeParentValue } = require("./contents-list-pagination.js");

function normalizeTagList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return normalizeTagList(parsed);
    } catch {
      // fall through
    }
  }
  return text
    .split(/[,;#|\s]+/)
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);
}

function parseFilterQuery(rawQuery = {}) {
  const extRaw = String(rawQuery.ext || "")
    .trim()
    .toLowerCase();
  const ext =
    extRaw &&
    extRaw
      .split(/[,;\s]+/)
      .map((e) => (e.startsWith(".") ? e : `.${e}`))
      .filter(Boolean);
  const tags = normalizeTagList(rawQuery.tags || rawQuery.tag);
  const status = String(rawQuery.status || rawQuery.awnStatus || "")
    .trim()
    .toLowerCase();
  const entryType = String(rawQuery.entryType || rawQuery.entryKind || "all")
    .trim()
    .toLowerCase();
  return { ext: ext.length ? ext : null, tags, status: status || null, entryType };
}

function itemExtension(item) {
  const fromField = String(item.ext || item.fileExtension || "").toLowerCase();
  if (fromField) return fromField.startsWith(".") ? fromField : `.${fromField}`;
  const ref = String(item.ref || item.name || "").toLowerCase();
  const dot = ref.lastIndexOf(".");
  return dot >= 0 ? ref.slice(dot) : "";
}

function isMarkdownEntry(item) {
  const ext = itemExtension(item);
  return ext === ".md" || ext === ".mdback";
}

function isBinaryEntry(item) {
  const ext = itemExtension(item);
  if (!ext || isMarkdownEntry(item)) return false;
  return ![".csv", ".json", ".yml", ".yaml", ".txt"].includes(ext);
}

function filterItemsByAdvancedQuery(items, rawQuery = {}) {
  const { ext, tags, status, entryType } = parseFilterQuery(rawQuery);
  let out = Array.isArray(items) ? items : [];

  if (entryType && entryType !== "all") {
    out = out.filter((item) => {
      if (item.kind === "section") return entryType === "section";
      if (entryType === "md") return isMarkdownEntry(item);
      if (entryType === "file" || entryType === "binary") return isBinaryEntry(item);
      if (entryType === "csv") {
        const e = itemExtension(item);
        return e === ".csv";
      }
      return true;
    });
  }

  if (ext && ext.length) {
    out = out.filter((item) => {
      const e = itemExtension(item);
      return ext.includes(e);
    });
  }

  if (status) {
    out = out.filter((item) => String(item.status || "").trim().toLowerCase() === status);
  }

  if (tags.length) {
    out = out.filter((item) => {
      const itemTags = normalizeTagList(item.tags);
      return tags.some((t) => itemTags.includes(t));
    });
  }

  const q = String(rawQuery.q || "")
    .trim()
    .toLowerCase();
  if (q) {
    out = out.filter((item) => {
      const hay = `${item.title || ""} ${item.id || ""} ${item.ref || ""} ${item.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const parentNorm = normalizeParentValue(rawQuery.parent);
  if (rawQuery.parent !== undefined && (parentNorm !== null || rawQuery.parent === "" || rawQuery.parent === ".")) {
    out = out.filter((item) => {
      const itemParent = normalizeParentValue(item.parent);
      if (parentNorm === null) return itemParent === null;
      return itemParent === parentNorm || item.parent === parentNorm || item.parentId === parentNorm;
    });
  }

  return out;
}

module.exports = {
  filterItemsByAdvancedQuery,
  normalizeTagList,
  parseFilterQuery,
  itemExtension
};
