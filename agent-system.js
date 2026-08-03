const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const { CMS_CONFIG_REL, AWN_DATA_REL } = require("./platform-sources");
const {
  getTypeCatalogPayload,
  resolveAgentDomainManifest
} = require("./type-catalog-loader");
const { cmsConfigExists, DOMAIN_TYPE_STORES } = require("./awn-data-types-bridge");

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
  settings: "Settings"
};

function getAgentSystemRoot(agentRoot) {
  return path.join(String(agentRoot || "").trim(), CMS_CONFIG_REL);
}

function agentSystemExists(agentRoot) {
  return cmsConfigExists(agentRoot);
}

function normalizeAgentSystemRelPath(relPath) {
  let normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized === "awn-system" || normalized.startsWith("awn-system/")) {
    normalized = normalized.replace(/^awn-system/, CMS_CONFIG_REL);
  }
  if (normalized.startsWith("awn-system/types/")) {
    const rest = normalized.slice("awn-system/types/".length);
    const domain = rest.split("/")[0];
    const store = DOMAIN_TYPE_STORES[domain];
    if (store) {
      normalized = `awn-data/${store}/${rest.slice(domain.length + 1)}`.replace(/\.ya?ml$/i, ".md");
    }
  }
  normalized = normalized.replace(
    /^awn-data\/(pages|content|slots|base|mixins|settings)\/types\//,
    "awn-data/$1/"
  );
  normalized = normalized.replace(/^awn-data\/base\//, "awn-data/cms-base/entities/");
  normalized = normalized.replace(/^awn-data\/mixins\//, "awn-data/cms-base/mixins/");
  return normalized;
}

function isAwnDataStoreManifestPath(normalized) {
  return /^awn-data\/.+\/manifest\.md$/i.test(normalized);
}

/** @deprecated */
function isAwnDataStoreContractPath(normalized) {
  return isAwnDataStoreManifestPath(normalized) || /^awn-data\/.+\/manifest\.store\.md$/i.test(normalized);
}

function isAwnDataTypeRecordPath(normalized) {
  if (!normalized.startsWith(`${AWN_DATA_REL}/`) || !/\.md$/i.test(normalized)) return false;
  if (/\/manifest\.md$/i.test(normalized) || /\/manifest\.store\.md$/i.test(normalized)) return false;
  const prefixes = [
    "awn-data/pages/",
    "awn-data/content/",
    "awn-data/slots/",
    "awn-data/settings/",
    "awn-data/cms-base/entities/",
    "awn-data/cms-base/mixins/"
  ];
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function isAgentSystemRelPath(relPath) {
  const normalized = normalizeAgentSystemRelPath(relPath);
  return (
    normalized === CMS_CONFIG_REL ||
    normalized.startsWith(`${CMS_CONFIG_REL}/`) ||
    isAwnDataStoreManifestPath(normalized) ||
    isAwnDataTypeRecordPath(normalized)
  );
}

function resolveAgentSystemAbsolute(agentRoot, relPath) {
  const normalized = normalizeAgentSystemRelPath(relPath);
  if (!isAgentSystemRelPath(normalized)) return null;
  const absolute = path.join(String(agentRoot || "").trim(), normalized);
  const dataRoot = path.join(String(agentRoot || "").trim(), AWN_DATA_REL);
  if (!absolute.startsWith(dataRoot)) return null;
  return absolute;
}

async function buildAgentSystemMenuTree(agentRootAbsolute, projectRoot = process.cwd()) {
  const agentRoot = String(agentRootAbsolute || "").trim();
  if (!agentRoot || !agentSystemExists(agentRoot)) return null;

  const configRoot = getAgentSystemRoot(agentRoot);
  const indexPath = fs.existsSync(path.join(configRoot, "manifest.md"))
    ? `${CMS_CONFIG_REL}/manifest.md`
    : null;

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
      path: `${CMS_CONFIG_REL}/${name}`.replace(/\\/g, "/"),
      systemFile: true
    });
  }

  const domainManifest = resolveAgentDomainManifest(configRoot);
  const payload = getTypeCatalogPayload(projectRoot, agentRoot);
  const sections = [];

  for (const domainMeta of domainManifest) {
    const domain = domainMeta.id;
    const domainEntries = (payload.domains?.[domain] || []).filter((entry) => entry && !entry.aliasOf);
    if (!domainEntries.length) continue;

    const domainItems = domainEntries.map((entry) => {
      const schema = entry.schema || {};
      const isFoundation = schema.kind === "entity" || schema.kind === "base" || /\/_base$/i.test(entry.relPath || "");
      return {
        label: isFoundation ? `${schema.name || entry.id} (база)` : schema.name || entry.id,
        path: entry.catalogFile || `${CMS_CONFIG_REL}/${domain}/${entry.fileName}.md`,
        systemFile: true,
        typeId: entry.id,
        typeKind: schema.kind || entry.kind || "",
        typeExtends: schema.extends || entry.extends || "",
        isFoundation
      };
    });

    const storeFolder = DOMAIN_TYPE_STORES[domain];
    sections.push({
      title: domainMeta.label || SYSTEM_DOMAIN_LABELS[domain] || domain,
      domain,
      domainKind: domainMeta.kind || null,
      folderPath: storeFolder ? `awn-data/${storeFolder}` : `${CMS_CONFIG_REL}/${domain}`,
      items: domainItems.sort((a, b) => String(a.label).localeCompare(String(b.label), "ru")),
      subGroups: []
    });
  }

  return {
    title: "Базовая модель",
    indexPath,
    sections,
    items,
    typeCount: Array.isArray(payload?.browseTypes) ? payload.browseTypes.length : 0,
    systemRoot: CMS_CONFIG_REL
  };
}

