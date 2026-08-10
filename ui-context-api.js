const path = require("path");
const fs = require("fs/promises");
const { enrichUiContext } = require("./ui-context-focus");

const UI_CONTEXT_DIR = ".agent-cms";
const UI_CONTEXT_FILE = "ui-context.json";
const UI_CONTEXT_REL_PATH = `${UI_CONTEXT_DIR}/${UI_CONTEXT_FILE}`;
const UI_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;

function getUiContextAbsolute(agentRoot) {
  return path.join(agentRoot, UI_CONTEXT_DIR, UI_CONTEXT_FILE);
}

async function readAgentUiContext(agentRoot) {
  if (!agentRoot) {
    return { exists: false, context: null, stale: true };
  }
  const absolute = getUiContextAbsolute(agentRoot);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const context = JSON.parse(raw);
    const updatedAt = Date.parse(context?.updatedAt || "");
    const stale =
      !Number.isFinite(updatedAt) || Date.now() - updatedAt > UI_CONTEXT_MAX_AGE_MS;
    return {
      exists: true,
      context: enrichUiContext(context),
      stale,
      path: UI_CONTEXT_REL_PATH
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, context: null, stale: true };
    }
    throw error;
  }
}

async function writeAgentUiContext(agentRoot, payload) {
  if (!agentRoot) throw new Error("Agent root is required");
  const absolute = getUiContextAbsolute(agentRoot);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const context = enrichUiContext({
    ...payload,
    updatedAt: new Date().toISOString()
  });
  await fs.writeFile(absolute, `${JSON.stringify(context, null, 2)}\n`, "utf-8");
  return context;
}

module.exports = {
  UI_CONTEXT_DIR,
  UI_CONTEXT_FILE,
  UI_CONTEXT_REL_PATH,
  UI_CONTEXT_MAX_AGE_MS,
  readAgentUiContext,
  writeAgentUiContext
};
