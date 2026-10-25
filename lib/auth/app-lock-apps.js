"use strict";

const { PLATFORM_APP_CATALOG } = require("../platform/platform-apps");

const LOCKABLE_APP_IDS = new Set(
  PLATFORM_APP_CATALOG.filter((entry) => entry.kind === "ui").map((entry) => entry.appId)
);

const LEGACY_DEFAULT_LOCKED_APPS = ["editor", "control"];

function normalizeAppLockAppsRaw(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const ids = text
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const id of ids) {
    if (!LOCKABLE_APP_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function readCredentialsFromEnv(env = process.env) {
  const login = String(env.APP_LOCK_LOGIN || "").trim();
  const password = String(env.APP_LOCK_PASSWORD || "").trim();
  return {
    login,
    password,
    configured: Boolean(login && password)
  };
}

function resolveAppLockPolicy(env = process.env) {
  const credentials = readCredentialsFromEnv(env);
  if (!credentials.configured) {
    return {
      configured: false,
      needsSetup: true,
      lockedApps: [],
      lockableApps: [...LOCKABLE_APP_IDS],
      legacyDefault: false
    };
  }

  const parsed = normalizeAppLockAppsRaw(env.APP_LOCK_APPS);
  const lockedApps = parsed == null ? [...LEGACY_DEFAULT_LOCKED_APPS] : parsed;
  return {
    configured: true,
    needsSetup: false,
    lockedApps,
    lockableApps: [...LOCKABLE_APP_IDS],
    legacyDefault: parsed == null
  };
}

function normalizePathname(pathname) {
  const p = String(pathname || "/").split("?")[0].split("#")[0];
  const trimmed = p.replace(/\/+$/, "");
  return trimmed || "/";
}

function resolvePlatformAppIdFromPath(pathname) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return "editor";

  for (const app of PLATFORM_APP_CATALOG) {
    const base = app.publicPath === "/" ? null : app.publicPath;
    if (base && (normalized === base || normalized.startsWith(`${base}/`))) {
      return app.appId;
    }
    for (const legacy of app.legacyPaths || []) {
      const leg = normalizePathname(legacy);
      if (normalized === leg || normalized.startsWith(`${leg}/`)) {
        return app.appId;
      }
    }
  }

  return null;
}

function isAppLockRequiredForApp(appId, policy = resolveAppLockPolicy()) {
  const id = String(appId || "").trim().toLowerCase();
  if (!id || !policy.configured) return false;
  return policy.lockedApps.includes(id);
}

function isOpsAppLockRequired(policy = resolveAppLockPolicy()) {
  return isAppLockRequiredForApp("control", policy);
}

function buildAppLockAppsCatalog(policy = resolveAppLockPolicy()) {
  return PLATFORM_APP_CATALOG.filter((entry) => entry.kind === "ui").map((entry) => ({
    appId: entry.appId,
    title: entry.title,
    publicPath: entry.publicPath,
    locked: policy.lockedApps.includes(entry.appId)
  }));
}

module.exports = {
  LOCKABLE_APP_IDS,
  LEGACY_DEFAULT_LOCKED_APPS,
  normalizeAppLockAppsRaw,
  resolveAppLockPolicy,
  resolvePlatformAppIdFromPath,
  isAppLockRequiredForApp,
  isOpsAppLockRequired,
  buildAppLockAppsCatalog,
  readCredentialsFromEnv
};
