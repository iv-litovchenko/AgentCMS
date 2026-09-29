const { AsyncLocalStorage } = require("async_hooks");
const fs = require("fs");
const path = require("path");
const { DEPENDENCIES_CSV_FILE, isDependenciesCsvFileName } = require("../services/dependencies-service");
const {
  AREA_MANIFEST_CANDIDATES,
  AREA_MANIFEST_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_TODO_FILE,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_EXTENSIONS,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_MEDIA,
  getManifestNamedSlotKey,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
  getNamedStorageSlotDirRel,
  joinAreaManifestRel,
  getServiceAreaManifestRel,
  SERVICE_AREA_NAME,
  parseStorageAssetsRef,
  toAreaFolderName,
  toTopicFileName,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isStorageFolderName,
  isPlatformDataRootFolderName
} = require("../config/manifest-paths");
const { buildDefaultFrontmatter } = require("../awn/awn-types-loader");
const {
  isPlatformAgentId,
  buildPlatformAgentEntry
} = require("../platform/platform-agent");
const {
  AGENT_CMS_CORE_REL,
  getAgentCmsCoreAbsolute,
  getAgentsGroupsAssetsAbsolute,
  toAgentsGroupsBackgroundRel
} = require("../platform/platform-sources");
const NodeConfigBundle = require("../config/node-config-bundle");
const { projectRel, projectLegacy, legacy } = require("../paths/agent-cms");
const {
  loadRegistryEntriesWithMigration,
  saveRegistryEntriesToWsList,
  loadGroupsWithMigration,
  saveGroupsToWsList,
  LEGACY_AGENTS_REGISTRY_FILE
} = require("../workspace/ws-list-bridge");
const { transliterateToSlug, sanitizeSlugInput } = require(path.join(__dirname, "../../public", "slug-translit.js"));

const agentContext = new AsyncLocalStorage();

function joinNodeFrontmatter(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  let mdBody = String(body ?? "");
  if (!fm) return mdBody;
  if (!mdBody.trim()) return `---\n${fm}\n---\n`;
  mdBody = mdBody.replace(/^\r?\n+/, "");
  return `---\n${fm}\n---\n\n${mdBody}`;
}

/** Канонический тип корневого манифеста workspace (CHPU / реестр). */
const WORKSPACE_AWN_TYPE = "awn.page.ws";
const WORKSPACE_AWN_TYPE_LEGACY = "awn.workspace";
const WORKSPACE_AWN_TYPES = new Set([WORKSPACE_AWN_TYPE, WORKSPACE_AWN_TYPE_LEGACY]);
const WORKSPACE_STATUS_INACTIVE = "🔴 Закрыта";
const WORKSPACE_STATUS_ACTIVE = "🟢 Открыта";
const AWN_MAP_FILE = "awn-map.json";
/** @deprecated legacy root registry; canonical: .agent-cms-global/ws-list-agents.json */
const AWN_AGENTS_REGISTRY_FILE = LEGACY_AGENTS_REGISTRY_FILE;
const UNGROUPED_GROUP_ID = "__ungrouped__";
const GROUP_BACKGROUND_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const AWN_AUTOINCREMENT_ID_FILE = "awn-autoincrement-id.json";

function resolveWorkspaceReginfoAbsoluteSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return null;
  const canonical = path.join(workspaceRootAbsolute, AREA_MANIFEST_FILE);
  return fs.existsSync(canonical) ? canonical : null;
}

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function getYamlScalar(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function getYamlBoolean(frontmatter, key) {
  const raw = getYamlScalar(frontmatter, key);
  if (!raw) return false;
  const value = String(raw).trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
}

const WORKSPACE_AWN_PROP_KEYS = [
  "awn-status",
  "awn-description",
  "awn-category",
  "awn-owner",
  "awn-priority",
  "awn-tags",
  "awn-color",
  "awn-emoji",
  "awn-version",
  "awn-create",
  "awn-update",
  "awn-type"
];

function extractWorkspaceAwnProps(frontmatter) {
  const props = {};
  for (const key of WORKSPACE_AWN_PROP_KEYS) {
    const raw = getYamlScalar(frontmatter, key);
    if (!raw || raw === "[]" || raw === '""' || raw === "''") continue;
    props[key] = raw;
  }
  return props;
}

const FOCUS_WALK_SKIP_DIRS = new Set(["node_modules", ".git"]);

function shouldSkipFocusWalkDir(name) {
  if (!name) return true;
  if (FOCUS_WALK_SKIP_DIRS.has(String(name).toLowerCase())) return true;
  if (shouldSkipScanDir(name)) return true;
  if (String(name).toLowerCase() === "history") return true;
  return false;
}

function shouldSkipFocusMdFileName(name) {
  const base = String(name || "");
  const lower = base.toLowerCase();
  if (!lower.endsWith(".md")) return true;
  if (lower.endsWith(".mdback")) return true;
  return false;
}

function focusEntrySlugFromFileName(fileName) {
  let slug = String(fileName || "").replace(/\.md$/i, "");
  if (slug.toLowerCase().endsWith(".sidecar")) {
    slug = slug.slice(0, -".sidecar".length);
  }
  return slug;
}

function hasYamlKey(frontmatter, key) {
  return new RegExp(`^${String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "m").test(String(frontmatter || ""));
}

function isAwnFocusEntry(frontmatter) {
  if (hasYamlKey(frontmatter, "awn-focus")) {
    return getYamlBoolean(frontmatter, "awn-focus");
  }
  // Legacy: до разделения awn-focus / awn-main фокус хранился в awn-main.
  return getYamlBoolean(frontmatter, "awn-main");
}

function isAwnMainEntry(frontmatter) {
  return getYamlBoolean(frontmatter, "awn-main");
}

function buildNavFlagEntry(relativePath, frontmatterYaml) {
  const nodePath = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const slug = focusEntrySlugFromFileName(path.basename(nodePath));
  let name = getYamlScalar(frontmatterYaml, "awn-name") || "";
  if (!String(name).trim()) name = slug;
  return {
    nodePath,
    name: String(name).trim() || slug,
    awnType: getYamlScalar(frontmatterYaml, "awn-type") || "",
    awnProps: extractWorkspaceAwnProps(frontmatterYaml)
  };
}

function walkNavFlagMdFilesSync(dirAbsolute, prefix, acc, isMatch) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirAbsolute, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}`.replace(/\\/g, "/") : entry.name;

    if (entry.isDirectory()) {
      if (shouldSkipFocusWalkDir(entry.name)) continue;
      walkNavFlagMdFilesSync(fullPath, relativePath, acc, isMatch);
      continue;
    }

    if (!entry.isFile() || shouldSkipFocusMdFileName(entry.name)) continue;

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const { frontmatter } = splitFrontmatter(content);
      if (!isMatch(frontmatter)) continue;

      const slug = focusEntrySlugFromFileName(entry.name);
      let name = getYamlScalar(frontmatter, "awn-name") || "";
      if (!String(name).trim()) name = slug;

      acc.push({
        nodePath: relativePath.replace(/\\/g, "/"),
        name: String(name).trim() || slug,
        awnType: getYamlScalar(frontmatter, "awn-type") || "",
        awnProps: extractWorkspaceAwnProps(frontmatter)
      });
    } catch {
      // skip unreadable files
    }
  }
}

function collectAgentFocusEntries(agent) {
  const items = [];
  if (!agent?.rootAbsolute || agent.folderExists === false) return items;
  walkNavFlagMdFilesSync(agent.rootAbsolute, "", items, isAwnFocusEntry);
  return items;
}

function collectAgentMainEntries(agent) {
  const items = [];
  if (!agent?.rootAbsolute || agent.folderExists === false) return items;
  walkNavFlagMdFilesSync(agent.rootAbsolute, "", items, isAwnMainEntry);
  return items;
}

function collectAllFocusEntries() {
  const items = [];
  for (const agent of agents) {
    if (agent.folderExists === false) continue;
    for (const entry of collectAgentFocusEntries(agent)) {
      items.push({
        agentId: agent.id,
        agentName: agent.name || agent.id,
        agentPath: agent.path,
        agentActive: normalizeAgentActive(agent.active),
        ...entry
      });
    }
  }
  return items;
}

function collectAllMainEntries() {
  const items = [];
  for (const agent of agents) {
    if (agent.folderExists === false) continue;
    for (const entry of collectAgentMainEntries(agent)) {
      items.push({
        agentId: agent.id,
        agentName: agent.name || agent.id,
        agentPath: agent.path,
        agentActive: normalizeAgentActive(agent.active),
        ...entry
      });
    }
  }
  return items;
}

