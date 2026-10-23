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

function readProjectEnvFile(projectRoot) {
  const root = resolveEnvProjectRoot(projectRoot);
  const filePath = resolveEnvPath(projectRoot);
  try {
    if (!fs.existsSync(filePath)) {
      const example = path.join(path.dirname(filePath), ".env.example");
      const template = fs.existsSync(example) ? fs.readFileSync(example, "utf8") : "";
      return {
        ok: true,
        filePath,
        projectRoot: root,
        exists: false,
        content: template,
        schemaOnly: true,
        message:
          "Нет .env в каталоге проекта — ниже шаблон из .env.example (не сохраняйте без правок). Рабочий .env должен быть в git на хосте."
      };
    }
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_ENV_BYTES) {
      return { ok: false, error: "env_too_large", filePath };
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { ok: true, filePath, projectRoot: root, exists: true, content, schemaOnly: false };
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
  readProjectEnvFile,
  writeProjectEnvFile
};
