const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("../awn/awn-yaml-utils");
const {
  getAgentCmsCoreAbsolute,
  getCmsConfigAbsolute,
  getAgentSystemAbsolute,
  getAgentSystemTypesDir,
  TYPE_DOMAINS,
  AGENT_TYPE_DOMAINS,
  AGENT_SYSTEM_REL,
  agentSystemDirExists,
  getTypeDomainDirName
} = require("../platform/platform-sources");
const {
  DOMAIN_TYPE_STORES,
  ingestDomainTypesFromAwnData,
  cmsConfigExists
} = require("../awn/awn-data-types-bridge");
const { ingestYamlDomainTypes } = require("../awn/types-yaml-bridge");

const WORKSPACE_STATUS_ACTIVE = "🟢 Открыта";

const ACTIVE_STATUS = new Set(["active", "deprecated"]);

/** Legacy id → canonical id (манifests могут ещё использовать старые awn-type). */
const TYPE_ID_ALIASES = {
  // Page aliases
  "awn.page": "awn.page.base",
  "awn.entity": "awn.table.base",
  "awn.workspace": "awn.page.ws",
  "awn.area": "awn.page.area",
  "awn.topic": "awn.page.topic",
  // Legacy section ids → canonical section stub
  "awn.page.section.agent-kit": "awn.page.section",
  "awn.page.section.shared": "awn.page.section",
  "awn.page.section.container": "awn.page.section",
  "awn.page.topic.agent": "awn.page.topic",
  "awn.page.topic.user": "awn.page.topic",
  "awn.page.topic.users": "awn.page.topic",
  "awn.page.topic.rules": "awn.page.topic",
  "awn.page.topic.voice-tts": "awn.page.topic",
  "awn.page.topic.voice-sst": "awn.page.topic",
  "awn.page.topic.agent-kit.agent": "awn.page.topic",
  "awn.page.topic.agent-kit.user": "awn.page.topic",
  "awn.page.topic.agent-kit.users": "awn.page.topic",
  "awn.page.topic.agent-kit.rules": "awn.page.topic",
  "awn.page.topic.agent-kit.voice-tts": "awn.page.topic",
  "awn.page.topic.agent-kit.voice-sst": "awn.page.topic",
  "agent.settings.global": "awn.settings.platform",
  "agent.settings.local": "awn.settings.workspace",
  "agent.settings.user": "awn.settings.user",
  "awn.page.topic.shared.inbox": "awn.page.topic",
  "awn.page.topic.shared.notes": "awn.page.topic",
  "awn.page.topic.shared.references": "awn.page.topic",
  "awn.page.topic.shared.artefacts": "awn.page.topic",
  "awn.page.topic.shared.scripts": "awn.page.topic",
  "awn.page.topic.shared.media": "awn.page.topic",
  "awn.record": "awn.content.record",
  "awn.sidecar": "awn.content.sidecar",
  "awn.record.category": "awn.content.category",
  "awn.content.record.category": "awn.content.category",
  "awn.media.category": "awn.content.category",
  "awn.dialog": "awn.content.discussion",
  "awn.content.dialog": "awn.content.discussion",
  "awn.comment": "awn.content.comment",
  "awn.page.service-doc": "awn.page.topic",
  // Taxonomy field aliases (awn.taxonomy.* → agent.taxonomy.*)
  "awn.taxonomy.categories": "agent.taxonomy.categories",
  "awn.taxonomy.colors": "agent.taxonomy.colors",
  "awn.taxonomy.priorities": "agent.taxonomy.priorities",
  "awn.taxonomy.statuses": "agent.taxonomy.statuses",
  "awn.taxonomy.tags": "agent.taxonomy.tags",
  "awn.taxonomy.tax": "agent.taxonomy.tax",
  "awn.null": "awn.field.base",
  // Slot aliases
  "awn.slot.notes": "awn.slot.note",
  "awn.slot.scripts": "awn.slot.script",
  "awn.slot.todo": "awn.slot.todo-single",
  "awn.slot.roadmap": "awn.slot.roadmap-single",
  "awn.slot.thread": "awn.slot.discussion",
  "awn.slot.dialogs": "awn.slot.discussion",
  "awn.slot.quick-notes": "awn.slot.note",
  "awn.data.singleton": "awn.database.frame.single",
  "awn.data.single": "awn.database.frame.single",
  "awn.data.group": "awn.database.frame.group",
  "awn.data.collection": "awn.database.frame.collection",
  "awn.database.group": "awn.database.frame.group",
  "awn.database.collection": "awn.database.frame.collection",
  "awn.database.single": "awn.database.frame.single",
  "awn.database.singleton": "awn.database.frame.single",
  "awn.data.base": "awn.database.base",
  "awn.data.element.base": "awn.database.element.base",
  "awn.data.element.default": "awn.database.element.record",
  "awn.database.element.default": "awn.database.element.record",
  "awn-databases/cms-base/data-elements/default.md": "awn.database.element.record",
  "awn.data.element.record": "awn.database.element.record",
  "awn.data.element.record-lite": "awn.database.element.record-lite",
  "awn.data.element.record-csv": "awn.database.element.record-csv",
  "awn.data.record": "awn.database.element.record",
  "awn.data.record-lite": "awn.database.element.record-lite",
  "awn.data.record-csv": "awn.database.element.record-csv",
  "awn.database.record": "awn.database.element.record",
  "awn.database.record-lite": "awn.database.element.record-lite",
  "awn.database.record-csv": "awn.database.element.record-csv",
  "awn.database.element.record-lite": "awn.database.element.record-lite",
  "awn.database.element.record-csv": "awn.database.element.record-csv",
  "awn.content.record-csv": "awn.content.record-csv",
  "awn.data.category": "awn.database.element.category",
  "awn.database.category": "awn.database.element.category",
  "awn.data.sidecar": "awn.database.element.sidecar",
  "awn.database.sidecar": "awn.database.element.sidecar",
  "awn.data.comment": "awn.database.element.comment",
  "awn.database.comment": "awn.database.element.comment",
  "awn.database.content.base": "awn.database.element.base",
  "awn.database.content.record": "awn.database.element.record",
  "awn.database.content.category": "awn.database.element.category",
  "awn.database.content.sidecar": "awn.database.element.sidecar",
  "awn.database.content.comment": "awn.database.element.comment",
  "awn-databases/cms-base/data-containers/group.md": "awn.database.frame.group",
  "awn-databases/cms-base/data-containers/collection.md": "awn.database.frame.collection",
  "awn-databases/cms-base/data-containers/single.md": "awn.database.frame.single",
  // Legacy infoblock type ids (manifests / schema.yml до rename)
  "awn.infoblock.base": "awn.database.base",
  "awn.infoblock.frame.base": "awn.database.frame.base",
  "awn.infoblock.frame.group": "awn.database.frame.group",
  "awn.infoblock.frame.collection": "awn.database.frame.collection",
  "awn.infoblock.frame.single": "awn.database.frame.single",
  "awn.infoblock.frame.taxonomy-collection": "awn.database.frame.taxonomy-collection",
  "awn.infoblock.group": "awn.database.frame.group",
  "awn.infoblock.collection": "awn.database.frame.collection",
  "awn.infoblock.single": "awn.database.frame.single",
  "awn.infoblock.singleton": "awn.database.frame.single",
  "awn.infoblock.element.base": "awn.database.element.base",
  "awn.infoblock.element.record": "awn.database.element.record",
  "awn.infoblock.element.record-lite": "awn.database.element.record-lite",
  "awn.infoblock.element.record-csv": "awn.database.element.record-csv",
  "awn.infoblock.element.category": "awn.database.element.category",
  "awn.infoblock.element.sidecar": "awn.database.element.sidecar",
  "awn.infoblock.element.comment": "awn.database.element.comment",
  "awn.infoblock.element.default": "awn.database.element.record",
  "awn.infoblock.record": "awn.database.element.record",
  "awn.infoblock.record-lite": "awn.database.element.record-lite",
  "awn.infoblock.record-csv": "awn.database.element.record-csv",
  "awn.infoblock.category": "awn.database.element.category",
  "awn.infoblock.sidecar": "awn.database.element.sidecar",
  "awn.infoblock.comment": "awn.database.element.comment",
  "awn.infoblock.content.base": "awn.database.element.base",
  "awn.infoblock.content.record": "awn.database.element.record",
  "awn.infoblock.content.category": "awn.database.element.category",
  "awn.infoblock.content.sidecar": "awn.database.element.sidecar",
  "awn.infoblock.content.comment": "awn.database.element.comment"
};