async function readAgentSystemFile(agentRoot, relPath) {
  const absolute = resolveAgentSystemAbsolute(agentRoot, relPath);
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

async function writeAgentSystemFile(agentRoot, relPath, content) {
  const absolute = resolveAgentSystemAbsolute(agentRoot, relPath);
  if (!absolute) {
    throw new Error("Invalid agent-system path");
  }
  const ext = path.extname(absolute).toLowerCase();
  const allowed = [".yml", ".yaml", ".md", ".json"];
  if (!allowed.includes(ext)) {
    throw new Error("Only .yml, .yaml, .md and .json files are editable in cms-base/types stores");
  }
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const normalized = String(content ?? "");
  const nextContent = normalized.endsWith("\n") || !normalized ? normalized : `${normalized}\n`;
  await fs.promises.writeFile(absolute, nextContent, "utf-8");
  return readAgentSystemFile(agentRoot, relPath);
}

function getAgentSystemStatus(agentRoot, projectRoot = process.cwd()) {
  const exists = agentSystemExists(agentRoot);
  if (!exists) {
    return { exists: false, root: CMS_CONFIG_REL };
  }
  const payload = getTypeCatalogPayload(projectRoot, agentRoot);
  return {
    exists: true,
    root: CMS_CONFIG_REL,
    sources: payload.sources || [],
    typeCount: Array.isArray(payload.browseTypes) ? payload.browseTypes.length : 0,
    domains: Object.keys(payload.domains || {}),
    agentSystemRoot: payload.agentSystemRoot || null
  };
}

module.exports = {
  AGENT_SYSTEM_REL: CMS_CONFIG_REL,
  SYSTEM_DOMAIN_LABELS,
  getAgentSystemRoot,
  agentSystemExists,
  isAgentSystemRelPath,
  resolveAgentSystemAbsolute,
  normalizeAgentSystemRelPath,
  buildAgentSystemMenuTree,
  readAgentSystemFile,
  writeAgentSystemFile,
  getAgentSystemStatus
};