function resolveRecentEntryUpdatedAt(frontmatter, stat) {
  for (const key of ["awn-update", "awn-updated"]) {
    const raw = getYamlScalar(frontmatter, key);
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  if (stat?.mtime) return stat.mtime.toISOString();
  return "";
}

function shouldIncludeRecentEntry(relativePath, frontmatter) {
  const lower = String(relativePath || "").replace(/\\/g, "/").toLowerCase();
  if (/\/history\//.test(lower)) return false;
  if (/\/awn-system\//.test(lower)) return false;

  const awnType = String(getYamlScalar(frontmatter, "awn-type") || "").trim();
  if (awnType === "awn.page.ws") return false;

  const hasName = Boolean(String(getYamlScalar(frontmatter, "awn-name") || "").trim());
  if (!hasName && !awnType) return false;

  return true;
}

function walkRecentMdFilesSync(dirAbsolute, prefix, acc) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirAbsolute, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}`.replace(/\\/g, "/") : entry.name;

    if (entry.isDirectory()) {
      if (shouldSkipFocusWalkDir(entry.name)) continue;
      walkRecentMdFilesSync(fullPath, relativePath, acc);
      continue;
    }

    if (!entry.isFile() || shouldSkipFocusMdFileName(entry.name)) continue;

    try {
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const { frontmatter } = splitFrontmatter(content);
      if (!shouldIncludeRecentEntry(relativePath, frontmatter)) continue;

      const updatedAt = resolveRecentEntryUpdatedAt(frontmatter, stat);
      if (!updatedAt) continue;

      const slug = focusEntrySlugFromFileName(entry.name);
      let name = getYamlScalar(frontmatter, "awn-name") || "";
      if (!String(name).trim()) name = slug;

      acc.push({
        nodePath: relativePath.replace(/\\/g, "/"),
        name: String(name).trim() || slug,
        awnType: getYamlScalar(frontmatter, "awn-type") || "",
        awnProps: extractWorkspaceAwnProps(frontmatter),
        updatedAt
      });
    } catch {
      // skip unreadable files
    }
  }
}

function collectAgentRecentEntries(agent) {
  const items = [];
  if (!agent?.rootAbsolute || agent.folderExists === false) return items;
  walkRecentMdFilesSync(agent.rootAbsolute, "", items);
  return items;
}

function collectAllRecentEntries(limit = 30) {
  const cappedLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const items = [];
  for (const agent of agents) {
    if (agent.folderExists === false) continue;
    for (const entry of collectAgentRecentEntries(agent)) {
      items.push({
        agentId: agent.id,
        agentName: agent.name || agent.id,
        agentPath: agent.path,
        agentActive: normalizeAgentActive(agent.active),
        ...entry
      });
    }
  }
  items.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
  return items.slice(0, cappedLimit);
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?]|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function upsertYamlScalarInFrontmatter(frontmatter, key, value) {
  const lines = String(frontmatter || "").split(/\r?\n/);
  const scalar = formatYamlScalar(value);
  const nextLine = `${key}: ${scalar}`;
  let replaced = false;
  const result = lines.map((line) => {
    if (new RegExp(`^${key}:`).test(line)) {
      replaced = true;
      return nextLine;
    }
    return line;
  });
  if (!replaced) result.push(nextLine);
  return result.join("\n");
}

function readWorkspaceReginfoRawSync(workspaceRootAbsolute) {
  const manifestPath = resolveWorkspaceReginfoAbsoluteSync(workspaceRootAbsolute);
  if (!manifestPath) return null;
  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const { frontmatter, body } = splitFrontmatter(content);
    return { absolute: manifestPath, frontmatter, body, content };
  } catch {
    return null;
  }
}

function isWorkspaceAwnType(typeName) {
  return WORKSPACE_AWN_TYPES.has(String(typeName || "").trim());
}

function isWorkspaceReginfoRaw(raw) {
  if (!raw) return false;
  return isWorkspaceAwnType(getYamlScalar(raw.frontmatter, "awn-type"));
}

function isWorkspaceReginfoAtPath(workspaceRootAbsolute) {
  const raw = readWorkspaceReginfoRawSync(workspaceRootAbsolute);
  return isWorkspaceReginfoRaw(raw);
}

function normalizeWorkspaceManifest(raw, workspaceRootAbsolute) {
  if (!raw || !isWorkspaceReginfoRaw(raw)) return null;
  const folderName = path.basename(String(workspaceRootAbsolute || ""));
  let name = getYamlScalar(raw.frontmatter, "awn-name") || "";
  if (!String(name).trim()) {
    const headingMatch = String(raw.body || "").match(/^#\s+(.+?)\s*$/m);
    if (headingMatch) name = headingMatch[1].trim();
  }
  const comment = getYamlScalar(raw.frontmatter, "awn-description") || "";
  const status = getYamlScalar(raw.frontmatter, "awn-status") || "";
  const preview = getYamlScalar(raw.frontmatter, "awn-preview") || "";
  const main = getYamlBoolean(raw.frontmatter, "awn-main");
  const awnProps = extractWorkspaceAwnProps(raw.frontmatter);
  return {
    name: String(name).trim() || folderName,
    comment: String(comment).trim(),
    status: String(status).trim(),
    preview: String(preview).trim(),
    main,
    awnProps
  };
}

function readWorkspaceManifestSync(workspaceRootAbsolute) {
  const raw = readWorkspaceReginfoRawSync(workspaceRootAbsolute);
  if (!raw) return null;
  return normalizeWorkspaceManifest(raw, workspaceRootAbsolute);
}

function writeWorkspaceReginfoSync(workspaceRootAbsolute, frontmatter, body) {
  const manifestPath = path.join(workspaceRootAbsolute, AREA_MANIFEST_FILE);
  fs.writeFileSync(manifestPath, joinNodeFrontmatter(frontmatter, body), "utf-8");
}

function updateWorkspaceReginfoFields(agentPath, fields = {}) {
  const resolvedPath = assertSafeAgentPath(agentPath);
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const raw = readWorkspaceReginfoRawSync(absolute);
  if (!isWorkspaceReginfoRaw(raw)) {
    throw new Error(`В «${resolvedPath}» нет ${AREA_MANIFEST_FILE} с awn-type: ${WORKSPACE_AWN_TYPE}`);
  }

  let frontmatter = raw.frontmatter;

  if (fields.name !== undefined) {
    const trimmed = String(fields.name ?? "").trim();
    if (!trimmed) {
      throw new Error("Название агента не может быть пустым");
    }
    frontmatter = upsertYamlScalarInFrontmatter(frontmatter, "awn-name", trimmed);
  }

  if (fields.comment !== undefined) {
    const trimmed = String(fields.comment ?? "").trim();
    frontmatter = upsertYamlScalarInFrontmatter(frontmatter, "awn-description", trimmed);
  }

  if (fields.status !== undefined) {
    const trimmed = String(fields.status ?? "").trim();
    if (trimmed) {
      frontmatter = upsertYamlScalarInFrontmatter(frontmatter, "awn-status", trimmed);
    }
  }

  if (fields.active !== undefined) {
    const status = fields.active === false ? WORKSPACE_STATUS_INACTIVE : WORKSPACE_STATUS_ACTIVE;
    frontmatter = upsertYamlScalarInFrontmatter(frontmatter, "awn-status", status);
  }

  writeWorkspaceReginfoSync(absolute, frontmatter, raw.body);
}

function upsertYamlArrayInFrontmatter(frontmatter, key, values) {
  const items = (Array.isArray(values) ? values : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const nextLine = `${key}: [${items.map((value) => formatYamlScalar(value)).join(", ")}]`;
  const lines = String(frontmatter || "").split(/\r?\n/);
  let replaced = false;
  const result = lines.map((line) => {
    if (new RegExp(`^${key}:`).test(line)) {
      replaced = true;
      return nextLine;
    }
    return line;
  });
  if (!replaced) result.push(nextLine);
  return result.join("\n");
}

function updateWorkspaceManifestUiFields(agentPath, fields = {}) {
  const resolvedPath = assertSafeAgentPath(agentPath);
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const raw = readWorkspaceReginfoRawSync(absolute);
  if (!isWorkspaceReginfoRaw(raw)) {
    throw new Error(`В «${resolvedPath}» нет ${AREA_MANIFEST_FILE} с awn-type: ${WORKSPACE_AWN_TYPE}`);
  }

  let frontmatter = raw.frontmatter;
  const scalarMap = {
    color: "awn-color",
    emoji: "awn-emoji",
    preview: "awn-preview",
    category: "awn-category",
    owner: "awn-owner",
    priority: "awn-priority"
  };

  for (const [field, yamlKey] of Object.entries(scalarMap)) {
    if (fields[field] !== undefined) {
      frontmatter = upsertYamlScalarInFrontmatter(frontmatter, yamlKey, fields[field]);
    }
  }

  if (fields.tags !== undefined) {
    frontmatter = upsertYamlArrayInFrontmatter(frontmatter, "awn-tags", fields.tags);
  }

  writeWorkspaceReginfoSync(absolute, frontmatter, raw.body);
}

function getAgentsRegistryPathSync() {
  return path.join(projectRoot, AWN_AGENTS_REGISTRY_FILE);
}

function getAgentsGroupsAssetsDirSync() {
  return getAgentsGroupsAssetsAbsolute(projectRoot || process.cwd());
}

function sanitizeAgentsGroupId(raw) {
  return slugifyAgentId(String(raw || "").trim(), 0);
}

function findGroupBackgroundAbsolute(groupId) {
  const safeId = sanitizeAgentsGroupId(groupId);
  if (!safeId) return null;
  const dir = getAgentsGroupsAssetsDirSync();
  for (const ext of GROUP_BACKGROUND_EXTS) {
    const absolute = path.join(dir, `${safeId}${ext}`);
    if (fs.existsSync(absolute)) return absolute;
  }
  return null;
}

function getGroupBackgroundPublicUrl(groupId) {
  if (!findGroupBackgroundAbsolute(groupId)) return null;
  return `/api/agents/groups/background?groupId=${encodeURIComponent(String(groupId || ""))}`;
}

function normalizeGroupBackgroundRel(rawBackground, groupId) {
  const rel = String(rawBackground || "").trim().replace(/\\/g, "/");
  if (!rel) return null;
  const safeId = sanitizeAgentsGroupId(groupId);
  const base = path.posix.basename(rel);
  if (!base.startsWith(`${safeId}.`)) return null;
  const assetsDir = getAgentsGroupsAssetsDirSync();
  const absolute = path.join(assetsDir, base);
  if (!absolute.startsWith(assetsDir)) return null;
  return fs.existsSync(absolute) ? toAgentsGroupsBackgroundRel(base) : null;
}

function clearGroupBackgroundFiles(groupId) {
  const safeId = sanitizeAgentsGroupId(groupId);
  if (!safeId) return;
  const dir = getAgentsGroupsAssetsDirSync();
  for (const ext of GROUP_BACKGROUND_EXTS) {
    const absolute = path.join(dir, `${safeId}${ext}`);
    if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }
  }
}

function normalizeUngroupedSection(raw) {
  let background = normalizeGroupBackgroundRel(raw?.background, UNGROUPED_GROUP_ID);
  if (!background) {
    const absolute = findGroupBackgroundAbsolute(UNGROUPED_GROUP_ID);
    if (absolute) {
      background = toAgentsGroupsBackgroundRel(path.basename(absolute));
    }
  }
  return {
    background: background || null,
    appearance: raw?.appearance === "dark" ? "dark" : "light"
  };
}

function setGroupBackgroundOnCache(groupId, background) {
  if (String(groupId) === UNGROUPED_GROUP_ID) {
    if (!agentsGroupsCache.ungrouped) {
      agentsGroupsCache.ungrouped = normalizeUngroupedSection(null);
    }
    if (background) agentsGroupsCache.ungrouped.background = background;
    else delete agentsGroupsCache.ungrouped.background;
    return;
  }
  const target = agentsGroupsCache?.groups?.find((group) => group.id === String(groupId));
  if (target) {
    if (background) target.background = background;
    else delete target.background;
  }
}

function persistAgentsGroupsCacheToDisk() {
  saveGroupsToWsList(projectRoot, agentsGroupsCache.groups, agentsGroupsCache.ungrouped);
}

function writeGroupBackgroundFile(groupId, buffer, ext) {
  const safeId = sanitizeAgentsGroupId(groupId);
  if (!safeId) throw new Error("Некорректный id группы");
  if (!GROUP_BACKGROUND_EXTS.includes(String(ext || "").toLowerCase())) {
    throw new Error("Недопустимое расширение фона");
  }
  const dir = getAgentsGroupsAssetsDirSync();
  fs.mkdirSync(dir, { recursive: true });
  clearGroupBackgroundFiles(safeId);
  const normalizedExt = ext.toLowerCase() === ".jpeg" ? ".jpg" : ext.toLowerCase();
  const fileName = `${safeId}${normalizedExt}`;
  const absolute = path.join(dir, fileName);
  fs.writeFileSync(absolute, buffer);
  const background = toAgentsGroupsBackgroundRel(fileName);
  setGroupBackgroundOnCache(groupId, background);
  persistAgentsGroupsCacheToDisk();
  return {
    background,
    backgroundUrl: getGroupBackgroundPublicUrl(groupId)
  };
}

function removeGroupBackground(groupId) {
  const safeId = sanitizeAgentsGroupId(groupId);
  if (!safeId) throw new Error("Некорректный id группы");
  clearGroupBackgroundFiles(safeId);
  setGroupBackgroundOnCache(groupId, null);
  persistAgentsGroupsCacheToDisk();
  return { background: null, backgroundUrl: null };
}

function readGroupBackgroundFile(groupId) {
  const absolute = findGroupBackgroundAbsolute(groupId);
  if (!absolute) return null;
  const ext = path.extname(absolute).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".gif"
        ? "image/gif"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
  return {
    absolute,
    content: fs.readFileSync(absolute),
    mime
  };
}

function getKnownAgentIdsSet() {
  return new Set(agents.map((agent) => agent.id));
}

function normalizeAgentsGroupEntry(raw, index, knownAgentIds) {
  const id = slugifyAgentId(raw?.id || raw?.title, index);
  if (id === UNGROUPED_GROUP_ID) return null;
  const title = String(raw?.title || raw?.name || id).trim() || id;
  const agentIds = Array.isArray(raw?.agentIds)
    ? [...new Set(raw.agentIds.map((value) => String(value || "").trim()).filter(Boolean))]
    : [];
  const validAgentIds = agentIds.filter((agentId) => knownAgentIds.has(agentId));
  let background = normalizeGroupBackgroundRel(raw?.background, id);
  if (!background) {
    const absolute = findGroupBackgroundAbsolute(id);
    if (absolute) {
      background = toAgentsGroupsBackgroundRel(path.basename(absolute));
    }
  }
  const appearance = raw?.appearance === "dark" ? "dark" : "light";
  return { id, title, agentIds: validAgentIds, background, appearance };
}

function loadAgentsGroupsSync() {
  const knownAgentIds = getKnownAgentIdsSet();

  const fromAwn = loadGroupsWithMigration(projectRoot);
  if (fromAwn) {
    const seen = new Set();
    const groups = (Array.isArray(fromAwn.groups) ? fromAwn.groups : [])
      .map((entry, index) => normalizeAgentsGroupEntry(entry, index, knownAgentIds))
      .filter((group) => {
        if (!group?.id || seen.has(group.id)) return false;
        seen.add(group.id);
        return true;
      });
    agentsGroupsCache = {
      groups,
      ungrouped: normalizeUngroupedSection(fromAwn.ungrouped)
    };
    return agentsGroupsCache;
  }

  agentsGroupsCache = { groups: [], ungrouped: normalizeUngroupedSection(null) };
  return agentsGroupsCache;
}

function getAgentsGroupsPublic() {
  if (!agentsGroupsCache) loadAgentsGroupsSync();
  const ungrouped = agentsGroupsCache.ungrouped || normalizeUngroupedSection(null);
  return {
    groups: agentsGroupsCache.groups.map(({ id, title, agentIds, background, appearance }) => ({
      id,
      title,
      agentIds: [...agentIds],
      background: background || null,
      backgroundUrl: getGroupBackgroundPublicUrl(id),
      appearance: appearance === "dark" ? "dark" : "light"
    })),
    ungrouped: {
      background: ungrouped.background || null,
      backgroundUrl: ungrouped.background ? getGroupBackgroundPublicUrl(UNGROUPED_GROUP_ID) : null,
      appearance: ungrouped.appearance === "dark" ? "dark" : "light"
    }
  };
}

function saveAgentsGroups(rawGroups, rawUngrouped) {
  if (!Array.isArray(rawGroups)) {
    throw new Error("groups должен быть массивом");
  }

  const knownAgentIds = getKnownAgentIdsSet();
  const usedAgentIds = new Set();
  const seenGroupIds = new Set();
  const normalized = [];

  rawGroups.forEach((entry, index) => {
    const group = normalizeAgentsGroupEntry(entry, index, knownAgentIds);
    if (!group) return;
    if (seenGroupIds.has(group.id)) {
      throw new Error(`Дублирующийся id группы: ${group.id}`);
    }
    seenGroupIds.add(group.id);

    const uniqueAgentIds = [];
    for (const agentId of group.agentIds) {
      if (usedAgentIds.has(agentId)) continue;
      usedAgentIds.add(agentId);
      uniqueAgentIds.push(agentId);
    }

    normalized.push({
      id: group.id,
      title: group.title,
      agentIds: uniqueAgentIds,
      background: group.background || null,
      appearance: group.appearance === "dark" ? "dark" : "light"
    });
  });

  const ungrouped =
    rawUngrouped !== undefined
      ? normalizeUngroupedSection(rawUngrouped)
      : agentsGroupsCache?.ungrouped || normalizeUngroupedSection(null);

  agentsGroupsCache = { groups: normalized, ungrouped };
  persistAgentsGroupsCacheToDisk();
  return getAgentsGroupsPublic();
}

const DEFAULT_AGENT_KIT_FOLDER = "awn-agent-kit";
const LEGACY_AGENT_KIT_FOLDER = "agent-kit";
const DEFAULT_AGENT_CONTAINER_FOLDER = "awn-container";
const DEFAULT_CONTAINER_FOLDER = "awn-container";
const LEGACY_CONTAINER_FOLDER = "container";
const DEFAULT_AGENT_SHARED_FOLDER = "awn-shared";
const DEFAULT_SHARED_FOLDER = "awn-shared";

function isAgentKitFolderEntryName(name) {
  const lower = String(name || "").trim().toLowerCase();
  return (
    lower === DEFAULT_AGENT_KIT_FOLDER.toLowerCase() ||
    lower === LEGACY_AGENT_KIT_FOLDER.toLowerCase()
  );
}

function isContainerFolderEntryName(name) {
  const lower = String(name || "").trim().toLowerCase();
  return (
    lower === DEFAULT_CONTAINER_FOLDER.toLowerCase() ||
    lower === LEGACY_CONTAINER_FOLDER.toLowerCase()
  );
}

function isSharedFolderEntryName(name) {
  const lower = String(name || "").trim().toLowerCase();
  return lower === DEFAULT_SHARED_FOLDER.toLowerCase();
}

function isReservedAgentRootFolderEntryName(name) {
  return (
    isAgentKitFolderEntryName(name) ||
    isContainerFolderEntryName(name) ||
    isSharedFolderEntryName(name) ||
    isPlatformDataRootFolderName(name)
  );
}


/** Папка справочников внутри awn-agent-kit (workspace-агенты) */
const WORKSPACE_TAXONOMY_FOLDER = "taxonomies";
/** Старое имя папки — для обратной совместимости */
/** Legacy folder name in workspace agent-kit (prefer taxonomies/) */
const LEGACY_WORKSPACE_TAXONOMY_FOLDER = "catalog";
const DEFAULT_SERVICE_CATALOG_FOLDER = WORKSPACE_TAXONOMY_FOLDER;
const SYSTEM_REFERENCE_SCAFFOLDS = [
  {
    preset: "categories",
    kind: "catalog",
    fileName: "categories",
    title: "Категории",
    bundleFile: BUNDLE_TABULAR_FILE,
    manifest:
      "# Категории\n\nСправочник категорий workspace. Глобальные — `awn-databases/awn-taxonomies/categories/main.csv`. Локальные — в `taxonomies/` agent-kit.\n",
    content:
      "id,label,color\n" +
      "general,Общее (по умолчанию),#64748b\n" +
      "system,Системное (агент),#475569\n" +
      "work,Работа и проекты,#2563eb\n" +
      "finance,Финансы,#059669\n" +
      "education,Образование,#7c3aed\n" +
      "health,Здоровье,#e11d48\n" +
      "hobby,Хобби,#d97706\n" +
      "collections,Коллекции,#8b5cf6\n" +
      "world-objects,Объекты мира,#78716c\n" +
      "family,Семья,#db2777\n" +
      "documents,Документы,#6366f1\n" +
      "travel,Путешествия,#0ea5e9\n" +
      "media,Медиа,#a855f7\n" +
      "creative,Творчество,#f97316\n" +
      "documentation,Документация,#94a3b8\n" +
      "focus,Фокус и продуктивность,#14b8a6\n"
  },
  {
    preset: "tags",
    kind: "catalog",
    fileName: "tags",
    title: "Теги",
    bundleFile: BUNDLE_TABULAR_FILE,
    manifest:
      "# Теги\n\nСписок тегов workspace. Глобальные — `awn-databases/awn-taxonomies/tags/main.csv`. Локальные — `taxonomies/tags/` в agent-kit.\n\nТемы ссылаются через `awn-tags` в YAML-frontmatter или `#tag` в тексте.\n",
    content: "tag\nproject\nidea\nreference\ndaily\nperson\nsource\ntodo\nreview\n"
  },
  {
    preset: "statuses",
    kind: "catalog",
    fileName: "statuses",
    title: "Статусы",
    bundleFile: BUNDLE_TABULAR_FILE,
    manifest:
      "# Статусы\n\nСтатусы для `awn-status` заданы enum в `awn-system/types/base/base.yml`.\n",
    content:
      "id,label\nnew,🔵 Новая\nplanned,🟣 Запланирована\ndraft,🟡 Черновик\nopen,🟢 Открыта\nin-progress,🟠 В работе\ndone,✅ Готова\nclosed,🔴 Закрыта\narchived,⚫ Архив\nnone,⚪ Без статуса\n"
  },
  {
    preset: "priorities",
    kind: "catalog",
    fileName: "priorities",
    title: "Приоритеты",
    bundleFile: BUNDLE_TABULAR_FILE,
    manifest:
      "# Приоритеты\n\nСправочник для `awn-priority`. Данные — в `awn-storage/priorities/main.csv`.\n",
    content: "id,label,sort\nlow,Низкий,1\nmedium,Средний,2\nhigh,Высокий,3\n"
  },
  {
    preset: "colors",
    kind: "catalog",
    fileName: "colors",
    title: "Палитра",
    bundleFile: BUNDLE_TABULAR_FILE,
    manifest:
      "# Палитра\n\nBrand-цвета для `awn-color`. Данные — в `awn-storage/colors/main.csv`.\n",
    content: "id,label,color\nslate,Slate,#64748b\nblue,Blue,#2563eb\nviolet,Violet,#7c3aed\n"
  },
  {
    preset: "schemas",
    kind: "catalog",
    fileName: "schemas",
    title: "Схемы",
    manifest:
      "# Схемы\n\nОпределения типов и полей для тем workspace. Данные — в `awn-storage/schemas/main.md`.\n",
    content:
      "# Схемы\n\n## node.default\n\nБазовые поля темы: `title`, `tags`, `color`, `priority`, `owner`, `status`.\n"
  },
  {
    preset: "agent",
    kind: "service-doc",
    fileName: "agent",
    title: "Агент",
    manifest: "# Агент\n\nОписание агента: роль, цели и границы workspace.\n"
  },
  {
    preset: "user",
    kind: "service-doc",
    fileName: "user",
    title: "Пользователь",
    manifest: "# Пользователь\n\nПрофиль пользователя: предпочтения, контекст и стиль работы.\n"
  },
  {
    preset: "users",
    kind: "service-doc",
    fileName: "users",
    title: "Пользователи",
    manifest: "# Пользователи\n\nСписок пользователей и связанных ролей в workspace.\n"
  },
  {
    preset: "agent-rules",
    kind: "service-doc",
    fileName: "agent.rules",
    title: "Правила агента",
    manifest: "# Правила агента\n\nОбщие правила и ограничения для агента в этом workspace.\n"
  },
  {
    preset: "agent-voice-tts",
    kind: "service-doc",
    fileName: "agent.voice.tts",
    title: "Голос · TTS",
    manifest: "# Голос · TTS\n\nНастройки и инструкции для синтеза речи (text-to-speech).\n"
  },
  {
    preset: "agent-voice-stt",
    kind: "service-doc",
    fileName: "agent.voice.stt",
    title: "Голос · STT",
    manifest: "# Голос · STT\n\nНастройки и инструкции для распознавания речи (speech-to-text).\n"
  },
  {
    preset: "devices",
    kind: "service-doc",
    fileName: "devices",
    title: "Управление ПК, устройствами, различный софт",
    manifest:
      "# Управление ПК, устройствами, различный софт\n\nТема про компьютер, ОС, периферию, софт и автоматизацию устройств.\n"
  },
  {
    preset: "random-joke",
    kind: "service-doc",
    fileName: "random-joke",
    title: "Случайный анекдот — для экспериментов",
    manifest:
      "# Случайный анекдот\n\nЭкспериментальная тема: правила выбора анекдота, журнал рассказанных шуток, триггеры.\n"
  },
  {
    preset: "robot-exoskeleton-and-body",
    kind: "service-doc",
    fileName: "robot-exoskeleton-and-body",
    title: "Экзоскелет робота (сенсоры, датчики, механизмы, руки, ноги, колеса и другое)",
    manifest:
      "# Экзоскелет робота\n\nСенсоры, датчики, механизмы, руки, ноги, колеса и другие компоненты робота.\n"
  },
  {
    preset: "real-world-and-space",
    kind: "service-doc",
    fileName: "real-world-and-space",
    title: "Объекты реального мира, места и пространства",
    manifest:
      "# Объекты реального мира, места и пространства\n\nФизические объекты, локации, помещения и пространства.\n"
  }
];
const AGENT_FOLDER_NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;

