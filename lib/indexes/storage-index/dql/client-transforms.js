/**
 * Safe post-processing of DQL rows in the browser (no eval).
 * Used by awn-system/renderers/dql-table.js when body contains `@transform` JSON line.
 */
function applyClientTransform(rows, spec) {
  if (!spec || typeof spec !== "object") return rows;
  let out = Array.isArray(rows) ? rows.slice() : [];

  if (Array.isArray(spec.pick) && spec.pick.length) {
    const keys = spec.pick.map((k) => String(k));
    out = out.map((row) => {
      if (!row || typeof row !== "object") return row;
      const next = { path: row.path };
      const fields = {};
      for (const key of keys) {
        if (key === "path") continue;
        const entry = row.fields?.[key];
        if (entry != null) fields[key] = entry;
      }
      if (Object.keys(fields).length) next.fields = fields;
      return next;
    });
  }

  if (spec.sort && typeof spec.sort === "object" && spec.sort.field) {
    const field = String(spec.sort.field);
    const dir = spec.sort.dir === "desc" ? -1 : 1;
    out.sort((a, b) => {
      const av =
        field === "path"
          ? a?.path
          : a?.fields?.[field]?.value ?? a?.fields?.[field];
      const bv =
        field === "path"
          ? b?.path
          : b?.fields?.[field]?.value ?? b?.fields?.[field];
      return dir * String(av || "").localeCompare(String(bv || ""), "ru");
    });
  }

  if (Number.isFinite(Number(spec.limit))) {
    out = out.slice(0, Math.max(1, Number(spec.limit)));
  }

  return out;
}

module.exports = { applyClientTransform };
