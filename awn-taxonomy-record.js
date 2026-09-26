function recordToCatalogItem(record) {
  const fm = record.frontmatter || {};
  const id = String(fm.code || fm.id || record.id || "").trim();
  if (!id) return null;
  const label = String(
    fm["awn-name"] || fm["awn-label"] || fm.label || record.title || id
  ).trim();
  const color = String(fm.color || "").trim() || null;
  const email = String(fm.email || "").trim() || null;
  const item = { id, label, color };
  if (email) item.email = email;
  return item;
}

module.exports = {
  recordToCatalogItem
};
