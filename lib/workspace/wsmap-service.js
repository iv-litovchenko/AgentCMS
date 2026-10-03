const path = require("path");

const WORKSPACE_WSMAP_FILE = "WSMAP.md";
const WORKSPACE_INDEX_BASENAME_LOWER = "index.md";

function isWorkspaceIndexFileName(name) {
  return String(name || "").trim().toLowerCase() === WORKSPACE_INDEX_BASENAME_LOWER;
}

function wsmapSectionAnchor(relPath) {
  return (
    String(relPath || "")
      .toLowerCase()
      .replace(/[^a-z0-9./_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

async function collectWorkspaceIndexMdPaths(collectSearchableFiles, agentRoot) {
  if (!agentRoot || typeof collectSearchableFiles !== "function") return [];
  const all = await collectSearchableFiles(agentRoot);
  const wsmapLower = WORKSPACE_WSMAP_FILE.toLowerCase();
  return all
    .filter((rel) => {
      const normalized = String(rel || "").replace(/\\/g, "/").trim();
      if (!normalized) return false;
      if (normalized.toLowerCase() === wsmapLower) return false;
      const base = path.basename(normalized);
      return isWorkspaceIndexFileName(base);
    })
    .sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
}

async function buildWsmapMarkdown({ sources, readFileContent }) {
  const paths = Array.isArray(sources) ? sources : [];
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Карта workspace (WSMAP)",
    "",
    `Собрано: ${generatedAt}`,
    `Файлов index: ${paths.length}`,
    "",
    "Автогенерация из всех `index.md` / `INDEX.md` в workspace. Пересборка: ⟲ в sidebar, «Карта» в индексировании или шаг pipeline.",
    "",
    "## Оглавление",
    ""
  ];

  if (!paths.length) {
    lines.push("_В workspace не найдено файлов index.md / INDEX.md._", "");
  } else {
    for (const relPath of paths) {
      const anchor = wsmapSectionAnchor(relPath);
      lines.push(`- [\`${relPath}\`](#${anchor})`);
    }
    lines.push("", "---", "");
    for (const relPath of paths) {
      const anchor = wsmapSectionAnchor(relPath);
      let body = "";
      if (typeof readFileContent === "function") {
        try {
          body = String(await readFileContent(relPath) || "").trim();
        } catch {
          body = "_Не удалось прочитать файл._";
        }
      }
      if (!body) body = "_Пустой файл._";
      lines.push(`<a id="${anchor}"></a>`, "", `## \`${relPath}\``, "", body, "", "---", "");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

module.exports = {
  WORKSPACE_WSMAP_FILE,
  isWorkspaceIndexFileName,
  wsmapSectionAnchor,
  collectWorkspaceIndexMdPaths,
  buildWsmapMarkdown
};
