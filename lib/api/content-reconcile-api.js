const fs = require("fs/promises");
const path = require("path");

const MAX_ITEMS = 50;

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function pathsEqual(a, b) {
  const left = normalizeRelPath(a);
  const right = normalizeRelPath(b);
  if (!left || !right) return false;
  return left === right;
}

function splitFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: text };
  return {
    frontmatter: text.slice(3, end).replace(/^\n/, ""),
    body: text.slice(end + 4).replace(/^\n/, "")
  };
}

function getYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = String(frontmatter || "").match(re);
  if (!match) return "";
  let raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function createContentReconcileApi(deps) {
  const {
    resolveId,
    parseAwnId,
    resolveRecordContext,
    statNodeFileMeta
  } = deps;

  async function readRecordAtPath(relPath) {
    const normalized = normalizeRelPath(relPath);
    if (!normalized) return null;
    const ctx = await resolveRecordContext(normalized);
    if (!ctx?.absolute) return null;

    let frontmatter = "";
    try {
      const raw = await fs.readFile(ctx.absolute, "utf-8");
      frontmatter = splitFrontmatter(raw).frontmatter;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }

    const idRaw = getYamlScalar(frontmatter, "awn-id");
    const id = idRaw ? parseAwnId(idRaw) : null;
    const title =
      getYamlScalar(frontmatter, "awn-name") ||
      getYamlScalar(frontmatter, "title") ||
      path.posix.basename(ctx.rel);

    const file = await statNodeFileMeta(ctx.absolute);
    return {
      path: ctx.rel,
      id: id || null,
      title,
      updatedAt: file?.updatedAt ?? null,
      size: file?.size ?? null
    };
  }

  function bumpSummary(summary, status) {
    if (Object.prototype.hasOwnProperty.call(summary, status)) {
      summary[status] += 1;
    }
  }

  async function reconcile(payload = {}) {
    const includeMeta = payload.includeMeta !== false;
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    if (rawItems.length < 1) {
      throw Object.assign(new Error("items must contain at least one entry"), { code: "EINVAL" });
    }
    if (rawItems.length > MAX_ITEMS) {
      throw Object.assign(new Error(`items max is ${MAX_ITEMS}`), { code: "EINVAL" });
    }

    const summary = {
      ok: 0,
      moved: 0,
      missing: 0,
      path_missing: 0,
      id_mismatch: 0,
      duplicate: 0,
      no_id: 0,
      invalid: 0
    };

    const items = [];

    for (const entry of rawItems) {
      const note = entry?.note != null ? String(entry.note) : undefined;
      const expectedPath = entry?.path != null ? normalizeRelPath(entry.path) : null;
      const expectedId =
        entry?.id != null && String(entry.id).trim() !== ""
          ? parseAwnId(String(entry.id).trim().replace(/^#+/, ""))
          : null;

      if (!expectedPath && !expectedId) {
        bumpSummary(summary, "invalid");
        items.push({
          status: "invalid",
          hint: "Each item needs id and/or path",
          expected: { id: null, path: null },
          actual: null,
          ...(note !== undefined ? { note } : {})
        });
        continue;
      }

      if (expectedId && expectedPath) {
        const resolved = await resolveId(expectedId);
        if (!resolved?.ok) {
          bumpSummary(summary, "missing");
          items.push({
            status: "missing",
            hint: "id not found on disk",
            expected: { id: expectedId, path: expectedPath },
            actual: null,
            ...(note !== undefined ? { note } : {})
          });
          continue;
        }
        if (resolved.duplicate) {
          bumpSummary(summary, "duplicate");
          items.push({
            status: "duplicate",
            hint: "multiple files share this id",
            expected: { id: expectedId, path: expectedPath },
            actual: {
              id: expectedId,
              path: resolved.path,
              paths: resolved.paths || []
            },
            ...(note !== undefined ? { note } : {})
          });
          continue;
        }
        if (!pathsEqual(resolved.path, expectedPath)) {
          bumpSummary(summary, "moved");
          const row = {
            status: "moved",
            hint: "path changed; refresh memory and re-read content",
            expected: { id: expectedId, path: expectedPath },
            actual: { id: expectedId, path: resolved.path }
          };
          if (includeMeta) {
            const meta = await readRecordAtPath(resolved.path);
            if (meta) row.actual = { ...row.actual, ...meta };
          }
          if (note !== undefined) row.note = note;
          items.push(row);
          continue;
        }
        const atPath = await readRecordAtPath(resolved.path);
        if (atPath?.id && atPath.id !== expectedId) {
          bumpSummary(summary, "id_mismatch");
          const row = {
            status: "id_mismatch",
            hint: "awn-id in file differs from expected; trust actual.id or re-read",
            expected: { id: expectedId, path: expectedPath },
            actual: includeMeta ? atPath : { id: atPath.id, path: atPath.path }
          };
          if (note !== undefined) row.note = note;
          items.push(row);
          continue;
        }
        bumpSummary(summary, "ok");
        const row = {
          status: "ok",
          hint: "matches workspace",
          expected: { id: expectedId, path: expectedPath },
          actual: { id: expectedId, path: resolved.path }
        };
        if (includeMeta && atPath) row.actual = { ...row.actual, ...atPath };
        if (note !== undefined) row.note = note;
        items.push(row);
        continue;
      }

      if (expectedId) {
        const resolved = await resolveId(expectedId);
        if (!resolved?.ok) {
          bumpSummary(summary, "missing");
          items.push({
            status: "missing",
            hint: "id not found on disk",
            expected: { id: expectedId, path: null },
            actual: null,
            ...(note !== undefined ? { note } : {})
          });
          continue;
        }
        if (resolved.duplicate) {
          bumpSummary(summary, "duplicate");
          items.push({
            status: "duplicate",
            hint: "multiple files share this id",
            expected: { id: expectedId, path: null },
            actual: {
              id: expectedId,
              path: resolved.path,
              paths: resolved.paths || []
            },
            ...(note !== undefined ? { note } : {})
          });
          continue;
        }
        bumpSummary(summary, "ok");
        const row = {
          status: "ok",
          hint: "resolved by id",
          expected: { id: expectedId, path: null },
          actual: { id: expectedId, path: resolved.path }
        };
        if (includeMeta) {
          const meta = await readRecordAtPath(resolved.path);
          if (meta) row.actual = { ...row.actual, ...meta };
        }
        if (note !== undefined) row.note = note;
        items.push(row);
        continue;
      }

      const meta = await readRecordAtPath(expectedPath);
      if (!meta) {
        bumpSummary(summary, "path_missing");
        items.push({
          status: "path_missing",
          hint: "path not found",
          expected: { id: null, path: expectedPath },
          actual: null,
          ...(note !== undefined ? { note } : {})
        });
        continue;
      }
      if (!meta.id) {
        bumpSummary(summary, "no_id");
        const row = {
          status: "no_id",
          hint: "file exists but has no awn-id",
          expected: { id: null, path: expectedPath },
          actual: includeMeta ? meta : { path: meta.path }
        };
        if (note !== undefined) row.note = note;
        items.push(row);
        continue;
      }
      bumpSummary(summary, "ok");
      const row = {
        status: "ok",
        hint: "resolved by path",
        expected: { id: null, path: expectedPath },
        actual: includeMeta ? meta : { id: meta.id, path: meta.path }
      };
      if (note !== undefined) row.note = note;
      items.push(row);
    }

    return {
      ok: true,
      mode: "content-reconcile-v1",
      includeMeta,
      total: items.length,
      summary,
      items
    };
  }

  return { reconcile, MAX_ITEMS };
}

module.exports = { createContentReconcileApi, MAX_ITEMS };
