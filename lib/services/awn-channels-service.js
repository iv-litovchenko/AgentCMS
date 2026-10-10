const fs = require("fs/promises");
const path = require("path");
const { buildDefaultFrontmatter } = require("../awn/awn-types-loader");
const { allocateNextId } = require("../workspace-id/store");
const {
  CHANNEL_BUILTIN_PRESETS,
  CHANNEL_BUILTIN_SLUGS
} = require("../config/channel-presets");
const { HUB_CHANNEL_TYPE_ID } = require("../config/awn-hub-type-ids");

const AWN_CHANNELS_DIR = "awn-channels";
const CHANNEL_MANIFEST_FILE = "manifest.md";
const CHANNEL_INBOX_DIR = "inbox";

const CHANNEL_MANIFEST_DEFAULT_BODY =
  "Канал ingress workspace: входящий поток в inbox/ — triage в темы и инфоблоки.";

function normalizeRelPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

async function pathExists(absolute) {
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

function splitFrontmatter(content) {
  const raw = String(content || "");
  if (!raw.startsWith("---")) {
    return { frontmatter: "", body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: "", body: raw };
  }
  return {
    frontmatter: raw.slice(3, end).trim(),
    body: raw.slice(end + 4).replace(/^\s+/, "")
  };
}

function getYamlScalar(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.*)$`, "im");
  const match = String(frontmatter || "").match(pattern);
  if (!match) return "";
  let value = String(match[1] || "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function formatYamlScalar(value) {
  const text = String(value ?? "").trim();
  if (!text) return '""';
  if (/^[a-z0-9._-]+$/i.test(text)) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function joinManifestContent(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "").trim();
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}\n`;
}

function upsertYamlScalarLine(frontmatter, key, value) {
  const pattern = new RegExp(`^${String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:.*\\n?`, "gm");
  const line = `${key}: ${formatYamlScalar(value)}`;
  const raw = String(frontmatter || "").trim();
  if (!raw) return line;
  if (pattern.test(raw)) {
    return raw.replace(pattern, `${line}\n`).trim();
  }
  return `${raw}\n${line}`.trim();
}

function stampAwnIdInFrontmatter(frontmatter, agentRoot) {
  const existing = getYamlScalar(frontmatter, "awn-id").trim();
  if (existing) return frontmatter;
  const root = String(agentRoot || "").trim();
  if (!root) return frontmatter;
  return upsertYamlScalarLine(frontmatter, "awn-id", String(allocateNextId(root)));
}

async function readChannelEntry(agentRoot, manifestRel) {
  const manifestAbs = path.join(agentRoot, manifestRel);
  let content = "";
  try {
    content = await fs.readFile(manifestAbs, "utf-8");
  } catch {
    return null;
  }
  const { frontmatter, body } = splitFrontmatter(content);
  const folderRel = path.posix.dirname(manifestRel);
  const slug = path.posix.basename(folderRel);
  return {
    id: slug,
    slug,
    folderPath: folderRel,
    manifestPath: manifestRel,
    name: getYamlScalar(frontmatter, "awn-name") || slug,
    description: getYamlScalar(frontmatter, "awn-description") || "",
    awnType: getYamlScalar(frontmatter, "awn-type") || HUB_CHANNEL_TYPE_ID,
    awnId: getYamlScalar(frontmatter, "awn-id") || "",
    body: String(body || "").trim()
  };
}

async function listChannelFolderSlugs(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_CHANNELS_DIR);
  if (!(await pathExists(rootAbs))) return [];
  const entries = await fs.readdir(rootAbs, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
}

async function buildUnregisteredChannelEntry(agentRoot, slug) {
  const folderPath = `${AWN_CHANNELS_DIR}/${slug}`;
  return {
    slug,
    folderPath,
    manifestPath: `${folderPath}/${CHANNEL_MANIFEST_FILE}`,
    name: slug,
    registered: false
  };
}

async function ensureChannelInboxDir(channelFolderAbs) {
  await fs.mkdir(path.join(channelFolderAbs, CHANNEL_INBOX_DIR), { recursive: true });
}

