const WORKSPACE_WS_MAP_FILE = "WS-MAP.md";
/** @deprecated legacy filename; still resolved on read */
const WORKSPACE_WSMAP_LEGACY_FILE = "WSMAP.md";

function isWorkspaceWsMapAggregateFileName(name) {
  const base = String(name || "").trim().toLowerCase();
  return base === WORKSPACE_WS_MAP_FILE.toLowerCase() || base === WORKSPACE_WSMAP_LEGACY_FILE.toLowerCase();
}

function filterPageMapManifestNodes(pages = []) {
  return (pages || []).filter((page) => page?.hasManifest !== false && page?.kind !== "folder");
}

async function buildWsmapMarkdown({ entries, formatEntriesTable, generatedAt } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const at = generatedAt || new Date().toISOString();
  const lines = [
    "# Карта хранилища (WS-MAP)",
    "",
    `Собрано: ${at}`,
    `Узлов manifest: ${rows.length}`,
    "",
    "Лёгкий реестр всех `manifest.md` в workspace (ID, статус, тип, путь, название, описание). " +
      "Для записей внутри темы — `read_content_index_toc` по пути темы. " +
      "Пересборка: sidebar «Карта», pipeline или MCP `refresh_workspace_manifest_map`.",
    ""
  ];

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
  filterPageMapManifestNodes,
  buildWsmapMarkdown
};
