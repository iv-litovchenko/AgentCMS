const fs = require("fs/promises");
const path = require("path");
const { rel } = require("../paths/agent-cms");

const RUN_LOG_VERSION = 1;
const RUN_LOG_JSON_REL = rel.indexes.lastRunJson;
const RUN_LOG_FILES_REL = rel.indexes.lastRunFiles;

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

async function collectPolicyIndexableFiles(agentRoot, deps = {}) {
  const {
    collectSearchableFiles,
    getIndexPolicy,
    isEntityIndexExcluded,
    requireNonEmpty = false,
    readFileContent,
    startProgress,
    tickProgress,
    finishProgress
  } = deps;

  if (typeof collectSearchableFiles !== "function") return [];

  const relFiles = await collectSearchableFiles(agentRoot);
  if (typeof startProgress === "function") startProgress("run-log", relFiles.length);
  const policy = typeof getIndexPolicy === "function" ? await getIndexPolicy() : null;
  const eligible = [];

  try {
    for (let index = 0; index < relFiles.length; index += 1) {
      const relPath = relFiles[index];
      const normalized = normalizeRelPath(relPath);
      if (typeof tickProgress === "function") {
        tickProgress(index + 1, relFiles.length, normalized);
      }
      if (!normalized) continue;
      if (typeof isEntityIndexExcluded === "function" && (await isEntityIndexExcluded(normalized))) {
        continue;
      }
      if (policy && typeof policy.isIndexable === "function" && !policy.isIndexable(normalized)) {
        continue;
      }
      if (requireNonEmpty && typeof readFileContent === "function") {
        const content = await readFileContent(normalized);
        if (!String(content || "").trim()) continue;
      }
      eligible.push(normalized);
    }
  } finally {
    if (typeof finishProgress === "function") finishProgress();
  }

  eligible.sort((a, b) => a.localeCompare(b, "ru"));
  return eligible;
}

async function ensureRunLogDir(agentRoot) {
  const dirAbs = path.join(agentRoot, rel.indexes.dir);
  await fs.mkdir(dirAbs, { recursive: true });
  return dirAbs;
}

async function writeIndexRunLog(agentRoot, payload = {}) {
  if (!agentRoot) throw new Error("Agent root not set");

  const startedAt = String(payload.startedAt || new Date().toISOString());
  const finishedAt = String(payload.finishedAt || new Date().toISOString());
  const files = Array.isArray(payload.files)
    ? payload.files.map(normalizeRelPath).filter(Boolean)
    : [];
  const uniqueFiles = [...new Set(files)];

  await ensureRunLogDir(agentRoot);

  const durationMs = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  );

  const meta = {
    version: RUN_LOG_VERSION,
    kind: String(payload.kind || "pipeline"),
    startedAt,
    finishedAt,
    durationMs,
    fileCount: uniqueFiles.length,
    files: uniqueFiles,
    enabledSteps: payload.enabledSteps && typeof payload.enabledSteps === "object" ? payload.enabledSteps : null,
    steps: payload.steps && typeof payload.steps === "object" ? payload.steps : null,
    logPath: RUN_LOG_FILES_REL,
    jsonPath: RUN_LOG_JSON_REL
  };

  const header = `# Index run ${finishedAt} · ${meta.kind} · ${meta.fileCount} files · ${durationMs} ms`;
  const filesText = `${header}\n${uniqueFiles.join("\n")}\n`;

  await fs.writeFile(path.join(agentRoot, RUN_LOG_JSON_REL), `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
  await fs.writeFile(path.join(agentRoot, RUN_LOG_FILES_REL), filesText, "utf-8");

  return {
    ok: true,
    ...meta
  };
}

async function readIndexRunLog(agentRoot) {
  if (!agentRoot) {
    return { exists: false, reason: "Agent not selected" };
  }

  const jsonAbs = path.join(agentRoot, RUN_LOG_JSON_REL);
  const filesAbs = path.join(agentRoot, RUN_LOG_FILES_REL);

  try {
    const [jsonRaw, filesRaw] = await Promise.all([
      fs.readFile(jsonAbs, "utf-8"),
      fs.readFile(filesAbs, "utf-8")
    ]);
    let meta = null;
    try {
      meta = JSON.parse(jsonRaw);
    } catch {
      meta = null;
    }
    const filesFromMeta = Array.isArray(meta?.files) ? meta.files.map(normalizeRelPath).filter(Boolean) : [];
    const filesFromText = String(filesRaw || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    const files = filesFromMeta.length ? filesFromMeta : filesFromText;

    return {
      exists: true,
      path: RUN_LOG_FILES_REL,
      jsonPath: RUN_LOG_JSON_REL,
      builtAt: meta?.finishedAt || meta?.startedAt || null,
      kind: meta?.kind || "pipeline",
      fileCount: files.length,
      durationMs: meta?.durationMs ?? null,
      enabledSteps: meta?.enabledSteps || null,
      steps: meta?.steps || null,
      files,
      filesText: filesRaw
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        exists: false,
        path: RUN_LOG_FILES_REL,
        jsonPath: RUN_LOG_JSON_REL,
        hint: "Лог ещё не создан — запустите полную цепочку индексирования"
      };
    }
    throw error;
  }
}

module.exports = {
  RUN_LOG_JSON_REL,
  RUN_LOG_FILES_REL,
  collectPolicyIndexableFiles,
  writeIndexRunLog,
  readIndexRunLog
};
