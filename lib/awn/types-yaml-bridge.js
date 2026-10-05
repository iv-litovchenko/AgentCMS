const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const { AGENT_SYSTEM_REL, getTypeDomainDirName } = require("../platform/platform-sources");

function agentSystemYamlEnabled(agentSystemRoot) {
  const root = String(agentSystemRoot || "").trim();
  if (!root) return false;
  return fs.existsSync(path.join(root, "registry.yml"));
}

function listTypeYamlFiles(typesDir) {
  if (!typesDir || !fs.existsSync(typesDir)) return [];
  const result = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
        result.push(path.join(dir, entry.name));
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        walk(path.join(dir, entry.name));
      }
    }
  }
  walk(typesDir);
  return result;
}

function loadTypeYamlFile(filePath, domain, source, domainDir) {
  try {
    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    if (!parsed?.id) return null;
    const fileName = path.basename(filePath).replace(/\.ya?ml$/i, "");
    let relFromDomain = fileName;
    if (domainDir) {
      try {
        relFromDomain = path
          .relative(domainDir, filePath)
          .replace(/\\/g, "/")
          .replace(/\.ya?ml$/i, "");
      } catch {
        relFromDomain = fileName;
      }
    }
    const catalogFile = `${AGENT_SYSTEM_REL}/types/${getTypeDomainDirName(domain)}/${relFromDomain}.yml`.replace(
      /\/+/g,
      "/"
    );
    return {
      id: String(parsed.id).trim(),
      domain,
      fileName,
      filePath,
      relPath: `${domain}/${relFromDomain}`,
      catalogFile,
      source,
      schema: parsed,
      status: String(parsed.status || "active").trim(),
      kind: String(parsed.kind || "").trim(),
      extends: parsed.extends ? String(parsed.extends).trim() : null
    };
  } catch {
    return null;
  }
}

function ingestYamlDomainTypes(typesDir, domain, source, byId, byDomain) {
  if (!typesDir || !fs.existsSync(typesDir)) return false;
  if (!byDomain[domain]) byDomain[domain] = [];
  const indexById = new Map(byDomain[domain].map((entry, idx) => [entry.id, idx]));
  let count = 0;
  for (const filePath of listTypeYamlFiles(typesDir)) {
    const entry = loadTypeYamlFile(filePath, domain, source, typesDir);
    if (!entry) continue;
    count += 1;
    byId.set(entry.id, entry);
    if (indexById.has(entry.id)) {
      byDomain[domain][indexById.get(entry.id)] = entry;
    } else {
      byDomain[domain].push(entry);
      indexById.set(entry.id, byDomain[domain].length - 1);
    }
  }
  return count > 0;
}

function getAgentSystemTypesSectionFolder(domain) {
  return `${AGENT_SYSTEM_REL}/types/${getTypeDomainDirName(domain)}`;
}

function isAgentSystemRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized === AGENT_SYSTEM_REL || normalized.startsWith(`${AGENT_SYSTEM_REL}/`);
}

function resolveAgentSystemFileAbsolute(agentRoot, relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!isAgentSystemRelPath(normalized)) return null;
  const absolute = path.join(String(agentRoot || "").trim(), normalized);
  const systemRoot = path.join(String(agentRoot || "").trim(), AGENT_SYSTEM_REL);
  if (!absolute.startsWith(systemRoot)) return null;
  return absolute;
}

module.exports = {
  agentSystemYamlEnabled,
  listTypeYamlFiles,
  loadTypeYamlFile,
  ingestYamlDomainTypes,
  getAgentSystemTypesSectionFolder,
  isAgentSystemRelPath,
  resolveAgentSystemFileAbsolute
};