function composeChannelManifestContent(options = {}) {
  const agentRoot = String(options.agentRoot || "").trim();
  const projectRoot = options.projectRoot || process.cwd();
  const name = String(options.name || "").trim();
  let frontmatter = buildDefaultFrontmatter(HUB_CHANNEL_TYPE_ID, {
    name,
    agentRoot,
    projectRoot,
    skipCanonical: true
  });
  const description = String(options.description || "").trim();
  if (description) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-description", description);
  }
  const body = String(options.body || CHANNEL_MANIFEST_DEFAULT_BODY).trim();
  if (agentRoot) {
    frontmatter = stampAwnIdInFrontmatter(frontmatter, agentRoot);
  }
  return joinManifestContent(frontmatter, body);
}

async function ensureChannelsRoot(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_CHANNELS_DIR);
  await fs.mkdir(rootAbs, { recursive: true });
  return rootAbs;
}

async function listAwnChannels(agentRoot) {
  const slugs = await listChannelFolderSlugs(agentRoot);
  const channels = [];
  const unregistered = [];
  for (const slug of slugs) {
    const manifestRel = `${AWN_CHANNELS_DIR}/${slug}/${CHANNEL_MANIFEST_FILE}`;
    const entry = await readChannelEntry(agentRoot, manifestRel);
    if (entry) {
      channels.push({ ...entry, registered: true });
    } else {
      unregistered.push(await buildUnregisteredChannelEntry(agentRoot, slug));
    }
  }

  const channelBySlug = new Map(channels.map((entry) => [entry.slug, entry]));
  const unregisteredBySlug = new Map(unregistered.map((entry) => [entry.slug, entry]));
  const userChannels = channels.filter((entry) => !CHANNEL_BUILTIN_SLUGS.has(entry.slug));
  const userUnregistered = unregistered.filter((entry) => !CHANNEL_BUILTIN_SLUGS.has(entry.slug));

  const presets = CHANNEL_BUILTIN_PRESETS.map((preset) => {
    const registered = channelBySlug.get(preset.slug);
    if (registered) {
      return { ...registered, ...preset, builtin: true, preset: true, registered: true };
    }
    const loose = unregisteredBySlug.get(preset.slug);
    if (loose) {
      return { ...loose, ...preset, builtin: true, preset: true, registered: false };
    }
    const folderPath = `${AWN_CHANNELS_DIR}/${preset.slug}`;
    return {
      ...preset,
      folderPath,
      manifestPath: `${folderPath}/${CHANNEL_MANIFEST_FILE}`,
      builtin: true,
      preset: true,
      registered: false,
      stub: true,
      description: "Заготовка — создайте канал по клику"
    };
  });

  return {
    version: 1,
    model: "awn-channels-catalog",
    hint:
      "Каналы workspace: awn-channels/{slug}/manifest.md + inbox/. " +
      "presets — заготовки сверху; unregistered — папки без manifest.",
    root: AWN_CHANNELS_DIR,
    presets,
    presetCount: presets.length,
    channels: userChannels,
    channelCount: userChannels.length,
    unregistered: userUnregistered,
    unregisteredCount: userUnregistered.length
  };
}

async function registerAwnChannel(agentRoot, options = {}) {
  const slug = String(options.slug || options.id || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!slug || slug.includes("/") || slug.includes("..")) {
    return { error: "slug is required", status: 400 };
  }

  await ensureChannelsRoot(agentRoot);
  const folderRel = `${AWN_CHANNELS_DIR}/${slug}`;
  const manifestRel = `${folderRel}/${CHANNEL_MANIFEST_FILE}`;
  const manifestAbs = path.join(agentRoot, manifestRel);
  const folderAbs = path.dirname(manifestAbs);
  if (await pathExists(manifestAbs)) {
    return { error: "Channel already exists", status: 409, path: manifestRel };
  }

  const folderExists = await pathExists(folderAbs);
  await fs.mkdir(folderAbs, { recursive: true });
  await ensureChannelInboxDir(folderAbs);
  const content = composeChannelManifestContent({ ...options, agentRoot });
  await fs.writeFile(manifestAbs, content, "utf-8");

  const channel = await readChannelEntry(agentRoot, manifestRel);
  return {
    version: 1,
    model: "awn-channel-register",
    created: true,
    adopted: folderExists,
    path: manifestRel,
    folderPath: folderRel,
    channel
  };
}

module.exports = {
  AWN_CHANNELS_DIR,
  listAwnChannels,
  registerAwnChannel
};
