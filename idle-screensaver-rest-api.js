const fs = require("fs/promises");
const { rel, abs } = require("./paths/agent-cms");

const BREAKS_REL_PATH = rel.rest.idleScreensaverBreaks;

function normalizeBreaksPayload(raw, fallbackDate) {
  const date = String(raw?.date || fallbackDate || "").trim();
  const count = Number(raw?.count);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Invalid date (expected YYYY-MM-DD)" };
  }
  if (!Number.isFinite(count) || count < 0) {
    return { error: "Invalid count" };
  }
  return {
    date,
    count: Math.floor(count),
    updatedAt: new Date().toISOString()
  };
}

async function readIdleScreensaverBreaks(agentRoot) {
  if (!agentRoot) {
    return { exists: false, breaks: null, path: BREAKS_REL_PATH };
  }
  const absolute = abs(agentRoot, BREAKS_REL_PATH);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeBreaksPayload(parsed, parsed?.date);
    if (normalized.error) {
      return { exists: true, breaks: null, corrupt: true, path: BREAKS_REL_PATH };
    }
    return { exists: true, breaks: normalized, path: BREAKS_REL_PATH };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, breaks: null, path: BREAKS_REL_PATH };
    }
    throw error;
  }
}

async function writeIdleScreensaverBreaks(agentRoot, payload) {
  if (!agentRoot) throw new Error("Agent root is required");
  const normalized = normalizeBreaksPayload(payload, payload?.date);
  if (normalized.error) {
    return { error: normalized.error, status: 400 };
  }
  await fs.mkdir(abs(agentRoot, rel.rest.dir), { recursive: true });
  const absolute = abs(agentRoot, BREAKS_REL_PATH);
  await fs.writeFile(absolute, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return { path: BREAKS_REL_PATH, breaks: normalized };
}

module.exports = {
  BREAKS_REL_PATH,
  readIdleScreensaverBreaks,
  writeIdleScreensaverBreaks
};
