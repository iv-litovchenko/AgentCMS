#!/usr/bin/env node
/**
 * Import Obsidian notes as flat records in main/ slot.
 * Images go to assets/ (one level above main/).
 *
 *   awn-storage/main/{slug}.md   ← awn.content.record
 *   awn-storage/assets/attachments/*
 */
const fs = require("fs/promises");
const path = require("path");

const AGENT_ROOT = path.resolve(__dirname, "../workspaces/agent-cms-test");
const VAULT_ROOT = "/Users/macbook/Desktop/agent-aya";
const ATTACHMENTS_ROOT = path.join(VAULT_ROOT, "07 📦 Vault/📎 Attachments");
const STORAGE_ROOT = path.join(AGENT_ROOT, "awn-shared/inbox/awn-storage");
const MAIN_DIR = path.join(STORAGE_ROOT, "main");
const ASSETS_DIR = path.join(STORAGE_ROOT, "assets/pasted");
const OLD_INBOX_DIR = path.join(STORAGE_ROOT, "inbox");

const RECORDS = [
  {
    slug: "myschy-final-yt",
    title: "Мышцы финал (YT)",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/Мышцы финал (YT).md"),
    webUrl: "https://youtu.be/UNk-fMh1c60",
    author: "Биомашин",
    tags: ["video", "archive", "fitness"],
    emoji: "💪"
  },
  {
    slug: "predvaritelnyy-analiz-video",
    title: "Предварительный анализ видео",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/Предварительный анализ видео.md"),
    tags: ["prompt", "video", "archive"],
    emoji: "🎬"
  },
  {
    slug: "produktivnost",
    title: "Продуктивность",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/Продукивность.md"),
    tags: ["productivity", "archive"],
    emoji: "⚡"
  },
  {
    slug: "sfera-uslug",
    title: "Сфера услуг (идеи для бизнеса)",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/Сфера услуг (идеи для бизнеса).md"),
    tags: ["business", "ideas", "archive"],
    emoji: "💼"
  },
  {
    slug: "efir-moy-plan",
    title: "Эфир · ИИ-чаты и агенты",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/ЭфирМойПлан.md"),
    tags: ["ai", "presentation", "archive"],
    emoji: "🎙️"
  },
  {
    slug: "cms-typo3",
    title: "CMS TYPO3",
    sourceFile: path.join(VAULT_ROOT, "08 ❄️ Archive/01 🏛 History/CMS TYPO3.md"),
    tags: ["cms", "typo3", "archive"],
    emoji: "🏛️"
  },
  {
    slug: "programmirovanie",
    title: "Программирование",
    sourceFile: path.join(VAULT_ROOT, "06 📥 Inbox/📝 Notes/Программирование.md"),
    tags: ["programming", "php", "roadmap", "inbox"],
    emoji: "💻"
  },
  {
    slug: "copilot-obsidian",
    title: "Copilot для Obsidian — режимы и практика",
    sourceFile: path.join(
      VAULT_ROOT,
      "06 📥 Inbox/📝 Notes/Copilot для Obsidian - Режимы работы и практическое применение.md"
    ),
    tags: ["obsidian", "copilot", "workflow", "inbox"],
    emoji: "🤖"
  },
  {
    slug: "obsidian",
    title: "Obsidian",
    sourceFile: path.join(VAULT_ROOT, "06 📥 Inbox/📝 Notes/Obsidian.md"),
    tags: ["obsidian", "pkm", "plugins", "inbox"],
    emoji: "📓"
  }
];

function formatYamlScalar(value) {
  const raw = String(value ?? "");
  if (!raw) return '""';
  if (/[:#\n"'&*!?|>@[\]{},]/.test(raw) || raw.startsWith(" ") || raw.endsWith(" ")) {
    return JSON.stringify(raw);
  }
  return raw;
}

function slugifyFileName(name) {
  return (
    String(name || "file")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 120) || "file"
  );
}

function stripExtension(name) {
  return String(name || "").replace(/\.[^.]+$/, "");
}

async function findVaultImage(fileName) {
  const direct = path.join(ATTACHMENTS_ROOT, fileName);
  try {
    await fs.access(direct);
    return direct;
  } catch {
    // continue
  }

  async function walk(dir, depth = 0) {
    if (depth > 12) return null;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === fileName) return full;
      if (entry.isDirectory()) {
        const hit = await walk(full, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  }

  return walk(VAULT_ROOT);
}

function cleanObsidianBody(raw) {
  let text = String(raw || "");
  text = text.replace(/^---[\s\S]*?---\n?/m, "");
  text = text.replace(/%%[\s\S]*?%%/g, "");
  text = text.replace(/^>\s*\[!summary\]\s*\n/gm, "> **Ключевая идея:**\n");
  return text.trim() + "\n";
}

function stripObsidianWikilinks(text) {
  let result = String(text || "");
  result = result.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  result = result.replace(/\[\[([^\]]+)\]\]/g, "$1");
  return result;
}

