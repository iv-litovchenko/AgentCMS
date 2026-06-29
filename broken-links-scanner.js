const fs = require("fs/promises");
const path = require("path");
const {
  STORAGE_ROOT_FOLDER,
  STORAGE_SUBFOLDER_REPOSITORY,
  parseStorageAssetsRef,
  parseStorageSlotInlineRef,
  getNamedStorageSlotDirRel
} = require("./manifest-paths");
const {
  resolveMarkdownHrefToWorkspaceRel,
  getWikilinkTargetFromRel
} = require("./markdown-link-rewriter");

const MARKDOWN_LINK_RE = /(!?\[(?:\\.|[^\]])*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKILINK_RE = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
const REF_LINK_DEF_RE = /^\s*\[([^\]]+)\]:\s+<?([^>\s]+)>?(?:\s+["'][^"']*["'])?\s*$/;
const HTML_HREF_RE = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
const FILE_REF_EXTENSION_RE = /\.(md|png|jpe?g|gif|webp|csv|yml|yaml|pdf|svg|mp4|mp3|txt|json|xml|html?|docx?|xlsx?|pptx?|zip|tar|gz)$/i;

const SCAN_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv"
]);

function normalizeLinkPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function shouldSkipScanDirectory(name) {
  const lower = String(name || "").toLowerCase();
  if (SCAN_SKIP_DIRS.has(lower)) return true;
  if (lower === ".obsidian") return true;
  return false;
}

/** Пути внутри awn-storage/repository не сканируем (клоны git и внешние деревья). */
function isBrokenLinksExcludedScanPath(relPath) {
  const norm = normalizeLinkPath(relPath).toLowerCase();
  if (!norm) return false;
  const marker = `/${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_REPOSITORY}`;
  return norm.includes(marker) || norm.endsWith(`${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_REPOSITORY}`);
}

function splitNodeFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) {
    return { frontmatter: "", body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: "", body: text };
  }
  const frontmatter = text.slice(3, end).replace(/^\n/, "");
  const body = text.slice(end + 4).replace(/^\n/, "");
  return { frontmatter, body };
}

async function collectWorkspaceFiles(dirAbsolute, prefix = "", files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const absolute = path.join(dirAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const relativeNorm = relative.replace(/\\/g, "/");
      if (isBrokenLinksExcludedScanPath(relativeNorm)) continue;
      if (shouldSkipScanDirectory(entry.name)) continue;
      await collectWorkspaceFiles(absolute, relativeNorm, files);
      continue;
    }

    if (!entry.isFile()) continue;
    files.push(relative.replace(/\\/g, "/"));
  }

  return files;
}

function buildWikilinkIndex(mdFiles) {
  const index = new Map();

  for (const relPath of mdFiles) {
    const target = getWikilinkTargetFromRel(relPath);
    if (!target) continue;
    const keys = new Set([target, target.toLowerCase()]);
    for (const key of keys) {
      const bucket = index.get(key) || [];
      bucket.push(relPath);
      index.set(key, bucket);
    }
  }

  return index;
}

function workspacePathExistsInSet(fileSet, relPath) {
  const lower = normalizeLinkPath(relPath).toLowerCase();
  if (!lower) return true;
  if (fileSet.has(lower)) return true;

  if (new RegExp(`^${STORAGE_ROOT_FOLDER}/`, "i").test(lower)) {
    for (const file of fileSet) {
      if (file === lower || file.endsWith(`/${lower}`)) return true;
    }
  }

  return false;
}

function workspaceFileExists(fileSet, relPath) {
  const norm = normalizeLinkPath(relPath);
  if (!norm) return true;

  if (workspacePathExistsInSet(fileSet, norm)) return true;

  const inlineRef = parseStorageSlotInlineRef(norm);
  if (inlineRef?.workspacePath && workspacePathExistsInSet(fileSet, inlineRef.workspacePath)) {
    return true;
  }

  const assetsRef = parseStorageAssetsRef(norm);
  if (assetsRef?.workspacePath && workspacePathExistsInSet(fileSet, assetsRef.workspacePath)) {
    return true;
  }

  const lower = norm.toLowerCase();
  if (!/\.[a-z0-9]{1,8}$/i.test(norm)) {
    if (fileSet.has(`${lower}.md`)) return true;
  }

  return false;
}

