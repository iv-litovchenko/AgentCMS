/**
 * Canonical storage slot routing — shared by server HTTP API and MCP content tools.
 * Mirrors public/main.js DATA_STORAGE_SLOT_SPECS (sectionKind + defaultMode).
 */
const {
  STORAGE_SUBFOLDER_MAIN,
  STORAGE_SUBFOLDER_BY_MODE
} = require("./manifest-paths");

/** @typedef {"external"|"flat"|"media"|"bundle"|null} SectionKind */

/** @type {Array<{ slotKey: string, aliases?: string[], storageFolder: string, sectionKind: SectionKind, disabled?: boolean }>} */
const STORAGE_SLOT_ROUTING = [
  {
    slotKey: "memory",
    aliases: ["main", "external"],
    storageFolder: STORAGE_SUBFOLDER_MAIN,
    sectionKind: "external"
  },
  { slotKey: "inbox", storageFolder: "inbox", sectionKind: "flat" },
  { slotKey: "notes", aliases: ["note"], storageFolder: "notes", sectionKind: "flat" },
  { slotKey: "references", storageFolder: "references", sectionKind: "flat" },
  { slotKey: "artefacts", storageFolder: "artefacts", sectionKind: "flat" },
  { slotKey: "media", storageFolder: "media", sectionKind: "media" },
  { slotKey: "assets", storageFolder: "assets", sectionKind: "media" },
  { slotKey: "repository", storageFolder: "repository", sectionKind: "flat" },
  { slotKey: "scripts", aliases: ["script"], storageFolder: "scripts", sectionKind: "flat" },
  { slotKey: "templates", storageFolder: "templates", sectionKind: "flat" },
  { slotKey: "base", storageFolder: "base", sectionKind: "flat" },
  { slotKey: "notebooklm", storageFolder: "notebooklm", sectionKind: "flat" },
  { slotKey: "quick-notes", storageFolder: "quick-notes", sectionKind: "flat", disabled: true },
  { slotKey: "main-single", storageFolder: STORAGE_SUBFOLDER_MAIN, sectionKind: "bundle" },
  { slotKey: "main-single-csv", storageFolder: STORAGE_SUBFOLDER_MAIN, sectionKind: "bundle" },
  { slotKey: "todo-single", storageFolder: "todo", sectionKind: "bundle" },
  { slotKey: "todo", storageFolder: "todo", sectionKind: "bundle" },
  { slotKey: "log-single", storageFolder: "log", sectionKind: "bundle" },
  { slotKey: "dialogs", aliases: ["thread"], storageFolder: "thread", sectionKind: null },
  { slotKey: "temp", storageFolder: "temp", sectionKind: null },
  { slotKey: "volume", storageFolder: "volume", sectionKind: null },
  { slotKey: "history", storageFolder: "history", sectionKind: null },
  { slotKey: "comments", storageFolder: "comments", sectionKind: null }
];

const SLOT_ALIAS_TO_KEY = new Map();
const SLOT_KEY_TO_SPEC = new Map();

for (const spec of STORAGE_SLOT_ROUTING) {
  SLOT_KEY_TO_SPEC.set(spec.slotKey, spec);
  SLOT_ALIAS_TO_KEY.set(spec.slotKey, spec.slotKey);
  for (const alias of spec.aliases || []) {
    SLOT_ALIAS_TO_KEY.set(alias, spec.slotKey);
  }
}

const INTERNAL_BUNDLE_SLOT_KEYS = new Set(
  STORAGE_SLOT_ROUTING.filter((spec) => spec.sectionKind === "bundle").map((spec) => spec.slotKey)
);

const FLAT_SECTION_STORAGE_FOLDERS = new Set(
  STORAGE_SLOT_ROUTING.filter((spec) => spec.sectionKind === "flat" && !spec.disabled).map(
    (spec) => spec.storageFolder
  )
);

function normalizeStorageSlotKey(raw) {
  const key = String(raw || "").trim();
  if (!key) return "";
  return SLOT_ALIAS_TO_KEY.get(key) || key;
}

function getStorageSlotSpec(raw) {
  const slotKey = normalizeStorageSlotKey(raw);
  return SLOT_KEY_TO_SPEC.get(slotKey) || null;
}