function parseSimpleFrontmatter(raw) {
  const match = String(raw || "").match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function transformEmbeds(body, copied) {
  const embedRe = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let result = body;
  const matches = [...body.matchAll(embedRe)];

  for (const match of matches) {
    const fileName = match[1].trim();
    const alt = (match[2] || stripExtension(fileName)).trim();
    const source = await findVaultImage(fileName);
    if (!source) {
      result = result.replace(match[0], `<!-- missing: ${fileName} -->`);
      continue;
    }

    const ext = path.extname(source) || ".png";
    const base = slugifyFileName(stripExtension(fileName));
    let destName = `${base}${ext.toLowerCase()}`;
    let n = 1;
    while (copied.has(destName)) {
      destName = `${base}-${n}${ext.toLowerCase()}`;
      n += 1;
    }

    copied.set(destName, source);
    const storagePath = `awn-storage/assets/pasted/${destName}`;
    result = result.replace(match[0], `![${alt}](${storagePath})`);
  }

  return result;
}

function buildRecordFile({ record, attachmentPaths, body }) {
  const now = new Date().toISOString();
  const tagsYaml = (record.tags || []).map((t) => `  - ${formatYamlScalar(t)}`).join("\n");
  const attachmentsYaml = attachmentPaths.map((p) => `  - ${formatYamlScalar(p)}`).join("\n");
  const preview = body.replace(/<!--.*?-->/g, "").replace(/\s+/g, " ").trim().slice(0, 240);

  const lines = [
    "---",
    'awn-preview: ""',
    `awn-emoji: ${formatYamlScalar(record.emoji || "")}`,
    `awn-name: ${formatYamlScalar(record.title)}`,
    "awn-status: new",
    "awn-type: awn.content.record",
    `awn-create: ${now}`,
    `awn-update: ${now}`,
    `awn-description: ${formatYamlScalar(preview)}`,
    "awn-main: false",
    "awn-source: archive-import",
    `awn-author: ${formatYamlScalar(record.author || "Obsidian")}`,
    tagsYaml ? "awn-tags:\n" + tagsYaml : "awn-tags: []",
    record.webUrl ? `awn-web-url: ${formatYamlScalar(record.webUrl)}` : 'awn-web-url: ""',
    attachmentsYaml ? "awn-attachments:\n" + attachmentsYaml : "awn-attachments: []",
    "awn-version: 1",
    "awn-sort: \"\"",
    "---",
    "",
    body.startsWith("#") ? body : `# ${record.title}\n\n${body}`
  ];
  return lines.join("\n");
}

async function importRecord(record) {
  const raw = await fs.readFile(record.sourceFile, "utf-8");
  const fm = parseSimpleFrontmatter(raw);
  if (!record.webUrl && fm["Ссылка"]) record.webUrl = fm["Ссылка"];
  if (!record.author && fm["Автор"]) record.author = fm["Автор"];

  const copied = new Map();
  let body = cleanObsidianBody(raw);
  body = await transformEmbeds(body, copied);
  body = stripObsidianWikilinks(body);

  for (const [destName, sourcePath] of copied.entries()) {
    await fs.copyFile(sourcePath, path.join(ASSETS_DIR, destName));
  }

  const attachmentPaths = [...copied.keys()].map(
    (name) => `awn-storage/assets/pasted/${name}`
  );

  const content = buildRecordFile({ record, attachmentPaths, body });
  const filePath = path.join(MAIN_DIR, `${record.slug}.md`);
  await fs.writeFile(filePath, content, "utf-8");

  return {
    slug: record.slug,
    images: copied.size,
    file: path.relative(AGENT_ROOT, filePath)
  };
}

async function removeOldBundles() {
  try {
    await fs.rm(OLD_INBOX_DIR, { recursive: true, force: true });
  } catch {
    // ok
  }
}

async function main() {
  const onlySlugs = process.argv.slice(2).filter(Boolean);
  await fs.mkdir(MAIN_DIR, { recursive: true });
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  if (!onlySlugs.length) await removeOldBundles();

  const selected = onlySlugs.length
    ? RECORDS.filter((r) => onlySlugs.includes(r.slug))
    : RECORDS;

  const results = [];
  for (const record of selected) {
    results.push(await importRecord(record));
  }

  console.log(
    JSON.stringify(
      {
        topic: "awn-shared/inbox/manifest.md",
        slot: "main/",
        assets: "assets/pasted/",
        records: results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
