const STATUS_CANONICAL = [
  { id: "open", label: "🟢 Открыта", aliases: ["open", "🟢 открыта", "открыта"] },
  { id: "draft", label: "🟡 Черновик", aliases: ["draft", "🟡 черновик", "черновик"] },
  { id: "closed", label: "🔴 Закрыта", aliases: ["closed", "🔴 закрыта", "закрыта"] },
  { id: "none", label: "⚪ Без статуса", aliases: ["none", "⚪ без статуса", "без статуса"] },
  { id: "archived", label: "⚫ Архив", aliases: ["archived", "archive", "⚫ архив", "архив"] }
];

function normalizeLookupKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugifyCatalogId(raw) {
  const withoutEmoji = String(raw || "")
    .trim()
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+/gu, "")
    .replace(/^#+/, "")
    .toLowerCase();
  if (!withoutEmoji) return "";
  const slug = withoutEmoji
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_\u0400-\u04FF-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || withoutEmoji.replace(/\s+/g, "-");
}

function catalogItemKnown(existingItems, candidate) {
  const items = Array.isArray(existingItems) ? existingItems : [];
  const id = String(candidate?.id || "").trim();
  const label = String(candidate?.label || "").trim();
  const idKey = normalizeLookupKey(id);
  const labelKey = normalizeLookupKey(label);

  return items.some((item) => {
    const itemId = String(item?.id || "").trim();
    const itemLabel = String(item?.label || "").trim();
    if (id && itemId === id) return true;
    if (label && itemLabel === label) return true;
    if (idKey && normalizeLookupKey(itemId) === idKey) return true;
    if (labelKey && normalizeLookupKey(itemLabel) === labelKey) return true;
    if (labelKey && normalizeLookupKey(itemId) === labelKey) return true;
    if (idKey && normalizeLookupKey(itemLabel) === idKey) return true;
    return false;
  });
}

function resolveStatusCatalogItem(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const key = normalizeLookupKey(text);
  for (const entry of STATUS_CANONICAL) {
    if (normalizeLookupKey(entry.id) === key) {
      return { id: entry.id, label: entry.label };
    }
    for (const alias of entry.aliases) {
      if (normalizeLookupKey(alias) === key) {
        return { id: entry.id, label: entry.label };
      }
    }
  }
  const id = slugifyCatalogId(text);
  if (!id) return null;
  return { id, label: text };
}

function resolveDiscoveredCatalogItem(preset, raw, existingItems = []) {
  const text = String(raw || "").trim();
  if (!text) return null;

  let candidate = null;
  if (preset === "statuses") {
    candidate = resolveStatusCatalogItem(text);
  } else if (preset === "tags") {
    const id = slugifyCatalogId(text.replace(/^#+/, ""));
    if (!id) return null;
    candidate = { id, label: `#${id}` };
  } else {
    const id = slugifyCatalogId(text);
    if (!id) return null;
    candidate = { id, label: text };
    const byId = existingItems.find((item) => normalizeLookupKey(item.id) === normalizeLookupKey(id));
    if (byId?.label) candidate.label = byId.label;
  }

  if (!candidate?.id) return null;
  if (catalogItemKnown(existingItems, candidate)) return null;
  return candidate;
}

function normalizeCatalogItemInput(preset, payload = {}, existingItems = []) {
  const labelRaw = String(payload.label ?? payload.name ?? "").trim();
  let id = String(payload.id ?? "").trim().replace(/^#+/, "");

  if (preset === "statuses" && !id && labelRaw) {
    const resolved = resolveStatusCatalogItem(labelRaw);
    if (resolved) return resolved;
  }

  if (!id && labelRaw) id = slugifyCatalogId(labelRaw);
  if (preset === "tags" && !id && labelRaw) id = slugifyCatalogId(labelRaw);
  if (!id) {
    const error = new Error("id or label is required");
    error.code = "EINVAL";
    throw error;
  }

  if (preset === "tags") {
    return { id, label: `#${id}` };
  }

  let label = labelRaw || id;
  if (preset === "statuses") {
    const resolved = resolveStatusCatalogItem(id) || resolveStatusCatalogItem(label);
    if (resolved) {
      return resolved;
    }
  }

  const color = String(payload.color || "").trim() || null;
  const item = { id, label, color };
  if (catalogItemKnown(existingItems, item)) {
    const error = new Error(`Catalog item "${label || id}" already exists`);
    error.code = "EEXIST";
    throw error;
  }
  return item;
}

module.exports = {
  STATUS_CANONICAL,
  normalizeLookupKey,
  slugifyCatalogId,
  catalogItemKnown,
  resolveStatusCatalogItem,
  resolveDiscoveredCatalogItem,
  normalizeCatalogItemInput
};
