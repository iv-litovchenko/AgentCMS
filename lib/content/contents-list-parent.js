const { normalizeParentValue } = require("./contents-list-pagination.js");

function normalizeParentRef(ref) {
  return String(ref || "")
    .replace(/\\/g, "/")
    .replace(/\/manifest\.md$/i, "")
    .replace(/^\/+|\/+$/g, "");
}

function sectionMatchesParent(section, rawParent) {
  const raw = String(rawParent || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!raw) return false;
  const id = String(section.id || "").trim();
  const ref = normalizeParentRef(section.ref);
  if (id === raw || ref === raw) return true;
  if (ref && (ref.endsWith(`/${raw}`) || ref.split("/").pop() === raw)) return true;
  return false;
}

/**
 * Resolve parent query (id, inner path, or ref tail) to canonical parent id for filtering.
 * @returns {{ parentKey: string|null, error: string|null }}
 */
function resolveListParentContext(items, rawParent) {
  if (rawParent === undefined || rawParent === null) {
    return { parentKey: null, error: null };
  }
  const raw = String(rawParent).trim();
  if (!raw || raw === ".") return { parentKey: null, error: null };

  const list = Array.isArray(items) ? items : [];
  const sections = list.filter((item) => item.kind === "section" || item.isSection);
  const hit = sections.find((s) => sectionMatchesParent(s, raw));
  if (hit) return { parentKey: String(hit.id || "").trim() || raw, error: null };

  const hasChild = list.some((item) => {
    const p = item.parent;
    return p === raw || normalizeParentValue(p) === raw || String(p || "").split("/").pop() === raw;
  });
  if (hasChild) return { parentKey: raw, error: null };

  return {
    parentKey: null,
    error: `Section not found for parent=${JSON.stringify(raw)} (use section id or folder path)`
  };
}

function filterItemsByParentKey(items, parentKey, { rawParentProvided = false, topLevelWhenNull = true } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (rawParentProvided && parentKey) {
    return list.filter(
      (item) =>
        item.parent === parentKey ||
        normalizeParentValue(item.parent) === parentKey ||
        String(item.parent || "").split("/").pop() === parentKey
    );
  }
  if (!rawParentProvided || topLevelWhenNull) {
    return list.filter((item) => !normalizeParentValue(item.parent));
  }
  return list;
}

module.exports = {
  resolveListParentContext,
  filterItemsByParentKey,
  normalizeParentRef,
  sectionMatchesParent
};
