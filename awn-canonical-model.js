const fs = require("fs");
const path = require("path");
const { parseCsvText } = require("./awn-data-csv");
const { getAgentCmsCoreAbsolute, AGENT_SYSTEM_REL, AWN_DATA_REL } = require("./platform-sources");
const {
  loadTypeCatalog,
  mergeTypeSchema,
  isTypeActive,
  resolveCanonicalTypeId
} = require("./type-catalog-loader");

const CANONICAL_PAGE_TYPES = ["awn.page.ws", "awn.page.area", "awn.page.topic"];

const CANONICAL_SLOT_CONTENT_TYPES = [
  "awn.content.record",
  "awn.content.category",
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
  "awn.slot.todo-single",
  "awn.slot.log-single"
];

const PRIMARY_SLOT_ORDER = new Map(CANONICAL_PRIMARY_SLOT_TYPES.map((id, index) => [id, index + 1]));

const DEFAULT_SLOT_CATEGORIES = [
  {
    id: "memory",
    name: "Память",
    sort: 1,
    description: "Рабочая память темы — записи, входящие, заметки, источники"
  },
  { id: "files", name: "Файлы", sort: 2, description: "Медиа, активы, скрипты, артефакты, репозитории" },
  {
    id: "single-file",
    name: "Однофайловая",
    sort: 3,
    description: "Один файл на слот — main.md, todo.md, log.md, CSV"
  },
  { id: "records", name: "Записи", sort: 4, description: "Системные слои — история, временные файлы, итоги" },
  { id: "communication", name: "Общение", sort: 5, description: "Диалоги и комментарии" }
];

const SLOT_CATEGORY_ORDER = new Map(DEFAULT_SLOT_CATEGORIES.map((row) => [row.id, row.sort]));

const DEFAULT_SYSTEM_ONLY_FOLDERS = ["preview/"];

const SLOT_TYPES_SOURCE = `${AGENT_SYSTEM_REL}/types/slots/`;
const SLOT_CATEGORIES_SOURCE = `${AWN_DATA_REL}/taxonomies/slot-categories/main.csv`;

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

function compareSlotEntries(a, b, categoryOrder = SLOT_CATEGORY_ORDER) {
  const catA = categoryOrder.get(a.slotCategory) ?? 999;
  const catB = categoryOrder.get(b.slotCategory) ?? 999;
  if (catA !== catB) return catA - catB;
  const orderA = a.slotOrder ?? PRIMARY_SLOT_ORDER.get(a.id) ?? 999;
  const orderB = b.slotOrder ?? PRIMARY_SLOT_ORDER.get(b.id) ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return String(a.id).localeCompare(String(b.id), "ru");
}

function resolveAgentRootAbsolute(agentRoot, projectRoot = process.cwd()) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(projectRoot, raw);
}

function readSlotCategoriesCsv(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) return null;
  try {
    const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
    const codeIdx = columns.indexOf("code");
    const labelIdx = columns.indexOf("label");
    const sortIdx = columns.indexOf("sort");
    const descIdx = columns.indexOf("description");
    if (codeIdx < 0) return null;

    const categories = rows
      .map((row) => ({
        id: String(row[codeIdx] || "").trim(),
        name: String(row[labelIdx >= 0 ? labelIdx : codeIdx] || "").trim(),
        sort: sortIdx >= 0 ? Number(row[sortIdx]) || 0 : 0,
        description: descIdx >= 0 ? String(row[descIdx] || "").trim() : ""
      }))
      .filter((row) => row.id);

    if (!categories.length) return null;
    categories.sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name, "ru"));
    return { version: 1, categories };
  } catch {
    return null;
  }
}

function readSlotCategories(projectRoot = process.cwd(), agentRoot = "") {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const candidates = [];
  if (agentRootAbs) {
    candidates.push(path.join(agentRootAbs, SLOT_CATEGORIES_SOURCE));
  }
  candidates.push(path.join(coreRoot, SLOT_CATEGORIES_SOURCE));

  for (const csvPath of candidates) {
    const parsed = readSlotCategoriesCsv(csvPath);
    if (parsed) return parsed;
  }

  return { version: 1, categories: [...DEFAULT_SLOT_CATEGORIES] };
}

