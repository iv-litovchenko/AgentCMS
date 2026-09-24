const fs = require("fs/promises");
const path = require("path");
const { parseCsvText, serializeCsv } = require("./awn-data-csv");

const DEPENDENCIES_CSV_FILE = "dependencies.csv";
const LEGACY_DEPENDENCIES_JSON = "awn-dependencies.json";

const DEFAULT_DEPENDENCIES_COLUMNS = [
  {
    key: "host",
    title: "Хост",
    description: "cursor | claude | codex | shell | linux | mac | any",
    required: true
  },
  {
    key: "kind",
    title: "Тип",
    description:
      "any | runtime | npm | pip | brew | apt | docker | mcp | mcp-tool | skill | plugin | rule | hook | env | repo | doc | cli | self | other",
    required: true
  },
  {
    key: "name",
    title: "Название",
    description: "Короткое имя зависимости",
    required: true
  },
  {
    key: "description",
    title: "Описание",
    description: "Зачем нужно в проекте",
    required: false
  },
  {
    key: "path",
    title: "Путь / install",
    description: "Путь, package, команда установки или env-ключ",
    required: false
  },
  {
    key: "version",
    title: "Версия",
    description: ">=22, 1.2.3, latest",
    required: false
  },
  {
    key: "status",
    title: "Статус",
    description: "active | optional | missing | broken",
    required: false
  },
  {
    key: "required",
    title: "Обязательно",
    description: "yes | no",
    required: false
  },
  {
    key: "notes",
    title: "Заметки",
    description: "Кто ставил, дата, self-view агента",
    required: false
  }
];

const DEFAULT_EXAMPLE_ROWS = [
  ["any", "runtime", "node", "Сервер CMS и MCP", "node", ">=22", "active", "yes", ""],
  ["any", "mcp", "agent-cms", "MCP workspace", "mcp-server/", "", "active", "yes", ""],
  ["any", "env", "XAI_API_KEY", "Voice xAI (без значения в CSV)", ".env", "XAI_API_KEY", "missing", "no", ""]
];

function normalizeColumnDefinitions(raw) {
  const source = Array.isArray(raw) && raw.length ? raw : DEFAULT_DEPENDENCIES_COLUMNS;
  const columns = [];
  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;
    const key = String(entry.key || entry.id || "").trim();
    if (!key) continue;
    columns.push({
      key,
      title: String(entry.title || entry.name || key).trim() || key,
      description: String(entry.description || "").trim(),
      required: Boolean(entry.required)
    });
  }
  return columns.length ? columns : DEFAULT_DEPENDENCIES_COLUMNS.map((item) => ({ ...item }));
}

function resolveDependenciesFileRel(workspaceSettings = {}) {
  const file = String(workspaceSettings["dependencies-file"] || DEPENDENCIES_CSV_FILE).trim();
  return file || DEPENDENCIES_CSV_FILE;
}

function rowsToObjects(columnKeys, rows) {
  return (Array.isArray(rows) ? rows : []).map((cells, index) => {
    const row = { _row: index + 2 };
    for (let i = 0; i < columnKeys.length; i += 1) {
      row[columnKeys[i]] = String(cells?.[i] ?? "").trim();
    }
    return row;
  });
}

function objectsToRows(columnKeys, objects) {
  return (Array.isArray(objects) ? objects : []).map((item) =>
    columnKeys.map((key) => String(item?.[key] ?? "").trim())
  );
}

function buildDefaultCsvContent(columns = DEFAULT_DEPENDENCIES_COLUMNS) {
  const keys = columns.map((column) => column.key);
  return serializeCsv(keys, DEFAULT_EXAMPLE_ROWS);
}

function validateCsvHeader(columnKeys, csvColumns) {
  const expected = columnKeys.map(String);
  const actual = (csvColumns || []).map((cell) => String(cell || "").trim());
  if (!actual.length) return { ok: true, warning: "CSV без заголовка — будет перезаписан заголовком из настроек." };
  if (expected.length !== actual.length) {
    return {
      ok: false,
      error: `Колонки CSV (${actual.length}) не совпадают с настройками (${expected.length}). Меняйте dependencies-columns в настройках workspace.`
    };
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i] !== actual[i]) {
      return {
        ok: false,
        error: `Колонка ${i + 1}: ожидалось "${expected[i]}", в CSV "${actual[i]}".`
      };
    }
  }
  return { ok: true };
}

