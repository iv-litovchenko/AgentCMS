#!/usr/bin/env node
/**
 * Normalize inline asset refs in markdown/yaml to:
 *   awn-storage/assets/{pasted|preview|attachments}/<file>
 */
const fs = require("fs/promises");
const path = require("path");

const WORKSPACES_ROOT = path.join(__dirname, "..", "workspaces");
const STORAGE_ROOT = "awn-storage";
const ASSETS_ROOT = `${STORAGE_ROOT}/assets`;
const INLINE_SUBDIRS = ["pasted", "preview", "attachments"];

function extractCanonicalRef(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized) || normalized.startsWith("/api/")) {
    return normalized;
  }

  let candidate = normalized;
  if (/^storage\//i.test(candidate)) {
    candidate = `${STORAGE_ROOT}/${candidate.replace(/^storage\//i, "")}`;
  }

  const inlineAssetsMatch = candidate.match(/\/assets\/(pasted|preview|attachments)\/(.+)$/i);
  if (inlineAssetsMatch?.[1] && inlineAssetsMatch[2]) {
    return `${ASSETS_ROOT}/${inlineAssetsMatch[1]}/${inlineAssetsMatch[2]}`;
  }

  if (/^assets\/(pasted|preview|attachments)\//i.test(candidate)) {
    return `${STORAGE_ROOT}/${candidate}`;
  }

  if (/^(pasted|preview|attachments)\//i.test(candidate)) {
    return `${ASSETS_ROOT}/${candidate}`;
  }

  const markerIdx = Math.max(
    candidate.toLowerCase().indexOf(`/${STORAGE_ROOT}/assets/`),
    candidate.toLowerCase().indexOf("/storage/assets/")
  );
  if (markerIdx >= 0) {
    const tail = candidate.slice(markerIdx + 1).replace(/^storage\//i, `${STORAGE_ROOT}/`);
    const tailMatch = tail.match(/^awn-storage\/assets\/(pasted|preview|attachments)\/(.+)$/i);
    if (tailMatch) return `${ASSETS_ROOT}/${tailMatch[1]}/${tailMatch[2]}`;
  }

  if (/^awn-storage\/assets\/(pasted|preview|attachments)\//i.test(candidate)) {
    return candidate;
  }

  return "";
}

function rewriteMarkdownRefs(text) {
  let changed = false;
  let next = String(text || "");

  next = next.replace(/!\[([^\]]*)\]\(([^)\s"#]+)(?:\s+"[^"]*")?\)/g, (match, alt, href) => {
    const canonical = extractCanonicalRef(href);
    if (!canonical || canonical === href.trim()) return match;
    changed = true;
    return `![${alt}](${canonical})`;
  });

  next = next.replace(/(?<!!)\[([^\]]*)\]\(([^)\s"#]+)(?:\s+"[^"]*")?\)/g, (match, label, href) => {
    if (!/\/attachments\//i.test(href) && !/^attachments\//i.test(href) && !/\/assets\/attachments\//i.test(href)) {
      return match;
    }
    const canonical = extractCanonicalRef(href);
    if (!canonical || canonical === href.trim()) return match;
    changed = true;
    return `[${label}](${canonical})`;
  });

  return { text: next, changed };
}

function rewriteFrontmatterScalar(line, key) {
  const match = line.match(/^(\s*[-\s]*)([^:]+):\s*(.*)$/);
  if (!match) return { line, changed: false };

  const [, prefix, rawKey, rawValue] = match;
  if (rawKey.trim() !== key) return { line, changed: false };

  const trimmed = rawValue.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return { line, changed: false };

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  const canonical = extractCanonicalRef(unquoted);
  if (!canonical || canonical === unquoted) return { line, changed: false };

  return { line: `${prefix}${rawKey}: ${canonical}`, changed: true };
}

function rewriteAttachmentListLines(lines) {
  let changed = false;
  const next = lines.map((line) => {
    const listMatch = line.match(/^(\s*-\s+)(.+)$/);
    if (!listMatch) return line;
    const canonical = extractCanonicalRef(listMatch[2].trim());
    if (!canonical || canonical === listMatch[2].trim()) return line;
    changed = true;
    return `${listMatch[1]}${canonical}`;
  });
  return { lines: next, changed };
}

function migrateFileContent(content) {
  let changed = false;
  const { frontmatter, body } = splitFrontmatter(content);
  let nextFrontmatter = frontmatter;
  let nextBody = body;

  if (frontmatter) {
    const lines = frontmatter.split("\n");
    let inAttachments = false;
    const rewritten = [];

    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (/^awn-preview:/i.test(line)) {
        const result = rewriteFrontmatterScalar(line, "awn-preview");
        if (result.changed) changed = true;
        line = result.line;
        inAttachments = false;
      } else if (/^awn-attachments:/i.test(line)) {
        inAttachments = true;
        line = lines[i];
      } else if (inAttachments && /^\s+-\s+/.test(line)) {
        const canonical = extractCanonicalRef(line.replace(/^\s*-\s+/, "").trim());
        if (canonical && canonical !== line.replace(/^\s*-\s+/, "").trim()) {
          changed = true;
          line = line.replace(/^(\s*-\s+).+$/, `$1${canonical}`);
        }
      } else if (inAttachments && line.trim() && !/^\s/.test(line)) {
        inAttachments = false;
      } else if (inAttachments && /^\s*\[\s*\]\s*$/.test(line)) {
        inAttachments = false;
      } else if (!/^\s/.test(line)) {
        inAttachments = false;
      }

      rewritten.push(line);
    }

    nextFrontmatter = rewritten.join("\n");
  }

  const bodyResult = rewriteMarkdownRefs(nextBody);
  if (bodyResult.changed) changed = true;
  nextBody = bodyResult.text;

  if (!changed) return null;
  return joinFrontmatter(nextFrontmatter, nextBody);
}

function splitFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function joinFrontmatter(frontmatter, body) {
  if (!String(frontmatter || "").trim()) return String(body || "");
  return `---\n${frontmatter}\n---\n${body}`;
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await walk(absolute, files);
      continue;
    }
    if (!/\.(?:md|mdback|yml|yaml)$/i.test(entry.name)) continue;
    files.push(absolute);
  }
  return files;
}

async function main() {
  const files = await walk(WORKSPACES_ROOT);
  let updated = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8");
    const migrated = migrateFileContent(original);
    if (!migrated || migrated === original) continue;
    await fs.writeFile(filePath, migrated, "utf8");
    updated += 1;
    console.log(path.relative(WORKSPACES_ROOT, filePath));
  }

  console.log(`\nUpdated ${updated} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