function resolveHrefToWorkspaceRel(sourceRel, pathPart) {
  const normalizedSource = normalizeLinkPath(sourceRel);
  const href = String(pathPart || "").trim().split("#")[0].split("?")[0].trim();
  if (!href) return null;

  const hrefClean = href.replace(/^\.\//, "");
  if (/^(assets|media|pasted|preview|attachments)\//i.test(hrefClean)) {
    const slotInsideStorage = normalizedSource.match(
      new RegExp(`^(.*?/${STORAGE_ROOT_FOLDER}/[^/]+)(?:/|$)`, "i")
    );
    if (slotInsideStorage) {
      return normalizeLinkPath(`${slotInsideStorage[1]}/${hrefClean}`);
    }

    const slotDir = getNamedStorageSlotDirRel(normalizedSource);
    if (slotDir) {
      return normalizeLinkPath(`${slotDir}/${hrefClean}`);
    }
  }

  return resolveMarkdownHrefToWorkspaceRel(href, normalizedSource);
}

function wikilinkTargetExists(target, wikiIndex) {
  const raw = String(target || "").trim();
  if (!raw) return true;
  const bucket = wikiIndex.get(raw) || wikiIndex.get(raw.toLowerCase());
  return Array.isArray(bucket) && bucket.length > 0;
}

function looksLikeFileReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/api/")) return false;
  if (raw.startsWith("./") || raw.startsWith("../")) return true;
  if (raw.includes("/")) return true;
  if (/^awn-storage\//i.test(raw)) return true;
  return FILE_REF_EXTENSION_RE.test(raw);
}

function unwrapYamlScalar(value) {
  let raw = String(value || "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function isExternalHref(href) {
  const raw = String(href || "").trim();
  if (!raw) return true;
  if (/^https?:\/\//i.test(raw)) return true;
  if (/^data:/i.test(raw)) return true;
  if (raw.startsWith("/api/")) return true;
  if (/^mailto:/i.test(raw)) return true;
  if (/^tel:/i.test(raw)) return true;
  if (raw === "#" || raw.startsWith("#")) return true;
  return false;
}

function pushIssue(issues, issue) {
  issues.push(issue);
}

function inspectHref(href, sourceRel, context, meta, issues) {
  if (isExternalHref(href)) return;

  const raw = String(href || "").trim();
  const hashIndex = raw.indexOf("#");
  const pathPart = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  if (!pathPart) return;

  const inlineRef = parseStorageSlotInlineRef(pathPart);
  if (inlineRef?.workspacePath) {
    if (
      !isBrokenLinksExcludedScanPath(inlineRef.workspacePath) &&
      !workspaceFileExists(context.fileSet, inlineRef.workspacePath)
    ) {
      pushIssue(issues, {
        sourcePath: sourceRel,
        location: meta.location,
        field: meta.field || null,
        line: meta.line || null,
        kind: "asset",
        link: raw,
        resolvedPath: inlineRef.workspacePath,
        message: "Файл вложения не найден"
      });
    }
    return;
  }

  const assetsRef = parseStorageAssetsRef(pathPart);
  if (assetsRef?.workspacePath) {
    if (
      !isBrokenLinksExcludedScanPath(assetsRef.workspacePath) &&
      !workspaceFileExists(context.fileSet, assetsRef.workspacePath)
    ) {
      pushIssue(issues, {
        sourcePath: sourceRel,
        location: meta.location,
        field: meta.field || null,
        line: meta.line || null,
        kind: "asset",
        link: raw,
        resolvedPath: assetsRef.workspacePath,
        message: "Файл вложения не найден"
      });
    }
    return;
  }

  const resolved = resolveHrefToWorkspaceRel(sourceRel, pathPart);
  if (!resolved) return;
  if (isBrokenLinksExcludedScanPath(resolved)) return;

  if (!workspaceFileExists(context.fileSet, resolved)) {
    pushIssue(issues, {
      sourcePath: sourceRel,
      location: meta.location,
      field: meta.field || null,
      line: meta.line || null,
      kind: "file",
      link: raw,
      resolvedPath: resolved,
      message: "Файл или документ не найден"
    });
  }
}

function inspectWikilink(target, sourceRel, context, meta, issues) {
  const raw = String(target || "").trim();
  if (!raw) return;
  if (!wikilinkTargetExists(raw, context.wikiIndex)) {
    pushIssue(issues, {
      sourcePath: sourceRel,
      location: meta.location,
      field: meta.field || null,
      line: meta.line || null,
      kind: "wikilink",
      link: `[[${raw}]]`,
      resolvedPath: raw,
      message: "Цель wikilink не найдена в workspace"
    });
  }
}

function scanTextForLinks(text, sourceRel, context, metaBase, issues) {
  const source = String(text || "");
  if (!source) return;

  for (const match of source.matchAll(MARKDOWN_LINK_RE)) {
    inspectHref(match[2], sourceRel, context, metaBase, issues);
  }

  for (const match of source.matchAll(WIKILINK_RE)) {
    inspectWikilink(match[1], sourceRel, context, metaBase, issues);
  }

  for (const match of source.matchAll(HTML_HREF_RE)) {
    inspectHref(match[1], sourceRel, context, metaBase, issues);
  }

  for (const line of source.split("\n")) {
    const refMatch = line.match(REF_LINK_DEF_RE);
    if (!refMatch) continue;
    inspectHref(refMatch[2], sourceRel, context, metaBase, issues);
  }
}

function scanYamlFrontmatter(frontmatter, sourceRel, context, issues) {
  const lines = String(frontmatter || "").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const lineNo = index + 1;
    scanTextForLinks(trimmed, sourceRel, context, { location: "yaml", line: lineNo }, issues);

    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem) {
      const value = unwrapYamlScalar(listItem[1]);
      if (looksLikeFileReference(value)) {
        inspectHref(value, sourceRel, context, { location: "yaml", line: lineNo }, issues);
      }
      continue;
    }

    const scalar = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.+)$/);
    if (!scalar) continue;

    const field = scalar[1];
    const value = unwrapYamlScalar(scalar[2]);
    if (!value || value === '""' || value === "''") continue;
    if (!looksLikeFileReference(value)) continue;

    inspectHref(value, sourceRel, context, { location: "yaml", field, line: lineNo }, issues);
  }
}

