(function installWebAgentControlBridge() {
  if (window.agentControl) return;

  const logListeners = new Set();
  const actionStateListeners = new Set();

  const SERVER_ACTION_MAP = {
    "server-start-bg": "start",
    "server-start-attached": "start",
    "server-stop": "stop",
    "server-restart": "restart",
    "install-deps": "install-npm"
  };

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || data.message || data.details || response.statusText || "Request failed";
      throw new Error(message);
    }
    return data;
  }

  function emitLog(payload) {
    for (const listener of logListeners) listener(payload);
  }

  function emitActionState(payload) {
    for (const listener of actionStateListeners) listener(payload);
  }

  window.agentControl = {
    getBootstrap: () => fetchJson("/api/ops/bootstrap"),

    refreshStatus: async () => {
      const payload = await fetchJson("/api/ops/bootstrap?lite=1");
      return { server: payload.server };
    },

    refreshBootstrap: async () => {
      const payload = await fetchJson("/api/ops/bootstrap?lite=1");
      return {
        environment: payload.environment,
        mobileConnect: payload.mobileConnect,
        server: payload.server,
        mcpConnect: payload.mcpConnect,
        setupFlags: payload.setupFlags,
        appLock: payload.appLock
      };
    },

    appLockLogin: (login, password) =>
      fetchJson("/api/app-lock/login", {
        method: "POST",
        body: JSON.stringify({
          login: String(login || "").trim(),
          password: String(password || ""),
          remember: true
        })
      }),

    appLockLogout: () =>
      fetchJson("/api/app-lock/logout", {
        method: "POST",
        body: JSON.stringify({})
      }),

    getEnvFile: () => fetchJson("/api/ops/env-file"),

    saveEnvFile: (content) =>
      fetchJson("/api/ops/env-file", {
        method: "POST",
        body: JSON.stringify({ content: String(content ?? "") })
      }),

    reloadUi: () => {
      window.location.reload();
      return Promise.resolve({ ok: true });
    },

    openExternal: (url) => {
      const target = String(url || "").trim();
      if (target) window.open(target, "_blank", "noopener,noreferrer");
      return Promise.resolve({ ok: Boolean(target) });
    },

    revealPath: () => Promise.resolve({ ok: false }),

    testUrl: async (url) => {
      const target = String(url || "").trim();
      if (!target) return { ok: false, command: "", url: "", output: "URL не задан" };
      try {
        const response = await fetch(target, { method: "GET", credentials: "omit", cache: "no-store" });
        const output = `${response.status} ${response.statusText}`.trim();
        return { ok: response.ok, command: `fetch ${target}`, url: target, output };
      } catch (error) {
        return { ok: false, command: `fetch ${target}`, url: target, output: String(error.message || error) };
      }
    },

    notify: (_title, body) => {
      if (body && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(String(_title || "Agent CMS Control"), { body: String(body) });
      }
      return Promise.resolve({ ok: true });
    },

    renderQr: () => Promise.resolve({ ok: false, error: "QR доступен в Electron" }),

    getMaintenanceMode: () => fetchJson("/api/ops/maintenance"),

    setMaintenanceMode: (enabled) =>
      fetchJson("/api/ops/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled: Boolean(enabled) })
      }),

    getMcpInstances: async () => {
      const data = await fetchJson("/api/platform/mcp-instances");
      return { ok: true, filePath: data.filePath, exists: data.exists, instances: data.instances, tunnelDevices: data.tunnelDevices };
    },

    saveMcpInstances: () =>
      Promise.resolve({
        ok: false,
        error: "Сохранение MCP instances — через Editor API или Electron на Mac."
      }),

    runAction: async (actionId) => {
      const id = String(actionId || "").trim();
      const mapped = SERVER_ACTION_MAP[id];
      if (!mapped) {
        return {
          ok: false,
          error:
            "На Linux/VPS в браузере доступны только «Запуск/Стоп/Restart сервера» и «npm ci». Остальное — Electron (Mac) или SSH."
        };
      }

      const mayDropConnection = mapped === "stop" || mapped === "restart";

      emitActionState({ actionId: id, running: true });
      emitLog({ text: `\n▶ ${id} (${mapped})\n`, stream: "stdout" });
      try {
        const result = await fetchJson("/api/ops/server/action", {
          method: "POST",
          body: JSON.stringify({ action: mapped })
        });
        if (result.message) emitLog({ text: `${result.message}\n`, stream: "stdout" });
        if (result.logTail) emitLog({ text: `${result.logTail}\n`, stream: "stdout" });
        if (result.output) emitLog({ text: `${result.output}\n`, stream: "stdout" });
        if (!result.ok && result.error) emitLog({ text: `${result.error}\n`, stream: "stderr" });
        return {
          ok: Boolean(result.ok),
          error: result.error || null,
          serverDisconnectExpected: mayDropConnection && result.ok
        };
      } catch (error) {
        let msg = String(error.message || error);
        if (/app_lock_required/i.test(msg)) {
          msg =
            "app_lock_required — сначала войдите: Editor http://HOST:3000 (логин/пароль из .env APP_LOCK_*), затем снова «Старт» на :3288 (куки на тот же IP/домен).";
          emitLog({ text: `${msg}\n`, stream: "stderr" });
          return { ok: false, error: msg };
        }
        if (mayDropConnection && /failed to fetch|networkerror|load failed/i.test(msg)) {
          emitLog({
            text:
              mapped === "restart"
                ? "Соединение оборвалось — перезапуск идёт. Страница обновится, когда :3288 снова ответит.\n"
                : "Соединение оборвалось — остановка, скорее всего, выполнена. Чтобы снова поднять CMS — «Старт» после reload или SSH: agent-cms-http-service.sh start\n",
            stream: "stdout"
          });
          return { ok: true, serverDisconnectExpected: true };
        }
        emitLog({ text: `${msg}\n`, stream: "stderr" });
        return { ok: false, error: msg };
      } finally {
        emitActionState({ actionId: id, running: false });
      }
    },

    onLog: (callback) => {
      logListeners.add(callback);
      return () => logListeners.delete(callback);
    },

    onActionState: (callback) => {
      actionStateListeners.add(callback);
      return () => actionStateListeners.delete(callback);
    }
  };

  document.documentElement.dataset.controlLauncher = "web";
})();
