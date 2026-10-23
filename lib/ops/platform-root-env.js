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

function parseEnvExampleCatalog(projectRoot) {
  const root = path.resolve(String(projectRoot || process.cwd()));
  const examplePath = path.join(root, ".env.example");
  if (!fs.existsSync(examplePath)) {
    return { ok: false, error: "env_example_missing", examplePath, keys: [] };
  }
  const text = fs.readFileSync(examplePath, "utf8");
  const keys = [];
  const seen = new Set();
  let pendingComment = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      pendingComment = [];
      continue;
    }

    const keyFromLine = parseKeyFromAssignmentLine(trimmed);
    if (keyFromLine) {
      if (!seen.has(keyFromLine)) {
        seen.add(keyFromLine);
        keys.push({
          key: keyFromLine,
          description: pendingComment.join(" ").trim() || null,
          documentedInExample: true,
          commentedInExample: trimmed.startsWith("#")
        });
      }
      pendingComment = [];
      continue;
    }

    if (trimmed.startsWith("#")) {
      pendingComment.push(trimmed.slice(1).trim());
    }
  }

  return { ok: true, examplePath, keys };
}

function listPlatformEnvKeys(projectRoot) {
  const catalog = parseEnvExampleCatalog(projectRoot);
  if (!catalog.ok) return catalog;
  return {
    ok: true,
    source: ".env.example",
    examplePath: catalog.examplePath,
    keys: catalog.keys.map((entry) => ({
      ...entry,
      secret: isSecretEnvKey(entry.key)
    }))
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