function resolveAgentKitTopicType(_preset) {
  return "awn.page.topic";
}

const SKIP_SCAN_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "Library",
  "Caches",
  "Application Support",
  "Trash",
  "vendor"
]);

function isAgentFolderName(name) {
  const folderName = String(name || "").trim().toLowerCase();
  return AGENT_FOLDER_NAME_RE.test(folderName);
}

function slugifyAgentFolderSegment(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  return sanitizeSlugInput(transliterateToSlug(text) || text) || "";
}

function normalizeAgentFolderName(rawFolderName) {
  return slugifyAgentFolderSegment(rawFolderName);
}

function assertAgentIdAvailable(agentId, { excludePath = "" } = {}) {
  const id = String(agentId || "").trim().toLowerCase();
  if (!id) {
    throw new Error("ID агента не может быть пустым");
  }
  loadRegistrySync();
  const excludeKey = excludePath ? normalizeRegistryPathKey(excludePath) : "";
  const taken = agents.some((agent) => {
    if (excludeKey && normalizeRegistryPathKey(agent.path) === excludeKey) return false;
    return String(agent.id || "").trim().toLowerCase() === id;
  });
  if (taken) {
    throw new Error(`Агент с ID «${id}» уже есть в реестре`);
  }
}

function normalizeAgentWorkspacePath(rawPath) {
  const trimmed = String(rawPath || "").trim().replace(/[\\/]+$/, "");
  if (!trimmed) return trimmed;
  const folderName = path.basename(trimmed);
  if (!folderName || folderName === "." || folderName === "..") return trimmed;
  const normalizedFolder = normalizeAgentFolderName(folderName);
  if (!normalizedFolder || normalizedFolder === folderName) return trimmed;
  const parent = trimmed.slice(0, Math.max(0, trimmed.length - folderName.length)).replace(/[\\/]+$/, "");
  if (!parent) return normalizedFolder;
  const sep = trimmed.includes("\\") ? "\\" : "/";
  return `${parent}${sep}${normalizedFolder}`;
}

