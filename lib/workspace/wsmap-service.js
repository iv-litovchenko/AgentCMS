const fs = require("fs/promises");
const path = require("path");

const WORKSPACE_WS_MAP_FILE = "WS-MAP.md";
/** @deprecated legacy filename; still resolved on read */
const WORKSPACE_WSMAP_LEGACY_FILE = "WSMAP.md";

const WSMAP_WALK_SKIP_DIR_NAMES = new Set(["node_modules", ".git", "history"]);

function isWorkspaceWsMapAggregateFileName(name) {
  const base = String(name || "").trim().toLowerCase();
  return base === WORKSPACE_WS_MAP_FILE.toLowerCase() || base === WORKSPACE_WSMAP_LEGACY_FILE.toLowerCase();
}

function shouldSkipWsmapWalkDirEntry(name) {
  const lower = String(name || "").toLowerCase();
  if (!lower || WSMAP_WALK_SKIP_DIR_NAMES.has(lower)) return true;
  return String(name || "").startsWith(".");
}

async function walkWorkspaceManifestFiles(dirAbsolute, dirRel, acc) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  for (const entry of entries) {
    if (shouldSkipWsmapWalkDirEntry(entry.name)) continue;
    const abs = path.join(dirAbsolute, entry.name);
    const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkWorkspaceManifestFiles(abs, rel, acc);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase() === "manifest.md") {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
}

async function collectAllWorkspaceManifestRels(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return [];
  const acc = [];
  await walkWorkspaceManifestFiles(root, "", acc);
  return acc.sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
}

function isAwnPrefixedHubDirName(name) {
  return String(name || "").trim().toLowerCase().startsWith("awn-");
}

function shouldIncludeWsmapRootEntry(entry) {
  if (!entry || shouldSkipWsmapWalkDirEntry(entry.name)) return false;
  if (entry.isDirectory() && isAwnPrefixedHubDirName(entry.name)) return false;
  if (entry.isFile() && isWorkspaceWsMapAggregateFileName(entry.name)) return false;
  return entry.isFile() || entry.isDirectory();
}

async function collectWorkspaceRootEntries(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return [];
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const acc = [];
  for (const entry of entries) {
    if (!shouldIncludeWsmapRootEntry(entry)) continue;
    acc.push({
      kind: entry.isDirectory() ? "folder" : "file",
      name: entry.name
    });
  }
  return acc.sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base", numeric: true })
  );
}

function escapeWsmapMarkdownTableCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function formatWorkspaceRootEntriesMarkdown(rootEntries) {
  const rows = Array.isArray(rootEntries) ? rootEntries : [];
  if (!rows.length) {
    return "_В корне workspace (вне hub-папок `awn-*`) нет файлов и папок._";
  }
  const lines = [
    "| Вид | Имя |",
    "| --- | --- |"
  ];
  for (const row of rows) {
    const kind = row.kind === "folder" ? "папка" : "файл";
    const name = escapeWsmapMarkdownTableCell(row.name) || "—";
    lines.push(`| ${kind} | \`${name}\` |`);
  }
  return lines.join("\n");
}

async function buildWsmapMarkdown({
  entries,
  rootEntries,
  formatEntriesTable,
  formatRootEntriesTable,
  generatedAt
} = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const rootRows = Array.isArray(rootEntries) ? rootEntries : [];
  const at = generatedAt || new Date().toISOString();
  const lines = [
    "# Карта хранилища (WS-MAP)",
    "",
    `Собрано: ${at}`,
    `Узлов manifest: ${rows.length}`,
    `Записей в корне (без \`awn-*\`): ${rootRows.length}`,
    "",
    "Лёгкий реестр **всех** `manifest.md` в workspace (обход диска, не меню и не get_topic_map): ID, статус, тип, путь (до `manifest.md`), название (текст), описание. " +
      "Для записей внутри темы — `read_content_index_toc` по пути темы. " +
      "Пересборка: sidebar «Карта», pipeline или MCP `nav_map_workspace_refresh`.",
    "",
    "## Корень workspace (без `awn-*`)",
    "",
    "Файлы и папки в корне агента, кроме служебных hub-каталогов `awn-*` (они перечислены в таблице manifest ниже).",
    ""
  ];

  const rootTable =
    typeof formatRootEntriesTable === "function"
      ? formatRootEntriesTable(rootRows)
      : formatWorkspaceRootEntriesMarkdown(rootRows);
  lines.push(rootTable, "", "## Реестр manifest", "");

  const table =
    typeof formatEntriesTable === "function"
      ? formatEntriesTable(rows)
      : "_В workspace не найдено manifest-узлов._";
  lines.push(table, "");
  return `${lines.join("\n").trimEnd()}\n`;
}

module.exports = {
  WORKSPACE_WS_MAP_FILE,
  /** @deprecated use WORKSPACE_WS_MAP_FILE */
  WORKSPACE_WSMAP_FILE: WORKSPACE_WS_MAP_FILE,
  WORKSPACE_WSMAP_LEGACY_FILE,
  isWorkspaceWsMapAggregateFileName,
  walkWorkspaceManifestFiles,
  collectAllWorkspaceManifestRels,
  collectWorkspaceRootEntries,
  formatWorkspaceRootEntriesMarkdown,
  buildWsmapMarkdown
};
