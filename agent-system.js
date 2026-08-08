const fs = require("fs");
const path = require("path");
const {
  AGENT_SYSTEM_REL,
  AWN_DATA_REL,
  getCmsConfigRel,
  agentSystemDirExists,
  getAgentCmsCoreAbsolute
} = require("./platform-sources");
const {
  getTypeCatalogPayload,
  resolveAgentDomainManifest,
  loadTypeCatalog
} = require("./type-catalog-loader");
const { cmsConfigExists, DOMAIN_TYPE_STORES } = require("./awn-data-types-bridge");
const {
  getAgentSystemTypesSectionFolder,
  isAgentSystemRelPath: isAwnSystemFolderRelPath,
  resolveAgentSystemFileAbsolute
} = require("./types-yaml-bridge");

const SYSTEM_DOMAIN_LABELS = {
  base: "Base",
  pages: "Pages",
  content: "Content",
  slots: "Slots",
  fields: "Fields",
  "md-blocks": "Markdown blocks",
  taxonomies: "Taxonomies",
  views: "Views",
  mixins: "Mixins",
  settings: "Settings",
  data: "Накопители (awn-data)"
};

function getAgentSystemRoot(agentRoot) {
  return path.join(String(agentRoot || "").trim(), getCmsConfigRel(agentRoot));
}

function getAgentSystemRootRel(agentRoot) {
  return getCmsConfigRel(agentRoot);
}

function agentSystemExists(agentRoot) {
  return cmsConfigExists(agentRoot);
}

function normalizeAgentSystemRelPath(relPath) {
  let normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("awn-data/cms-base/")) {
    return normalized;
  }
  if (normalized.startsWith("awn-data/") && isAwnDataTypeRecordPath(normalized)) {
    return normalized;
  }
  return normalized;
}

function isAwnDataStoreManifestPath(normalized) {
  return /^awn-data\/.+\/manifest\.md$/i.test(normalized);
}

