const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const { getAgentSystemAbsolute, AGENT_SYSTEM_REL } = require("./platform-sources");
const {
  loadTypeCatalog,
  mergeTypeSchema,
  isTypeActive,
  resolveCanonicalTypeId
} = require("./type-catalog-loader");

const CANONICAL_PAGE_TYPES = ["awn.page.ws", "awn.page.area", "awn.page.topic"];

const CANONICAL_SLOT_CONTENT_TYPES = [
  "awn.content.record",
  "awn.content.record.category",
  "awn.content.sidecar"
];

/** Основные слоты топика — порядок отображения и storage-slots у awn.page.topic */
const CANONICAL_PRIMARY_SLOT_TYPES = [
  "awn.slot.main",
  "awn.slot.main-single",
  "awn.slot.main-single-csv",
  "awn.slot.inbox",
  "awn.slot.note",
  "awn.slot.references",
  "awn.slot.artefacts",
  "awn.slot.media",
  "awn.slot.assets",
  "awn.slot.repository",
  "awn.slot.script",
  "awn.slot.todo-single"
];

const PRIMARY_SLOT_ORDER = new Map(CANONICAL_PRIMARY_SLOT_TYPES.map((id, index) => [id, index + 1]));

function normalizeCanonicalSlotContent(typeIds, byId) {
  const canonicalSet = new Set(CANONICAL_SLOT_CONTENT_TYPES);
  const seen = new Set();
  const normalized = [];
  for (const rawId of typeIds || []) {
    const id = resolveCanonicalTypeId(String(rawId), byId);
    if (!canonicalSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  if (!normalized.length) return [...CANONICAL_SLOT_CONTENT_TYPES];
  return CANONICAL_SLOT_CONTENT_TYPES.filter((id) => seen.has(id));
}

function compareSlotEntries(a, b) {
  const orderA = a.slotOrder ?? PRIMARY_SLOT_ORDER.get(a.id) ?? 999;
  const orderB = b.slotOrder ?? PRIMARY_SLOT_ORDER.get(b.id) ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return String(a.id).localeCompare(String(b.id), "ru");
}

function readSlotsBindings(agentRoot) {
  const bindingsPath = path.join(getAgentSystemAbsolute(agentRoot), "slots-bindings.yml");
  if (!fs.existsSync(bindingsPath)) {
    return { version: 1, bindings: {} };
  }
  try {
    const parsed = loadYamlFileSync(bindingsPath, {}) || {};
    return {
      version: parsed.version || 1,
      bindings: parsed.bindings && typeof parsed.bindings === "object" ? parsed.bindings : {},
      systemOnly: Array.isArray(parsed["system-only"]) ? parsed["system-only"] : []
    };
  } catch {
    return { version: 1, bindings: {} };
  }
}

function getSlotTypesFromCatalog(projectRoot, agentRoot) {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const slots = [];
  for (const entry of catalog.byDomain.slots || []) {
    if (!isTypeActive(entry) || entry.kind !== "slot") continue;
    if (entry.id === "awn.slot") continue;
    const merged = mergeTypeSchema(entry, catalog.byId);
    if (!merged.path) continue;
    const allowed = normalizeCanonicalSlotContent(merged["allowed-content"], catalog.byId);
    const canonicalId = resolveCanonicalTypeId(entry.id, catalog.byId);
    slots.push({
      id: canonicalId,
      name: merged.name || entry.id,
      path: merged.path || null,
      storageDriver: merged["storage-driver"] || null,
      slotOrder:
        typeof merged["slot-order"] === "number"
          ? merged["slot-order"]
          : PRIMARY_SLOT_ORDER.get(canonicalId) ?? null,
      primary: PRIMARY_SLOT_ORDER.has(canonicalId),
      allowedContent: allowed,
      catalogFile: entry.catalogFile || null
    });
  }
  slots.sort(compareSlotEntries);
  return slots;
}

function getCanonicalModelPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const bindingsDoc = readSlotsBindings(agentRoot);
  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const bindingEntries = Object.entries(bindingsDoc.bindings || {}).map(([slotKey, meta]) => ({
    slotKey,
    path: meta?.path || `${slotKey}/`,
    allowedContent: normalizeCanonicalSlotContent(meta?.content, catalog.byId),
    acceptFiles: meta?.files || []
  }));

  const primarySlotTypes = CANONICAL_PRIMARY_SLOT_TYPES.map((id) => {
    const row = slotTypes.find((s) => s.id === id);
    return row || { id, name: id, missing: true };
  });

  return {
    version: 1,
    model: "canonical-v1",
    pageTypes: [...CANONICAL_PAGE_TYPES],
    slotContentTypes: [...CANONICAL_SLOT_CONTENT_TYPES],
    primarySlotTypes: [...CANONICAL_PRIMARY_SLOT_TYPES],
    rules: {
      pages: "Только awn.page.ws | awn.page.area | awn.page.topic — узлы дерева меню",
      slotContent:
        "В любом слоте допустимы только awn.content.record, awn.content.record.category, awn.content.sidecar",
      slotOrder: "Основные слоты топика — см. primarySlotTypes (main → … → todo)"
    },
    slotTypes,
    slotBindings: bindingEntries,
    slotBindingsFile: `${AGENT_SYSTEM_REL}/slots-bindings.yml`,
    systemOnlyFolders: bindingsDoc.systemOnly || []
  };
}

module.exports = {
  CANONICAL_PAGE_TYPES,
  CANONICAL_SLOT_CONTENT_TYPES,
  CANONICAL_PRIMARY_SLOT_TYPES,
  normalizeCanonicalSlotContent,
  getCanonicalModelPayload,
  readSlotsBindings,
  getSlotTypesFromCatalog
};