function normalizeLegacyCatalogPath(catalogPath) {
  let normalized = String(catalogPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";

  if (normalized.startsWith("awn-system/types/")) {
    const rest = normalized.slice("awn-system/types/".length).replace(/\.ya?ml$/i, ".md");
    const domain = rest.split("/")[0];
    const store = DOMAIN_TYPE_STORES[domain];
    if (store) return `awn-databases/${store}/${rest.slice(domain.length + 1)}`;
  }

  normalized = normalized.replace(
    /^awn-databases\/(pages|content|slots|base|mixins|settings)\/types\//,
    "awn-databases/$1/"
  );

  const legacyPlatform = normalized.match(
    /^types\/([^/]+)\/awn-storage\/configuration\/types\/(.+)\.ya?ml$/i
  );
  if (legacyPlatform) {
    const store = DOMAIN_TYPE_STORES[legacyPlatform[1]];
    if (store) return `awn-databases/${store}/${legacyPlatform[2]}.md`;
  }

  return normalized;
}

function resolveAgentRootAbsolute(agentRoot, projectRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot || process.cwd(), raw);
}

// Метаданные встроенных доменов (label + kind нового типа). registry.yml может
// переопределять их и добавлять свои домены («пакеты»).
const BUILTIN_DOMAIN_META = {
  base: { label: "Base", kind: "base" },
  pages: { label: "Pages", kind: "type" },
  content: { label: "Content", kind: "type" },
  slots: { label: "Slots", kind: "slot" },
  fields: { label: "Fields", kind: "field" },
  "md-blocks": { label: "Markdown blocks", kind: "block" },
  taxonomies: { label: "Taxonomies", kind: "taxonomy" },
  mixins: { label: "Mixins", kind: "mixin" },
  database: { label: "Инфоблоки / databases (awn-databases)", kind: "data-container" },
  /** @deprecated use database */
  infoblock: { label: "Инфоблоки (awn-databases)", kind: "data-container" },
  /** @deprecated use database */
  data: { label: "Инфоблоки (awn-databases)", kind: "data-container" }
};

function normalizeDomainEntry(raw) {
  if (typeof raw === "string") {
    const id = raw.trim();
    return id ? { id } : null;
  }
  if (raw && typeof raw === "object" && raw.id) {
    const id = String(raw.id).trim();
    if (!id) return null;
    const out = { id };
    if (raw.label) out.label = String(raw.label);
    if (raw.kind) out.kind = String(raw.kind);
    if (raw.icon) out.icon = String(raw.icon);
    if (raw.extends) out.extends = String(raw.extends);
    if (raw.prefix) out.prefix = String(raw.prefix);
    return out;
  }
  return null;
}

/**
 * Единый источник правды для списка доменов агента: встроенные (в коде) +
 * объявленные в awn-system/registry.yml (domains:). registry может добавлять
 * новые домены-«пакеты» и переопределять label/kind встроенных.
 * Формат domains: список строк ["base", ...] ИЛИ объектов {id,label,kind,icon}.
 */
function resolveAgentDomainManifest(cmsConfigRoot) {
  const map = new Map();
  for (const id of AGENT_TYPE_DOMAINS) {
    const meta = BUILTIN_DOMAIN_META[id] || {};
    map.set(id, { id, label: meta.label || id, kind: meta.kind || "type", builtin: true });
  }
  if (cmsConfigRoot) {
    try {
      const registry = loadYamlFileSync(path.join(cmsConfigRoot, "registry.yml"), {});
      const declared = Array.isArray(registry?.domains) ? registry.domains : [];
      for (const raw of declared) {
        const entry = normalizeDomainEntry(raw);
        if (!entry) continue;
        const existing = map.get(entry.id);
        if (existing) {
          if (entry.label) existing.label = entry.label;
          if (entry.kind) existing.kind = entry.kind;
          if (entry.icon) existing.icon = entry.icon;
          if (entry.extends) existing.extends = entry.extends;
          if (entry.prefix) existing.prefix = entry.prefix;
        } else {
          map.set(entry.id, {
            id: entry.id,
            label: entry.label || entry.id,
            kind: entry.kind || "type",
            icon: entry.icon,
            extends: entry.extends,
            prefix: entry.prefix,
            builtin: false
          });
        }
      }
    } catch {}
  }
  return [...map.values()];
}