function scanCsvContent(content, sourceRel, context, issues) {
  scanTextForLinks(content, sourceRel, context, { location: "csv" }, issues);

  const lines = String(content || "").split("\n");
  for (let rowIndex = 0; rowIndex < lines.length; rowIndex += 1) {
    const line = lines[rowIndex];
    if (!line.trim()) continue;
    const cells = line.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
    for (const cell of cells) {
      const value = cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
      if (!looksLikeFileReference(value)) continue;
      inspectHref(value, sourceRel, context, { location: "csv", line: rowIndex + 1 }, issues);
    }
  }
}

async function buildAgentBrokenLinksReport(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) {
    return {
      count: 0,
      issues: [],
      scanned: { markdown: 0, csv: 0, files: 0 }
    };
  }

  const allFiles = await collectWorkspaceFiles(root);
  const fileSet = new Set(allFiles.map((item) => item.toLowerCase()));
  const mdFiles = allFiles.filter(
    (item) => item.toLowerCase().endsWith(".md") && !isBrokenLinksExcludedScanPath(item)
  );
  const csvFiles = allFiles.filter(
    (item) =>
      path.posix.basename(item).toLowerCase() === "content.csv" && !isBrokenLinksExcludedScanPath(item)
  );
  const wikiIndex = buildWikilinkIndex(mdFiles);
  const context = { fileSet, wikiIndex };
  const issues = [];

  for (const relPath of mdFiles) {
    const absolute = path.join(root, relPath);
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }

    const { frontmatter, body } = splitNodeFrontmatter(content);
    if (frontmatter.trim()) {
      scanYamlFrontmatter(frontmatter, relPath, context, issues);
    }
    scanTextForLinks(body, relPath, context, { location: "body" }, issues);
  }

  for (const relPath of csvFiles) {
    const absolute = path.join(root, relPath);
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }
    scanCsvContent(content, relPath, context, issues);
  }

  issues.sort(
    (left, right) =>
      left.sourcePath.localeCompare(right.sourcePath, "ru", { sensitivity: "base", numeric: true }) ||
      String(left.location).localeCompare(String(right.location)) ||
      (left.line || 0) - (right.line || 0) ||
      String(left.link).localeCompare(String(right.link))
  );

  return {
    count: issues.length,
    issues,
    scanned: {
      markdown: mdFiles.length,
      csv: csvFiles.length,
      files: allFiles.length
    }
  };
}

module.exports = {
  buildAgentBrokenLinksReport
};