function isAwnDataTypeRecordPath(normalized) {
  if (!normalized.startsWith(`${AWN_DATA_REL}/`) || !/\.md$/i.test(normalized)) return false;
  if (/\/manifest\.md$/i.test(normalized)) return false;
  const prefixes = [
    "awn-data/pages/",
    "awn-data/content/",
    "awn-data/slots/",
    "awn-data/settings/",
    "awn-data/cms-base/mixins/"
  ];
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function isAgentSystemRelPath(relPath) {
  const normalized = normalizeAgentSystemRelPath(relPath);
  if (isAwnSystemFolderRelPath(normalized)) return true;
  return (
    normalized === AGENT_SYSTEM_REL ||
    normalized.startsWith(`${AGENT_SYSTEM_REL}/`) ||
    normalized.startsWith("awn-data/cms-base/") ||
    isAwnDataStoreManifestPath(normalized) ||
    isAwnDataTypeRecordPath(normalized)
  );
}

function resolveAgentSystemAbsolute(agentRoot, relPath, projectRoot = process.cwd()) {
  const normalized = normalizeAgentSystemRelPath(relPath);
  if (isAwnSystemFolderRelPath(normalized)) {
    return resolveAgentSystemFileAbsolute(agentRoot, normalized);
  }
  if (
    normalized.startsWith("awn-data/cms-base/") ||
    isAwnDataStoreManifestPath(normalized) ||
    isAwnDataTypeRecordPath(normalized)
  ) {
    const absolute = path.join(String(agentRoot || "").trim(), normalized);
    const dataRoot = path.join(String(agentRoot || "").trim(), AWN_DATA_REL);
    if (!absolute.startsWith(dataRoot)) return null;
    return absolute;
  }
  const configRel = getCmsConfigRel(agentRoot);
  if (normalized === configRel || normalized.startsWith(`${configRel}/`)) {
    return path.join(String(agentRoot || "").trim(), normalized);
  }
  return null;
}

async function buildAgentSystemMenuTree(agentRootAbsolute, projectRoot = process.cwd()) {
  const agentRoot = String(agentRootAbsolute || "").trim();
  if (!agentRoot || !agentSystemExists(agentRoot)) return null;

  const configRel = getAgentSystemRootRel(agentRoot);
  const configRoot = getAgentSystemRoot(agentRoot);
  const indexPath = fs.existsSync(path.join(configRoot, "manifest.md")) ? `${configRel}/manifest.md` : null;
  const useYaml = agentSystemDirExists(agentRoot);

  const items = [];
  let topFiles = [];
  try {
    topFiles = fs
      .readdirSync(configRoot, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith("."))
      .map((e) => e.name)
      .filter((name) => /\.(md|ya?ml|json)$/i.test(name) && name !== "manifest.md")
      .sort((a, b) => a.localeCompare(b, "ru"));
  } catch {}
  for (const name of topFiles) {
    items.push({
      label: name,
      path: `${configRel}/${name}`.replace(/\\/g, "/"),
      systemFile: true
    });
  }

  const domainManifest = resolveAgentDomainManifest(configRoot);
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const sections = [];

  for (const domainMeta of domainManifest) {
    const domain = domainMeta.id;
    const domainEntries = (catalog.byDomain?.[domain] || []).filter((entry) => entry && !entry.aliasOf);
    if (!domainEntries.length) continue;

    const mapEntryToItem = (entry) => {
      const schema = entry.schema || {};
      const isFoundation =
        schema.kind === "entity" ||
        schema.kind === "base" ||
        schema.kind === "table" ||
        schema.kind === "row" ||
        /\/(base|table\.base|row\.base|_base|entity)$/i.test(entry.relPath || entry.fileName || "");
      return {
        label: isFoundation ? `${schema.name || entry.id} (база)` : schema.name || entry.id,
        path: entry.catalogFile || `${configRel}/${domain}/${entry.fileName}.md`,
        systemFile: true,
        typeId: entry.id,
        typeKind: schema.kind || entry.kind || "",
        typeExtends: schema.extends || entry.extends || "",
        isFoundation
      };
    };

    let domainItems = [];
    let subGroups = [];

    if (domain === "data") {
      const foundations = [];
      const containers = [];
      const elements = [];
      for (const entry of domainEntries) {
        const item = mapEntryToItem(entry);
        const rel = String(entry.relPath || entry.fileName || "").replace(/\\/g, "/");
        const kind = entry.kind || entry.schema?.kind || "";
        if (item.isFoundation) {
          foundations.push(item);
        } else if (kind === "data-element" || rel.includes("elements/")) {
          elements.push(item);
        } else {
          containers.push(item);
        }
      }
      domainItems = foundations;
      if (containers.length) {
        subGroups.push({
          title: "Контейнеры (group / collection / single)",
          items: containers.sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"))
        });
      }
      if (elements.length) {
        subGroups.push({
          title: "Схемы записей (elements)",
          items: elements.sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"))
        });
      }
    } else {
      domainItems = domainEntries
        .map(mapEntryToItem)
        .sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"));
    }

    const storeFolder = useYaml
      ? getAgentSystemTypesSectionFolder(domain)
      : DOMAIN_TYPE_STORES[domain]
        ? `awn-data/${DOMAIN_TYPE_STORES[domain]}`
        : `${configRel}/${domain}`;

    sections.push({
      title: domainMeta.label || SYSTEM_DOMAIN_LABELS[domain] || domain,
      domain,
      domainKind: domainMeta.kind || null,
      folderPath: storeFolder,
      items: domainItems.sort((a, b) => String(a.label).localeCompare(String(b.label), "ru")),
      subGroups
    });
  }

  return {
    title: "Базовая модель",
    indexPath,
    sections,
    items,
    typeCount: catalog.byId?.size || 0,
    systemRoot: configRel
  };
}

async function readAgentSystemFile(agentRoot, relPath, projectRoot = process.cwd()) {
  const absolute = resolveAgentSystemAbsolute(agentRoot, relPath, projectRoot);
  if (!absolute || !fs.existsSync(absolute)) {
    return { path: relPath, exists: false, content: null };
  }
  const stat = await fs.promises.stat(absolute);
  if (!stat.isFile()) {
    return { path: relPath, exists: false, content: null, error: "Not a file" };
  }
  const content = await fs.promises.readFile(absolute, "utf-8");
  return {
    path: normalizeAgentSystemRelPath(relPath),
    exists: true,
    content,
    ext: path.extname(absolute).toLowerCase()
  };
}

async function writeAgentSystemFile(agentRoot, relPath, content, projectRoot = process.cwd()) {
  const absolute = resolveAgentSystemAbsolute(agentRoot, relPath, projectRoot);
  if (!absolute) {
    throw new Error("Invalid agent-system path");
  }
  const ext = path.extname(absolute).toLowerCase();
  const allowed = [".yml", ".yaml", ".md", ".json"];
  if (!allowed.includes(ext)) {
    throw new Error("Only .yml, .yaml, .md and .json files are editable in agent-system");
  }
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const normalized = String(content ?? "");
  const nextContent = normalized.endsWith("\n") || !normalized ? normalized : `${normalized}\n`;
  await fs.promises.writeFile(absolute, nextContent, "utf-8");
  return readAgentSystemFile(agentRoot, relPath, projectRoot);
}

function getAgentSystemStatus(agentRoot, projectRoot = process.cwd()) {
  const exists = agentSystemExists(agentRoot);
  const configRel = getAgentSystemRootRel(agentRoot);
  if (!exists) {
    return { exists: false, root: configRel };
  }
  const payload = getTypeCatalogPayload(projectRoot, agentRoot);
  return {
    exists: true,
    root: configRel,
    sources: payload.sources || [],
    typeCount: Array.isArray(payload.browseTypes) ? payload.browseTypes.length : 0,
    domains: Object.keys(payload.domains || {}),
    agentSystemRoot: payload.agentSystemRoot || null
  };
}

module.exports = {
  AGENT_SYSTEM_REL,
  SYSTEM_DOMAIN_LABELS,
  getAgentSystemRoot,
  getAgentSystemRootRel,
  agentSystemExists,
  isAgentSystemRelPath,
  resolveAgentSystemAbsolute,
  normalizeAgentSystemRelPath,
  buildAgentSystemMenuTree,
  readAgentSystemFile,
  writeAgentSystemFile,
  getAgentSystemStatus
};
