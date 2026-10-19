const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { AWN_SHORT_LINKS_ROOT_FOLDER } = require("../config/manifest-paths");
const { buildPageUrlPayload, normalizeWorkspaceInputPath } = require("../routing/page-url");

const SHORT_LINK_CODE_RE = /^[a-z0-9]{6,32}$/;
const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function normalizeRelPath(value) {
  return normalizeWorkspaceInputPath(value);
}

function shortLinksRootRel() {
  return AWN_SHORT_LINKS_ROOT_FOLDER;
}

function shortLinkRecordRel(code) {
  return `${shortLinksRootRel()}/${code}.md`;
}

function parseFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const row = line.match(/^([a-z0-9-]+):\s*(.*)$/i);
    if (!row) continue;
    let value = row[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[row[1]] = value;
  }
  return { frontmatter, body: match[2].trim() };
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?"']|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function buildShortLinkRecordContent({ code, targetPath, view, createdAt }) {
  const lines = [
    "---",
    "awn-type: awn.annotation.short-link",
    `awn-code: ${formatYamlScalar(code)}`,
    `awn-target-path: ${formatYamlScalar(targetPath)}`,
    `awn-view: ${formatYamlScalar(view || "")}`,
    `awn-created-at: ${formatYamlScalar(createdAt)}`,
    "---",
    "",
    `# Короткая ссылка \`${code}\``,
    "",
    `Цель: \`${targetPath}\``,
    ""
  ];
  return lines.join("\n");
}

function recordToPayload(record, options = {}) {
  const { frontmatter } = parseFrontmatter(record.content);
  const code = String(frontmatter["awn-code"] || record.code || "").trim();
  const targetPath = normalizeRelPath(frontmatter["awn-target-path"] || "");
  const view = String(frontmatter["awn-view"] || "").trim() || null;
  const createdAt = String(frontmatter["awn-created-at"] || "").trim() || null;
  const targetExists = Boolean(options.targetExists);
  return {
    code,
    targetPath,
    view,
    createdAt,
    recordPath: record.relPath,
    targetExists,
    shortPath: buildShortLinkPublicPath(options.agentId, code),
    previewUrl: options.previewUrl || null,
    fullUrl: options.fullUrl || null
  };
}

function buildShortLinkPublicPath(agentId, code) {
  const id = String(agentId || "").trim();
  const c = String(code || "").trim();
  return `/link/${encodeURIComponent(id)}/${encodeURIComponent(c)}`;
}

