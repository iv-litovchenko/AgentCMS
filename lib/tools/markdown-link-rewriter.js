const fs = require("fs");
const path = require("path");
const {
  isAreaManifestFileName,
  stripTopicPrefix,
  stripStoragePrefix
} = require("../config/manifest-paths");

const MARKDOWN_LINK_RE = /(!?\[(?:\\.|[^\]])*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKILINK_RE = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

function normalizeLinkPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function joinWorkspaceRelativePath(baseRel, hrefRel) {
  const stack = baseRel ? normalizeLinkPath(baseRel).split("/").filter(Boolean) : [];
  if (stack.length && /\.md$/i.test(stack[stack.length - 1])) {
    stack.pop();
  }
  for (const part of String(hrefRel || "").split("/")) {
    if (part === "..") stack.pop();
    else if (part && part !== ".") stack.push(part);
  }
  return stack.join("/");
}

function resolveMarkdownHrefToWorkspaceRel(href, sourceRel) {
  const raw = String(href || "").trim();
  if (!raw || /^https?:\/\//i.test(raw) || /^data:/i.test(raw) || raw.startsWith("/api/")) {
    return null;
  }
  const pathPart = raw.split("#")[0].split("?")[0].trim();
  if (!pathPart) return null;
  if (pathPart.startsWith("/")) {
    return normalizeLinkPath(decodeURIComponent(pathPart));
  }
  return normalizeLinkPath(joinWorkspaceRelativePath(sourceRel, decodeURIComponent(pathPart)));
}

function relativizeWorkspacePath(fromRel, toRel) {
  const from = normalizeLinkPath(fromRel);
  const to = normalizeLinkPath(toRel);
  if (!to) return "";
  if (!from || from === to) return to.split("/").pop() || to;

  const fromParts = from.split("/").filter(Boolean);
  const toParts = to.split("/").filter(Boolean);
  if (fromParts.length && /\.md$/i.test(fromParts[fromParts.length - 1])) {
    fromParts.pop();
  }

  let index = 0;
  while (
    index < fromParts.length &&
    index < toParts.length &&
    fromParts[index].toLowerCase() === toParts[index].toLowerCase()
  ) {
    index += 1;
  }
  const up = fromParts.length - index;
  const relParts = [...Array(up).fill(".."), ...toParts.slice(index)];
  return relParts.join("/") || toParts[toParts.length - 1] || to;
}

function getWikilinkTargetFromRel(relPath) {
  const normalized = normalizeLinkPath(relPath);
  if (!normalized) return "";
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) return "";
  const fileName = parts[parts.length - 1];
  if (isAreaManifestFileName(fileName)) {
    const folderName = parts[parts.length - 2] || "";
    const topicLabel = stripStoragePrefix(folderName) || stripTopicPrefix(folderName);
    if (parts.length > 2) {
      return [...parts.slice(0, -2), topicLabel].filter(Boolean).join("/");
    }
    return topicLabel;
  }
  const baseName = stripTopicPrefix(fileName);
  if (parts.length > 1) {
    return [...parts.slice(0, -1), baseName].join("/");
  }
  return baseName;
}

function buildTargetRelMapper(exactMappings = [], prefixMappings = []) {
  const exact = new Map();
  for (const item of exactMappings) {
    const oldRel = normalizeLinkPath(item.oldRel);
    const newRel = normalizeLinkPath(item.newRel);
    if (!oldRel || !newRel) continue;
    exact.set(oldRel.toLowerCase(), newRel);
  }

  const prefixes = prefixMappings
    .map((item) => ({
      oldPrefix: normalizeLinkPath(item.oldPrefix).replace(/\/?$/, "/"),
      newPrefix: normalizeLinkPath(item.newPrefix).replace(/\/?$/, "/")
    }))
    .filter((item) => item.oldPrefix && item.newPrefix && item.oldPrefix !== item.newPrefix)
    .sort((a, b) => b.oldPrefix.length - a.oldPrefix.length);

  return (targetRel) => {
    const norm = normalizeLinkPath(targetRel);
    if (!norm) return null;
    const lower = norm.toLowerCase();
    if (exact.has(lower)) return exact.get(lower);

    for (const { oldPrefix, newPrefix } of prefixes) {
      if (lower === oldPrefix.slice(0, -1)) {
        return newPrefix.slice(0, -1);
      }
      if (lower.startsWith(oldPrefix)) {
        return newPrefix + norm.slice(oldPrefix.length);
      }
    }
    return null;
  };
}