let projectRoot = null;
let agents = [];
let agentsGroupsCache = null;
let defaultAgentId = "main";

function resolveAgentRootAbsolute(rawPath) {
  const cleaned = String(rawPath || "./Workspaces").trim();
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  return path.resolve(projectRoot, cleaned);
}

function normalizeRegistryPathKey(rawPath) {
  return String(rawPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

function toRegistryPath(absolutePath) {
  const absolute = path.normalize(String(absolutePath || ""));
  if (!absolute) return "";
  const relative = path.relative(projectRoot, absolute);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join("/");
  }
  return absolute;
}

function resolveExistingWorkspaceDirectory(absolutePath) {
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      return { exists: false, absolute: path.normalize(absolutePath), error: "Путь указывает на файл, нужна папка" };
    }
    let resolvedAbsolute = path.normalize(absolutePath);
    try {
      resolvedAbsolute = fs.realpathSync.native(absolutePath);
    } catch {
      // keep normalized absolute
    }
    return { exists: true, absolute: resolvedAbsolute };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, absolute: path.normalize(absolutePath) };
    }
    return {
      exists: false,
      absolute: path.normalize(absolutePath),
      error: String(error?.message || error)
    };
  }
}

const AGENT_ENVIRONMENTS = ["local", "production"];

function normalizeAgentEnvironment(raw) {
  const value = String(raw || "local").trim().toLowerCase();
  return AGENT_ENVIRONMENTS.includes(value) ? value : "local";
}

function isWorkspaceActiveFromStatus(status) {
  return String(status || "").trim() !== WORKSPACE_STATUS_INACTIVE;
}

function getWorkspaceStorageKeySync(workspaceRootAbsolute) {
  return path.basename(String(workspaceRootAbsolute || "").replace(/[\\/]+$/, ""));
}

/** Превью корневой области: workspace/awn-storage/{имя_манифеста}/preview.* */
function resolveWorkspaceRootManifestRelSync(workspaceRootAbsolute) {
  return AREA_MANIFEST_FILE;
}

function getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute) {
  const workspaceKey = getWorkspaceStorageKeySync(workspaceRootAbsolute);
  const manifestRel = resolveWorkspaceRootManifestRelSync(workspaceRootAbsolute);
  return path.join(
    workspaceRootAbsolute,
    ...getNamedStorageSlotDirRel(manifestRel).split("/")
  );
}

function getAgentWorkspacePreviewAssetsDirSync(workspaceRootAbsolute) {
  return path.join(getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute), STORAGE_SUBFOLDER_MEDIA);
}

