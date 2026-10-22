"use strict";

const fs = require("fs");
const path = require("path");

function readRootEnvSync(projectRoot) {
  const envPath = path.join(path.resolve(projectRoot), ".env");
  const out = {};
  let raw = "";
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash >= 0) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return out;
}

function getAppLockConfig(projectRoot) {
  const env = readRootEnvSync(projectRoot);
  const login = String(env.APP_LOCK_LOGIN || "").trim();
  const password = String(env.APP_LOCK_PASSWORD || "").trim();
  return {
    login,
    password,
    configured: Boolean(login && password)
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
    enabled: cfg.configured,
    sessionActive: Boolean(sessionActive),
    canToggleMaintenance: !cfg.configured || Boolean(sessionActive)
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
