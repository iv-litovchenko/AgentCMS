const { normalizeParentValue } = require("./contents-list-pagination.js");

function parseSortMode(rawQuery = {}) {
  const sort = String(rawQuery.sort || rawQuery.sortBy || "manual")
    .trim()
    .toLowerCase();
  if (["manual", "name", "title", "updated", "updatedAt", "date"].includes(sort)) {
    if (sort === "title") return "name";
    if (sort === "updatedAt" || sort === "date") return "updated";
    return sort;
  }
  return "manual";
}

function sortKeyForItem(item) {
  return String(item.id || item.name || item.title || item.ref || "")
    .trim()
    .toLowerCase();
}

function resolveManualOrder(rawQuery, payload, parentNorm) {
  const sectionSortOrders =
    payload?.sectionSortOrders && typeof payload.sectionSortOrders === "object"
      ? payload.sectionSortOrders
      : {};
  const parentKey = parentNorm || "";
  if (sectionSortOrders[parentKey]?.length) return sectionSortOrders[parentKey];
  if (Array.isArray(payload?.sortOrder) && payload.sortOrder.length) return payload.sortOrder;
  return null;
}

function compareManual(a, b, order) {
  if (!order?.length) return 0;
  const ia = order.indexOf(a.id);
  const ib = order.indexOf(b.id);
  const ja = order.indexOf(a.name);
  const jb = order.indexOf(b.name);
  const rankA = ia >= 0 ? ia : ja >= 0 ? ja : Number.MAX_SAFE_INTEGER;
  const rankB = ib >= 0 ? ib : jb >= 0 ? jb : Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;
  return sortKeyForItem(a).localeCompare(sortKeyForItem(b), "ru", { sensitivity: "base", numeric: true });
}

function sortListItems(items, rawQuery = {}, payload = {}) {
  const mode = parseSortMode(rawQuery);
  const parentNorm = normalizeParentValue(rawQuery.parent);
  const list = [...(Array.isArray(items) ? items : [])];

  if (mode === "name") {
    list.sort((a, b) =>
      sortKeyForItem(a).localeCompare(sortKeyForItem(b), "ru", { sensitivity: "base", numeric: true })
    );
    return list;
  }

  if (mode === "updated") {
    list.sort((a, b) => {
      const ta = Date.parse(a.updatedAt || a.createdAt || "") || 0;
      const tb = Date.parse(b.updatedAt || b.createdAt || "") || 0;
      return tb - ta;
    });
    return list;
  }

  const order = resolveManualOrder(rawQuery, payload, parentNorm);
  if (order?.length) {
    list.sort((a, b) => compareManual(a, b, order));
    return list;
  }

  list.sort((a, b) =>
    sortKeyForItem(a).localeCompare(sortKeyForItem(b), "ru", { sensitivity: "base", numeric: true })
  );
  return list;
}

module.exports = {
  parseSortMode,
  sortListItems
};