function buildShortLinkPreviewUrl(baseUrl, agentId, code) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}${buildShortLinkPublicPath(agentId, code)}`;
}

async function ensureShortLinksRoot(agentRoot) {
  const dir = path.join(agentRoot, shortLinksRootRel());
  await fs.mkdir(dir, { recursive: true });
  const manifestPath = path.join(dir, "manifest.md");
  try {
    await fs.access(manifestPath);
  } catch {
    const body = [
      "---",
      "awn-type: awn.hub.area",
      "awn-name: Короткие ссылки",
      "awn-description: Реестр публичных коротких ссылок на страницы workspace",
      "---",
      "",
      "Записи: `{code}.md` с полями `awn-target-path`, `awn-view`.",
      ""
    ].join("\n");
    await fs.writeFile(manifestPath, body, "utf8");
  }
  return dir;
}

function generateShortLinkCode(length = 8) {
  const size = Math.min(Math.max(length, 6), 32);
  const bytes = crypto.randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function listShortLinkRecords(agentRoot) {
  const rootRel = shortLinksRootRel();
  const dir = path.join(agentRoot, rootRel);
  let names = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const records = [];
  for (const name of names) {
    if (!/^[a-z0-9]+\.md$/i.test(name)) continue;
    const code = name.replace(/\.md$/i, "").toLowerCase();
    const relPath = `${rootRel}/${name}`;
    const absolute = path.join(agentRoot, relPath);
    if (!absolute.startsWith(agentRoot)) continue;
    try {
      const content = await fs.readFile(absolute, "utf8");
      records.push({ code, relPath, content });
    } catch {
      // skip unreadable
    }
  }
  return records;
}

async function readTargetDisplayMeta(agentRoot, targetPath) {
  const normalized = normalizeRelPath(targetPath);
  if (!normalized) {
    return { title: "", description: "" };
  }
  const absolute = path.join(agentRoot, normalized);
  if (!absolute.startsWith(agentRoot)) {
    return { title: "", description: "" };
  }
  try {
    const content = await fs.readFile(absolute, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    const title =
      String(frontmatter["awn-name"] || frontmatter.title || "").trim() ||
      path.basename(normalized, path.extname(normalized));
    const description = String(frontmatter["awn-description"] || frontmatter.description || "").trim();
    return { title, description };
  } catch {
    return {
      title: path.basename(normalized, path.extname(normalized)),
      description: ""
    };
  }
}

async function pathExistsInWorkspace(agentRoot, relPath) {
  const normalized = normalizeRelPath(relPath);
  if (!normalized) return false;
  const absolute = path.join(agentRoot, normalized);
  if (!absolute.startsWith(agentRoot)) return false;
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

async function enrichShortLinkPayload(agentRoot, agentId, baseUrl, record) {
  const partial = recordToPayload(record, { agentId });
  const targetExists = await pathExistsInWorkspace(agentRoot, partial.targetPath);
  const previewUrl = buildShortLinkPreviewUrl(baseUrl, agentId, partial.code);
  let fullUrl = null;
  if (partial.targetPath && targetExists) {
    try {
      const page = await buildPageUrlPayload(agentRoot, agentId, partial.targetPath, {
        baseUrl,
        view: partial.view || undefined
      });
      fullUrl = page.url;
    } catch {
      fullUrl = null;
    }
  }
  return recordToPayload(record, {
    agentId,
    targetExists,
    previewUrl,
    fullUrl
  });
}

async function getShortLinkByCode(agentRoot, agentId, baseUrl, code) {
  const normalizedCode = String(code || "").trim().toLowerCase();
  if (!SHORT_LINK_CODE_RE.test(normalizedCode)) return null;
  const relPath = shortLinkRecordRel(normalizedCode);
  const absolute = path.join(agentRoot, relPath);
  if (!absolute.startsWith(agentRoot)) return null;
  try {
    const content = await fs.readFile(absolute, "utf8");
    return enrichShortLinkPayload(agentRoot, agentId, baseUrl, {
      code: normalizedCode,
      relPath,
      content
    });
  } catch {
    return null;
  }
}

async function findShortLinkByTargetPath(agentRoot, agentId, baseUrl, targetPath) {
  const normalizedTarget = normalizeRelPath(targetPath);
  if (!normalizedTarget) return null;
  const records = await listShortLinkRecords(agentRoot);
  for (const record of records) {
    const { frontmatter } = parseFrontmatter(record.content);
    const recordTarget = normalizeRelPath(frontmatter["awn-target-path"] || "");
    if (recordTarget !== normalizedTarget) continue;
    return enrichShortLinkPayload(agentRoot, agentId, baseUrl, record);
  }
  return null;
}

async function listShortLinks(agentRoot, agentId, baseUrl) {
  await ensureShortLinksRoot(agentRoot);
  const records = await listShortLinkRecords(agentRoot);
  const items = [];
  for (const record of records) {
    items.push(await enrichShortLinkPayload(agentRoot, agentId, baseUrl, record));
  }
  items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return items;
}

async function createShortLink(agentRoot, agentId, baseUrl, options = {}) {
  const targetPath = normalizeRelPath(options.targetPath || options.path);
  if (!targetPath) {
    throw Object.assign(new Error("targetPath is required"), { status: 400 });
  }
  if (!(await pathExistsInWorkspace(agentRoot, targetPath))) {
    throw Object.assign(new Error("Target path not found in workspace"), { status: 404 });
  }

  await ensureShortLinksRoot(agentRoot);

  const existing = await findShortLinkByTargetPath(agentRoot, agentId, baseUrl, targetPath);
  if (existing && options.replace !== true) {
    return { created: false, link: existing };
  }

  if (existing && options.replace === true) {
    await deleteShortLink(agentRoot, existing.code);
  }

  let code = String(options.code || "").trim().toLowerCase();
  if (code) {
    if (!SHORT_LINK_CODE_RE.test(code)) {
      throw Object.assign(new Error("Invalid code — use a-z0-9, 6–32 chars"), { status: 400 });
    }
    const taken = await getShortLinkByCode(agentRoot, agentId, baseUrl, code);
    if (taken) {
      throw Object.assign(new Error("Short link code already exists"), { status: 409 });
    }
  } else {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = generateShortLinkCode();
      const taken = await getShortLinkByCode(agentRoot, agentId, baseUrl, candidate);
      if (!taken) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw Object.assign(new Error("Failed to allocate short link code"), { status: 500 });
    }
  }

  const view = String(options.view || "").trim() || "";
  const createdAt = new Date().toISOString();
  const relPath = shortLinkRecordRel(code);
  const absolute = path.join(agentRoot, relPath);
  if (!absolute.startsWith(agentRoot)) {
    throw Object.assign(new Error("Invalid short link path"), { status: 500 });
  }

  const content = buildShortLinkRecordContent({
    code,
    targetPath,
    view,
    createdAt
  });
  await fs.writeFile(absolute, content, "utf8");

  const link = await getShortLinkByCode(agentRoot, agentId, baseUrl, code);
  return { created: true, link };
}

async function deleteShortLink(agentRoot, code) {
  const normalizedCode = String(code || "").trim().toLowerCase();
  if (!SHORT_LINK_CODE_RE.test(normalizedCode)) {
    throw Object.assign(new Error("Invalid code"), { status: 400 });
  }
  const relPath = shortLinkRecordRel(normalizedCode);
  const absolute = path.join(agentRoot, relPath);
  if (!absolute.startsWith(agentRoot)) {
    throw Object.assign(new Error("Invalid path"), { status: 400 });
  }
  try {
    await fs.unlink(absolute);
    return { ok: true, code: normalizedCode, deleted: true };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { ok: true, code: normalizedCode, deleted: false };
    }
    throw error;
  }
}

module.exports = {
  AWN_SHORT_LINKS_ROOT_FOLDER,
  SHORT_LINK_CODE_RE,
  buildShortLinkPublicPath,
  buildShortLinkPreviewUrl,
  ensureShortLinksRoot,
  listShortLinks,
  getShortLinkByCode,
  findShortLinkByTargetPath,
  createShortLink,
  deleteShortLink,
  readTargetDisplayMeta
};
