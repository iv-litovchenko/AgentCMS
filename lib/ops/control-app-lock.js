"use strict";

const fs = require("fs");
const path = require("path");
const { parseRootEnvFileContent } = require("../config/agent-cms-ports");
const { resolveAppLockPolicy, isOpsAppLockRequired } = require("../auth/app-lock-apps");
const { resolveEnvProjectRoot } = require("./control-env-file");

function readRootEnvSync(projectRoot) {
  const root = resolveEnvProjectRoot(projectRoot);
  const envPath = path.join(root, ".env");
  try {
    return parseRootEnvFileContent(fs.readFileSync(envPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function getAppLockConfig(projectRoot) {
  const env = { ...process.env, ...readRootEnvSync(projectRoot) };
  const login = String(env.APP_LOCK_LOGIN || process.env.APP_LOCK_LOGIN || "").trim();
  const password = String(env.APP_LOCK_PASSWORD || process.env.APP_LOCK_PASSWORD || "").trim();
  const policy = resolveAppLockPolicy({ ...process.env, ...env });
  return {
    login,
    password,
    configured: Boolean(login && password),
    lockedApps: policy.lockedApps,
    opsLockRequired: isOpsAppLockRequired(policy),
    envPath: path.join(resolveEnvProjectRoot(projectRoot), ".env")
  };
}

function verifyAppLockCredentials(projectRoot, login, password) {
  const cfg = getAppLockConfig(projectRoot);
  if (!cfg.configured) return true;
  return String(login || "").trim() === cfg.login && String(password || "") === cfg.password;
}

function buildAppLockGate(projectRoot, sessionActive) {
  const cfg = getAppLockConfig(projectRoot);
  return {
    enabled: cfg.opsLockRequired,
    configured: cfg.configured,
    lockedApps: cfg.lockedApps,
    sessionActive: Boolean(sessionActive),
    canToggleMaintenance: !cfg.opsLockRequired || Boolean(sessionActive)
  };
}

function isOpsActionGated(action) {
  if (!action) return false;
  if (action.serverRole) return true;
  if (action.id === "install-deps") return true;
  return false;
}

module.exports = {
  getAppLockConfig,
  verifyAppLockCredentials,
  buildAppLockGate,
  isOpsActionGated
};
