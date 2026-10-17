const fs = require("fs");
const path = require("path");
const { isSchemaModFileName } = require("../config/schema-mod-paths");
const {
  isWorkspaceAwnChannelManifestRel,
  isWorkspaceAwnMediaLibraryManifestRel,
  normalizeStorageSubfolderName,
  BUNDLE_CONFIG_FILE,
  LEGACY_BUNDLE_CONFIG_FILE,
  STORAGE_SUBFOLDER_HISTORY,
  STORAGE_SUBFOLDER_COMMENTS,
  LEGACY_STORAGE_SUBFOLDER_THREAD,
  STORAGE_SUBFOLDER_DISCUSSION,
  STORAGE_SUBFOLDER_CONFIGURATION,
  STORAGE_SUBFOLDER_TEMP,
  STORAGE_SUBFOLDER_VOLUME,
  STORAGE_SUBFOLDER_ATTACHMENTS
} = require("../config/manifest-paths");
const { normalizeStorageSlotKey } = require("../config/storage-slot-routing");
const { resolveStorageSlotsForManifest } = require("../api/page-slots-api");
const { HUB_CHANNEL_TYPE_ID, HUB_MEDIA_TYPE_ID } = require("../config/awn-hub-type-ids");

const MANIFEST_FILE = "manifest.md";
const STORAGE_ROOT = "awn-storage";

const HUB_OUTSIDE_ALLOWED_ROOT_FILES = new Set([
  "read.json",
  "read-content.json",
  "sort.json",
  ".env",
  BUNDLE_CONFIG_FILE.toLowerCase(),
  LEGACY_BUNDLE_CONFIG_FILE.toLowerCase()
]);

/** Служебные каталоги в awn-storage/ (как SHARED_SLOT_STORAGE_SKIP_DIR_NAMES у page-outside-slots). */
const HUB_OUTSIDE_STORAGE_SYSTEM_DIR_NAMES = new Set(
  [
    STORAGE_SUBFOLDER_HISTORY,
    STORAGE_SUBFOLDER_COMMENTS,
    LEGACY_STORAGE_SUBFOLDER_THREAD,
    STORAGE_SUBFOLDER_DISCUSSION,
    STORAGE_SUBFOLDER_CONFIGURATION,
    STORAGE_SUBFOLDER_TEMP,
    STORAGE_SUBFOLDER_VOLUME,
    STORAGE_SUBFOLDER_ATTACHMENTS
  ].map((name) => String(name || "").trim().toLowerCase())
);

function resolveAgentRootAbsolute(agentRoot, projectRoot = process.cwd()) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  if (path.isAbsolute(raw)) return path.normalize(raw);
  return path.resolve(projectRoot, raw);
}

function shouldIgnoreHubOutsideScanEntryName(name) {
  const lower = String(name || "").trim().toLowerCase();
  if (!lower || lower === ".ds_store") return true;
  if (lower.startsWith(".") && lower !== ".env") return true;
  return false;
}

function isAllowedHubRootFile(name) {
  if (shouldIgnoreHubOutsideScanEntryName(name)) return true;
  const lower = String(name || "").trim().toLowerCase();
  if (lower === MANIFEST_FILE.toLowerCase()) return true;
  if (isSchemaModFileName(name)) return true;
  if (HUB_OUTSIDE_ALLOWED_ROOT_FILES.has(lower)) return true;
  return false;
}