function buildDependenciesPayload({
  fileRel,
  exists,
  content,
  parsed,
  columns,
  columnKeys,
  headerValidation
}) {
  return {
    version: 1,
    model: "awn-dependencies-csv",
    file: fileRel,
    exists,
    columns,
    columnKeys,
    csvColumns: parsed.columns,
    rows: rowsToObjects(columnKeys, parsed.rows),
    rowCount: parsed.rows.length,
    content,
    headerValid: headerValidation.ok,
    headerWarning: headerValidation.warning || null,
    hint:
      "Зависимости workspace: dependencies.csv + схема колонок в настройках «Зависимости». " +
      "MCP: read_dependencies / write_dependencies. Меняйте колонки только в settings; строки — в CSV."
  };
}

async function readDependencies(agentRoot, workspaceSettings = {}) {
  if (!agentRoot) return { error: "Agent root is required", status: 400 };

  const fileRel = resolveDependenciesFileRel(workspaceSettings);
  const columns = normalizeColumnDefinitions(workspaceSettings["dependencies-columns"]);
  const columnKeys = columns.map((column) => column.key);
  const absolute = path.join(agentRoot, fileRel);

  let exists = false;
  let content = "";
  let parsed = { columns: [], rows: [], delimiter: "," };

  try {
    content = await fs.readFile(absolute, "utf-8");
    exists = true;
    parsed = parseCsvText(content);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    content = buildDefaultCsvContent(columns);
    parsed = parseCsvText(content);
  }

  const headerValidation = exists
    ? validateCsvHeader(columnKeys, parsed.columns)
    : { ok: true, warning: "Файл ещё не создан — ниже шаблон по умолчанию." };

  return buildDependenciesPayload({
    fileRel,
    exists,
    content,
    parsed,
    columns,
    columnKeys,
    headerValidation
  });
}

async function writeDependencies(agentRoot, payload = {}, workspaceSettings = {}) {
  if (!agentRoot) return { error: "Agent root is required", status: 400 };

  const fileRel = resolveDependenciesFileRel(workspaceSettings);
  const columns = normalizeColumnDefinitions(workspaceSettings["dependencies-columns"]);
  const columnKeys = columns.map((column) => column.key);

  let content = "";
  if (typeof payload.content === "string") {
    content = payload.content.replace(/\r\n/g, "\n");
  } else if (Array.isArray(payload.rows)) {
    const rows = objectsToRows(columnKeys, payload.rows);
    content = serializeCsv(columnKeys, rows);
  } else {
    return { error: "Provide content (full CSV text) or rows (array of objects keyed by column)", status: 400 };
  }

  const parsed = parseCsvText(content);
  const headerValidation = validateCsvHeader(columnKeys, parsed.columns);
  if (!headerValidation.ok) {
    return { error: headerValidation.error, status: 400, columns, columnKeys };
  }

  const normalizedContent = serializeCsv(columnKeys, parsed.rows);
  return {
    file: fileRel,
    content: normalizedContent,
    rowCount: parsed.rows.length,
    columns,
    columnKeys,
    hint: "CSV нормализован по колонкам из настроек workspace. Сохраните через system file write."
  };
}

function isDependenciesCsvFileName(fileName) {
  const base = String(fileName || "").trim().toLowerCase();
  return base === DEPENDENCIES_CSV_FILE.toLowerCase();
}

module.exports = {
  DEPENDENCIES_CSV_FILE,
  LEGACY_DEPENDENCIES_JSON,
  DEFAULT_DEPENDENCIES_COLUMNS,
  DEFAULT_EXAMPLE_ROWS,
  normalizeColumnDefinitions,
  resolveDependenciesFileRel,
  buildDefaultCsvContent,
  readDependencies,
  writeDependencies,
  isDependenciesCsvFileName
};