function resolveWorkspaceManifestPreviewAbsoluteSync(workspaceRootAbsolute, previewRel) {
  const previewValue = String(previewRel || "").trim();
  if (!previewValue || /^https?:\/\//i.test(previewValue)) return null;

  const assetsRef = parseStorageAssetsRef(previewValue);
  if (!assetsRef?.workspacePath) return null;

  const absolute = path.resolve(workspaceRootAbsolute, assetsRef.workspacePath);
  if (!absolute.startsWith(path.resolve(workspaceRootAbsolute))) return null;

  try {
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  } catch {
    // not found
  }
  return null;
}

function findAgentWorkspacePreviewAbsoluteSync(workspaceRootAbsolute) {
  const previewCandidates = [
    getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute),
    getAgentWorkspacePreviewAssetsDirSync(workspaceRootAbsolute)
  ];
  for (const dir of previewCandidates) {
    for (const name of PREVIEW_FILE_NAMES) {
      const absolute = path.join(dir, name);
      try {
        if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
      } catch {
        // try next
      }
    }
  }

  const manifest = readWorkspaceManifestSync(workspaceRootAbsolute);
  if (manifest?.preview) {
    return resolveWorkspaceManifestPreviewAbsoluteSync(workspaceRootAbsolute, manifest.preview);
  }
  return null;
}

function getOrCreateAgentWorkspacePreviewAbsoluteSync(workspaceRootAbsolute, ext = ".jpg") {
  const directoryState = resolveExistingWorkspaceDirectory(workspaceRootAbsolute);
  if (!directoryState.exists) {
    const error = new Error("Workspace folder not found");
    error.code = "ENOENT";
    throw error;
  }
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(directoryState.absolute);
  fs.mkdirSync(bundleDir, { recursive: true });
  const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
  return path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
}

function clearAgentWorkspacePreviewImagesSync(workspaceRootAbsolute) {
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  for (const name of PREVIEW_FILE_NAMES) {
    try {
      fs.unlinkSync(path.join(bundleDir, name));
    } catch {
      // file may not exist
    }
  }
}

function resolveManifestPreviewAbsolute(workspaceRootAbsolute, previewRel) {
  const rel = String(previewRel || "").trim().replace(/\\/g, "/");
  if (!rel) return null;
  const absolute = path.resolve(workspaceRootAbsolute, rel);
  if (!absolute.startsWith(path.resolve(workspaceRootAbsolute))) return null;
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return null;
    return absolute;
  } catch {
    return null;
  }
}

function enrichAgentEntry(entry) {
  const folderExists =
    entry.folderExists !== undefined
      ? entry.folderExists !== false
      : isWorkspaceDirectoryExisting(entry.rootAbsolute);
  const manifest = folderExists ? readWorkspaceManifestSync(entry.rootAbsolute) : null;
  const folderName = path.basename(entry.rootAbsolute);
  const activeFromStatus = manifest ? isWorkspaceActiveFromStatus(manifest.status) : entry.active !== false;
  return {
    ...entry,
    folderExists,
    manifestFound: Boolean(manifest),
    name: manifest?.name || entry.name || entry.id || folderName,
    comment: manifest?.comment || entry.comment || "",
    status: manifest?.status || "",
    active: activeFromStatus,
    awnMain: manifest?.main === true,
    awnProps: manifest?.awnProps || {},
    hasPreview: Boolean(findAgentWorkspacePreviewAbsoluteSync(entry.rootAbsolute)),
    previewRel: manifest?.preview || null
  };
}

function getAgentKitFolder() {
  const store = agentContext.getStore();
  if (store?.agentId && isPlatformAgentId(store.agentId)) {
    return null;
  }
  return DEFAULT_AGENT_KIT_FOLDER;
}

function getAgentContainerFolder() {
  const store = agentContext.getStore();
  if (store?.agentId && isPlatformAgentId(store.agentId)) {
    return null;
  }
  return DEFAULT_CONTAINER_FOLDER;
}

function getAgentSharedFolder() {
  const store = agentContext.getStore();
  if (store?.agentId && isPlatformAgentId(store.agentId)) {
    return null;
  }
  return DEFAULT_SHARED_FOLDER;
}

function normalizeAgentActive(raw) {
  return raw !== false;
}

function pickDefaultAgentId(agentList) {
  const activeAgents = agentList.filter((agent) => normalizeAgentActive(agent.active));
  const pool = activeAgents.length > 0 ? activeAgents : agentList;
  const existingPool = pool.filter((agent) => agent.folderExists !== false);
  const targetPool = existingPool.length > 0 ? existingPool : pool;
  return targetPool.find((agent) => agent.default)?.id || targetPool[0]?.id || "main";
}

function readDefaultWorkspaceIdFromPlatformSettingsSync() {
  if (!projectRoot) return "";
  const candidates = [
    path.join(projectRoot, projectRel.settings.platform),
    path.join(projectRoot, projectLegacy.platformSettings),
    path.join(projectRoot, projectLegacy.globalSettings),
    path.join(projectRoot, legacy.platformSettings),
    path.join(getAgentCmsCoreAbsolute(projectRoot), "settings.global.yml")
  ];
  for (const absolutePath of candidates) {
    try {
      const content = fs.readFileSync(absolutePath, "utf-8");
      const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
      const value = String(bundle.awn_settings?.["default-workspace-id"] || "").trim();
      if (value) return value;
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        // ignore parse/read errors and try legacy path
      }
    }
  }
  return "";
}

function applyPlatformDefaultWorkspaceId() {
  const configured = readDefaultWorkspaceIdFromPlatformSettingsSync();
  if (!configured) return;
  const match = agents.find((agent) => agent.id === configured && normalizeAgentActive(agent.active));
  if (match) defaultAgentId = configured;
}

function reloadDefaultAgentId() {
  defaultAgentId = pickDefaultAgentId(agents);
  applyPlatformDefaultWorkspaceId();
}

function deriveAgentIdFromPath(agentPath, fallbackIndex = 0) {
  const rootAbsolute = resolveAgentRootAbsolute(agentPath);
  const folderName = path.basename(String(rootAbsolute || "").replace(/[\\/]+$/, ""));
  return agentFolderNameToSlug(folderName, fallbackIndex);
}

function isWorkspaceDirectoryExisting(rootAbsolute) {
  return resolveExistingWorkspaceDirectory(rootAbsolute).exists;
}

function normalizeAgentEntry(entry, index = 0) {
  const agentPath = String(entry.path || "./Workspaces");
  const rootAbsolute = resolveAgentRootAbsolute(agentPath);
  const folderName = path.basename(String(rootAbsolute || "").replace(/[\\/]+$/, ""));
  const id = deriveAgentIdFromPath(agentPath, index);
  const base = {
    id,
    name: folderName,
    path: agentPath,
    rootAbsolute,
    environment: normalizeAgentEnvironment(entry.environment),
    comment: "",
    default: Boolean(entry.default),
    orchestrator: Boolean(entry.orchestrator),
    active: true,
    folderExists: isWorkspaceDirectoryExisting(rootAbsolute)
  };
  return enrichAgentEntry(base);
}

function loadRawRegistryEntriesSync() {
  try {
    const fromWsList = loadRegistryEntriesWithMigration(projectRoot);
    if (fromWsList && fromWsList.length > 0) return fromWsList;
  } catch {
    // no registry sources
  }
  return null;
}

function loadRegistrySync() {
  const rawEntries = loadRawRegistryEntriesSync();
  if (!rawEntries) {
    const rootAbsolute = path.join(projectRoot, "Workspaces");
    agents = [enrichAgentEntry({ id: "main", name: "Main Agent", path: "./Workspaces", rootAbsolute, default: true, active: true, folderExists: true })];
    defaultAgentId = "main";
    return;
  }

  agents = rawEntries.map((entry, index) => normalizeAgentEntry(entry, index)).filter((agent) => agent.id);

  if (agents.length === 0) {
    const rootAbsolute = path.join(projectRoot, "Workspaces");
    agents = [enrichAgentEntry({ id: "main", name: "Main Agent", path: "./Workspaces", rootAbsolute, default: true, active: true, folderExists: true })];
  }
  reloadDefaultAgentId();
  loadAgentsGroupsSync();
}

function init(rootDir) {
  projectRoot = rootDir;
  loadRegistrySync();
}

function getAgentRoot() {
  const store = agentContext.getStore();
  if (store?.agentRoot) return store.agentRoot;
  const fallback = resolveAgent(defaultAgentId);
  return fallback?.rootAbsolute || path.join(projectRoot, "Workspaces");
}

function resolveAgent(agentId) {
  const id = String(agentId || defaultAgentId).trim();
  if (isPlatformAgentId(id)) {
    return enrichAgentEntry(buildPlatformAgentEntry(projectRoot));
  }
  return agents.find((agent) => agent.id === id) || null;
}

function getDefaultAgentId() {
  return defaultAgentId;
}

function getActiveAgentId() {
  return agentContext.getStore()?.agentId || defaultAgentId;
}

function getAgentsPublicList() {
  const list = agents.map(
    ({
      id,
      name,
      path: agentPath,
      environment,
      comment,
      default: isDefault,
      active,
      orchestrator,
      manifestFound,
      status,
      previewRel,
      folderExists,
      awnMain,
      awnProps
    }) => ({
      id,
      name,
      path: agentPath,
      environment,
      comment: comment || "",
      status: status || "",
      default: isDefault,
      active: normalizeAgentActive(active),
      orchestrator: orchestrator === true,
      manifestFound: Boolean(manifestFound),
      folderExists: folderExists !== false,
      previewRel: previewRel || null,
      awnMain: awnMain === true,
      awnProps: awnProps && typeof awnProps === "object" ? awnProps : {},
      virtual: false,
      registryEditable: true
    })
  );

  const platform = enrichAgentEntry(buildPlatformAgentEntry(projectRoot));
  if (platform.folderExists !== false) {
    list.unshift({
      id: platform.id,
      name: platform.name,
      path: platform.path,
      environment: "platform",
      comment: platform.comment || "",
      status: platform.status || "",
      default: false,
      active: true,
      orchestrator: false,
      manifestFound: Boolean(platform.manifestFound),
      folderExists: true,
      previewRel: platform.previewRel || null,
      awnMain: false,
      awnProps: platform.awnProps || {},
      virtual: true,
      registryEditable: false
    });
  }

  return list;
}

function agentFolderNameToSlug(folderName, fallbackIndex = 0) {
  const slug = String(folderName || "").trim().toLowerCase();
  return slug || `agent-${fallbackIndex + 1}`;
}

function slugifyAgentId(raw, fallbackIndex = 0) {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `agent-${fallbackIndex + 1}`;
}