function slotKeyToStorageFolder(raw) {
  const spec = getStorageSlotSpec(raw);
  if (spec?.storageFolder) return spec.storageFolder;
  const mode = String(raw || "").trim();
  return STORAGE_SUBFOLDER_BY_MODE[mode] || mode;
}

function isExternalMemorySlot(raw) {
  return normalizeStorageSlotKey(raw) === "memory";
}

function isMediaSlotKey(raw) {
  const slotKey = normalizeStorageSlotKey(raw);
  return slotKey === "media" || slotKey === "assets";
}

function isInternalBundleSlot(raw) {
  return INTERNAL_BUNDLE_SLOT_KEYS.has(normalizeStorageSlotKey(raw));
}

/** External storage on disk (memory, inbox, media…), not bundle/single-file slots. */
function isExternalDriverSlot(raw) {
  const spec = getStorageSlotSpec(raw);
  if (!spec || spec.disabled) return false;
  return spec.sectionKind === "external" || spec.sectionKind === "flat" || spec.sectionKind === "media";
}

function isTopicWideContentIndexSlotRow(slotRow) {
  if (!slotRow?.slot) return false;
  if (isInternalBundleSlot(slotRow.slot)) return false;
  const driver = String(slotRow.driver || "").trim();
  if (driver === "internal" || driver === "tabular") return false;
  if (driver === "external") return true;
  return isExternalDriverSlot(slotRow.slot);
}

function isStorageFlatSectionFolder(storageFolder) {
  return FLAT_SECTION_STORAGE_FOLDERS.has(String(storageFolder || "").trim());
}

function listSectionCapableSlotKeys() {
  return STORAGE_SLOT_ROUTING.filter((spec) => spec.sectionKind && spec.sectionKind !== "bundle" && !spec.disabled).map(
    (spec) => spec.slotKey
  );
}

/**
 * Resolve HTTP endpoint + body fields for creating awn.content.category (section folder).
 * @returns {{ supportsSections: boolean, endpoint?: string, folder?: string, slotKey: string, sectionKind: SectionKind }}
 */
function resolveSectionCreateRoute(rawSlot) {
  const slotKey = normalizeStorageSlotKey(rawSlot);
  const spec = getStorageSlotSpec(rawSlot);
  if (!spec || spec.disabled || !spec.sectionKind || spec.sectionKind === "bundle") {
    return {
      supportsSections: false,
      slotKey,
      sectionKind: spec?.sectionKind ?? null
    };
  }

  if (spec.sectionKind === "external") {
    return {
      supportsSections: true,
      endpoint: "/api/external/section/create",
      slotKey,
      sectionKind: spec.sectionKind
    };
  }

  if (spec.sectionKind === "media") {
    return {
      supportsSections: true,
      endpoint: "/api/media/section/create",
      folder: spec.storageFolder,
      slotKey,
      sectionKind: spec.sectionKind
    };
  }

  return {
    supportsSections: true,
    endpoint: "/api/storage/section/create",
    folder: spec.storageFolder,
    slotKey,
    sectionKind: spec.sectionKind
  };
}

function buildSectionCreateRequest(rawSlot, basePayload) {
  const route = resolveSectionCreateRoute(rawSlot);
  if (!route.supportsSections || !route.endpoint) {
    throw new Error(
      `Sections (awn.content.category) are not supported in slot "${rawSlot}". ` +
        `Supported slots: ${listSectionCapableSlotKeys().join(", ")}.`
    );
  }
  const body = { ...basePayload };
  if (route.folder && route.sectionKind === "flat") {
    body.folder = route.folder;
  } else if (route.folder && route.sectionKind === "media" && route.folder !== "media") {
    body.folder = route.folder;
  }
  return { endpoint: route.endpoint, body, route };
}

module.exports = {
  STORAGE_SLOT_ROUTING,
  FLAT_SECTION_STORAGE_FOLDERS,
  normalizeStorageSlotKey,
  getStorageSlotSpec,
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  isMediaSlotKey,
  isInternalBundleSlot,
  isExternalDriverSlot,
  isTopicWideContentIndexSlotRow,
  isStorageFlatSectionFolder,
  listSectionCapableSlotKeys,
  resolveSectionCreateRoute,
  buildSectionCreateRequest
};
