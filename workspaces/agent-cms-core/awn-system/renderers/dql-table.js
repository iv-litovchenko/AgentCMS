/**
 * Fence ```awn-query — рендер DQL-lite через POST /api/storage-index/query
 * @param {HTMLElement} target
 * @param {string} source
 * @param {{ agentId?: string }} ctx
 */
export default async function renderDqlTable(target, source, ctx) {
  const dql = String(source || "").trim();
  if (!dql) {
    target.innerHTML = '<p class="awn-dql-empty">Пустой DQL-запрос</p>';
    return;
  }

  const res = await fetch("/api/storage-index/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ dql })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || `HTTP ${res.status}`);
  }

  const rows = Array.isArray(data.results) ? data.results : [];
  if (!rows.length) {
    target.innerHTML = `<p class="awn-dql-empty">Нет строк (total ${data.total ?? 0})</p>`;
    return;
  }

  if (data.mode === "dql-group") {
    const head = ["group", "value", "count"];
    const body = rows.map(
      (r) =>
        `<tr><td>${esc(r.groupKey)}</td><td>${esc(r.value)}</td><td>${esc(r.count)}</td></tr>`
    );
    target.innerHTML = `<table class="awn-dql-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table>`;
    return;
  }

  const keys = new Set(["path"]);
  for (const row of rows) {
    if (row.fields && typeof row.fields === "object") {
      Object.keys(row.fields).forEach((k) => keys.add(k));
    }
  }
  const columns = [...keys];
  const thead = columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const tbody = rows
    .map((row) => {
      const cells = columns.map((col) => {
        if (col === "path") return `<td>${esc(row.path)}</td>`;
        const entry = row.fields?.[col];
        const val = entry != null && typeof entry === "object" && "value" in entry ? entry.value : entry;
        return `<td>${esc(val)}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  target.innerHTML = `<table class="awn-dql-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table><p class="awn-dql-meta">${esc(
    data.engine || ""
  )} · total ${data.total ?? rows.length}</p>`;
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