function groupSlotTypesByCategory(slotTypes, categories) {
  const order = new Map((categories || []).map((row, index) => [row.id, row.sort ?? index + 1]));
  const groups = new Map();
  for (const slot of slotTypes || []) {
    const categoryId = slot.slotCategory || "memory";
    if (!groups.has(categoryId)) groups.set(categoryId, []);
    groups.get(categoryId).push(slot);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
    .map(([categoryId, slots]) => {
      const meta = (categories || []).find((row) => row.id === categoryId);
      return {
        id: categoryId,
        name: meta?.name || categoryId,
        sort: meta?.sort ?? order.get(categoryId) ?? null,
        slots
      };
    });
}

function slotTypeIdToKey(slotId) {
  const id = String(slotId || "").trim();
  return id.startsWith("awn.slot.") ? id.slice("awn.slot.".length) : id;
}

function slotBindingsFromTypes(slotTypes) {
  return (slotTypes || []).map((row) => ({
    slotKey: slotTypeIdToKey(row.id),
    path: row.path || null,
    allowedContent: row.allowedContent || [],
    acceptFiles: row.acceptFiles || []
  }));
}

function systemOnlyFoldersFromTypes(slotTypes) {
  const folders = new Set(DEFAULT_SYSTEM_ONLY_FOLDERS);
  for (const row of slotTypes || []) {
    if (String(row.slotTier || "").trim() !== "system") continue;
    const folder = String(row.path || "").trim();
    if (folder) folders.add(folder.endsWith("/") ? folder : `${folder}/`);
  }
  return [...folders];
}

function getSlotTypesFromCatalog(projectRoot, agentRoot) {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const categoriesDoc = readSlotCategories(projectRoot, agentRoot);
  const categoryOrder = new Map(
    (categoriesDoc.categories || []).map((row, index) => [row.id, row.sort ?? index + 1])
  );
  const slots = [];
  for (const entry of catalog.byDomain.slots || []) {
    if (!isTypeActive(entry) || entry.kind !== "slot") continue;
    if (entry.id === "awn.slot") continue;
    const merged = mergeTypeSchema(entry, catalog.byId);
    if (!merged.path) continue;
    const allowed = normalizeCanonicalSlotContent(merged["allowed-content"], catalog.byId);
    const canonicalId = resolveCanonicalTypeId(entry.id, catalog.byId);
    const slotCategory = String(merged["slot-category"] || "").trim() || null;
    const acceptFiles = Array.isArray(merged["accept-files"])
      ? merged["accept-files"].map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    slots.push({
      id: canonicalId,
      name: merged.name || entry.id,
      path: merged.path || null,
      storageDriver: merged["storage-driver"] || null,
      slotCategory,
      slotTier: String(merged["slot-tier"] || "").trim() || null,
      slotOrder:
        typeof merged["slot-order"] === "number"
          ? merged["slot-order"]
          : PRIMARY_SLOT_ORDER.get(canonicalId) ?? null,
      primary: PRIMARY_SLOT_ORDER.has(canonicalId),
      allowedContent: allowed,
      acceptFiles,
      catalogFile: entry.catalogFile || null
    });
  }
  slots.sort((a, b) => compareSlotEntries(a, b, categoryOrder));
  return slots;
}

function getCanonicalModelPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const categoriesDoc = readSlotCategories(projectRoot, agentRoot);
  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const bindingEntries = slotBindingsFromTypes(slotTypes);

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
        "В любом слоте допустимы только awn.content.record, awn.content.category, awn.content.sidecar",
      slotOrder: "Основные слоты топика — см. primarySlotTypes (main → … → todo)",
      slotTypesSource: `Типы слотов — записи в ${SLOT_TYPES_SOURCE} (path, allowed-content, accept-files, slot-category)`
    },
    slotTypes,
    slotCategories: categoriesDoc.categories,
    slotTypesByCategory: groupSlotTypesByCategory(slotTypes, categoriesDoc.categories),
    slotBindings: bindingEntries,
    slotTypesSource: SLOT_TYPES_SOURCE,
    slotCategoriesSource: SLOT_CATEGORIES_SOURCE,
    systemOnlyFolders: systemOnlyFoldersFromTypes(slotTypes)
  };
}

module.exports = {
  CANONICAL_PAGE_TYPES,
  CANONICAL_SLOT_CONTENT_TYPES,
  CANONICAL_PRIMARY_SLOT_TYPES,
  DEFAULT_SLOT_CATEGORIES,
  normalizeCanonicalSlotContent,
  getCanonicalModelPayload,
  readSlotCategories,
  groupSlotTypesByCategory,
  getSlotTypesFromCatalog,
  slotTypeIdToKey,
  slotBindingsFromTypes
};
