"use strict";

const fs = require("fs");
const path = require("path");
const { parseRootEnvFileContent } = require("../config/agent-cms-ports");
const { readProjectEnvFile, writeProjectEnvFile } = require("./control-env-file");

const KEY_LINE_RE = /^(?:#\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

function isSecretEnvKey(key) {
  const name = String(key || "").trim();
  if (!name) return false;
  if (/PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE|CREDENTIAL/i.test(name)) return true;
  return new Set(["GOOGLE_SEARCH_API_KEY"]).has(name);
}

function formatEnvValue(value) {
  const text = String(value ?? "");
  if (/[\s#"'=]/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function parseKeyFromAssignmentLine(line) {
  const trimmed = String(line || "").trim();
  const match = KEY_LINE_RE.exec(trimmed);
  return match ? match[1] : null;
}

function parseValueFromAssignmentLine(line) {
  let trimmed = String(line || "").trim();
  if (trimmed.startsWith("#")) trimmed = trimmed.slice(1).trim();
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex <= 0) return "";
  let value = trimmed.slice(eqIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function currentEnvField(key, values, secret, revealSecrets) {
  const hasValue = Object.prototype.hasOwnProperty.call(values, key);
  const raw = hasValue ? values[key] : "";
  const empty = !hasValue || String(raw).length === 0;
  if (secret && !revealSecrets && !empty) {
    return {
      inEnv: true,
      set: true,
      empty: false,
      value: null,
      display: "***",
      redacted: true
    };
  }
  return {
    inEnv: hasValue,
    set: !empty,
    empty,
    value: hasValue ? String(raw) : "",
    display: hasValue ? String(raw) : "",
    redacted: false
  };
}

function parseEnvExampleFile(examplePath, keys, seen) {
  const text = fs.readFileSync(examplePath, "utf8");
  let pendingComment = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      pendingComment = [];
      continue;
    }

    const keyFromLine = parseKeyFromAssignmentLine(trimmed);
    if (keyFromLine) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(keyFromLine)) {
        pendingComment = [];
        continue;
      }
      if (!seen.has(keyFromLine)) {
        seen.add(keyFromLine);
        keys.push({
          key: keyFromLine,
          description: pendingComment.join(" ").trim() || null,
          documentedInExample: true,
          commentedInExample: trimmed.startsWith("#"),
          exampleValue: parseValueFromAssignmentLine(trimmed)
        });
      }
      pendingComment = [];
      continue;
    }

    if (trimmed.startsWith("#")) {
      pendingComment.push(trimmed.slice(1).trim());
    }
  }
}

function parseEnvExampleCatalog(projectRoot) {
  const root = path.resolve(String(projectRoot || process.cwd()));
  const examplePath = path.join(root, ".env.example");
  if (!fs.existsSync(examplePath)) {
    return { ok: false, error: "env_example_missing", examplePath, keys: [] };
  }

  const keys = [];
  const seen = new Set();
  parseEnvExampleFile(examplePath, keys, seen);

  return { ok: true, examplePath, keys };
}

function listPlatformEnvKeys(projectRoot, options = {}) {
  const catalog = parseEnvExampleCatalog(projectRoot);
  if (!catalog.ok) return catalog;

  const revealSecrets = Boolean(options.revealSecrets);
  const envRead = readProjectEnvFile(projectRoot);
  const envPath = envRead.filePath || path.join(path.resolve(projectRoot), ".env");
  const envExists = Boolean(envRead.exists);
  const values = envRead.ok ? parseRootEnvFileContent(envRead.content || "") : {};
  const catalogSet = new Set(catalog.keys.map((entry) => entry.key));

  const keys = catalog.keys.map((entry) => {
    const secret = isSecretEnvKey(entry.key);
    const current = currentEnvField(entry.key, values, secret, revealSecrets);
    return {
      key: entry.key,
      description: entry.description,
      secret,
      example: {
        value: entry.exampleValue ?? "",
        inExample: true
      },
      current
    };
  });

  const extraInEnv = Object.keys(values)
    .filter((key) => !catalogSet.has(key))
    .sort()
    .map((key) => {
      const secret = isSecretEnvKey(key);
      const current = currentEnvField(key, values, secret, revealSecrets);
      return {
        key,
        description: null,
        secret,
        example: { value: null, inExample: false },
        current,
        unknownKey: true
      };
    });

  return {
    ok: true,
    schemaSource: ".env.example",
    valuesSource: ".env",
    examplePath: catalog.examplePath,
    envPath,
    envExists,
    keys: [...keys, ...extraInEnv]
  };
}

function assertCatalogKey(projectRoot, key) {
  const catalog = parseEnvExampleCatalog(projectRoot);
  if (!catalog.ok) return catalog;
  const normalized = String(key || "").trim();
  if (!normalized) {
    return { ok: false, error: "missing_key", message: "key is required" };
  }
  const entry = catalog.keys.find((item) => item.key === normalized);
  if (!entry) {
    return {
      ok: false,
      error: "unknown_key",
      message: "Key must be listed in .env.example (platform_env_keys_list)."
    };
  }
  return { ok: true, entry, catalog };
}

function readPlatformEnvKey(projectRoot, key, options = {}) {
  const gate = assertCatalogKey(projectRoot, key);
  if (!gate.ok) return gate;

  const envRead = readProjectEnvFile(projectRoot);
  if (!envRead.ok) return envRead;

  const values = parseRootEnvFileContent(envRead.content || "");
  const hasValue = Object.prototype.hasOwnProperty.call(values, gate.entry.key);
  const raw = hasValue ? values[gate.entry.key] : "";
  const empty = !hasValue || String(raw).length === 0;
  const secret = isSecretEnvKey(gate.entry.key);
  const reveal = Boolean(options.revealSecrets);

  if (secret && !reveal) {
    return {
      ok: true,
      key: gate.entry.key,
      description: gate.entry.description,
      secret: true,
      set: !empty,
      empty,
      value: null,
      redacted: !empty,
      display: empty ? "" : "***"
    };
  }

  return {
    ok: true,
    key: gate.entry.key,
    description: gate.entry.description,
    secret,
    set: !empty,
    empty,
    value: hasValue ? String(raw) : "",
    redacted: false
  };
}

function setKeyInEnvContent(content, key, value) {
  const lines = String(content ?? "").split(/\r?\n/);
  const formatted = `${key}=${formatEnvValue(value)}`;
  let found = false;
  const next = lines.map((line) => {
    const parsed = parseKeyFromAssignmentLine(line);
    if (parsed === key && !found) {
      found = true;
      return formatted;
    }
    return line;
  });
  if (!found) {
    if (next.length && next[next.length - 1] !== "") next.push("");
    next.push(formatted);
  }
  return next.join("\n");
}

function writePlatformEnvKey(projectRoot, key, value) {
  const gate = assertCatalogKey(projectRoot, key);
  if (!gate.ok) return gate;

  const envRead = readProjectEnvFile(projectRoot);
  if (!envRead.ok) return envRead;

  const nextContent = setKeyInEnvContent(envRead.content ?? "", gate.entry.key, value);
  const writeResult = writeProjectEnvFile(projectRoot, nextContent);
  if (!writeResult.ok) return writeResult;

  return {
    ok: true,
    key: gate.entry.key,
    secret: isSecretEnvKey(gate.entry.key),
    filePath: writeResult.filePath,
    message: "Ключ записан в .env. При необходимости перезапустите CMS/MCP."
  };
}

module.exports = {
  isSecretEnvKey,
  listPlatformEnvKeys,
  readPlatformEnvKey,
  writePlatformEnvKey,
  parseEnvExampleCatalog
};