function buildWikilinkTargetMapper(mappings = [], prefixMappings = []) {
  const exact = new Map();
  for (const item of mappings) {
    const oldTarget = String(item.oldTarget || "").trim();
    const newTarget = String(item.newTarget || "").trim();
    if (!oldTarget || !newTarget || oldTarget === newTarget) continue;
    exact.set(oldTarget, newTarget);
    exact.set(oldTarget.toLowerCase(), newTarget);
  }

  const prefixes = prefixMappings
    .map((item) => ({
      oldPrefix: normalizeLinkPath(item.oldPrefix).replace(/\/?$/, ""),
      newPrefix: normalizeLinkPath(item.newPrefix).replace(/\/?$/, "")
    }))
    .filter((item) => item.oldPrefix && item.newPrefix && item.oldPrefix !== item.newPrefix)
    .sort((a, b) => b.oldPrefix.length - a.oldPrefix.length);

  return (target) => {
    const raw = String(target || "").trim();
    if (!raw) return null;
    if (exact.has(raw)) return exact.get(raw);
    const lower = raw.toLowerCase();
    if (exact.has(lower)) return exact.get(lower);

    for (const { oldPrefix, newPrefix } of prefixes) {
      if (lower === oldPrefix) return newPrefix;
      if (lower.startsWith(`${oldPrefix}/`)) {
        return `${newPrefix}${raw.slice(oldPrefix.length)}`;
      }
    }
    return null;
  };
}

function rewriteMarkdownContent(content, sourceRel, mappers) {
  const source = String(content || "");
  const mapTargetRel = mappers.mapTargetRel;
  const mapWikilinkTarget = mappers.mapWikilinkTarget;
  let linksUpdated = 0;
  let changed = false;

  let next = source.replace(MARKDOWN_LINK_RE, (match, labelPart, href) => {
    const hrefRaw = String(href || "");
    const hashIndex = hrefRaw.indexOf("#");
    const pathPart = hashIndex >= 0 ? hrefRaw.slice(0, hashIndex) : hrefRaw;
    const anchor = hashIndex >= 0 ? hrefRaw.slice(hashIndex) : "";

    const resolved = resolveMarkdownHrefToWorkspaceRel(pathPart, sourceRel);
    if (!resolved) return match;

    const mapped = mapTargetRel(resolved);
    if (!mapped || mapped.toLowerCase() === resolved.toLowerCase()) return match;

    const newHref = relativizeWorkspacePath(sourceRel, mapped);
    linksUpdated += 1;
    changed = true;
    return `${labelPart}(${newHref}${anchor})`;
  });

  next = next.replace(WIKILINK_RE, (match, target, headingPart, alias) => {
    const mapped = mapWikilinkTarget(target);
    if (!mapped || mapped === target) return match;
    linksUpdated += 1;
    changed = true;
    const heading = headingPart || "";
    if (alias) return `[[${mapped}${heading}|${alias}]]`;
    return `[[${mapped}${heading}]]`;
  });

  return { content: next, changed, linksUpdated };
}

async function collectMarkdownFiles(dirAbsolute, prefix = "", files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env") continue;
    const absolute = path.join(dirAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await collectMarkdownFiles(absolute, relative.replace(/\\/g, "/"), files);
      continue;
    }

    if (!/\.md$/i.test(entry.name)) continue;
    files.push(relative.replace(/\\/g, "/"));
  }

  return files;
}

function buildRewritePlan({ exactMappings = [], prefixMappings = [] }) {
  const wikilinkMappings = [];
  for (const item of exactMappings) {
    wikilinkMappings.push({
      oldTarget: getWikilinkTargetFromRel(item.oldRel),
      newTarget: getWikilinkTargetFromRel(item.newRel)
    });
  }
  return {
    mapTargetRel: buildTargetRelMapper(exactMappings, prefixMappings),
    mapWikilinkTarget: buildWikilinkTargetMapper(wikilinkMappings, prefixMappings)
  };
}

async function rewriteAgentMarkdownLinks(agentRoot, options = {}) {
  const exactMappings = Array.isArray(options.exactMappings) ? options.exactMappings : [];
  const prefixMappings = Array.isArray(options.prefixMappings) ? options.prefixMappings : [];
  if (!exactMappings.length && !prefixMappings.length) {
    return { filesUpdated: 0, linksUpdated: 0, files: [] };
  }

  const mappers = buildRewritePlan({ exactMappings, prefixMappings });
  const files = await collectMarkdownFiles(agentRoot);
  let filesUpdated = 0;
  let linksUpdated = 0;
  const touched = [];

  for (const relPath of files) {
    const absolute = path.join(agentRoot, relPath);
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }

    const result = rewriteMarkdownContent(content, relPath, mappers);
    if (!result.changed) continue;

    await fs.writeFile(absolute, result.content, "utf-8");
    filesUpdated += 1;
    linksUpdated += result.linksUpdated;
    touched.push(relPath);
  }

  return { filesUpdated, linksUpdated, files: touched };
}

module.exports = {
  rewriteAgentMarkdownLinks,
  rewriteMarkdownContent,
  resolveMarkdownHrefToWorkspaceRel,
  relativizeWorkspacePath,
  getWikilinkTargetFromRel,
  buildRewritePlan
};
