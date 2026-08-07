/**
 * Universal UI focus model: PAGE → SLOT → CONTENT (+ system, browse, home).
 * Server enriches browser payload with normalized focus + MCP arg hints.
 */

const LEGACY_AWN_TYPE_MAP = {
  "awn.record": "awn.content.record",
  "awn.record.category": "awn.content.category",
  "awn.content.record.category": "awn.content.category",
  "awn.sidecar": "awn.content.sidecar",
  "awn.media.category": "awn.content.category"
};

function normalizeAwnType(typeName) {
  const raw = String(typeName || "").trim();
  if (!raw) return "";
  return LEGACY_AWN_TYPE_MAP[raw] || raw;
}

function isPageType(awnType) {
  return String(awnType || "").startsWith("awn.page.");
}

function isSlotContentType(awnType) {
  const t = normalizeAwnType(awnType);
  return (
    t === "awn.content.record" ||
    t === "awn.content.category" ||
    t === "awn.content.record.category" ||
    t === "awn.content.sidecar"
  );
}

function buildFocusFromLegacy(raw) {
  const kind = String(raw?.kind || "").trim();
  const editing = Boolean(raw?.editing);

  if (kind === "home") return { entity: "home", editing: false };
  if (kind === "none") return { entity: "none", editing: false };

  if (kind === "system-file") {
    return {
      entity: "system",
      page: raw.path ? { path: raw.path, label: raw.label || null } : undefined,
      system: { file: raw.systemFile || raw.ref || null },
      editing
    };
  }

  if (kind === "folder-browse") {
    return {
      entity: "browse",
      browse: {
        folder: raw.folderBrowsePath || null,
        file: raw.ref || raw.contextPath || null
      },
      editing: false
    };
  }

  const pagePath = raw.path || null;
  const page = pagePath
    ? {
        path: pagePath,
        type: normalizeAwnType(raw.awnType) || null,
        label: raw.label || raw.title || null
      }
    : undefined;

  const slotKey = raw.slot || null;
  const awnType = normalizeAwnType(raw.awnType);
  const ref = raw.relativePath || raw.ref || null;
  const contextPath = raw.contextPath || null;

  if (raw.contentType === "page" || (awnType && isPageType(awnType) && !ref)) {
    return { entity: "page", page, editing };
  }

  if (
    ref &&
    (isSlotContentType(awnType) ||
      ["record", "record.category", "sidecar"].includes(String(raw.contentType || "")))
  ) {
    const contentType =
      awnType ||
      (raw.contentType === "record.category" || raw.contentType === "category"
        ? "awn.content.category"
        : raw.contentType === "sidecar"
          ? "awn.content.sidecar"
          : "awn.content.record");
    return {
      entity: "content",
      page,
      slot: slotKey ? { key: slotKey, view: editing ? "edit" : "overview" } : undefined,
      content: {
        type: contentType,
        ref,
        contextPath,
        title: raw.title || null,
        attach: raw.sidecarOf ? { binary: raw.sidecarOf } : undefined
      },
      editing
    };
  }

  if (slotKey && page) {
    return {
      entity: "slot",
      page,
      slot: { key: slotKey, view: "list" },
      editing: false
    };
  }

  if (page) return { entity: "page", page, editing };
  return { entity: "none", editing: false };
}

function resolveFocus(raw) {
  if (raw?.focus?.entity) return raw.focus;
  return buildFocusFromLegacy(raw);
}

function buildMcpHints(focus) {
  const mcp = {};
  const pagePath = focus?.page?.path;
  if (!pagePath) return mcp;

  mcp.get_page_meta = { path: pagePath };
  mcp.read_page_body = { path: pagePath };
  mcp.read_page_properties = { path: pagePath };
  mcp.list_page_slots = { path: pagePath };

  if (focus.entity === "content" && focus.slot?.key) {
    const base = { path: pagePath, slot: focus.slot.key };
    const ref = focus.content?.ref;
    if (ref) {
      mcp.read_content_meta = { ...base, ref };
      mcp.read_content_body = { ...base, ref };
      mcp.write_content_body = { ...base, ref };
      mcp.read_content_properties = {
        path: pagePath,
        contextPath: focus.content.contextPath || ref
      };
      mcp.write_content_properties = {
        path: pagePath,
        contextPath: focus.content.contextPath || ref
      };
    } else {
      mcp.read_content_body = { path: pagePath, slot: focus.slot.key };
      mcp.write_content_body = { path: pagePath, slot: focus.slot.key };
    }
  }

  if (focus.entity === "page") {
    mcp.write_page_body = { path: pagePath };
    mcp.write_page_properties = { path: pagePath };
  }

  if (focus.entity === "browse" && focus.browse?.folder) {
    mcp.browse_workspace_folder = { folderPath: focus.browse.folder };
    if (focus.browse.file) {
      mcp.read_workspace_page = { file: focus.browse.file };
    }
  }

  return mcp;
}

/** Flat aliases derived from focus — stable shortcuts for agents. */
function buildFocusAliases(focus) {
  return {
    path: focus.page?.path || null,
    slot: focus.slot?.key || null,
    ref: focus.content?.ref || null,
    contextPath: focus.content?.contextPath || focus.page?.path || null,
    awnType: focus.content?.type || focus.page?.type || null
  };
}

function enrichUiContext(raw) {
  if (!raw || typeof raw !== "object") {
    return { version: 1, focus: { entity: "none", editing: false }, mcp: {}, aliases: {} };
  }
  const focus = resolveFocus(raw);
  const mcp = buildMcpHints(focus);
  const aliases = buildFocusAliases(focus);
  return {
    version: raw.version || 1,
    agentId: raw.agentId || null,
    route: raw.route || null,
    contentMode: raw.contentMode || null,
    label: raw.label || focus.page?.label || focus.content?.title || null,
    focus,
    mcp,
    aliases,
    editing: Boolean(focus.editing),
    updatedAt: raw.updatedAt || null
  };
}

module.exports = {
  enrichUiContext,
  buildFocusFromLegacy,
  buildMcpHints,
  resolveFocus
};
