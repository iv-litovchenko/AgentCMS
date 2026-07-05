const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const { AGENT_SYSTEM_REL, AGENT_TYPE_DOMAINS } = require("./platform-sources");
const { getTypeCatalogPayload } = require("./type-catalog-loader");

const SYSTEM_DOMAIN_LABELS = {
  base: "Base",
  pages: "Pages",
  content: "Content",
  slots: "Slots",
  fields: "Fields",
  "md-blocks": "Markdown blocks",
  taxonomies: "Taxonomies",
  views: "Views",
  mixins: "Mixins"
};

function getAgentSystemRoot(agentRoot) {
  return path.join(String(agentRoot || "").trim(), AGENT_SYSTEM_REL);
}

function agentSystemExists(agentRoot) {
  const root = getAgentSystemRoot(agentRoot);
  return fs.existsSync(path.join(root, "registry.yml")) || fs.existsSync(path.join(root, "types"));
}

function isAgentSystemRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized === AGENT_SYSTEM_REL || normalized.startsWith(`${AGENT_SYSTEM_REL}/`);
}

function resolveAgentSystemAbsolute(agentRoot, relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!isAgentSystemRelPath(normalized)) return null;
  const absolute = path.join(String(agentRoot || "").trim(), normalized);
  const systemRoot = getAgentSystemRoot(agentRoot);
  if (!absolute.startsWith(systemRoot)) return null;
  return absolute;
}

function listYamlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "ru"));
}

function readTypeYamlMeta(filePath) {
  try {
    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    return {
      id: parsed?.id ? String(parsed.id) : path.basename(filePath).replace(/\.ya?ml$/i, ""),
      name: parsed?.name ? String(parsed.name) : path.basename(filePath, path.extname(filePath)),
      kind: parsed?.kind ? String(parsed.kind) : "",
      extends: parsed?.extends ? String(parsed.extends) : ""
    };
  } catch {
    return {
      id: path.basename(filePath).replace(/\.ya?ml$/i, ""),
      name: path.basename(filePath).replace(/\.ya?ml$/i, ""),
      kind: "",
      extends: ""
    };
  }
}

async function buildAgentSystemMenuTree(agentRootAbsolute, projectRoot = process.cwd()) {
  const agentRoot = String(agentRootAbsolute || "").trim();
  if (!agentRoot || !agentSystemExists(agentRoot)) return null;

  const systemRoot = getAgentSystemRoot(agentRoot);
  const manifestPath = path.join(systemRoot, "manifest.md");
  const indexPath = fs.existsSync(manifestPath) ? `${AGENT_SYSTEM_REL}/manifest.md` : null;

  const items = [];
  for (const name of ["MAP.md", "slots-bindings.yml", "registry.yml"]) {
    const rel = `${AGENT_SYSTEM_REL}/${name}`.replace(/\\/g, "/");
    if (fs.existsSync(path.join(systemRoot, name))) {
      items.push({
        label: name,
        path: rel,
        systemFile: true
      });
    }
  }

  const sections = [];
  const typesRoot = path.join(systemRoot, "types");
  if (fs.existsSync(typesRoot)) {
    for (const domain of AGENT_TYPE_DOMAINS) {
      const domainDir = path.join(typesRoot, domain);
      if (!fs.existsSync(domainDir)) continue;
      const domainItems = [];
      for (const fileName of listYamlFiles(domainDir)) {
        if (fileName.startsWith("_")) continue;
        const rel = `${AGENT_SYSTEM_REL}/types/${domain}/${fileName}`.replace(/\\/g, "/");
        const meta = readTypeYamlMeta(path.join(domainDir, fileName));
        domainItems.push({
          label: meta.name || meta.id,
          path: rel,
          systemFile: true,
          typeId: meta.id,
          typeKind: meta.kind,
          typeExtends: meta.extends
        });
      }
      if (!domainItems.length) continue;
      sections.push({
        title: SYSTEM_DOMAIN_LABELS[domain] || domain,
        folderPath: `${AGENT_SYSTEM_REL}/types/${domain}`,
        items: domainItems
      });
    }
  }

  let typeCount = 0;
  try {
    const payload = getTypeCatalogPayload(projectRoot, agentRoot);
    typeCount = Array.isArray(payload?.browseTypes) ? payload.browseTypes.length : 0;
  } catch {
    typeCount = sections.reduce((acc, section) => acc + (section.items?.length || 0), 0);
  }

  return {
    title: "Базовая модель",
    indexPath,
    sections,
    items,
    typeCount,
    systemRoot: AGENT_SYSTEM_REL
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
    path: String(relPath || "").replace(/\\/g, "/"),
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
  if (![".yml", ".yaml", ".md"].includes(ext)) {
    throw new Error("Only .yml, .yaml and .md files are editable in agent-system");
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
    return { exists: false, root: AGENT_SYSTEM_REL };
  }
  const payload = getTypeCatalogPayload(projectRoot, agentRoot);
  return {
    exists: true,
    root: AGENT_SYSTEM_REL,
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
  agentSystemExists,
  isAgentSystemRelPath,
  resolveAgentSystemAbsolute,
  buildAgentSystemMenuTree,
  readAgentSystemFile,
  writeAgentSystemFile,
  getAgentSystemStatus
};
