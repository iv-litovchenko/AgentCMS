"use strict";

const fs = require("fs");
const path = require("path");
const { projectRel, abs } = require("../paths/agent-cms");

const FILE_NAME = "instances.json";

function defaultDocument() {
  return {
    instances: [{ id: "local", kind: "local", auto: true, label: "local" }]
  };
}

function instancesFilePath(projectRoot) {
  return abs(projectRoot, path.join(projectRel.root, FILE_NAME));
}

function normalizeInstance(entry, index) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`instances[${index}]: must be an object`);
  }
  const id = String(entry.id || "").trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
    throw new Error(`instances[${index}].id: invalid "${id}"`);
  }
  const kind = String(entry.kind || "local").trim().toLowerCase();
  if (!["local", "remote", "tunnel"].includes(kind)) {
    throw new Error(`instances[${index}].kind: must be local|remote|tunnel`);
  }
  const out = {
    id,
    kind,
    label: String(entry.label || id).trim() || id
  };
  if (entry.auto) out.auto = true;
  if (kind === "remote" || entry.url) {
    out.url = String(entry.url || "").trim();
    if (kind === "remote" && !out.url) {
      throw new Error(`instances[${index}].url required for remote`);
    }
  }
  if (entry.token) out.token = String(entry.token).trim();
  if (kind === "tunnel") {
    out.deviceId = String(entry.deviceId || id).trim();
    if (entry.hubUrl) out.hubUrl = String(entry.hubUrl).trim().replace(/\/$/, "");
  }
  if (entry.baseUrl) out.baseUrl = String(entry.baseUrl).trim().replace(/\/$/, "");
  return out;
}

function normalizeDocument(raw) {
  const list = Array.isArray(raw?.instances) ? raw.instances : [];
  if (!list.length) return defaultDocument();
  const instances = list.map((entry, index) => normalizeInstance(entry, index));
  const ids = new Set();
  for (const inst of instances) {
    if (ids.has(inst.id)) throw new Error(`Duplicate instance id "${inst.id}"`);
    ids.add(inst.id);
  }
  if (!instances.some((i) => i.id === "local")) {
    instances.unshift({ id: "local", kind: "local", auto: true, label: "local" });
  }
  return { instances };
}

function readInstances(projectRoot) {
  const filePath = instancesFilePath(projectRoot);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { filePath, document: normalizeDocument(parsed), exists: true };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { filePath, document: defaultDocument(), exists: false };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

function writeInstances(projectRoot, rawDocument) {
  const filePath = instancesFilePath(projectRoot);
  const document = normalizeDocument(rawDocument);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return { filePath, document };
}

module.exports = {
  defaultDocument,
  instancesFilePath,
  readInstances,
  writeInstances,
  normalizeDocument
};
