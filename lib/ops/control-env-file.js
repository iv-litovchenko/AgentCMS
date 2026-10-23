"use strict";

const fs = require("fs");
const path = require("path");

const MAX_ENV_BYTES = 256_000;

function resolveEnvProjectRoot(projectRoot) {
  const host = String(process.env.AGENT_CMS_HOST_PROJECT || "").trim();
  if (host) {
    const resolved = path.resolve(host);
    if (fs.existsSync(resolved)) return resolved;
  }
  return path.resolve(String(projectRoot || process.cwd()));
}

function resolveEnvPath(projectRoot) {
  return path.join(resolveEnvProjectRoot(projectRoot), ".env");
}

function resolveEnvExamplePath(projectRoot) {
  return path.join(resolveEnvProjectRoot(projectRoot), ".env.example");
}

function readEnvExampleAtRoot(root) {
  const examplePath = path.join(path.resolve(root), ".env.example");
  if (!fs.existsSync(examplePath)) {
    return { ok: true, examplePath, exists: false, content: "" };
  }
  const stat = fs.statSync(examplePath);
  if (stat.size > MAX_ENV_BYTES) {
    return { ok: false, error: "env_example_too_large", examplePath };
  }
  const content = fs.readFileSync(examplePath, "utf8");
  return { ok: true, examplePath, exists: true, content };
}

function readProjectEnvExample(projectRoot) {
  const hostRoot = resolveEnvProjectRoot(projectRoot);
  const appRoot = path.resolve(String(projectRoot || process.cwd()));
  const roots = hostRoot === appRoot ? [hostRoot] : [hostRoot, appRoot];

  try {
    for (const root of roots) {
      const hit = readEnvExampleAtRoot(root);
      if (!hit.ok) return { ...hit, projectRoot: root };
      if (hit.exists && hit.content) {
        return { ok: true, examplePath: hit.examplePath, projectRoot: root, exists: true, content: hit.content };
      }
    }
    const examplePath = path.join(hostRoot, ".env.example");
    return {
      ok: true,
      examplePath,
      projectRoot: hostRoot,
      exists: false,
      content: ""
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error.message || error),
      examplePath: path.join(hostRoot, ".env.example")
    };
  }
}

function readProjectEnvFile(projectRoot) {
  const root = resolveEnvProjectRoot(projectRoot);
  const filePath = resolveEnvPath(projectRoot);
  const examplePayload = readProjectEnvExample(projectRoot);
  const exampleContent = examplePayload.ok ? examplePayload.content : "";
  const examplePath = examplePayload.examplePath || resolveEnvExamplePath(projectRoot);
  const exampleExists = Boolean(examplePayload.ok && examplePayload.exists);

  try {
    if (!fs.existsSync(filePath)) {
      return {
        ok: true,
        filePath,
        projectRoot: root,
        exists: false,
        content: "",
        schemaOnly: true,
        examplePath,
        exampleExists,
        exampleContent,
        message: exampleExists
          ? "Нет .env — слева создайте файл (Сохранить), справа справочник ключей из .env.example."
          : "Нет .env и .env.example в каталоге проекта."
      };
    }
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_ENV_BYTES) {
      return { ok: false, error: "env_too_large", filePath };
    }
    const content = fs.readFileSync(filePath, "utf8");
    return {
      ok: true,
      filePath,
      projectRoot: root,
      exists: true,
      content,
      schemaOnly: false,
      examplePath,
      exampleExists,
      exampleContent
    };
  } catch (error) {
    return { ok: false, error: String(error.message || error), filePath };
  }
}

function writeProjectEnvFile(projectRoot, content) {
  const filePath = resolveEnvPath(projectRoot);
  const text = String(content ?? "");
  if (Buffer.byteLength(text, "utf8") > MAX_ENV_BYTES) {
    return { ok: false, error: "env_too_large", filePath };
  }
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, text, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, filePath);
    return { ok: true, filePath, bytes: Buffer.byteLength(text, "utf8") };
  } catch (error) {
    return { ok: false, error: String(error.message || error), filePath };
  }
}

module.exports = {
  MAX_ENV_BYTES,
  resolveEnvProjectRoot,
  resolveEnvPath,
  resolveEnvExamplePath,
  readProjectEnvExample,
  readProjectEnvFile,
  writeProjectEnvFile
};