const BUILTIN_KIND_META = {
  base: { label: "База", badge: { background: "#eef2ff", border: "#a5b4fc", text: "#3730a3" } },
  entity: { label: "Сущность", badge: { background: "#f5f3ff", border: "#c4b5fd", text: "#5b21b6" } },
  type: { label: "Тип", badge: { background: "#ecfdf5", border: "#86efac", text: "#166534" } },
  slot: { label: "Слот", badge: { background: "#f0fdfa", border: "#5eead4", text: "#0f766e" } },
  field: { label: "Поле", badge: { background: "#fefce8", border: "#fde047", text: "#854d0e" } },
  view: { label: "Вид", badge: { background: "#dbeafe", border: "#93c5fd", text: "#1e40af" } },
  taxonomy: { label: "Таксономия", badge: { background: "#ffe4e6", border: "#fda4af", text: "#9f1239" } },
  block: { label: "Блок", badge: { background: "#fdf2f8", border: "#f9a8d4", text: "#9d174d" } },
  mixin: { label: "Миксин", badge: { background: "#f8fafc", border: "#cbd5e1", text: "#475569" } },
  meta: { label: "Мета", badge: { background: "#f0fdf4", border: "#86efac", text: "#15803d" } },
  preset: { label: "Пресет", badge: { background: "#fff7ed", border: "#fb923c", text: "#c2410c" } },
  "data-container": { label: "Store", badge: { background: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" } },
  "data-element": { label: "Запись", badge: { background: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e" } },
  collection: { label: "Коллекция", badge: { background: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" } },
  single: { label: "Одиночка", badge: { background: "#ecfeff", border: "#a5f3fc", text: "#0e7490" } },
  group: { label: "Группа", badge: { background: "#ecfdf5", border: "#a7f3d0", text: "#047857" } }
};

function normalizeKindBadge(raw) {
  if (!raw || typeof raw !== "object") return null;
  const background = String(raw.background || raw.bg || "").trim();
  const border = String(raw.border || "").trim();
  const text = String(raw.text || raw.color || "").trim();
  if (!background && !border && !text) return null;
  return {
    ...(background ? { background } : {}),
    ...(border ? { border } : {}),
    ...(text ? { text } : {})
  };
}

function extractKindUiFromSchema(schema, entryKind = "") {
  const raw = schema?.["kind-ui"] || schema?.kindUi;
  if (!raw || typeof raw !== "object") return null;
  const label = String(raw.label || raw.name || "").trim();
  const badge = normalizeKindBadge(raw.badge);
  const forKind = String(raw.for || raw.kind || entryKind || "").trim();
  if (!forKind && !label && !badge) return null;
  return { forKind: forKind || String(entryKind || "").trim(), label, badge };
}

/** Метаданные kind (label + badge) — kind-ui на базовых типах YAML, fallback BUILTIN_KIND_META. */
function resolveKindManifestFromCatalog(byId) {
  const map = new Map();
  for (const [id, meta] of Object.entries(BUILTIN_KIND_META)) {
    map.set(id, { id, label: meta.label, badge: { ...meta.badge }, builtin: true, source: null });
  }
  if (byId && typeof byId.values === "function") {
    for (const entry of byId.values()) {
      if (!entry || entry.aliasOf) continue;
      const schema = entry.schema || {};
      const extracted = extractKindUiFromSchema(schema, entry.kind || schema.kind);
      if (!extracted?.forKind) continue;
      const targetKind = extracted.forKind;
      const existing = map.get(targetKind) || { id: targetKind, builtin: false };
      if (extracted.label) existing.label = extracted.label;
      if (extracted.badge) existing.badge = { ...(existing.badge || {}), ...extracted.badge };
      existing.source = entry.id;
      existing.builtin = false;
      map.set(targetKind, existing);
    }
  }
  const out = {};
  for (const [id, meta] of map.entries()) out[id] = meta;
  return out;
}

/** @deprecated use resolveKindManifestFromCatalog */
function resolveAgentKindManifest(cmsConfigRoot) {
  void cmsConfigRoot;
  return resolveKindManifestFromCatalog(loadTypeCatalog(process.cwd(), "").byId);
}

function ingestLegacyPlatformYamlTypes(coreRoot, domain, byId, byDomain) {
  const legacyDir = path.join(coreRoot, "types", domain, "awn-storage", "configuration", "types");
  return ingestYamlDomainTypes(legacyDir, domain, "platform", byId, byDomain);
}

const DEFAULT_AGENT_SETTINGS_REGISTRY = {
  description: "",
  schema: {
    platform: {
      type: "awn.settings.platform",
      path: "awn-system/types/settings/platform.yml"
    },
    workspace: {
      type: "awn.settings.workspace",
      path: "awn-system/types/settings/workspace.yml"
    },
    user: {
      type: "awn.settings.user",
      path: "awn-system/types/settings/user.yml"
    },
    integrations: {
      type: "awn.settings.integrations",
      path: "awn-system/types/settings/integrations.yml"
    }
  },
  values: {
    platform: ".agent-cms-global/settings/platform.yml",
    workspace: ".agent-cms/settings/workspace.yml",
    user: ".agent-cms/settings/user.yml",
    integrations: ".agent-cms/settings/integrations.yml"
  }
};

function normalizeAgentSettingsRegistry(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const schema = source.schema && typeof source.schema === "object" ? source.schema : {};
  const values = source.values && typeof source.values === "object" ? source.values : {};
  const platformSchema =
    schema.platform && typeof schema.platform === "object"
      ? schema.platform
      : schema.global && typeof schema.global === "object"
        ? schema.global
        : {};
  const workspaceSchema =
    schema.workspace && typeof schema.workspace === "object"
      ? schema.workspace
      : schema.local && typeof schema.local === "object"
        ? schema.local
        : {};
  const userSchema =
    schema.user && typeof schema.user === "object" ? schema.user : {};
  const integrationsSchema =
    schema.integrations && typeof schema.integrations === "object" ? schema.integrations : {};
  return {
    description: String(source.description || "").trim(),
    schema: {
      platform: {
        ...DEFAULT_AGENT_SETTINGS_REGISTRY.schema.platform,
        ...platformSchema
      },
      workspace: {
        ...DEFAULT_AGENT_SETTINGS_REGISTRY.schema.workspace,
        ...workspaceSchema
      },
      user: {
        ...DEFAULT_AGENT_SETTINGS_REGISTRY.schema.user,
        ...userSchema
      },
      integrations: {
        ...DEFAULT_AGENT_SETTINGS_REGISTRY.schema.integrations,
        ...integrationsSchema
      }
    },
    values: {
      platform:
        values.platform || values.global || DEFAULT_AGENT_SETTINGS_REGISTRY.values.platform,
      workspace:
        values.workspace || values.local || DEFAULT_AGENT_SETTINGS_REGISTRY.values.workspace,
      user: values.user || DEFAULT_AGENT_SETTINGS_REGISTRY.values.user,
      integrations: values.integrations || DEFAULT_AGENT_SETTINGS_REGISTRY.values.integrations
    }
  };
}

/**
 * Реестр двух моделей настроек (global/local) из awn-system/registry.yml → settings:
 */
function resolveAgentSettingsRegistry(cmsConfigRoot) {
  if (!cmsConfigRoot) return normalizeAgentSettingsRegistry();
  try {
    const registry = loadYamlFileSync(path.join(cmsConfigRoot, "registry.yml"), {});
    return normalizeAgentSettingsRegistry(registry?.settings);
  } catch {
    return normalizeAgentSettingsRegistry();
  }
}

function resolveAgentDomainIds(cmsConfigRoot) {
  return resolveAgentDomainManifest(cmsConfigRoot).map((d) => d.id);
}

function loadTypeCatalog(projectRoot = process.cwd(), agentRoot = "") {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  const coreSystemRoot = path.join(coreRoot, AGENT_SYSTEM_REL);
  const agentSystemRoot = agentRootAbs ? getAgentSystemAbsolute(agentRootAbs) : "";
  const coreUsesYaml = agentSystemDirExists(coreRoot);
  const byId = new Map();
  const byDomain = {};
  const sources = coreUsesYaml
    ? ["platform:agent-cms-core/awn-system/types"]
    : ["platform:agent-cms-core/awn-databases"];
  const platformExtraDomains = ["mixins", "settings", "md-blocks", "database", "presets"];

  if (coreUsesYaml) {
    for (const domain of TYPE_DOMAINS) {
      ingestYamlDomainTypes(
        path.join(coreSystemRoot, "types", getTypeDomainDirName(domain)),
        domain,
        "platform",
        byId,
        byDomain
      );
    }
    for (const domain of platformExtraDomains) {
      ingestYamlDomainTypes(
        path.join(coreSystemRoot, "types", getTypeDomainDirName(domain)),
        domain,
        "platform",
        byId,
        byDomain
      );
    }
    for (const domain of ["fields"]) {
      if ((byDomain[domain] || []).length) continue;
      ingestLegacyPlatformYamlTypes(coreRoot, domain, byId, byDomain);
    }
  } else {
    for (const domain of TYPE_DOMAINS) {
      ingestDomainTypesFromAwnData(projectRoot, domain, "platform", byId, byDomain, coreRoot);
    }
    for (const domain of platformExtraDomains) {
      ingestDomainTypesFromAwnData(projectRoot, domain, "platform", byId, byDomain, coreRoot);
    }
  }

  const isCoreAgent =
    agentSystemRoot &&
    cmsConfigExists(agentRootAbs, projectRoot) &&
    path.resolve(agentSystemRoot) !== path.resolve(coreSystemRoot);

  if (isCoreAgent && agentSystemDirExists(agentRootAbs)) {
    sources.push(`${AGENT_SYSTEM_REL}:agent`);
    for (const domain of resolveAgentDomainIds(agentSystemRoot)) {
      ingestYamlDomainTypes(getAgentSystemTypesDir(agentRootAbs, domain), domain, "agent", byId, byDomain);
    }
  } else if (isCoreAgent) {
    sources.push("awn-databases/cms-base:agent");
    for (const domain of resolveAgentDomainIds(getCmsConfigAbsolute(agentRootAbs))) {
      ingestDomainTypesFromAwnData(projectRoot, domain, "agent", byId, byDomain, agentRootAbs);
    }
  }

  applyTypeAliases(byId);
  aliasLegacyTypeDomains(byDomain);

  return {
    coreRoot,
    agentRoot: agentRootAbs,
    agentSystemRoot: agentSystemRoot || getCmsConfigAbsolute(coreRoot),
    sources,
    byId,
    byDomain
  };
}

/** Legacy domain filters / menus still use infoblock | data. */
function aliasLegacyTypeDomains(byDomain) {
  const db = byDomain.database;
  if (Array.isArray(db) && db.length) {
    if (!byDomain.infoblock?.length) byDomain.infoblock = db;
    if (!byDomain.data?.length) byDomain.data = db;
  }
}

function normalizeTypeDomainFilter(domain) {
  const d = String(domain || "").trim();
  if (d === "infoblock" || d === "data") return "database";
  return d;
}

function applyTypeAliases(byId) {
  for (const [aliasId, canonicalId] of Object.entries(TYPE_ID_ALIASES)) {
    if (byId.has(aliasId)) continue;
    const canonical = byId.get(canonicalId);
    if (!canonical) continue;
    byId.set(aliasId, {
      ...canonical,
      id: aliasId,
      aliasOf: canonicalId,
      schema: canonical.schema ? { ...canonical.schema, id: aliasId } : canonical.schema
    });
  }
}

function resolveCanonicalTypeId(typeId, byId) {
  const raw = String(typeId || "").trim();
  if (!raw) return "";
  if (byId.has(raw)) {
    const entry = byId.get(raw);
    return entry?.aliasOf || raw;
  }
  return TYPE_ID_ALIASES[raw] || raw;
}

function mergeFieldGroupDefinitions(parentGroups, childGroups) {
  const byId = new Map();
  const order = [];
  for (const groups of [parentGroups, childGroups]) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!group?.id) continue;
      const id = String(group.id);
      if (!byId.has(id)) order.push(id);
      byId.set(id, { ...(byId.get(id) || {}), ...group, id });
    }
  }
  return order.length ? order.map((id) => byId.get(id)) : null;
}

function applyCatalogMixinFields(merged, byId) {
  const mixinIds = Array.isArray(merged.mixins) ? merged.mixins : [];
  if (!mixinIds.length) return;
  merged.fields = { ...(merged.fields || {}) };
  for (const mixinId of mixinIds) {
    const mixinEntry = byId.get(mixinId);
    const mixinFields =
      mixinEntry?.schema?.fields && typeof mixinEntry.schema.fields === "object"
        ? mixinEntry.schema.fields
        : null;
    if (!mixinFields) continue;
    for (const [fieldKey, patch] of Object.entries(mixinFields)) {
      merged.fields[fieldKey] = { ...(merged.fields[fieldKey] || {}), ...patch };
    }
  }
}

function mergeTypeSchema(entry, byId, visited = new Set()) {
  if (!entry || visited.has(entry.id)) return {};
  visited.add(entry.id);

  let merged = {};
  if (entry.extends) {
    const parent = byId.get(entry.extends);
    if (parent) merged = { ...mergeTypeSchema(parent, byId, visited), ...merged };
  }

  const schema = entry.schema && typeof entry.schema === "object" ? { ...entry.schema } : {};
  const schemaFields =
    (schema.fields && typeof schema.fields === "object" ? schema.fields : null) ||
    (schema["awn-fields"] && typeof schema["awn-fields"] === "object" ? schema["awn-fields"] : null);
  if (schema.properties && typeof schema.properties === "object") {
    merged.properties = { ...(merged.properties || {}), ...schema.properties };
    if (!merged.fields || !Object.keys(merged.fields).length) {
      merged.fields = { ...(merged.fields || {}), ...schema.properties };
    }
  }
  if (Array.isArray(schema.mixins)) {
    merged.mixins = [...new Set([...(merged.mixins || []), ...schema.mixins])];
  }
  applyCatalogMixinFields(merged, byId);
  if (schemaFields) {
    merged.fields = { ...(merged.fields || {}) };
    for (const [fieldKey, patch] of Object.entries(schemaFields)) {
      merged.fields[fieldKey] = { ...(merged.fields[fieldKey] || {}), ...patch };
    }
  }
  for (const [key, value] of Object.entries(schema)) {
    if (["fields", "awn-fields", "properties", "mixins", "extends", "status"].includes(key)) continue;
    if (key === "field-groups") {
      merged["field-groups"] = mergeFieldGroupDefinitions(merged["field-groups"], value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function isTypeActive(entry) {
  if (!entry) return false;
  return ACTIVE_STATUS.has(String(entry.status || "active").trim());
}

function isCatalogType(entry) {
  if (!entry || !isTypeActive(entry)) return false;
  if (entry.domain === "slots" && entry.kind === "slot" && entry.fileName !== "_base" && entry.id !== "awn.slot") {
    return true;
  }
  const baseNames = new Set(["_base", "base", "table.base", "row.base"]);
  if (baseNames.has(entry.fileName)) return false;
  if (entry.kind === "entity" || entry.kind === "base" || entry.kind === "table" || entry.kind === "row" || entry.kind === "component") return false;
  return true;
}

function inheritsFrom(typeId, ancestorId, byId) {
  const seen = new Set();
  let current = byId.get(typeId);
  while (current && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id);
    if (!current.extends) break;
    current = byId.get(current.extends);
  }
  return false;
}

function getPageTreeRootId(byId) {
  if (byId.has("awn.page.base")) return "awn.page.base";
  if (byId.has("awn.row.base")) return "awn.row.base";
  if (byId.has("awn.base")) return "awn.base";
  if (byId.has("awn.page")) return "awn.page";
  return null;
}

function isPageTreeType(typeId, byId) {
  const root = getPageTreeRootId(byId);
  if (!root || !typeId) return false;
  if (typeId === root) return true;
  return inheritsFrom(typeId, root, byId);
}

function getActiveTypes(projectRoot, domain = null, kind = null, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const pool = domain ? byDomain[domain] || [] : [...byId.values()];
  return pool.filter((entry) => {
    if (!isCatalogType(entry)) return false;
    if (kind && entry.kind !== kind) return false;
    return true;
  });
}

function toTypeBrowseEntry(entry, byId, pageRoot) {
  if (!entry || !isTypeActive(entry)) return null;
  return {
    id: entry.id,
    domain: entry.domain,
    fileName: entry.fileName,
    catalogFile:
      entry.catalogFile ||
      `awn-databases/${DOMAIN_TYPE_STORES[entry.domain] || entry.domain}/${entry.relPath || entry.fileName}.md`,
    source: entry.source || "platform",
    kind: entry.kind || entry.schema?.kind || null,
    status: entry.status,
    extends: entry.extends,
    name: entry.schema?.name || entry.id,
    description: entry.schema?.description || "",
    relPath: entry.relPath,
    registrable: isCatalogType(entry),
    inPageTree: pageRoot ? inheritsFrom(entry.id, pageRoot, byId) : false
  };
}

function getTypeCatalogIndexPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const { byId, byDomain, coreRoot, agentSystemRoot, sources } = catalog;
  const types = [];

  for (const entry of byId.values()) {
    if (entry.aliasOf || !isCatalogType(entry)) continue;
    const schema = entry.schema || {};
    types.push({
      id: entry.id,
      name: schema.name || entry.id,
      domain: entry.domain,
      kind: entry.kind || schema.kind || null,
      status: entry.status || schema.status || "active",
      extends: entry.extends || schema.extends || null,
      source: entry.source || "platform",
      catalogFile: entry.catalogFile || null,
      description: schema.description || ""
    });
  }

  types.sort((a, b) => String(a.domain).localeCompare(String(b.domain), "ru") || String(a.id).localeCompare(String(b.id), "ru"));

  const domains = {};
  for (const [domain, entries] of Object.entries(byDomain)) {
    const active = entries.filter((e) => !e.aliasOf && isCatalogType(e));
    domains[domain] = {
      count: active.length,
      ids: active.map((e) => e.id)
    };
  }

  return {
    specVersion: "1.1",
    model: "type-catalog-index",
    mode: "index",
    coreRoot: coreRoot.replace(/\\/g, "/"),
    agentSystemRoot: agentSystemRoot ? agentSystemRoot.replace(/\\/g, "/") : null,
    sources,
    typeCount: types.length,
    domains,
    types,
    hint:
      "Slim index без merged schema. Детали: get_type(id) или GET /api/agent-system/type?id="
  };
}

const SLOT_CONTENT_TYPE_IDS = new Set([
  "awn.content.record",
  "awn.content.category",
  "awn.content.sidecar"
]);

function getTypesListPayload(projectRoot = process.cwd(), agentRoot = "", options = {}) {
  const domainFilter = normalizeTypeDomainFilter(options.domain);
  const kindFilter = String(options.kind || "").trim();
  const preset = String(options.filter || "").trim().toLowerCase();
  const index = getTypeCatalogIndexPayload(projectRoot, agentRoot);
  let types = index.types.slice();

  if (preset === "create-page") {
    const catalog = loadTypeCatalog(projectRoot, agentRoot);
    const createIds = new Set();
    for (const entry of catalog.byId.values()) {
      if (entry.aliasOf || !isTypeActive(entry)) continue;
      if (entry.schema?.["create-node-group"]) createIds.add(entry.id);
    }
    types = types.filter((t) => createIds.has(t.id));
    return {
      specVersion: "1.0",
      model: "types-list",
      filter: "create-page",
      typeCount: types.length,
      types,
      groups: getCreateNodeTypesPayload(projectRoot, agentRoot).groups,
      hint: "Детали типа: get_type(id)."
    };
  }

  if (preset === "slot-content") {
    types = types.filter((t) => SLOT_CONTENT_TYPE_IDS.has(t.id));
    return {
      specVersion: "1.0",
      model: "types-list",
      filter: "slot-content",
      typeCount: types.length,
      types,
      hint: "Детали: get_type(id). Слоты: get_canonical_model."
    };
  }

  if (preset === "data-containers") {
    types = types.filter(
      (t) =>
        t.kind === "frame" ||
        t.kind === "frame-base" ||
        t.kind === "data-container" ||
        ((t.domain === "database" || t.domain === "infoblock") &&
          String(t.id || "").startsWith("awn.database.frame."))
    );
    return {
      specVersion: "1.0",
      model: "types-list",
      filter: "data-containers",
      typeCount: types.length,
      types,
      hint: "Детали: get_type(id)."
    };
  }

  if (preset === "data-elements") {
    types = types.filter(
      (t) =>
        t.kind === "element" ||
        t.kind === "element-base" ||
        t.kind === "data-element" ||
        String(t.id || "").startsWith("awn.database.element.") ||
        String(t.id || "").startsWith("awn.infoblock.element.")
    );
    return {
      specVersion: "1.0",
      model: "types-list",
      filter: "data-elements",
      typeCount: types.length,
      types,
      hint: "Детали: get_type(id)."
    };
  }

  if (domainFilter) {
    types = types.filter((t) => t.domain === domainFilter);
  }
  if (kindFilter) {
    types = types.filter((t) => String(t.kind || "") === kindFilter);
  }

  return {
    specVersion: "1.0",
    model: "types-list",
    domain: domainFilter || null,
    kind: kindFilter || null,
    filter: null,
    typeCount: types.length,
    domains: index.domains,
    types,
    hint: "Slim index. Детали: get_type(id) или GET /api/agent-system/type?id="
  };
}

function getTypeCatalogPayload(projectRoot = process.cwd(), agentRoot = "", options = {}) {
  const mode = String(options?.mode || "full").trim().toLowerCase();
  if (mode === "index") return getTypeCatalogIndexPayload(projectRoot, agentRoot);
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const { byId, byDomain, coreRoot, agentSystemRoot, sources } = catalog;
  const pageRoot = getPageTreeRootId(byId);

  const browseTypes = [];
  const types = [];
  for (const entry of byId.values()) {
    if (entry.aliasOf) continue;
    const browseEntry = toTypeBrowseEntry(entry, byId, pageRoot);
    if (browseEntry) browseTypes.push(browseEntry);
    if (!isCatalogType(entry)) continue;
    types.push({
      ...browseEntry,
      schema: mergeTypeSchema(entry, byId)
    });
  }

  const byKind = {};
  for (const t of types) {
    const k = t.kind || "unknown";
    if (!byKind[k]) byKind[k] = [];
    byKind[k].push(t.id);
  }

  const domains = {};
  for (const [domain, entries] of Object.entries(byDomain)) {
    domains[domain] = entries.map((e) => ({
      id: e.id,
      fileName: e.fileName,
      status: e.status,
      active: isCatalogType(e)
    }));
  }

  return {
    specVersion: "1.1",
    model: "type-catalog",
    coreRoot: coreRoot.replace(/\\/g, "/"),
    agentSystemRoot: agentSystemRoot ? agentSystemRoot.replace(/\\/g, "/") : null,
    sources,
    pageTreeRoot: pageRoot,
    domains,
    kinds: resolveKindManifestFromCatalog(byId),
    types,
    browseTypes,
    foundationTypes: collectFoundationTypes(byId, pageRoot),
    byKind
  };
}

function isFoundationType(entry) {
  if (!entry || !isTypeActive(entry)) return false;
  if (entry.domain === "slots") {
    return entry.fileName === "_base" || entry.id === "awn.slot";
  }
  if (entry.kind === "entity" || entry.kind === "base" || entry.kind === "table" || entry.kind === "row") return true;
  const baseNames = new Set(["_base", "base", "table.base", "row.base"]);
  return baseNames.has(entry.fileName);
}

function collectFoundationTypes(byId, pageRoot) {
  const out = [];
  for (const entry of byId.values()) {
    if (entry.aliasOf || !isFoundationType(entry)) continue;
    const browseEntry = toTypeBrowseEntry(entry, byId, pageRoot);
    if (!browseEntry) continue;
    const merged = mergeTypeSchema(entry, byId);
    out.push({
      ...browseEntry,
      kind: entry.kind || merged.kind || "base",
      fieldCount: merged.fields ? Object.keys(merged.fields).length : 0
    });
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), "ru"));
}

function stripTypePathExt(catalogPath) {
  return String(catalogPath || "").replace(/\.(ya?ml|md)$/i, "");
}

function findTypeEntryByCatalogPath(byId, catalogPath) {
  const raw = String(catalogPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!raw) return null;

  const legacy = normalizeLegacyCatalogPath(catalogPath);
  const rawBare = stripTypePathExt(raw);
  const legacyBare = stripTypePathExt(legacy);

  for (const entry of byId.values()) {
    const entryPath = String(entry.catalogFile || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!entryPath) continue;
    if (entryPath === raw || entryPath === legacy) return entry;
    const entryLegacy = normalizeLegacyCatalogPath(entryPath);
    if (legacy && entryLegacy === legacy) return entry;
    if (entryLegacy === raw) return entry;
    // Agents often pass catalog paths without extension (…/area vs …/area.yml).
    const entryBare = stripTypePathExt(entryPath);
    const entryLegacyBare = stripTypePathExt(entryLegacy);
    if (entryBare === rawBare || (legacyBare && entryBare === legacyBare)) return entry;
    if (legacyBare && entryLegacyBare === legacyBare) return entry;
    if (entryLegacyBare === rawBare) return entry;
  }
  return null;
}

function getTypeDetailByTypeId(projectRoot = process.cwd(), agentRoot = "", typeId = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const canonicalId = resolveCanonicalTypeId(typeId, byId);
  if (!canonicalId) return null;
  const entry = byId.get(canonicalId);
  if (!entry?.catalogFile) return null;
  return getTypeDetailByCatalogPath(projectRoot, agentRoot, entry.catalogFile);
}

function buildInheritanceChain(entry, byId) {
  const chain = [];
  const seen = new Set();
  let current = entry;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push({
      id: current.id,
      name: current.schema?.name || current.id,
      kind: current.kind || current.schema?.kind || null,
      catalogFile: current.catalogFile || null
    });
    if (!current.extends) break;
    current = byId.get(current.extends);
  }
  return chain;
}

function splitOwnAndInheritedFields(entry, byId) {
  const merged = mergeTypeSchema(entry, byId);
  const mergedFields =
    merged.fields && typeof merged.fields === "object" ? { ...merged.fields } : {};
  const ownFields =
    entry.schema?.fields && typeof entry.schema.fields === "object" ? { ...entry.schema.fields } : {};
  const inheritedFields = {};

  const assignInheritedFrom = (typeId) => {
    const typeEntry = byId.get(typeId);
    if (!typeEntry) return;
    const own =
      typeEntry.schema?.fields && typeof typeEntry.schema.fields === "object"
        ? typeEntry.schema.fields
        : {};
    for (const [key, def] of Object.entries(own)) {
      if (ownFields[key] || inheritedFields[key]) continue;
      inheritedFields[key] = { ...def, fromType: typeId };
    }
    if (typeEntry.extends) assignInheritedFrom(typeEntry.extends);
  };

  if (entry.extends) assignInheritedFrom(entry.extends);

  return { mergedFields, ownFields, inheritedFields };
}

/**
 * Что в рантайме РЕАЛЬНО читает этот тип: список потребителей + флаг wired.
 * Отвечает на вопрос «влияет он на систему или это просто данные для агента».
 */
function getTypeUsage(entry, merged, byId) {
  const consumers = [];
  let wired = false;
  let note = "";

  if (isFoundationType(entry)) {
    let children = 0;
    for (const e of byId.values()) {
      if (!e.aliasOf && e.extends === entry.id) children += 1;
    }
    if (children > 0) {
      consumers.push(`фундамент — наследуется типами (${children})`);
      wired = true;
    } else {
      note = "фундамент, но никто от него не наследует";
    }
    return { wired, consumers, note };
  }

  switch (entry.domain) {
    case "fields": {
      if (merged.widget) {
        consumers.push(`формы (виджет «${merged.widget}»)`);
        wired = true;
      } else {
        note = "нет widget — получит дефолтный ввод";
      }
      break;
    }
    case "slots": {
      // Реальность: набор слотов в дереве фиксирован рантаймом (скан папок
      // awn-storage). Тип слота — декларация/документация: словарь драйвера
      // (internal/external/tabular) совпадает с формами памяти в счётчике узла,
      // но сам тип рантайм в дерево не подставляет.
      const driver = merged["storage-driver"];
      if (driver) {
        const ru = { internal: "Однофайловая", external: "Многофайловая", tabular: "Табличная" };
        note = `декларирует драйвер «${driver}» (${ru[driver] || driver}); набор слотов в дереве фиксирован рантаймом`;
      } else {
        note = "набор слотов в дереве фиксирован рантаймом — тип слота пока декларация";
      }
      break;
    }
    case "md-blocks": {
      const render = merged.render || "template";
      if (merged.template || merged.text) {
        consumers.push("палитра блоков редактора");
        wired = true;
      } else note = "нет template — нечего вставлять";
      if (render === "fence") {
        if (merged.renderer) consumers.push(`JS-рендер (${merged.renderer})`);
        else note = (note ? note + "; " : "") + "render: fence без renderer";
      }
      break;
    }
    case "database":
    case "infoblock":
    case "data": {
      const storeKind =
        merged["awn-store-kind"] ||
        merged["store-kind"] ||
        (String(entry.id || "").match(/^awn\.(?:database|infoblock)\.(?:frame\.)?(group|collection|single)$/) ||
          [])[2] ||
        (String(entry.id || "").match(/^awn\.(?:database|infoblock)\.(group|collection|single)$/) || [])[1];
      if (storeKind) {
        consumers.push(`database_frame_create (${storeKind})`);
        wired = true;
      }
      if (entry.kind === "data-element") {
        consumers.push("схема записей store (schema.yml)");
        wired = true;
      }
      if (!consumers.length) note = "тип контейнера без полей / kind";
      break;
    }
    case "taxonomies": {
      if (merged["props-field"]) {
        consumers.push(`поле темы «${merged["props-field"]}»`);
        wired = true;
      }
      if (merged["data-path"]) consumers.push("справочник (awn-databases)");
      if (merged["create-node-group"]) consumers.push("меню «создать»");
      if (!consumers.length) note = "нет props-field/data-path — ни к чему не привязан";
      break;
    }
    case "pages":
    case "content": {
      consumers.push("узлы дерева / формы (по полям типа)");
      wired = true;
      if (merged["create-node-group"]) consumers.push("меню «создать»");
      break;
    }
    case "mixins": {
      let users = 0;
      for (const e of byId.values()) {
        if (e.aliasOf) continue;
        const m = e.schema && e.schema.mixins;
        if (Array.isArray(m) && m.includes(entry.id)) users += 1;
      }
      if (users > 0) {
        consumers.push(`подмешивается в типы (${users})`);
        wired = true;
      } else note = "никакой тип не подключает этот миксин";
      break;
    }
    default:
      note = "данные для агента (рантайм CMS их не читает)";
  }

  if (!consumers.length && !note) {
    note = "данные для агента (рантайм CMS их не читает)";
  }
  return { wired, consumers, note };
}

function getTypeDetailByCatalogPath(projectRoot = process.cwd(), agentRoot = "", catalogPath = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const entry = findTypeEntryByCatalogPath(byId, catalogPath);
  if (!entry) return null;

  const merged = mergeTypeSchema(entry, byId);
  const { mergedFields, ownFields, inheritedFields } = splitOwnAndInheritedFields(entry, byId);
  const chain = buildInheritanceChain(entry, byId);

  return {
    path: entry.catalogFile || String(catalogPath || "").replace(/\\/g, "/"),
    id: entry.id,
    name: merged.name || entry.id,
    kind: merged.kind || entry.kind || null,
    domain: entry.domain,
    status: entry.status,
    extends: entry.extends || merged.extends || null,
    mixins: Array.isArray(merged.mixins) ? [...merged.mixins] : [],
    description: merged.description || "",
    catalogFile: entry.catalogFile,
    source: entry.source || "platform",
    isFoundation: isFoundationType(entry),
    inheritanceChain: chain,
    // Собственные (не унаследованные) скаляры типа — для доменных контролов формы
    // (contentMode, widget, template, data-path…). Показывают реальные значения.
    schema: entry.schema && typeof entry.schema === "object" ? { ...entry.schema } : {},
    mergedSchema: merged,
    ownFields,
    inheritedFields,
    mergedFields,
    fieldCount: Object.keys(mergedFields).length,
    ownFieldCount: Object.keys(ownFields).length,
    storageSlots: Array.isArray(merged["storage-slots"]) ? [...merged["storage-slots"]] : [],
    manifestPattern: merged["manifest-pattern"] || null,
    usage: getTypeUsage(entry, merged, byId)
  };
}

function toRecordTypeDef(entry, byId) {
  const merged = mergeTypeSchema(entry, byId);
  return {
    id: entry.id,
    name: merged.name || entry.id,
    kind: merged.kind || "type",
    extends: entry.extends || merged.extends || null,
    mixins: Array.isArray(merged.mixins) ? [...merged.mixins] : [],
    description: merged.description || "",
    fieldGroups: Array.isArray(merged.fieldGroups)
      ? [...merged.fieldGroups]
      : Array.isArray(merged["field-groups"])
        ? [...merged["field-groups"]]
        : null,
    form: merged.form && typeof merged.form === "object" ? { ...merged.form } : null,
    fields: merged.fields && typeof merged.fields === "object" ? { ...merged.fields } : {}
  };
}

function loadPageTypesFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const types = {};

  for (const domain of ["pages", "content", "database", "infoblock"]) {
    for (const entry of byDomain[domain] || []) {
      if (!isTypeActive(entry)) continue;
      const def = toRecordTypeDef(entry, byId);
      if (def.id) types[def.id] = def;
    }
  }

  // Lean core base (awn.base) — включаем явно, чтобы downstream-загрузчик
  // не подменял его полным awn.page.base через свой fallback.
  const leanBase = byId.get("awn.base");
  if (leanBase && isTypeActive(leanBase)) {
    types[leanBase.id] = toRecordTypeDef(leanBase, byId);
  }

  const base = byId.get("awn.page.base") || byId.get("awn.base") || byId.get("awn.page");
  if (base && isTypeActive(base)) {
    types[base.id] = toRecordTypeDef(base, byId);
  }

  for (const [aliasId, canonicalId] of Object.entries(TYPE_ID_ALIASES)) {
    if (types[aliasId] || !types[canonicalId]) continue;
    types[aliasId] = { ...types[canonicalId], id: aliasId };
  }

  const mixinEntries = [...byId.values()].filter((e) => e.kind === "mixin" && isTypeActive(e));
  for (const entry of mixinEntries) {
    types[entry.id] = toRecordTypeDef(entry, byId);
  }

  for (const domain of ["settings"]) {
    for (const entry of byDomain[domain] || []) {
      if (!isTypeActive(entry)) continue;
      const def = toRecordTypeDef(entry, byId);
      if (def.id) types[def.id] = def;
    }
  }

  return types;
}

function loadFieldTypesFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const registry = {};
  for (const entry of byDomain.fields || []) {
    if (!isCatalogType(entry) || entry.kind !== "field") continue;
    const merged = mergeTypeSchema(entry, byId);
    registry[entry.id] = {
      id: entry.id,
      name: merged.name || entry.id,
      kind: "field",
      group: merged.group || "misc",
      sort: Number(merged.sort) || 0,
      storage: merged.storage || "string",
      mdbase: merged.mdbase || entry.id.replace(/^awn\./, ""),
      widget: merged.widget || "input",
      description: merged.description || "",
      settings: Array.isArray(merged.settings) ? [...merged.settings] : undefined,
      format: merged.format,
      catalog: merged.catalog,
      presets: Array.isArray(merged.presets) ? merged.presets : undefined,
      dayModes: Array.isArray(merged["day-modes"])
        ? merged["day-modes"]
        : Array.isArray(merged.dayModes)
          ? merged.dayModes
          : undefined,
      items: merged.items,
      properties: merged.properties || merged.fields || undefined,
      accept: merged.accept,
      catalogDomain: "fields",
      catalogPath: entry.relPath
    };
  }
  return registry;
}