function assertSafeAgentPath(agentPath) {
  const cleaned = String(agentPath || "").trim();
  if (!cleaned) {
    throw new Error("Путь workspace не может быть пустым");
  }
  if (cleaned.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
      throw new Error("Не удалось развернуть путь с ~");
    }
    return path.normalize(path.join(home, cleaned.slice(2)));
  }
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  const absolute = path.resolve(projectRoot, cleaned);
  if (!absolute.startsWith(projectRoot)) {
    throw new Error(`Недопустимый путь workspace: ${cleaned}`);
  }
  return toRegistryPath(absolute) || cleaned;
}

function saveAgentsRegistry(rawAgents) {
  if (!Array.isArray(rawAgents) || rawAgents.length === 0) {
    throw new Error("Нужен хотя бы один агент");
  }

  const seen = new Set();
  const normalized = [];
  let defaultAssigned = false;
  let orchestratorAssigned = false;

  rawAgents.forEach((entry, index) => {
    const agentPath = assertSafeAgentPath(entry?.path || "./Workspaces");
    const absolute = resolveAgentRootAbsolute(agentPath);
    const directoryState = resolveExistingWorkspaceDirectory(absolute);
    const workspaceAbsolute = directoryState.exists ? directoryState.absolute : absolute;
    const manifest = directoryState.exists ? readWorkspaceManifestSync(workspaceAbsolute) : null;

    if (directoryState.exists && manifest) {
      const manifestPatch = {};
      if (entry?.name !== undefined) {
        const nextName = String(entry.name ?? "").trim();
        if (nextName && nextName !== String(manifest.name || "").trim()) {
          manifestPatch.name = nextName;
        }
      }
      if (entry?.comment !== undefined) {
        const nextComment = String(entry.comment ?? "").trim();
        if (nextComment !== String(manifest.comment ?? "").trim()) {
          manifestPatch.comment = nextComment;
        }
      }
      if (entry?.active !== undefined) {
        const wantActive = entry.active !== false;
        const manifestActive = isWorkspaceActiveFromStatus(manifest.status);
        if (wantActive !== manifestActive) {
          manifestPatch.active = wantActive;
        }
      }
      if (Object.keys(manifestPatch).length) {
        updateWorkspaceReginfoFields(agentPath, manifestPatch);
      }
    }

    const id = deriveAgentIdFromPath(agentPath, index);
    const pathKey = normalizeRegistryPathKey(agentPath);
    if (seen.has(pathKey)) {
      throw new Error(`Дублирующийся workspace: ${agentPath}`);
    }
    seen.add(pathKey);

    const manifestAfterUpdate = directoryState.exists
      ? readWorkspaceManifestSync(workspaceAbsolute)
      : null;
    const isActive = manifestAfterUpdate
      ? isWorkspaceActiveFromStatus(manifestAfterUpdate.status)
      : normalizeAgentActive(entry?.active);
    const wantsDefault = Boolean(entry?.default);
    const isDefault = wantsDefault && isActive && !defaultAssigned;
    const wantsOrchestrator = Boolean(entry?.orchestrator);
    const isOrchestrator = wantsOrchestrator && !orchestratorAssigned;

    normalized.push({
      id,
      path: agentPath,
      environment: normalizeAgentEnvironment(entry?.environment),
      active: isActive,
      default: isDefault,
      orchestrator: isOrchestrator
    });

    if (isDefault) defaultAssigned = true;
    if (isOrchestrator) orchestratorAssigned = true;
  });

  if (!normalized.some((agent) => normalizeAgentActive(agent.active))) {
    throw new Error("Нужен хотя бы один активный агент");
  }

  if (!normalized.some((agent) => agent.default && normalizeAgentActive(agent.active))) {
    const firstActive = normalized.find((agent) => normalizeAgentActive(agent.active));
    if (firstActive) firstActive.default = true;
  }

  saveRegistryEntriesToWsList(
    projectRoot,
    normalized.map((agent) => ({
      id: agent.id,
      path: agent.path,
      environment: agent.environment,
      default: agent.default,
      orchestrator: agent.orchestrator
    }))
  );
  loadRegistrySync();

  return {
    agents: getAgentsPublicList(),
    defaultAgentId: getDefaultAgentId()
  };
}

function runWithAgent(agentId, fn) {
  const agent = resolveAgent(agentId);
  if (!agent) {
    return Promise.reject(new Error(`Unknown agent: ${agentId}`));
  }
  return agentContext.run({ agentId: agent.id, agentRoot: agent.rootAbsolute, agent }, fn);
}

function buildPathValidationResult(pathValue, resolvedPath) {
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const directoryState = resolveExistingWorkspaceDirectory(absolute);
  const manifest = directoryState.exists ? readWorkspaceManifestSync(directoryState.absolute) : null;

  if (directoryState.error) {
    return {
      path: pathValue,
      valid: false,
      exists: false,
      manifestFound: false,
      absolute: directoryState.absolute,
      error: directoryState.error
    };
  }

  if (!directoryState.exists) {
    return {
      path: pathValue,
      valid: true,
      exists: false,
      manifestFound: false,
      absolute: directoryState.absolute
    };
  }

  return {
    path: pathValue,
    valid: true,
    exists: true,
    manifestFound: Boolean(manifest),
    absolute: directoryState.absolute,
    manifest: manifest || null
  };
}

function validateAgentWorkspacePaths(rawPaths) {
  const paths = Array.isArray(rawPaths) ? rawPaths : [];
  return paths.map((rawPath) => {
    const pathValue = String(rawPath || "").trim();
    if (!pathValue) {
      return { path: pathValue, valid: false, exists: false, manifestFound: false, error: "Путь пустой" };
    }

    try {
      const resolvedPath = assertSafeAgentPath(pathValue);
      return buildPathValidationResult(pathValue, resolvedPath);
    } catch (error) {
      return {
        path: pathValue,
        valid: false,
        exists: false,
        manifestFound: false,
        error: String(error?.message || error)
      };
    }
  });
}

function getDefaultDiscoverRoots(extraRoots = []) {
  const roots = [
    path.join(projectRoot, "workspaces"),
    path.join(projectRoot, "Workspaces"),
    projectRoot
  ];
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    roots.push(path.join(home, "Desktop"));
    roots.push(home);
  }
  for (const item of extraRoots) {
    const cleaned = String(item || "").trim();
    if (cleaned) roots.push(cleaned);
  }
  return [...new Set(roots.map((item) => path.normalize(item)).filter(Boolean))];
}

function shouldSkipScanDir(name) {
  if (!name) return true;
  if (SKIP_SCAN_DIRS.has(name)) return true;
  return name.startsWith(".") && name !== ".awn-framework";
}

function scanForAgentManifests(dirAbsolute, depth, maxDepth, results, seen) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  if (isWorkspaceReginfoAtPath(dirAbsolute)) {
    const folderName = path.basename(dirAbsolute);
    if (isAgentFolderName(folderName)) {
      let key = path.normalize(dirAbsolute);
      try {
        key = fs.realpathSync.native(dirAbsolute);
      } catch {
        // keep normalized
      }
      if (!seen.has(key)) {
        seen.add(key);
        const manifest = readWorkspaceManifestSync(dirAbsolute);
        const previewAbsolute = findAgentWorkspacePreviewAbsoluteSync(dirAbsolute);
        results.push({
          path: toRegistryPath(dirAbsolute),
          absolute: key,
          manifestFound: Boolean(manifest),
          manifest: manifest || null,
          name: manifest?.name || folderName,
          comment: manifest?.comment || "",
          id: agentFolderNameToSlug(folderName, results.length),
          hasPreview: Boolean(previewAbsolute),
          previewRel: manifest?.preview || null
        });
      }
    }
  }

  if (depth >= maxDepth) return;

  const childDirs = entries.filter((entry) => entry.isDirectory() && !shouldSkipScanDir(entry.name));
  childDirs.sort((left, right) => {
    const leftIsAgent = isAgentFolderName(left.name);
    const rightIsAgent = isAgentFolderName(right.name);
    if (leftIsAgent !== rightIsAgent) return leftIsAgent ? -1 : 1;
    return String(left.name).localeCompare(String(right.name), "ru");
  });

  for (const entry of childDirs) {
    scanForAgentManifests(path.join(dirAbsolute, entry.name), depth + 1, maxDepth, results, seen);
  }
}

function discoverAgentManifests(options = {}) {
  const maxDepth = Math.min(Math.max(Number(options.maxDepth) || 6, 1), 10);
  const roots = getDefaultDiscoverRoots(Array.isArray(options.roots) ? options.roots : []);
  const results = [];
  const seen = new Set();

  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    let rootAbsolute = root;
    try {
      const stat = fs.statSync(root);
      if (!stat.isDirectory()) continue;
      rootAbsolute = fs.realpathSync.native(root);
    } catch {
      continue;
    }
    scanForAgentManifests(rootAbsolute, 0, maxDepth, results, seen);
  }

  results.sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ru"));
  return results;
}

function getAgentManifestPreviewAbsolute(agent) {
  const enriched = enrichAgentEntry(agent);
  return findAgentWorkspacePreviewAbsoluteSync(enriched.rootAbsolute);
}

