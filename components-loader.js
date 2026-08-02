const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const { getComponentsAbsolute, COMPONENTS_REL } = require("./platform-sources");
const { STORAGE_ROOT_FOLDER, LEGACY_STORAGE_ROOT_FOLDER } = require("./manifest-paths");

const MANIFEST_FILE = "manifest.md";
const SCHEMA_CANDIDATES = [
  [STORAGE_ROOT_FOLDER, "configuration", "schema.yml"],
  [LEGACY_STORAGE_ROOT_FOLDER, "configuration", "schema.yml"],
  ["schema.yml"]
];

const WORKSPACE_STATUS_ACTIVE = "🟢 Открыта";
const LEGACY_ACTIVE = new Set(["active", "deprecated"]);

const AREA_AWN_TYPES = new Set(["awn.area", "awn.workspace", "awn.record.category"]);

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function getYamlScalar(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  let value = match[1].trim();
  if (value === "null") return "";
  return value.replace(/^["']|["']$/g, "");
}

function loadTopicSchema(topicDir) {
  for (const segments of SCHEMA_CANDIDATES) {
    const schemaPath = path.join(topicDir, ...segments);
    if (!fs.existsSync(schemaPath)) continue;
    try {
      return loadYamlFileSync(schemaPath, { idKey: "id", nameKey: "name" });
    } catch {
      return null;
    }
  }
  return null;
}

function inferRegistryKind(relPath, schema) {
  const schemaKind = String(schema?.kind || "").trim();
  if (schemaKind === "block") return "block";
  if (schemaKind === "field") return "field";
  if (schemaKind === "mixin") return "mixin";
  if (schemaKind === "type" || schemaKind === "base" || schemaKind === "component") return "frame";

  const top = String(relPath || "").split("/").filter(Boolean)[0] || "";
  if (top === "fields") return "field";
  if (top === "markdown-blocks" || top === "blocks") return "block";
  if (top === "frames" || top === "nodes") return "frame";
  if (top === "taxonomies") return "taxonomy";
  if (top === "agents") return "agent";
  return schemaKind || "unknown";
}

function schemaRuntimeId(schema) {
  return String(schema?.["runtime-id"] || schema?.id || "").trim();
}

function parseTopicManifest(manifestPath, componentsRoot) {
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);

  const awnType = getYamlScalar(frontmatter, "awn-type");
  const legacyComponent = getYamlScalar(frontmatter, "type") === "component";

  if (AREA_AWN_TYPES.has(awnType)) return null;
  if (awnType && awnType !== "awn.topic" && !legacyComponent) return null;
  if (!awnType && !legacyComponent) return null;

  const dir = path.dirname(manifestPath);
  const relPath = path.relative(componentsRoot, dir).replace(/\\/g, "/");
  if (!relPath || relPath === ".") return null;

  const schema = loadTopicSchema(dir);
  const registryKind = inferRegistryKind(relPath, schema);

  const legacyStatus = getYamlScalar(frontmatter, "status");
  const awnStatus =
    getYamlScalar(frontmatter, "awn-status") ||
    (LEGACY_ACTIVE.has(legacyStatus) ? WORKSPACE_STATUS_ACTIVE : "🟡 Черновик");

  const legacyExtends = getYamlScalar(frontmatter, "extends");
  const name =
    getYamlScalar(frontmatter, "awn-name") ||
    getYamlScalar(frontmatter, "name") ||
    path.basename(dir);

  return {
    id: getYamlScalar(frontmatter, "id") || relPath,
    relPath,
    registryKind,
    awnType: awnType || "awn.topic",
    awnStatus,
    runtimeId:
      getYamlScalar(frontmatter, "runtime-id") ||
      schemaRuntimeId(schema) ||
      "",
    extendsPath:
      legacyExtends && legacyExtends !== "null" ? legacyExtends.replace(/\\/g, "/") : null,
    name,
    description:
      getYamlScalar(frontmatter, "awn-description") ||
      getYamlScalar(frontmatter, "description") ||
      "",
    dir,
    manifestPath,
    body: String(body || "").trim(),
    schema
  };
}

function listTopicManifestPaths(componentsRoot, acc = []) {
  if (!componentsRoot || !fs.existsSync(componentsRoot)) return acc;
  for (const entry of fs.readdirSync(componentsRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "types") continue;
    const fullPath = path.join(componentsRoot, entry.name);
    if (entry.isDirectory()) listTopicManifestPaths(fullPath, acc);
    else if (entry.isFile() && entry.name === MANIFEST_FILE) acc.push(fullPath);
  }
  return acc;
}

function loadTopicsFromRoot(componentsRoot) {
  const byPath = new Map();
  for (const manifestPath of listTopicManifestPaths(componentsRoot)) {
    const parsed = parseTopicManifest(manifestPath, componentsRoot);
    if (!parsed) continue;
    byPath.set(parsed.id, parsed);
  }
  return byPath;
}

function resolveTopicByRef(ref, byPath, byRuntimeId) {
  const raw = String(ref || "").trim();
  if (!raw) return null;
  return byPath.get(raw) || byRuntimeId.get(raw) || null;
}

function mergeTopicChain(topic, byPath, byRuntimeId, visited = new Set()) {
  if (!topic || visited.has(topic.id)) return {};
  visited.add(topic.id);

  let merged = {};
  const schema = topic.schema && typeof topic.schema === "object" ? { ...topic.schema } : {};

  if (topic.extendsPath) {
    const parent = byPath.get(topic.extendsPath);
    if (parent) merged = { ...mergeTopicChain(parent, byPath, byRuntimeId, visited), ...merged };
  }
  if (schema.extends) {
    const parent = resolveTopicByRef(schema.extends, byPath, byRuntimeId);
    if (parent) merged = { ...mergeTopicChain(parent, byPath, byRuntimeId, visited), ...merged };
  }

  if (schema.fields && typeof schema.fields === "object") {
    merged.fields = { ...(merged.fields || {}), ...schema.fields };
  }
  if (Array.isArray(schema.mixins)) {
    merged.mixins = [...new Set([...(merged.mixins || []), ...schema.mixins])];
  }
  for (const [key, value] of Object.entries(schema)) {
    if (key === "fields" || key === "mixins" || key === "extends") continue;
    merged[key] = value;
  }
  return merged;
}

function isTopicActive(topic) {
  const status = String(topic?.awnStatus || "").trim();
  if (status === WORKSPACE_STATUS_ACTIVE) return true;
  return LEGACY_ACTIVE.has(String(topic?.status || "").trim());
}

function isRegistryTopic(topic) {
  if (!topic || !isTopicActive(topic)) return false;
  if (topic.relPath.endsWith("/_base") || topic.relPath.endsWith("/base")) return false;
  if (topic.schema?.kind === "base" || topic.schema?.kind === "component") return false;
  return true;
}

function buildRuntimeIdIndex(byPath) {
  const byRuntimeId = new Map();
  for (const topic of byPath.values()) {
    const runtimeId = topic.runtimeId || schemaRuntimeId(topic.schema);
    if (runtimeId) byRuntimeId.set(String(runtimeId), topic);
  }
  return byRuntimeId;
}

function loadComponentRegistry(projectRoot = process.cwd(), agentRoot = "") {
  const systemRoot = getComponentsAbsolute(projectRoot);
  const systemByPath = loadTopicsFromRoot(systemRoot);

  const agentByPath = new Map();
  if (agentRoot) {
    const agentComponentsRoot = path.join(agentRoot, "components");
    if (fs.existsSync(agentComponentsRoot)) {
      for (const [id, def] of loadTopicsFromRoot(agentComponentsRoot)) {
        agentByPath.set(id, def);
      }
    }
  }

  const merged = new Map(systemByPath);
  for (const [id, def] of agentByPath) merged.set(id, def);

  const byRuntimeId = buildRuntimeIdIndex(merged);
  const topics = [];

  for (const topic of merged.values()) {
    const mergedSchema = mergeTopicChain(topic, merged, byRuntimeId);
    topics.push({
      ...topic,
      mergedSchema,
      runtimeId:
        topic.runtimeId ||
        String(mergedSchema.id || "").trim() ||
        topic.id
    });
  }

  return {
    root: systemRoot,
    byId: merged,
    byPath: merged,
    byRuntimeId,
    components: topics,
    topics
  };
}

function getActiveComponents(projectRoot, agentRoot, registryKind = null) {
  const { topics } = loadComponentRegistry(projectRoot, agentRoot);
  return topics.filter((item) => {
    if (!isRegistryTopic(item)) return false;
    if (registryKind && item.registryKind !== registryKind) return false;
    return true;
  });
}

function getComponentsPayload(projectRoot = process.cwd(), agentRoot = "") {
  const { topics, root } = loadComponentRegistry(projectRoot, agentRoot);
  const active = topics.filter(isRegistryTopic);

  const byKind = {};
  for (const item of active) {
    if (!byKind[item.registryKind]) byKind[item.registryKind] = [];
    byKind[item.registryKind].push(item.id);
  }

  return {
    specVersion: "2.0",
    model: "awn.topic",
    activeStatus: WORKSPACE_STATUS_ACTIVE,
    source: COMPONENTS_REL.replace(/\\/g, "/"),
    root: root.replace(/\\/g, "/"),
    topics: active.map((item) => ({
      id: item.id,
      relPath: item.relPath,
      awnType: item.awnType,
      awnStatus: item.awnStatus,
      registryKind: item.registryKind,
      runtimeId: item.runtimeId,
      name: item.name,
      description: item.description,
      schema: item.mergedSchema
    })),
    components: active.map((item) => ({
      id: item.id,
      kind: item.registryKind,
      status: item.awnStatus,
      runtimeId: item.runtimeId,
      name: item.name,
      description: item.description,
      relDir: item.relPath,
      schema: item.mergedSchema
    })),
    byKind
  };
}

function resolveRuntimeId(topic) {
  return (
    String(topic.runtimeId || "").trim() ||
    schemaRuntimeId(topic.mergedSchema) ||
    topic.id
  );
}

function toRecordTypeDef(topic, byPath, byRuntimeId) {
  const schema = mergeTopicChain(topic, byPath, byRuntimeId);
  const runtimeId = resolveRuntimeId({ ...topic, mergedSchema: schema });

  let extendsId = null;
  if (schema.extends) extendsId = String(schema.extends);
  else if (topic.extendsPath) {
    const parent = byPath.get(topic.extendsPath);
    if (parent) extendsId = resolveRuntimeId({ ...parent, mergedSchema: mergeTopicChain(parent, byPath, byRuntimeId) });
  }

  return {
    id: runtimeId,
    name: topic.name || schema.name || runtimeId,
    kind: schema.kind || (topic.registryKind === "frame" ? "type" : topic.registryKind),
    extends: extendsId,
    mixins: Array.isArray(schema.mixins) ? [...schema.mixins] : [],
    description: topic.description || schema.description || "",
    fields: schema.fields && typeof schema.fields === "object" ? { ...schema.fields } : {}
  };
}

function loadRecordTypesFromComponents(projectRoot, agentRoot) {
  const { byPath, byRuntimeId, topics } = loadComponentRegistry(projectRoot, agentRoot);
  const types = {};

  for (const topic of topics) {
    if (!isRegistryTopic(topic)) continue;
    if (!["frame", "mixin"].includes(topic.registryKind)) continue;
    const def = toRecordTypeDef(topic, byPath, byRuntimeId);
    if (def.id) types[def.id] = def;
  }

  return types;
}

function loadFieldDefFromComponents(projectRoot, agentRoot) {
  const { byPath, byRuntimeId } = loadComponentRegistry(projectRoot, agentRoot);
  const base = byPath.get("fields/_base");
  if (!base) return null;
  const merged = mergeTopicChain(base, byPath, byRuntimeId);
  const properties = merged.properties;
  if (!properties || typeof properties !== "object") return null;
  return {
    id: base.runtimeId || merged.id || "awn.field-def",
    name: base.name || "Мета-свойства поля",
    description: base.description || "",
    properties
  };
}

module.exports = {
  MANIFEST_FILE,
  WORKSPACE_STATUS_ACTIVE,
  parseTopicManifest,
  loadComponentRegistry,
  getActiveComponents,
  getComponentsPayload,
  loadRecordTypesFromComponents,
  loadFieldDefFromComponents,
  mergeTopicChain,
  isTopicActive,
  isRegistryTopic,
  loadTopicSchema
};