function loadFieldDefFromCatalog(projectRoot, agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const base = byId.get("awn.field.base") || byId.get("awn.field-def");
  if (!base) return null;
  const merged = mergeTypeSchema(base, byId);
  if (!merged.properties) return null;
  return {
    id: base.id || "awn.field.base",
    name: merged.name || "Мета-свойства поля",
    description: merged.description || "",
    properties: merged.properties
  };
}

function loadBlocksFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const blocksById = {};

  for (const entry of byDomain["md-blocks"] || []) {
    if (!isCatalogType(entry) || entry.kind !== "block") continue;
    const merged = mergeTypeSchema(entry, byId);
    let template = merged.template || merged.text || "";
    if (typeof template !== "string") template = "";
    template = template
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
    if (!template) continue;
    blocksById[entry.id] = {
      id: entry.id,
      name: merged.name || entry.id,
      kind: "block",
      group: merged.group || "misc",
      sort: Number(merged.sort) || 0,
      description: merged.description || "",
      icon: String(merged.icon || merged.emoji || "").trim(),
      template,
      render: String(merged.render || "template").trim(),
      fenceTag: String(merged["fence-tag"] || merged.fenceTag || "").trim(),
      renderer: String(merged.renderer || "").trim(),
      catalogPath: entry.relPath
    };
  }

  return blocksById;
}