function getYamlScalar(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.*)$`, "im");
  const match = String(frontmatter || "").match(pattern);
  if (!match) return "";
  let value = String(match[1] || "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function readManifestAwnType(manifestAbs) {
  try {
    const raw = fs.readFileSync(manifestAbs, "utf8");
    if (!raw.startsWith("---")) return "";
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return "";
    const frontmatter = raw.slice(3, end);
    return String(getYamlScalar(frontmatter, "awn-type") || "").trim();
  } catch {
    return "";
  }
}

function resolveHubContainerRel(hubRelInput) {
  let rel = String(hubRelInput || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  rel = rel.replace(/\/manifest\.md$/i, "");
  if (/^awn-channels\/[^/]+$/i.test(rel)) {
    return { hubRel: rel, hubKind: "channel", displayPrefix: rel };
  }
  if (/^awn-media\/[^/]+$/i.test(rel)) {
    return { hubRel: rel, hubKind: "media", displayPrefix: rel };
  }
  const manifestRel = rel.endsWith(".md") ? rel : `${rel}/${MANIFEST_FILE}`;
  if (isWorkspaceAwnChannelManifestRel(manifestRel)) {
    const hubRel = manifestRel.replace(/\/manifest\.md$/i, "");
    return { hubRel, hubKind: "channel", displayPrefix: hubRel };
  }
  if (isWorkspaceAwnMediaLibraryManifestRel(manifestRel)) {
    const hubRel = manifestRel.replace(/\/manifest\.md$/i, "");
    return { hubRel, hubKind: "media", displayPrefix: hubRel };
  }
  return null;
}

function buildAllowedHubStorageSlotKeys(awnType, projectRoot, agentRoot) {
  const slotKeys = resolveStorageSlotsForManifest(projectRoot, agentRoot, awnType);
  return new Set(
    slotKeys.map((key) => normalizeStorageSlotKey(String(key || "").trim())).filter(Boolean)
  );
}

function isAllowedHubStorageEntryName(name, allowedSlotKeys) {
  const canonical = normalizeStorageSubfolderName(name);
  if (allowedSlotKeys.has(canonical)) return true;
  const lower = String(name || "").trim().toLowerCase();
  return HUB_OUTSIDE_STORAGE_SYSTEM_DIR_NAMES.has(lower);
}

function buildHubWorkspaceOutsideStructureReport(agentRoot, projectRoot, hubRelInput) {
  const resolved = resolveHubContainerRel(hubRelInput);
  if (!resolved) return { error: "Not a hub workspace path", status: 400 };

  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return { error: "Missing agent root", status: 400 };

  const hubAbs = path.join(agentRootAbs, resolved.hubRel);
  const manifestAbs = path.join(hubAbs, MANIFEST_FILE);
  if (!fs.existsSync(hubAbs) || !fs.statSync(hubAbs).isDirectory()) {
    return { error: "Hub folder not found", status: 404 };
  }

  const awnType = readManifestAwnType(manifestAbs);
  const expectedType = resolved.hubKind === "channel" ? HUB_CHANNEL_TYPE_ID : HUB_MEDIA_TYPE_ID;
  const typeForSlots = awnType || expectedType;
  const allowedSlotKeys = buildAllowedHubStorageSlotKeys(typeForSlots, projectRoot, agentRoot);

  const items = [];
  const pushItem = (scope, entryKind, entryName, relSuffix) => {
    items.push({
      scope,
      kind: entryKind,
      name: entryName,
      relPath: `${resolved.displayPrefix}/${relSuffix}`.replace(/\/+/g, "/")
    });
  };

  const rootScope = resolved.hubKind === "channel" ? "channel-root" : "media-root";

  try {
    for (const entry of fs.readdirSync(hubAbs, { withFileTypes: true })) {
      if (shouldIgnoreHubOutsideScanEntryName(entry.name)) continue;
      if (entry.isFile()) {
        if (isAllowedHubRootFile(entry.name)) continue;
        pushItem(rootScope, "file", entry.name, entry.name);
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === STORAGE_ROOT.toLowerCase()) continue;
        pushItem(rootScope, "folder", entry.name, entry.name);
      }
    }
  } catch {
    // ignore unreadable hub root
  }

  const storageRootAbs = path.join(hubAbs, STORAGE_ROOT);
  if (fs.existsSync(storageRootAbs) && fs.statSync(storageRootAbs).isDirectory()) {
    try {
      for (const entry of fs.readdirSync(storageRootAbs, { withFileTypes: true })) {
        if (shouldIgnoreHubOutsideScanEntryName(entry.name)) continue;
        if (entry.isFile()) {
          pushItem("storage-root", "file", entry.name, `${STORAGE_ROOT}/${entry.name}`);
          continue;
        }
        if (!entry.isDirectory()) continue;
        if (isAllowedHubStorageEntryName(entry.name, allowedSlotKeys)) continue;
        pushItem("storage-root", "folder", entry.name, `${STORAGE_ROOT}/${entry.name}`);
      }
    } catch {
      // ignore unreadable storage root
    }
  }

  items.sort((a, b) => {
    const scopeOrder = { "channel-root": 0, "media-root": 0, "storage-root": 1 };
    const aScope = scopeOrder[a.scope] ?? 9;
    const bScope = scopeOrder[b.scope] ?? 9;
    if (aScope !== bScope) return aScope - bScope;
    return a.relPath.localeCompare(b.relPath, "ru", { sensitivity: "base", numeric: true });
  });

  return {
    version: 1,
    hubKind: resolved.hubKind,
    hubRel: resolved.hubRel,
    path: `${resolved.hubRel}/${MANIFEST_FILE}`.replace(/\\/g, "/"),
    awnType: typeForSlots,
    items,
    count: items.length
  };
}

module.exports = {
  buildHubWorkspaceOutsideStructureReport
};