function createAgentWorkspace(options = {}) {
  const workspacePath = normalizeAgentWorkspacePath(String(options.path || "").trim());
  if (!workspacePath) {
    throw new Error("Укажите путь workspace");
  }

  const resolvedPath = assertSafeAgentPath(workspacePath);
  const workspaceAbsolute = resolveAgentRootAbsolute(resolvedPath);
  const folderName = path.basename(workspaceAbsolute);
  if (!isAgentFolderName(folderName)) {
    throw new Error(
      `ID агента (имя папки) «${folderName}»: латиница, цифры, дефис и подчёркивание`
    );
  }

  const id = agentFolderNameToSlug(folderName, 0);
  assertAgentIdAvailable(id, { excludePath: resolvedPath });

  if (fs.existsSync(workspaceAbsolute)) {
    if (!fs.statSync(workspaceAbsolute).isDirectory()) {
      throw new Error("Путь указывает на файл, нужна папка");
    }
  } else {
    fs.mkdirSync(workspaceAbsolute, { recursive: true });
  }

  if (isWorkspaceReginfoAtPath(workspaceAbsolute)) {
    throw new Error(`В «${resolvedPath}» уже есть ${AREA_MANIFEST_FILE} с awn-type: ${WORKSPACE_AWN_TYPE}`);
  }

  const name = String(options.name || "").trim() || folderName.replace(/\.agent$/i, "") || folderName;
  const comment = String(options.comment ?? options.description ?? "").trim();
  const areaManifestRel = AREA_MANIFEST_FILE;
  fs.mkdirSync(
    path.join(workspaceAbsolute, ...getNamedStorageSlotDirRel(areaManifestRel).split("/")),
    { recursive: true }
  );

  let agentFrontmatter = buildDefaultFrontmatter(WORKSPACE_AWN_TYPE, {
    name,
    agentRoot: workspaceAbsolute,
    projectRoot
  });
  if (comment) {
    agentFrontmatter = upsertYamlScalarInFrontmatter(agentFrontmatter, "awn-description", comment);
  }
  fs.writeFileSync(
    path.join(workspaceAbsolute, AREA_MANIFEST_FILE),
    joinNodeFrontmatter(agentFrontmatter, `# ${name}\n`),
    "utf-8"
  );

  return {
    path: toRegistryPath(workspaceAbsolute) || resolvedPath,
    id,
    name,
    comment,
    manifestFound: true,
    hasPreview: false,
    previewRel: null
  };
}

function refreshAgentsFromDisk() {
  loadRegistrySync();
}

function assertMutableWorkspaceAgent(agentId) {
  const id = String(agentId || "").trim();
  if (!id) throw new Error("agentId is required");
  if (isPlatformAgentId(id)) {
    throw new Error("Platform workspace cannot be modified");
  }
  refreshAgentsFromDisk();
  const agent = resolveAgent(id);
  if (!agent || agent.virtual) {
    throw new Error(`Unknown workspace: ${id}`);
  }
  return agent;
}

function agentsToRegistryPayload() {
  refreshAgentsFromDisk();
  return agents.map((agent) => {
    const manifest = readWorkspaceManifestSync(agent.rootAbsolute);
    return {
      path: agent.path,
      environment: agent.environment,
      active: normalizeAgentActive(agent.active),
      default: Boolean(agent.default),
      orchestrator: Boolean(agent.orchestrator),
      name: manifest?.name || agent.name,
      comment: manifest?.description || agent.comment || ""
    };
  });
}

function appendAgentToRegistry(entry = {}) {
  const agentPath = assertSafeAgentPath(entry.path);
  const pathKey = normalizeRegistryPathKey(agentPath);
  const payload = agentsToRegistryPayload();
  if (payload.some((item) => normalizeRegistryPathKey(item.path) === pathKey)) {
    refreshAgentsFromDisk();
    const existing = agents.find((agent) => normalizeRegistryPathKey(agent.path) === pathKey);
    return {
      agents: getAgentsPublicList(),
      defaultAgentId: getDefaultAgentId(),
      agent: existing ? enrichAgentEntry(existing) : null,
      alreadyRegistered: true
    };
  }

  payload.push({
    path: agentPath,
    environment: normalizeAgentEnvironment(entry.environment),
    active: entry.active !== false,
    default: Boolean(entry.default),
    orchestrator: Boolean(entry.orchestrator),
    name: entry.name,
    comment: entry.comment ?? entry.description ?? ""
  });

  const data = saveAgentsRegistry(payload);
  const created = data.agents.find(
    (agent) => normalizeRegistryPathKey(agent.path) === pathKey
  );
  return { ...data, agent: created || null, alreadyRegistered: false };
}

function deriveWorkspacePathFromName(name) {
  const slug = slugifyAgentId(name, 0);
  if (!slug) throw new Error("name is required");
  return `workspaces/${slug}`;
}

function createWorkspaceAndRegister(options = {}) {
  const name = String(options.name || "").trim();
  if (!name) throw new Error("name is required");

  const workspacePath = normalizeAgentWorkspacePath(
    String(options.path || "").trim() || deriveWorkspacePathFromName(name)
  );
  const created = createAgentWorkspace({
    path: workspacePath,
    name,
    comment: options.description ?? options.comment
  });

  const registry = appendAgentToRegistry({
    path: created.path,
    environment: options.environment,
    active: options.active !== false,
    default: Boolean(options.default),
    orchestrator: Boolean(options.orchestrator),
    name: created.name,
    comment: created.comment
  });

  let groups = null;
  if (options.groupId) {
    groups = assignWorkspaceToGroup(created.id, options.groupId);
  }

  const agent =
    registry.agents?.find((item) => item.id === created.id) ||
    getAgentsPublicList().find((item) => item.id === created.id) ||
    null;

  return {
    agent,
    groups,
    defaultAgentId: registry.defaultAgentId,
    alreadyRegistered: registry.alreadyRegistered
  };
}

function updateAgentWorkspace(agentId, patch = {}) {
  const agent = assertMutableWorkspaceAgent(agentId);

  const manifestPatch = {};
  if (patch.name !== undefined) manifestPatch.name = patch.name;
  if (patch.description !== undefined) manifestPatch.comment = patch.description;
  if (patch.comment !== undefined) manifestPatch.comment = patch.comment;
  if (patch.active !== undefined) manifestPatch.active = patch.active;
  if (patch.status !== undefined) manifestPatch.status = patch.status;
  if (Object.keys(manifestPatch).length) {
    updateWorkspaceReginfoFields(agent.path, manifestPatch);
  }

  const uiPatch = {};
  for (const key of ["color", "emoji", "preview", "category", "owner", "priority", "tags"]) {
    if (patch[key] !== undefined) uiPatch[key] = patch[key];
  }
  if (Object.keys(uiPatch).length) {
    updateWorkspaceManifestUiFields(agent.path, uiPatch);
  }

  const registryPatch =
    patch.default !== undefined ||
    patch.orchestrator !== undefined ||
    patch.environment !== undefined ||
    patch.active !== undefined;

  let registryResult = null;
  if (registryPatch) {
    const payload = agentsToRegistryPayload().map((entry) => {
      if (normalizeRegistryPathKey(entry.path) !== normalizeRegistryPathKey(agent.path)) {
        if (patch.default === true) {
          return { ...entry, default: false };
        }
        if (patch.orchestrator === true) {
          return { ...entry, orchestrator: false };
        }
        return entry;
      }
      return {
        ...entry,
        environment:
          patch.environment !== undefined
            ? normalizeAgentEnvironment(patch.environment)
            : entry.environment,
        active: patch.active !== undefined ? patch.active !== false : entry.active,
        default: patch.default !== undefined ? Boolean(patch.default) : entry.default,
        orchestrator:
          patch.orchestrator !== undefined ? Boolean(patch.orchestrator) : entry.orchestrator,
        name: patch.name !== undefined ? String(patch.name).trim() : entry.name,
        comment:
          patch.description !== undefined || patch.comment !== undefined
            ? String(patch.description ?? patch.comment ?? "").trim()
            : entry.comment
      };
    });
    registryResult = saveAgentsRegistry(payload);
  } else {
    refreshAgentsFromDisk();
  }

  const updated =
    registryResult?.agents?.find((item) => item.id === agentId) ||
    getAgentsPublicList().find((item) => item.id === agentId) ||
    null;

  return {
    agent: updated,
    defaultAgentId: registryResult?.defaultAgentId || getDefaultAgentId()
  };
}

function setDefaultAgentWorkspace(agentId) {
  return updateAgentWorkspace(agentId, { default: true });
}

function setOrchestratorAgentWorkspace(agentId) {
  return updateAgentWorkspace(agentId, { orchestrator: true });
}

function createWorkspaceGroup(options = {}) {
  refreshAgentsFromDisk();
  loadAgentsGroupsSync();
  const title = String(options.title || options.name || "").trim();
  if (!title) throw new Error("title is required");

  const entry = normalizeAgentsGroupEntry(
    { id: options.id, title },
    agentsGroupsCache.groups.length,
    getKnownAgentIdsSet()
  );
  if (!entry) throw new Error("Invalid group");
  if (agentsGroupsCache.groups.some((group) => group.id === entry.id)) {
    throw new Error(`Group already exists: ${entry.id}`);
  }

  const groups = [
    ...agentsGroupsCache.groups,
    {
      id: entry.id,
      title: entry.title,
      agentIds: [],
      background: null,
      appearance: "light"
    }
  ];
  return saveAgentsGroups(groups, agentsGroupsCache.ungrouped);
}

function updateWorkspaceGroup(groupId, patch = {}) {
  refreshAgentsFromDisk();
  loadAgentsGroupsSync();
  const id = String(groupId || "").trim();
  if (!id || id === UNGROUPED_GROUP_ID) {
    throw new Error("groupId is required");
  }

  let found = false;
  const groups = agentsGroupsCache.groups.map((group) => {
    if (group.id !== id) return group;
    found = true;
    const title =
      patch.title !== undefined ? String(patch.title || group.title).trim() || group.title : group.title;
    const appearance =
      patch.appearance !== undefined
        ? patch.appearance === "dark"
          ? "dark"
          : "light"
        : group.appearance;
    return { ...group, title, appearance };
  });

  if (!found) throw new Error(`Group not found: ${id}`);
  return saveAgentsGroups(groups, agentsGroupsCache.ungrouped);
}

function deleteWorkspaceGroup(groupId) {
  refreshAgentsFromDisk();
  loadAgentsGroupsSync();
  const id = String(groupId || "").trim();
  if (!id || id === UNGROUPED_GROUP_ID) {
    throw new Error("groupId is required");
  }

  const groups = agentsGroupsCache.groups.filter((group) => group.id !== id);
  if (groups.length === agentsGroupsCache.groups.length) {
    throw new Error(`Group not found: ${id}`);
  }
  return saveAgentsGroups(groups, agentsGroupsCache.ungrouped);
}