function loadBlockGroupsFromCatalog(projectRoot, agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const groupsEntry = byId.get("awn.block.groups");
  const meta = groupsEntry?.schema || {};
  return {
    groupOrder: Array.isArray(meta.groupOrder) ? meta.groupOrder : [],
    groupNames: meta.groupNames && typeof meta.groupNames === "object" ? meta.groupNames : {}
  };
}

function loadFieldGroupsMetaFromCatalog(projectRoot, agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const groupsEntry = byId.get("awn.field.groups");
  const meta = groupsEntry?.schema || {};
  return {
    groupOrder: Array.isArray(meta.groupOrder) ? meta.groupOrder : [],
    groupNames: meta.groupNames && typeof meta.groupNames === "object" ? meta.groupNames : {}
  };
}

function buildFieldTypeGroups(registry, meta) {
  const grouped = new Map();
  for (const field of Object.values(registry || {})) {
    const groupId = field.group || "misc";
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(field);
  }

  const seen = new Set();
  const orderedGroupIds = [];
  for (const groupId of meta?.groupOrder || []) {
    if (grouped.has(groupId)) {
      orderedGroupIds.push(groupId);
      seen.add(groupId);
    }
  }
  for (const groupId of grouped.keys()) {
    if (!seen.has(groupId)) orderedGroupIds.push(groupId);
  }

  return orderedGroupIds.map((groupId) => ({
    id: groupId,
    title: meta?.groupNames?.[groupId] || groupId,
    fields: grouped
      .get(groupId)
      .slice()
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"))
      .map((field) => ({
        id: field.id,
        label: field.name,
        name: field.name,
        kind: field.kind,
        description: field.description,
        widget: field.widget,
        storeRel: field.storeRel || null
      }))
  }));
}

