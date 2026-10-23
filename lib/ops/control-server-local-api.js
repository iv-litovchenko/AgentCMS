"use strict";

const { URL } = require("url");
const {
  issueAppLockSession,
  buildSessionClearCookie,
  getValidAppLockSession
} = require("../auth/app-lock-session");
const { verifyAppLockCredentials, getAppLockConfig } = require("./control-app-lock");
const { buildControlBootstrap } = require("./control-bootstrap");
const { runServerAction } = require("./ops-server-control");
const { readProjectEnvFile, writeProjectEnvFile } = require("./control-env-file");

function readJsonBody(req, maxBytes = 64_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(payload);
}

function makeReadRootEnv(projectRoot) {
  return async () => {
    const cfg = getAppLockConfig(projectRoot);
    return {
      APP_LOCK_LOGIN: cfg.login,
      APP_LOCK_PASSWORD: cfg.password
    };
  };
}

async function resolveOpsAppLockGate(req, projectRoot) {
  const cfg = getAppLockConfig(projectRoot);
  const readRootEnvFile = makeReadRootEnv(projectRoot);
  const sessionActive = Boolean(await getValidAppLockSession(req, readRootEnvFile));
  const opsLockRequired = Boolean(cfg.opsLockRequired);
  return {
    enabled: opsLockRequired,
    configured: cfg.configured,
    lockedApps: cfg.lockedApps,
    sessionActive,
    canToggleMaintenance: !opsLockRequired || sessionActive
  };
}

async function getOpsWriteDenied(req, projectRoot) {
  const gate = await resolveOpsAppLockGate(req, projectRoot);
  if (gate.canToggleMaintenance) return null;
  return {
    status: 403,
    body: {
      ok: false,
      error: "app_lock_required",
      message: "Нужен вход (логин и пароль из .env APP_LOCK_*)."
    }
  };
}

const LOCAL_API_PREFIXES = [
  "/api/app-lock/login",
  "/api/app-lock/logout",
  "/api/app-lock/status",
  "/api/ops/bootstrap",
  "/api/ops/server/action",
  "/api/ops/env-file"
];

function shouldHandleLocally(urlPath) {
  return LOCAL_API_PREFIXES.some(
    (prefix) => urlPath === prefix || urlPath.startsWith(`${prefix}?`)
  );
}

async function handleLocalApi(req, res, projectRoot) {
  const url = new URL(String(req.url || "/"), "http://control.local");
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/app-lock/status") {
    try {
      const cfg = getAppLockConfig(projectRoot);
      return sendJson(res, 200, {
        ok: true,
        configured: cfg.configured,
        login: cfg.configured ? cfg.login : "",
        envPath: cfg.envPath
      });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: String(error.message || error) });
    }
  }

  if (req.method === "POST" && pathname === "/api/app-lock/login") {
    try {
      const payload = await readJsonBody(req);
      const login = String(payload?.login || "").trim();
      const password = String(payload?.password || "");
      const cfg = getAppLockConfig(projectRoot);
      if (!cfg.configured) {
        return sendJson(res, 200, { ok: true, skipped: true });
      }
      if (!login || !password) {
        return sendJson(res, 400, { ok: false, error: "Missing login or password" });
      }
      if (!verifyAppLockCredentials(projectRoot, login, password)) {
        return sendJson(res, 401, {
          ok: false,
          error: "Неверный логин или пароль",
          hint: `Проверьте APP_LOCK_* в ${cfg.envPath} (ожидаемый логин: ${cfg.login}).`
        });
      }
      const readRootEnvFile = makeReadRootEnv(projectRoot);
      const setCookie = await issueAppLockSession(req, readRootEnvFile, {
        remember: payload?.remember !== false
      });
      if (!setCookie) {
        return sendJson(res, 500, {
          ok: false,
          error: "Не удалось создать сессию (APP_LOCK_* в .env пустые или повреждены)."
        });
      }
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": setCookie });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: String(error.message || error) });
    }
  }

  if (req.method === "POST" && pathname === "/api/app-lock/logout") {
    try {
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": buildSessionClearCookie(req) });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: String(error.message || error) });
    }
  }

  if (req.method === "GET" && pathname === "/api/ops/bootstrap") {
    try {
      const lite = String(url.searchParams.get("lite") || "").trim() === "1";
      const payload = await buildControlBootstrap(projectRoot, { launcherMode: "web" });
      const appLock = await resolveOpsAppLockGate(req, projectRoot);
      if (lite) {
        return sendJson(res, 200, {
          environment: payload.environment,
          mobileConnect: payload.mobileConnect,
          server: payload.server,
          mcpConnect: payload.mcpConnect,
          setupFlags: payload.setupFlags,
          deployment: payload.deployment,
          appLock
        });
      }
      payload.appLock = appLock;
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to build control bootstrap",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && pathname === "/api/ops/env-file") {
    try {
      const gate = await resolveOpsAppLockGate(req, projectRoot);
      const payload = readProjectEnvFile(projectRoot);
      if (!payload.ok) return sendJson(res, 500, payload);
      if (!gate.canToggleMaintenance) {
        return sendJson(res, 200, {
          ...payload,
          content: "",
          locked: true,
          message: "Войдите для редактирования .env. Справа — справочник .env.example."
        });
      }
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: String(error.message || error) });
    }
  }

  if (req.method === "POST" && pathname === "/api/ops/env-file") {
    try {
      const denied = await getOpsWriteDenied(req, projectRoot);
      if (denied) return sendJson(res, denied.status, denied.body);
      const body = await readJsonBody(req, 280_000);
      const result = writeProjectEnvFile(projectRoot, body?.content);
      if (!result.ok) return sendJson(res, 400, result);
      return sendJson(res, 200, {
        ok: true,
        filePath: result.filePath,
        message: "Сохранено. Перезапустите MCP и при необходимости CMS (кнопки «Рестарт» / stack)."
      });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: String(error.message || error) });
    }
  }

  if (req.method === "POST" && pathname === "/api/ops/server/action") {
    try {
      const denied = await getOpsWriteDenied(req, projectRoot);
      if (denied) return sendJson(res, denied.status, denied.body);

      const payload = await readJsonBody(req);
      const result = runServerAction(projectRoot, payload?.action);
      const httpStatus = result.status || (result.ok ? 200 : 500);
      const body = {
        ok: Boolean(result.ok),
        action: result.action,
        message: result.message,
        output: result.output,
        logTail: result.output,
        error: result.ok ? undefined : result.error || result.output || "action_failed",
        exitCode: result.exitCode
      };
      return sendJson(res, httpStatus, body);
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        error: "Failed to run server action",
        details: String(error.message || error)
      });
    }
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

module.exports = {
  shouldHandleLocally,
  handleLocalApi
};
