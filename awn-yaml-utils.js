const fs = require("fs");
const path = require("path");

const YAML_FILE_RE = /\.ya?ml$/i;

/** Простой парсер YAML (плоские объекты + один уровень вложенности) */
function parseTypeYaml(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.match(/^(\s*)/)[1].length;
    const trimmed = rawLine.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;
    const kv = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1].trim();
    const value = kv[2].trim();

    if (value === "" || value === "|" || value === ">") {
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      parent[key] = inner
        ? inner.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
        : [];
      continue;
    }

    if (value === "true" || value === "false") {
      parent[key] = value === "true";
      continue;
    }

    if (/^-?\d+(?:\.\d+)?$/.test(value)) {
      parent[key] = Number(value);
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      parent[key] = value.slice(1, -1);
      continue;
    }

    parent[key] = value;
  }

  return root;
}

function listYamlFilesSync(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listYamlFilesSync(fullPath, acc);
    } else if (entry.isFile() && YAML_FILE_RE.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function loadYamlFileSync(filePath, { idKey = "id", nameKey = "name" } = {}) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = parseTypeYaml(raw);
  const base = path.basename(filePath).replace(YAML_FILE_RE, "");
  if (!parsed[idKey]) parsed[idKey] = base;
  if (!parsed[nameKey] && nameKey !== idKey) parsed[nameKey] = parsed[idKey];
  return parsed;
}

module.exports = {
  YAML_FILE_RE,
  parseTypeYaml,
  listYamlFilesSync,
  loadYamlFileSync
};