function loadFieldGroupsFromCatalog(projectRoot, agentRoot = "") {
  const registry = loadFieldTypesFromCatalog(projectRoot, agentRoot);
  if (!Object.keys(registry).length) return null;
  const meta = loadFieldGroupsMetaFromCatalog(projectRoot, agentRoot);
  return buildFieldTypeGroups(registry, meta);
}

/**
 * Проверка «здоровья» типов агента: битые extends, блоки без template,
 * блоки без template, поля без widget, несоответствие domain и т.п.
 * Используется UI (бейджи в дереве типов) и MCP (get_type_health).
 */
function getTypeHealth(projectRoot = process.cwd(), agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const issues = [];
  const add = (severity, entry, code, message) => {
    issues.push({
      severity,
      id: entry.id,
      domain: entry.domain,
      code,
      message,
      catalogFile: entry.catalogFile || null
    });
  };

  for (const entry of byId.values()) {
    if (entry.aliasOf) continue;
    const schema = entry.schema || {};
    const foundation = isFoundationType(entry);

    if (entry.extends && !byId.has(entry.extends)) {
      add("error", entry, "broken-extends", `extends «${entry.extends}» не найден — тип не наследует поля`);
    }
    if (schema.domain && String(schema.domain) !== entry.domain) {
      add("warn", entry, "domain-mismatch", `domain «${schema.domain}» ≠ папке «${entry.domain}»`);
    }
    if (!schema.name) {
      add("info", entry, "no-name", "нет человекочитаемого name");
    }

    if (foundation) continue;

    const isBlockConfig = schema.groupOrder || schema.groupNames;
    if (entry.domain === "md-blocks" && !isBlockConfig && !(schema.template || schema.text)) {
      add("warn", entry, "block-no-template", "блок без template ничего не вставит в редактор");
    }
    if (entry.domain === "fields" && !schema.widget) {
      add("info", entry, "field-no-widget", "поле без widget получит дефолтный ввод");
    }
    if (entry.domain === "slots" && !schema.path) {
      add("warn", entry, "slot-no-path", "слот без path не привязан к папке");
    }
  }

  issues.sort((a, b) => {
    const rank = { error: 0, warn: 1, info: 2 };
    return (rank[a.severity] - rank[b.severity]) || String(a.id).localeCompare(String(b.id), "ru");
  });

  const total = [...byId.values()].filter((e) => !e.aliasOf).length;
  const summary = {
    total,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
    info: issues.filter((i) => i.severity === "info").length,
    healthy: issues.filter((i) => i.severity === "error").length === 0
  };
  return { specVersion: "1.0", model: "type-health", summary, issues };
}

function getCreateNodeTypesPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const byGroup = new Map();
  for (const entry of catalog.byId.values()) {
    if (entry.aliasOf || !isTypeActive(entry)) continue;
    const schema = entry.schema || {};
    const group = schema["create-node-group"];
    if (!group) continue;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push({
      id: entry.id,
      name: schema["create-node-label"] || schema.name || entry.id,
      description: schema.description || "",
      slug: schema["create-node-slug"] || null,
      preset: schema["create-node-preset"] || null,
      order: typeof schema["create-node-order"] === "number" ? schema["create-node-order"] : 99,
      source: entry.source || "platform"
    });
  }
  const groups = [];
  for (const [groupId, types] of byGroup.entries()) {
    types.sort((a, b) => a.order - b.order || String(a.name).localeCompare(String(b.name), "ru"));
    groups.push({ id: groupId, types });
  }
  return { groups };
}

module.exports = {
  TYPE_ID_ALIASES,
  loadTypeCatalog,
  resolveAgentDomainManifest,
  resolveAgentKindManifest,
  resolveKindManifestFromCatalog,
  resolveAgentSettingsRegistry,
  resolveAgentDomainIds,
  mergeTypeSchema,
  isTypeActive,
  isCatalogType,
  inheritsFrom,
  isPageTreeType,
  getActiveTypes,
  getTypeCatalogPayload,
  getTypeCatalogIndexPayload,
  getTypesListPayload,
  getTypeDetailByCatalogPath,
  getTypeDetailByTypeId,
  getCreateNodeTypesPayload,
  getTypeHealth,
  isFoundationType,
  toRecordTypeDef,
  loadPageTypesFromCatalog,
  loadFieldTypesFromCatalog,
  loadFieldDefFromCatalog,
  loadBlocksFromCatalog,
  loadBlockGroupsFromCatalog,
  loadFieldGroupsFromCatalog,
  loadFieldGroupsMetaFromCatalog,
  buildFieldTypeGroups,
  getPageTreeRootId,
  resolveCanonicalTypeId
};
