const fs = require("fs/promises");
const path = require("path");
const { rel, abs: agentCmsAbs } = require("../paths/agent-cms");
const { flattenSettings } = require("./shell-settings-format");
const { hydrateWorkspaceFromShell, pickShellRuntimePatch } = require("../lib/workspace/workspace-shell-settings-bridge");
const { SESSION_SHELL_TO_WORKSPACE } = require("../lib/workspace/workspace-route-settings-bridge");

const LEGACY_SETTINGS_REL = ".agent-cms/settings/shell.json";
const STATE_REL = rel.state.shell;

function legacySettingsAbsolute(agentRoot) {
  return agentCmsAbs(agentRoot, LEGACY_SETTINGS_REL);
}

function stateAbsolute(agentRoot) {
  return agentCmsAbs(agentRoot, STATE_REL);
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readStateFile(agentRoot) {
  try {
    const raw = await fs.readFile(stateAbsolute(agentRoot), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.route || parsed.ui || parsed.media || parsed.cms || parsed.voice) {
      return flattenSettings(parsed);
    }
    const { formatVersion: _formatVersion, ...rest } = parsed;
    return rest;
  } catch {
    return {};
  }
}

async function writeStateFile(agentRoot, patch = {}) {
  const target = stateAbsolute(agentRoot);
  const current = await readStateFile(agentRoot);
  const merged = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };
  const out = { formatVersion: 1, ...merged };
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  return out;
}

async function readLegacySettingsFile(agentRoot) {
  try {
    const raw = await fs.readFile(legacySettingsAbsolute(agentRoot), "utf-8");
    return flattenSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function migrateStateSessionIdsToWorkspace(agentRoot, projectRoot = process.cwd()) {
  const target = stateAbsolute(agentRoot);
  if (!(await pathExists(target))) return false;

  let raw = {};
  try {
    raw = JSON.parse(await fs.readFile(target, "utf-8"));
  } catch {
    return false;
  }
  if (!raw || typeof raw !== "object") return false;

  const { patchWorkspaceSettings } = require("../settings-store");
  const workspacePatch = {};
  let changed = false;

  for (const [shellKey, workspaceKey] of Object.entries(SESSION_SHELL_TO_WORKSPACE)) {
    const value = String(raw[shellKey] ?? "").trim();
    if (!value) continue;
    workspacePatch[workspaceKey] = value;
    delete raw[shellKey];
    changed = true;
  }

  if (Object.keys(workspacePatch).length) {
    await patchWorkspaceSettings(agentRoot, workspacePatch, projectRoot);
  }
  if (!changed) return false;

  await fs.writeFile(target, `${JSON.stringify(raw, null, 2)}\n`, "utf-8");
  return true;
}

async function migrateLegacyShellSettingsFile(agentRoot, projectRoot = process.cwd()) {
  const legacyPath = legacySettingsAbsolute(agentRoot);
  if (!(await pathExists(legacyPath))) return false;

  const legacyFlat = await readLegacySettingsFile(agentRoot);
  if (!legacyFlat) return false;

  const { patchWorkspaceSettings, readWorkspaceSettingsWithLegacyFallback, parseSettingsFileContent } = require("../settings-store");
  const file = await readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot);
  const existing = file.exists
    ? parseSettingsFileContent(file.content || "").awn_settings || {}
    : file.awn_settings || {};
  const hydrated = hydrateWorkspaceFromShell(existing, legacyFlat);
  const workspacePatch = {};
  for (const [key, value] of Object.entries(hydrated)) {
    if (!(key in existing) || existing[key] === undefined || existing[key] === null || existing[key] === "") {
      workspacePatch[key] = value;
    }
  }
  if (Object.keys(workspacePatch).length) {
    await patchWorkspaceSettings(agentRoot, workspacePatch, projectRoot);
  }

  const runtimePatch = pickShellRuntimePatch(legacyFlat);
  if (Object.keys(runtimePatch).length) {
    await writeStateFile(agentRoot, runtimePatch);
  }

  await fs.unlink(legacyPath);
  return true;
}

module.exports = {
  LEGACY_SETTINGS_REL,
  STATE_REL,
  legacySettingsAbsolute,
  stateAbsolute,
  readStateFile,
  writeStateFile,
  readLegacySettingsFile,
  migrateLegacyShellSettingsFile,
  migrateStateSessionIdsToWorkspace
};
