function recordToCatalogItem(record) {
  const fm = record.frontmatter || {};
  const storedId = String(fm["awn-id"] || "").trim();
  const legacyId = String(
    fm["awn-code"] || fm.code || fm.id || record.id || ""
  ).trim();
  const id = storedId || legacyId;
  if (!id) return null;
  const name = String(
    fm["awn-name"] || fm["awn-label"] || fm.label || record.title || ""
  ).trim();
  const label = name || id;
  const parent =
    String(fm["awn-parent"] || fm["awn-pid"] || record.parent || "").trim() || null;
  const color = String(fm.color || "").trim() || null;
  const email = String(fm.email || "").trim() || null;
  const item = { id, label, name: label, color };
  if (parent) item.parent = parent;
  if (email) item.email = email;
  return item;
}

module.exports = {
  recordToCatalogItem
};
