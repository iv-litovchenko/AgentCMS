const fs = require("fs");
const path = require("path");

const YAML_FILE_RE = /\.ya?ml$/i;

function unescapeYamlDoubleQuotedString(text) {
  return String(text)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function normalizeYamlDisplayString(value) {
  const text = String(value ?? "").trim();
  if (!text || !text.includes("\\")) return text;
  if (text.includes('\\"') || text.includes("\\\\")) {
    return unescapeYamlDoubleQuotedString(text);
  }
  return text;
}

function parseYamlScalar(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return "";

  if (raw[0] === '"') {
    try {
      return JSON.parse(raw);
    } catch {
      if (raw.endsWith('"') && raw.length >= 2) {
        return unescapeYamlDoubleQuotedString(raw.slice(1, -1));
      }
      const end = raw.indexOf('"', 1);
      if (end > 0) return raw.slice(1, end);
      return raw.slice(1);
    }
  }

  if (raw[0] === "'") {
    if (raw.endsWith("'") && raw.length >= 2) {
      return raw.slice(1, -1).replace(/''/g, "'");
    }
    const end = raw.indexOf("'", 1);
    if (end > 0) return raw.slice(1, end);
    return raw.slice(1);
  }
  // Без кавычек: срезаем inline-комментарий (в YAML комментарий = пробел + '#').
  const commentAt = raw.search(/\s#/);
  if (commentAt >= 0) {
    raw = raw.slice(0, commentAt).trim();
    if (!raw) return "";
  }
  if (raw === "true" || raw === "false") return raw === "true";
  if (raw === "null" || raw === "~") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return normalizeYamlDisplayString(raw);
}

function nextSignificantYamlLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    return { line, index, indent: line.match(/^(\s*)/)[1].length, trimmed: line.trim() };
  }
  return null;
}

function parseYamlBlockScalar(lines, startIndex, baseIndent, style = "|") {
  const collected = [];
  let nextIndex = startIndex;

  while (nextIndex < lines.length) {
    const rawLine = lines[nextIndex];
    if (!rawLine.trim()) {
      collected.push({ indent: baseIndent + 2, raw: "" });
      nextIndex += 1;
      continue;
    }
    const lineIndent = rawLine.match(/^(\s*)/)[1].length;
    if (lineIndent <= baseIndent) break;
    collected.push({ indent: lineIndent, raw: rawLine });
    nextIndex += 1;
  }

  if (!collected.length) {
    return { value: "", nextIndex };
  }

  const contentIndent = collected
    .filter((entry) => entry.raw.trim())
    .reduce((min, entry) => Math.min(min, entry.indent), collected[0].indent);

  const text = collected
    .map((entry) => {
      if (!entry.raw.trim()) return "";
      return entry.raw.slice(contentIndent);
    })
    .join("\n")
    .replace(/\n+$/, "");

  if (style === ">") {
    return { value: text.replace(/\s*\n\s*/g, " ").trim(), nextIndex };
  }
  return { value: text, nextIndex };
}

/** Простой парсер YAML (объекты, вложенность, списки `- item`) */
function parseTypeYaml(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, kind: "object", obj: root }];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.match(/^(\s*)/)[1].length;
    const trimmed = rawLine.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const frame = stack[stack.length - 1];

    if (trimmed.startsWith("- ")) {
      if (frame.kind !== "array") continue;
      const itemText = trimmed.slice(2).trim();
      const targetArray = frame.arr;
      if (!itemText) {
        const item = {};
        targetArray.push(item);
        stack.push({ indent, kind: "object", obj: item });
        continue;
      }

      const itemKv = itemText.match(/^([^:]+):\s*(.*)$/);
      if (itemKv) {
        const itemKey = itemKv[1].trim();
        const itemValue = itemKv[2].trim();
        const item = {};
        if (itemValue === "|" || itemValue === ">") {
          const parsedBlock = parseYamlBlockScalar(lines, lineIndex + 1, indent, itemValue);
          item[itemKey] = parsedBlock.value;
          targetArray.push(item);
          lineIndex = parsedBlock.nextIndex - 1;
          continue;
        }
        if (itemValue === "") {
          item[itemKey] = {};
          targetArray.push(item);
          stack.push({ indent, kind: "object", obj: item[itemKey] });
          continue;
        }
        item[itemKey] = parseYamlScalar(itemValue);
        targetArray.push(item);
        stack.push({ indent, kind: "object", obj: item });
        continue;
      }

      targetArray.push(parseYamlScalar(itemText));
      continue;
    }

    const kv = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1].trim();
    const value = kv[2].trim();
    let target = null;

    if (frame.kind === "object") {
      target = frame.obj;
    } else if (frame.kind === "array") {
      const lastItem = frame.arr[frame.arr.length - 1];
      if (lastItem && typeof lastItem === "object" && !Array.isArray(lastItem)) {
        target = lastItem;
      } else {
        const item = {};
        frame.arr.push(item);
        target = item;
      }
    } else {
      continue;
    }

    if (value === "|" || value === ">") {
      const parsedBlock = parseYamlBlockScalar(lines, lineIndex + 1, indent, value);
      target[key] = parsedBlock.value;
      lineIndex = parsedBlock.nextIndex - 1;
      continue;
    }

    if (value === "") {
      const next = nextSignificantYamlLine(lines, lineIndex + 1);
      if (next && next.indent > indent && next.trimmed.startsWith("- ")) {
        const arr = [];
        target[key] = arr;
        stack.push({ indent, kind: "array", arr, parent: target, parentKey: key });
      } else {
        const child = {};
        target[key] = child;
        stack.push({ indent, kind: "object", obj: child });
      }
      continue;
    }

    if (value.startsWith("[")) {
      const close = value.lastIndexOf("]");
      if (close > 0) {
        const inner = value.slice(1, close).trim();
        target[key] = inner
          ? inner.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
          : [];
        continue;
      }
    }

    target[key] = parseYamlScalar(value);
  }

  for (const frame of stack) {
    if (frame.kind === "array" && frame.parent && frame.parentKey) {
      frame.parent[frame.parentKey] = frame.arr;
    }
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
  parseYamlScalar,
  unescapeYamlDoubleQuotedString,
  normalizeYamlDisplayString,
  listYamlFilesSync,
  loadYamlFileSync
};