function assignWorkspaceToGroup(agentId, groupId) {
  const agent = assertMutableWorkspaceAgent(agentId);
  const targetGroupId = String(groupId || "").trim();
  if (!targetGroupId) throw new Error("groupId is required");
  if (targetGroupId === UNGROUPED_GROUP_ID) {
    return removeWorkspaceFromGroup(agentId);
  }

  loadAgentsGroupsSync();
  if (!agentsGroupsCache.groups.some((group) => group.id === targetGroupId)) {
    throw new Error(`Group not found: ${targetGroupId}`);
  }

  const groups = agentsGroupsCache.groups.map((group) => ({
    ...group,
    agentIds: group.agentIds.filter((id) => id !== agent.id)
  }));
  const target = groups.find((group) => group.id === targetGroupId);
  if (!target.agentIds.includes(agent.id)) {
    target.agentIds.push(agent.id);
  }
  return saveAgentsGroups(groups, agentsGroupsCache.ungrouped);
}

function removeWorkspaceFromGroup(agentId) {
  const agent = assertMutableWorkspaceAgent(agentId);
  loadAgentsGroupsSync();
  const groups = agentsGroupsCache.groups.map((group) => ({
    ...group,
    agentIds: group.agentIds.filter((id) => id !== agent.id)
  }));
  return saveAgentsGroups(groups, agentsGroupsCache.ungrouped);
}

function reorderWorkspaceGroups(groupIds = []) {
  refreshAgentsFromDisk();
  loadAgentsGroupsSync();
  const order = [...new Set((Array.isArray(groupIds) ? groupIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!order.length) throw new Error("groupIds is required");

  const byId = new Map(agentsGroupsCache.groups.map((group) => [group.id, group]));
  const reordered = [];
  for (const id of order) {
    if (!byId.has(id)) {
      throw new Error(`Group not found: ${id}`);
    }
    reordered.push(byId.get(id));
    byId.delete(id);
  }
  for (const group of byId.values()) {
    reordered.push(group);
  }
  return saveAgentsGroups(reordered, agentsGroupsCache.ungrouped);
}

function findSystemReferenceScaffold(presetBase) {
  const key = String(presetBase || "").trim().toLowerCase();
  return SYSTEM_REFERENCE_SCAFFOLDS.find((item) => item.preset === key) || null;
}

function findCatalogScaffold(presetBase) {
  const scaffold = findSystemReferenceScaffold(presetBase);
  return scaffold && scaffold.kind === "catalog" ? scaffold : null;
}

function findServiceDocScaffold(presetBase) {
  const scaffold = findSystemReferenceScaffold(presetBase);
  return scaffold && scaffold.kind === "service-doc" ? scaffold : null;
}

function getSystemReferenceRelPaths(scaffold, options = {}) {
  if (scaffold.kind === "service-doc") {
    return {
      manifest: toTopicFileName(scaffold.fileName),
      content: null
    };
  }
  const bundleFile =
    scaffold.bundleFile === BUNDLE_TABULAR_FILE ? BUNDLE_TABULAR_FILE : BUNDLE_CONTENT_FILE;
  if (options.baseKind === "taxonomy-root") {
    const manifest = toTopicFileName(scaffold.fileName);
    return {
      manifest,
      content: getNamedStorageBundleRel(manifest, bundleFile)
    };
  }
  const catalogDir = DEFAULT_SERVICE_CATALOG_FOLDER;
  const manifest = path.join(catalogDir, toTopicFileName(scaffold.fileName)).replace(/\\/g, "/");
  return {
    manifest,
    content: getNamedStorageBundleRel(manifest, bundleFile)
  };
}

function getCatalogRelPaths(scaffold) {
  return getSystemReferenceRelPaths(scaffold);
}

function systemReferenceExistsSync(serviceAbsolute, scaffold) {
  const rel = getSystemReferenceRelPaths(scaffold);
  return fs.existsSync(path.join(serviceAbsolute, rel.manifest));
}

function catalogManifestExistsSync(serviceAbsolute, scaffold) {
  return systemReferenceExistsSync(serviceAbsolute, scaffold);
}

function isSystemReferenceManifestRel(relPath, kitFolder = getAgentKitFolder()) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!kitFolder) return false;
  const kitPrefix = String(kitFolder).replace(/\\/g, "/").replace(/\/$/, "");
  for (const scaffold of SYSTEM_REFERENCE_SCAFFOLDS) {
    const relPaths = getSystemReferenceRelPaths(scaffold);
    const candidate = `${kitPrefix}/${relPaths.manifest}`.replace(/\\/g, "/");
    if (candidate === normalized) return true;
  }
  return false;
}

function createSystemReferenceNodeSync(serviceAbsolute, presetBase, options = {}) {
  if (!serviceAbsolute) {
    const error = new Error("Service folder path is required");
    error.code = "EINVAL";
    throw error;
  }

  const scaffold = findSystemReferenceScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown system reference preset");
    error.code = "EINVAL";
    throw error;
  }

  const rel = getSystemReferenceRelPaths(scaffold, options);
  const manifestPath = path.join(serviceAbsolute, rel.manifest);

  if (fs.existsSync(manifestPath)) {
    const error = new Error("System reference already exists");
    error.code = "EEXIST";
    throw error;
  }

  if (scaffold.kind === "catalog") {
    const catalogAbsolute =
      options.baseKind === "taxonomy-root"
        ? serviceAbsolute
        : path.join(serviceAbsolute, DEFAULT_SERVICE_CATALOG_FOLDER);
    const contentPath = path.join(serviceAbsolute, rel.content);
    fs.mkdirSync(catalogAbsolute, { recursive: true });
    fs.mkdirSync(path.dirname(contentPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      joinNodeFrontmatter(
        `awn-name: ${scaffold.title}\nawn-tags: [system, catalog]\nawn-type: catalog`,
        scaffold.manifest
      ),
      "utf-8"
    );
    fs.writeFileSync(contentPath, scaffold.content, "utf-8");
    return rel.manifest;
  }

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const awnType = resolveAgentKitTopicType(scaffold.preset);
  fs.writeFileSync(
    manifestPath,
    joinNodeFrontmatter(
      `awn-name: ${scaffold.title}\nawn-tags: [system, service]\nawn-type: ${awnType}`,
      scaffold.manifest
    ),
    "utf-8"
  );
  return rel.manifest;
}

function createSystemCatalogNodeSync(serviceAbsolute, presetBase, options = {}) {
  const scaffold = findCatalogScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown catalog preset");
    error.code = "EINVAL";
    throw error;
  }
  return createSystemReferenceNodeSync(serviceAbsolute, presetBase, options);
}

function createSystemServiceDocSync(serviceAbsolute, presetBase) {
  const scaffold = findServiceDocScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown service doc preset");
    error.code = "EINVAL";
    throw error;
  }
  return createSystemReferenceNodeSync(serviceAbsolute, presetBase);
}

module.exports = {
  DEFAULT_AGENT_KIT_FOLDER,
  isAgentKitFolderEntryName,
  DEFAULT_CONTAINER_FOLDER,
  DEFAULT_SHARED_FOLDER,
  isContainerFolderEntryName,
  isSharedFolderEntryName,
  isReservedAgentRootFolderEntryName,
  getAgentKitFolder,
  getAgentContainerFolder,
  getAgentSharedFolder,
  WORKSPACE_TAXONOMY_FOLDER,
  LEGACY_WORKSPACE_TAXONOMY_FOLDER,
  DEFAULT_SERVICE_CATALOG_FOLDER,
  SYSTEM_REFERENCE_SCAFFOLDS,
  findCatalogScaffold,
  findServiceDocScaffold,
  findSystemReferenceScaffold,
  isSystemReferenceManifestRel,
  createSystemReferenceNodeSync,
  createSystemServiceDocSync,
  WORKSPACE_AWN_TYPE,
  WORKSPACE_AWN_TYPE_LEGACY,
  WORKSPACE_AWN_TYPES,
  isWorkspaceAwnType,
  agentFolderNameToSlug,
  AWN_MAP_FILE,
  AWN_AGENTS_REGISTRY_FILE,
  AGENT_CMS_CORE_REL,
  DEPENDENCIES_CSV_FILE,
  AWN_AUTOINCREMENT_ID_FILE,
  isDependenciesCsvFileName,
  init,
  getAgentRoot,
  getActiveAgentId,
  resolveAgent,
  getDefaultAgentId,
  reloadDefaultAgentId,
  getAgentsPublicList,
  createSystemCatalogNodeSync,
  saveAgentsRegistry,
  getAgentsGroupsPublic,
  saveAgentsGroups,
  writeGroupBackgroundFile,
  removeGroupBackground,
  readGroupBackgroundFile,
  clearGroupBackgroundFiles,
  validateAgentWorkspacePaths,
  discoverAgentManifests,
  createAgentWorkspace,
  createWorkspaceAndRegister,
  appendAgentToRegistry,
  updateAgentWorkspace,
  setDefaultAgentWorkspace,
  setOrchestratorAgentWorkspace,
  createWorkspaceGroup,
  updateWorkspaceGroup,
  deleteWorkspaceGroup,
  assignWorkspaceToGroup,
  removeWorkspaceFromGroup,
  reorderWorkspaceGroups,
  UNGROUPED_GROUP_ID,
  readWorkspaceManifestSync,
  isWorkspaceReginfoAtPath,
  enrichAgentEntry,
  getAgentManifestPreviewAbsolute,
  resolveManifestPreviewAbsolute,
  resolveAgentRootAbsolute,
  toRegistryPath,
  findAgentWorkspacePreviewAbsoluteSync,
  getOrCreateAgentWorkspacePreviewAbsoluteSync,
  clearAgentWorkspacePreviewImagesSync,
  updateWorkspaceReginfoFields,
  assertSafeAgentPath,
  refreshAgentsFromDisk,
  runWithAgent,
  collectAllFocusEntries,
  collectAgentFocusEntries,
  collectAllMainEntries,
  collectAgentMainEntries,
  collectAllRecentEntries,
  collectAgentRecentEntries,
  buildNavFlagEntry,
  isAwnFocusEntry,
  isAwnMainEntry,
  isPlatformAgentId
};
